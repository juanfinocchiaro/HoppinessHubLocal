-- =============================================================================
-- Re-run full backfill: schedule_id + work_date + employee_time_state.
-- Required because schedules created AFTER the initial backfill left many
-- entries unlinked.  This migration is idempotent — safe to re-run.
-- =============================================================================

-- Step 1: Clear ALL schedule_id / resolved_type
UPDATE clock_entries
SET schedule_id = NULL, resolved_type = NULL;

-- Step 2: Window-based schedule_id assignment for clock_in entries
DO $$
DECLARE
  rec RECORD;
  matched_sched_id UUID;
  entry_minutes INT;
  sched_start_min INT;
  sched_end_min INT;
  win_start INT;
  win_end INT;
  best_id UUID;
  best_dist INT;
  cur_dist INT;
BEGIN
  FOR rec IN
    SELECT ce.id, ce.user_id, ce.branch_id, ce.created_at,
           COALESCE(b.clock_window_before_min, 90) AS before_min,
           COALESCE(b.clock_window_after_min, 60)  AS after_min
    FROM clock_entries ce
    JOIN branches b ON b.id = ce.branch_id
    WHERE ce.entry_type = 'clock_in'
    ORDER BY ce.user_id, ce.created_at
  LOOP
    entry_minutes := EXTRACT(HOUR FROM (rec.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires'))::int * 60
                   + EXTRACT(MINUTE FROM (rec.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires'))::int;

    best_id := NULL;
    best_dist := 99999;

    -- Today's schedules
    FOR matched_sched_id, sched_start_min, sched_end_min IN
      SELECT es.id,
             EXTRACT(HOUR FROM es.start_time)::int * 60 + EXTRACT(MINUTE FROM es.start_time)::int,
             EXTRACT(HOUR FROM es.end_time)::int * 60 + EXTRACT(MINUTE FROM es.end_time)::int
      FROM employee_schedules es
      WHERE es.user_id = rec.user_id
        AND es.branch_id = rec.branch_id
        AND es.schedule_date = (rec.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
        AND es.is_day_off = false
        AND es.start_time IS NOT NULL
    LOOP
      win_start := ((sched_start_min - rec.before_min) % 1440 + 1440) % 1440;
      win_end   := ((sched_end_min + rec.after_min) % 1440 + 1440) % 1440;

      IF win_start <= win_end THEN
        IF entry_minutes >= win_start AND entry_minutes <= win_end THEN
          cur_dist := ABS(entry_minutes - sched_start_min);
          IF cur_dist > 720 THEN cur_dist := 1440 - cur_dist; END IF;
          IF cur_dist < best_dist THEN
            best_dist := cur_dist;
            best_id := matched_sched_id;
          END IF;
        END IF;
      ELSE
        IF entry_minutes >= win_start OR entry_minutes <= win_end THEN
          cur_dist := ABS(entry_minutes - sched_start_min);
          IF cur_dist > 720 THEN cur_dist := 1440 - cur_dist; END IF;
          IF cur_dist < best_dist THEN
            best_dist := cur_dist;
            best_id := matched_sched_id;
          END IF;
        END IF;
      END IF;
    END LOOP;

    -- Yesterday's overnight schedules
    IF best_id IS NULL THEN
      FOR matched_sched_id, sched_start_min, sched_end_min IN
        SELECT es.id,
               EXTRACT(HOUR FROM es.start_time)::int * 60 + EXTRACT(MINUTE FROM es.start_time)::int,
               EXTRACT(HOUR FROM es.end_time)::int * 60 + EXTRACT(MINUTE FROM es.end_time)::int
        FROM employee_schedules es
        WHERE es.user_id = rec.user_id
          AND es.branch_id = rec.branch_id
          AND es.schedule_date = (rec.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date - 1
          AND es.is_day_off = false
          AND es.start_time IS NOT NULL
          AND es.end_time IS NOT NULL
      LOOP
        IF sched_end_min < sched_start_min THEN
          IF entry_minutes <= sched_end_min + rec.after_min THEN
            cur_dist := entry_minutes + (1440 - sched_start_min);
            IF cur_dist < best_dist THEN
              best_dist := cur_dist;
              best_id := matched_sched_id;
            END IF;
          END IF;
        END IF;
      END LOOP;
    END IF;

    IF best_id IS NOT NULL THEN
      UPDATE clock_entries SET schedule_id = best_id, resolved_type = 'scheduled'
      WHERE id = rec.id;

      UPDATE clock_entries SET schedule_id = best_id, resolved_type = 'scheduled'
      WHERE id = (
        SELECT ce2.id FROM clock_entries ce2
        WHERE ce2.user_id = rec.user_id
          AND ce2.branch_id = rec.branch_id
          AND ce2.entry_type = 'clock_out'
          AND ce2.schedule_id IS NULL
          AND ce2.created_at > rec.created_at
          AND ce2.created_at < rec.created_at + INTERVAL '18 hours'
        ORDER BY ce2.created_at
        LIMIT 1
      );
    ELSE
      UPDATE clock_entries SET resolved_type = 'unscheduled' WHERE id = rec.id;
    END IF;
  END LOOP;

  UPDATE clock_entries SET resolved_type = 'unscheduled'
  WHERE resolved_type IS NULL AND entry_type = 'clock_out' AND schedule_id IS NULL;
END $$;

-- Step 3: Recompute work_date for all entries
-- 3a: linked entries → schedule_date
UPDATE clock_entries ce
SET work_date = es.schedule_date
FROM employee_schedules es
WHERE ce.schedule_id = es.id;

-- 3b: unlinked clock_in → Argentina local date
UPDATE clock_entries
SET work_date = (created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
WHERE schedule_id IS NULL
  AND entry_type = 'clock_in';

-- 3c: unlinked clock_out → inherit from paired clock_in, fallback to local date
UPDATE clock_entries co
SET work_date = COALESCE(
  (
    SELECT ci.work_date
    FROM clock_entries ci
    WHERE ci.user_id = co.user_id
      AND ci.branch_id = co.branch_id
      AND ci.entry_type = 'clock_in'
      AND ci.created_at < co.created_at
      AND ci.created_at > co.created_at - INTERVAL '18 hours'
      AND ci.work_date IS NOT NULL
    ORDER BY ci.created_at DESC
    LIMIT 1
  ),
  (co.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
)
WHERE co.schedule_id IS NULL
  AND co.entry_type = 'clock_out';

-- Step 4: Re-seed employee_time_state
TRUNCATE employee_time_state;
INSERT INTO employee_time_state (employee_id, branch_id, current_state, last_event_id, open_clock_in_id, open_schedule_id, last_updated)
SELECT DISTINCT ON (ce.user_id)
  ce.user_id,
  ce.branch_id,
  CASE WHEN ce.entry_type = 'clock_in' THEN 'working' ELSE 'off' END,
  ce.id,
  CASE WHEN ce.entry_type = 'clock_in' THEN ce.id ELSE NULL END,
  CASE WHEN ce.entry_type = 'clock_in' THEN ce.schedule_id ELSE NULL END,
  ce.created_at
FROM clock_entries ce
ORDER BY ce.user_id, ce.created_at DESC;

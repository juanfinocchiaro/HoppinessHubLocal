-- =============================================================================
-- Fix: Re-run schedule_id assignment with proper window-based distance check.
-- The original backfill assigned every clock_in to the closest schedule
-- regardless of distance. This migration clears bad assignments and re-links
-- only entries within the configured window.
-- =============================================================================

-- Step 1: Clear ALL schedule_id / resolved_type so we can re-assign cleanly.
UPDATE clock_entries
SET schedule_id = NULL,
    resolved_type = NULL
WHERE schedule_id IS NOT NULL;

-- Step 2: Re-assign clock_in entries using window-based matching.
-- Only match when the clock_in falls within [start_time - beforeMin, end_time + afterMin].
DO $$
DECLARE
  rec RECORD;
  matched_sched_id UUID;
  entry_minutes INT;
  sched_start_min INT;
  sched_end_min INT;
  before_win INT;
  after_win INT;
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

    -- Search today's schedules
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
      -- Window: [start - beforeMin, end + afterMin] with circular wrap
      win_start := ((sched_start_min - rec.before_min) % 1440 + 1440) % 1440;
      win_end   := ((sched_end_min + rec.after_min) % 1440 + 1440) % 1440;

      -- Check if entry_minutes falls in [win_start, win_end] (circular)
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

    -- Also search YESTERDAY's schedules (for overnight shifts)
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
        -- Only consider overnight schedules (end < start)
        IF sched_end_min < sched_start_min THEN
          -- For yesterday's overnight, the clock_in would be after midnight
          -- Accept if entry is before (end_time + afterMin) on the next day
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

      -- Also link the next clock_out for this user within 18 hours
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

  -- Mark remaining unlinked clock_outs as unscheduled
  UPDATE clock_entries SET resolved_type = 'unscheduled'
  WHERE resolved_type IS NULL AND entry_type = 'clock_out' AND schedule_id IS NULL;
END $$;

-- Step 3: Re-seed employee_time_state from latest entry per user
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

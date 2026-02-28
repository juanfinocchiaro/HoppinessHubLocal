-- =============================================================================
-- Unified Clock Engine: schema changes
-- Adds schedule_id FK to clock_entries, creates employee_time_state,
-- and backfills historical data.
-- =============================================================================

-- 1. New columns on clock_entries
ALTER TABLE clock_entries
  ADD COLUMN IF NOT EXISTS schedule_id UUID REFERENCES employee_schedules(id),
  ADD COLUMN IF NOT EXISTS resolved_type TEXT CHECK (resolved_type IN ('scheduled', 'unscheduled', 'system_inferred')),
  ADD COLUMN IF NOT EXISTS anomaly_type TEXT;

CREATE INDEX IF NOT EXISTS idx_clock_entries_schedule ON clock_entries(schedule_id);

-- 2. Employee real-time state table
CREATE TABLE IF NOT EXISTS employee_time_state (
  employee_id   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  branch_id     UUID REFERENCES branches(id),
  current_state TEXT NOT NULL DEFAULT 'off' CHECK (current_state IN ('off', 'working')),
  last_event_id     UUID REFERENCES clock_entries(id),
  open_clock_in_id  UUID REFERENCES clock_entries(id),
  open_schedule_id  UUID REFERENCES employee_schedules(id),
  last_updated  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE employee_time_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ets_select" ON employee_time_state FOR SELECT TO authenticated
  USING (
    employee_id = auth.uid()
    OR public.is_hr_role(auth.uid(), branch_id)
  );

CREATE POLICY "ets_all_service" ON employee_time_state FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 3. Backfill schedule_id on historical clock_entries
-- Pairs each clock_in with the closest employee_schedule of the same date/user
-- within the branch's configured window.
DO $$
DECLARE
  rec RECORD;
  matched_sched_id UUID;
  entry_time TIME;
  entry_date DATE;
BEGIN
  FOR rec IN
    SELECT ce.id, ce.user_id, ce.branch_id, ce.entry_type, ce.created_at
    FROM clock_entries ce
    WHERE ce.schedule_id IS NULL
      AND ce.entry_type = 'clock_in'
    ORDER BY ce.user_id, ce.created_at
  LOOP
    entry_date := (rec.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;
    entry_time := (rec.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::time;

    SELECT es.id INTO matched_sched_id
    FROM employee_schedules es
    JOIN branches b ON b.id = rec.branch_id
    WHERE es.user_id = rec.user_id
      AND es.branch_id = rec.branch_id
      AND es.schedule_date = entry_date
      AND es.is_day_off = false
      AND es.start_time IS NOT NULL
    ORDER BY ABS(
      EXTRACT(EPOCH FROM (entry_time - es.start_time))
    )
    LIMIT 1;

    IF matched_sched_id IS NOT NULL THEN
      UPDATE clock_entries SET schedule_id = matched_sched_id, resolved_type = 'scheduled'
      WHERE id = rec.id;

      UPDATE clock_entries SET schedule_id = matched_sched_id, resolved_type = 'scheduled'
      WHERE id IN (
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

-- 4. Seed employee_time_state from the latest clock_entry per user per branch
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
ORDER BY ce.user_id, ce.created_at DESC
ON CONFLICT (employee_id) DO NOTHING;

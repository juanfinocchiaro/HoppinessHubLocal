-- =============================================================================
-- Add work_date to clock_entries: canonical business day each entry belongs to.
-- Eliminates all date-bleeding issues between overnight/adjacent days.
-- =============================================================================

ALTER TABLE clock_entries
  ADD COLUMN IF NOT EXISTS work_date DATE;

-- Backfill work_date:
-- 1) Entries with schedule_id → use schedule_date
-- 2) clock_in without schedule_id → Argentina local date
-- 3) clock_out without schedule_id → inherit from paired clock_in, fallback to local date

-- Step 1: linked entries
UPDATE clock_entries ce
SET work_date = es.schedule_date
FROM employee_schedules es
WHERE ce.schedule_id = es.id
  AND ce.work_date IS NULL;

-- Step 2: unlinked clock_in entries
UPDATE clock_entries
SET work_date = (created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
WHERE work_date IS NULL
  AND entry_type = 'clock_in';

-- Step 3: unlinked clock_out entries — find their paired clock_in
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
WHERE co.work_date IS NULL
  AND co.entry_type = 'clock_out';

-- Step 4: catch-all for any remaining nulls
UPDATE clock_entries
SET work_date = (created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
WHERE work_date IS NULL;

-- Make NOT NULL going forward and add index
ALTER TABLE clock_entries ALTER COLUMN work_date SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clock_entries_work_date ON clock_entries(branch_id, work_date);



# Bug: EditEntryDialog — Overnight timestamp miscalculation

## Root Cause

In `EditEntryDialog.tsx` line 65:
```js
const newTimestamp = new Date(`${date}T${time}:00`).toISOString();
```

The `date` field uses `work_date` (e.g. `2026-03-01`). When the user sets time to `00:58` (an exit after midnight for an 18:00-02:00 shift), the timestamp is built as:

```
new Date("2026-03-01T00:58:00") → 2026-03-01 03:58:00 UTC
```

But the correct timestamp should be **March 2nd** at 00:58 AR = `2026-03-02T03:58:00Z`, because the exit happened after midnight of the **next calendar day**. The `work_date` is the operational date (March 1st), not the calendar date.

## Evidence in DB

Guadalupe Malizia, work_date `2026-03-01`, schedule 18:00-02:00:
- `clock_in` at `2026-03-01 20:44:19 UTC` (17:44 AR) — correct
- `clock_out` at `2026-03-01 03:58:00 UTC` (00:58 AR **March 1st**) — wrong, should be `2026-03-02 03:58:00 UTC` (00:58 AR **March 2nd**)

Since the clock_out timestamp is chronologically **before** the clock_in, `buildSessionsFromEntries` creates two orphaned sessions → "Turno no cerrado".

## Fix

In `EditEntryDialog.tsx` line 65, apply the **inverse** of the operational date rule: if the entered time is between 00:00 and 04:59 (early morning / overnight), the calendar date is `work_date + 1 day`.

```typescript
// Before:
const newTimestamp = new Date(`${date}T${time}:00`).toISOString();

// After:
const [hh] = time.split(':').map(Number);
let calendarDate = date;
if (hh < 5) {
  // Overnight: time 00:00-04:59 belongs to work_date operationally,
  // but calendar-wise it's the next day
  const next = new Date(`${date}T12:00:00`);
  next.setDate(next.getDate() + 1);
  calendarDate = next.toISOString().slice(0, 10);
}
const newTimestamp = new Date(`${calendarDate}T${time}:00`).toISOString();
```

Same fix needed in `RosterExpandedRow.tsx` inline manual entry (lines ~73-76) which also builds timestamps from `dateStr + time`.

## Data fix

Update Guadalupe's corrupted clock_out to the correct timestamp:
```sql
UPDATE clock_entries
SET created_at = '2026-03-02T03:58:00+00'
WHERE id = 'bf36533d-3741-4f95-985f-cbf173e3f3ab';
```

## Files to change

| File | Change |
|---|---|
| `EditEntryDialog.tsx` L62-65 | Add overnight detection: if time < 05:00, use `work_date + 1 day` for calendar date |
| `RosterExpandedRow.tsx` ~L73 | Same overnight detection in inline manual add mutation |
| DB data fix | Correct Guadalupe's clock_out timestamp |


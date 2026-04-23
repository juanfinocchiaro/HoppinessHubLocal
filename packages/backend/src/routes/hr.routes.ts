import { Router } from 'express';
import { db } from '../db/connection.js';
import {
  clock_entries,
  employee_time_state,
  employee_schedules,
  schedule_requests,
  warnings,
  salary_advances,
  employee_data,
  special_days,
  work_positions,
} from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// ============================================================================
// CLOCK ENTRIES
// ============================================================================

router.get('/clock/:branchId/entries', requireAuth, async (req, res, next) => {
  try {
    const { date } = req.query;
    let rows;
    if (date) {
      rows = await db.select().from(clock_entries)
        .where(and(
          eq(clock_entries.branch_id, req.params.branchId),
          eq(clock_entries.work_date, date as string),
        ))
        .orderBy(desc(clock_entries.created_at));
    } else {
      rows = await db.select().from(clock_entries)
        .where(eq(clock_entries.branch_id, req.params.branchId))
        .orderBy(desc(clock_entries.created_at));
    }
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/clock/register', requireAuth, async (req, res, next) => {
  try {
    const {
      user_id, branch_id, entry_type, latitude, longitude,
      gps_status, gps_message, photo_url, schedule_id, work_date,
    } = req.body;
    if (!branch_id || !entry_type) {
      throw new AppError(400, 'branch_id and entry_type are required');
    }

    const effectiveUserId = user_id ?? req.user!.userId;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const effectiveWorkDate = work_date ?? now.slice(0, 10);

    await db.insert(clock_entries).values({
      id, user_id: effectiveUserId, branch_id, entry_type,
      is_manual: false, latitude, longitude, gps_status, gps_message,
      photo_url, schedule_id, work_date: effectiveWorkDate,
      user_agent: req.headers['user-agent'] ?? null,
      ip_address: req.ip ?? null, created_at: now,
    });

    const newState = entry_type === 'clock_in' ? 'working' : 'off';
    const existing = await db.select().from(employee_time_state)
      .where(eq(employee_time_state.employee_id, effectiveUserId)).get();

    if (existing) {
      await db.update(employee_time_state).set({
        branch_id,
        current_state: newState,
        last_event_id: id,
        ...(entry_type === 'clock_in' ? { open_clock_in_id: id } : { open_clock_in_id: null }),
        open_schedule_id: schedule_id ?? existing.open_schedule_id,
        last_updated: now,
      }).where(eq(employee_time_state.employee_id, effectiveUserId));
    } else {
      await db.insert(employee_time_state).values({
        employee_id: effectiveUserId,
        branch_id,
        current_state: newState,
        last_event_id: id,
        open_clock_in_id: entry_type === 'clock_in' ? id : null,
        open_schedule_id: schedule_id,
        last_updated: now,
      });
    }

    const row = await db.select().from(clock_entries).where(eq(clock_entries.id, id)).get();
    res.status(201).json({ data: row });
  } catch (err) {
    next(err);
  }
});

router.put('/clock/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(clock_entries).where(eq(clock_entries.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Clock entry not found');

    const {
      entry_type, work_date, manual_reason, schedule_id,
      anomaly_type, resolved_type, early_leave_authorized,
      original_created_at,
    } = req.body;

    await db.update(clock_entries).set({
      ...(entry_type !== undefined && { entry_type }),
      ...(work_date !== undefined && { work_date }),
      ...(schedule_id !== undefined && { schedule_id }),
      ...(anomaly_type !== undefined && { anomaly_type }),
      ...(resolved_type !== undefined && { resolved_type }),
      ...(early_leave_authorized !== undefined && { early_leave_authorized }),
      ...(original_created_at !== undefined && { original_created_at }),
      is_manual: true,
      manual_by: req.user!.userId,
      manual_reason: manual_reason ?? 'Manual edit',
    }).where(eq(clock_entries.id, req.params.id));

    const row = await db.select().from(clock_entries).where(eq(clock_entries.id, req.params.id)).get();
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
});

router.delete('/clock/:id', requireAuth, async (req, res, next) => {
  try {
    await db.delete(clock_entries).where(eq(clock_entries.id, req.params.id));
    res.json({ message: 'Clock entry deleted' });
  } catch (err) {
    next(err);
  }
});

router.get('/clock/:branchId/time-state', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(employee_time_state)
      .where(eq(employee_time_state.branch_id, req.params.branchId));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// SCHEDULES
// ============================================================================

router.get('/schedules/:branchId', requireAuth, async (req, res, next) => {
  try {
    const { month, year } = req.query;
    let rows;
    if (month && year) {
      rows = await db.select().from(employee_schedules)
        .where(and(
          eq(employee_schedules.branch_id, req.params.branchId),
          eq(employee_schedules.schedule_month, Number(month)),
          eq(employee_schedules.schedule_year, Number(year)),
        ))
        .orderBy(employee_schedules.schedule_date);
    } else {
      rows = await db.select().from(employee_schedules)
        .where(eq(employee_schedules.branch_id, req.params.branchId))
        .orderBy(employee_schedules.schedule_date);
    }
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/schedules', requireAuth, async (req, res, next) => {
  try {
    const { schedules } = req.body;
    if (!Array.isArray(schedules)) throw new AppError(400, 'schedules must be an array');

    const now = new Date().toISOString();
    const ids: string[] = [];

    for (const s of schedules) {
      if (s.id) {
        await db.update(employee_schedules).set({
          ...(s.start_time !== undefined && { start_time: s.start_time }),
          ...(s.end_time !== undefined && { end_time: s.end_time }),
          ...(s.start_time_2 !== undefined && { start_time_2: s.start_time_2 }),
          ...(s.end_time_2 !== undefined && { end_time_2: s.end_time_2 }),
          ...(s.break_start !== undefined && { break_start: s.break_start }),
          ...(s.break_end !== undefined && { break_end: s.break_end }),
          ...(s.is_day_off !== undefined && { is_day_off: s.is_day_off }),
          ...(s.work_position !== undefined && { work_position: s.work_position }),
          ...(s.shift_number !== undefined && { shift_number: s.shift_number }),
          updated_at: now,
        }).where(eq(employee_schedules.id, s.id));
        ids.push(s.id);
      } else {
        const id = crypto.randomUUID();
        await db.insert(employee_schedules).values({
          id,
          employee_id: s.employee_id ?? s.user_id,
          user_id: s.user_id,
          branch_id: s.branch_id,
          schedule_date: s.schedule_date,
          schedule_month: s.schedule_month,
          schedule_year: s.schedule_year,
          day_of_week: s.day_of_week,
          shift_number: s.shift_number,
          start_time: s.start_time,
          end_time: s.end_time,
          start_time_2: s.start_time_2,
          end_time_2: s.end_time_2,
          break_start: s.break_start,
          break_end: s.break_end,
          is_day_off: s.is_day_off ?? false,
          work_position: s.work_position,
          created_at: now,
          updated_at: now,
        });
        ids.push(id);
      }
    }

    res.json({ message: 'Schedules saved', count: ids.length });
  } catch (err) {
    next(err);
  }
});

router.delete('/schedules/:id', requireAuth, async (req, res, next) => {
  try {
    await db.delete(employee_schedules).where(eq(employee_schedules.id, req.params.id));
    res.json({ message: 'Schedule deleted' });
  } catch (err) {
    next(err);
  }
});

router.post('/schedules/publish', requireAuth, async (req, res, next) => {
  try {
    const { branch_id, month, year } = req.body;
    if (!branch_id || !month || !year) {
      throw new AppError(400, 'branch_id, month, and year are required');
    }

    const now = new Date().toISOString();
    await db.update(employee_schedules).set({
      published_at: now,
      published_by: req.user!.userId,
      updated_at: now,
    }).where(and(
      eq(employee_schedules.branch_id, branch_id),
      eq(employee_schedules.schedule_month, Number(month)),
      eq(employee_schedules.schedule_year, Number(year)),
    ));

    res.json({ message: 'Schedules published' });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// SCHEDULE REQUESTS
// ============================================================================

router.get('/schedule-requests/:branchId', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(schedule_requests)
      .where(eq(schedule_requests.branch_id, req.params.branchId))
      .orderBy(desc(schedule_requests.created_at));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/schedule-requests', requireAuth, async (req, res, next) => {
  try {
    const { branch_id, request_type, start_date, end_date, reason } = req.body;
    if (!branch_id || !request_type) {
      throw new AppError(400, 'branch_id and request_type are required');
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(schedule_requests).values({
      id, employee_id: req.user!.userId, branch_id, request_type,
      start_date, end_date, reason, status: 'pending',
      created_at: now, updated_at: now,
    });
    const row = await db.select().from(schedule_requests).where(eq(schedule_requests.id, id)).get();
    res.status(201).json({ data: row });
  } catch (err) {
    next(err);
  }
});

router.put('/schedule-requests/:id', requireAuth, async (req, res, next) => {
  try {
    const { status, review_notes } = req.body;
    if (!status) throw new AppError(400, 'status is required');

    const now = new Date().toISOString();
    await db.update(schedule_requests).set({
      status,
      reviewed_by: req.user!.userId,
      reviewed_at: now,
      review_notes,
      updated_at: now,
    }).where(eq(schedule_requests.id, req.params.id));
    const row = await db.select().from(schedule_requests)
      .where(eq(schedule_requests.id, req.params.id)).get();
    if (!row) throw new AppError(404, 'Schedule request not found');
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// WARNINGS
// ============================================================================

router.get('/warnings/:branchId', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(warnings)
      .where(eq(warnings.branch_id, req.params.branchId))
      .orderBy(desc(warnings.created_at));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/warnings', requireAuth, async (req, res, next) => {
  try {
    const {
      user_id, branch_id, warning_type, severity,
      description, issued_date, notes, expiry_date,
    } = req.body;
    if (!user_id || !branch_id) {
      throw new AppError(400, 'user_id and branch_id are required');
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(warnings).values({
      id, user_id, branch_id, warning_type, severity, description,
      issued_by: req.user!.userId,
      issued_date: issued_date ?? now.slice(0, 10),
      status: 'active', notes, expiry_date,
      created_at: now, updated_at: now,
    });
    const row = await db.select().from(warnings).where(eq(warnings.id, id)).get();
    res.status(201).json({ data: row });
  } catch (err) {
    next(err);
  }
});

router.put('/warnings/:id', requireAuth, async (req, res, next) => {
  try {
    const { status, acknowledgement_date, acknowledgement_signature_url, notes } = req.body;
    const now = new Date().toISOString();
    await db.update(warnings).set({
      ...(status !== undefined && { status }),
      ...(acknowledgement_date !== undefined && { acknowledgement_date }),
      ...(acknowledgement_signature_url !== undefined && { acknowledgement_signature_url }),
      ...(notes !== undefined && { notes }),
      updated_at: now,
    }).where(eq(warnings.id, req.params.id));
    const row = await db.select().from(warnings).where(eq(warnings.id, req.params.id)).get();
    if (!row) throw new AppError(404, 'Warning not found');
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// SALARY ADVANCES
// ============================================================================

router.get('/advances/:branchId', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(salary_advances)
      .where(eq(salary_advances.branch_id, req.params.branchId))
      .orderBy(desc(salary_advances.created_at));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/advances', requireAuth, async (req, res, next) => {
  try {
    const {
      user_id, branch_id, amount, advance_date, reason,
      payment_method, reference, notes,
    } = req.body;
    if (!user_id || !branch_id || amount === undefined) {
      throw new AppError(400, 'user_id, branch_id, and amount are required');
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(salary_advances).values({
      id, user_id, branch_id, amount,
      advance_date: advance_date ?? now.slice(0, 10),
      reason, status: 'pending', payment_method, reference,
      notes, created_by: req.user!.userId,
      created_at: now, updated_at: now,
    });
    const row = await db.select().from(salary_advances).where(eq(salary_advances.id, id)).get();
    res.status(201).json({ data: row });
  } catch (err) {
    next(err);
  }
});

router.put('/advances/:id', requireAuth, async (req, res, next) => {
  try {
    const { status, rejected_reason, payment_method, reference, notes } = req.body;
    if (!status) throw new AppError(400, 'status is required');

    const now = new Date().toISOString();
    const isApproval = status === 'approved';
    await db.update(salary_advances).set({
      status,
      ...(isApproval && { approved_by: req.user!.userId, approved_at: now }),
      ...(rejected_reason !== undefined && { rejected_reason }),
      ...(payment_method !== undefined && { payment_method }),
      ...(reference !== undefined && { reference }),
      ...(notes !== undefined && { notes }),
      updated_at: now,
    }).where(eq(salary_advances.id, req.params.id));
    const row = await db.select().from(salary_advances)
      .where(eq(salary_advances.id, req.params.id)).get();
    if (!row) throw new AppError(404, 'Salary advance not found');
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// EMPLOYEE DATA
// ============================================================================

router.get('/employee-data/:branchId', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(employee_data)
      .where(eq(employee_data.branch_id, req.params.branchId));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/employee-data', requireAuth, async (req, res, next) => {
  try {
    const {
      user_id, branch_id, alias, dni, cuil, birth_date,
      personal_address, emergency_contact, emergency_phone,
      hire_date, hourly_rate, monthly_hours_target, registered_hours,
      bank_name, cbu, internal_notes,
    } = req.body;
    if (!user_id || !branch_id) {
      throw new AppError(400, 'user_id and branch_id are required');
    }

    const now = new Date().toISOString();
    const existing = await db.select().from(employee_data)
      .where(and(
        eq(employee_data.user_id, user_id),
        eq(employee_data.branch_id, branch_id),
      )).get();

    if (existing) {
      await db.update(employee_data).set({
        ...(alias !== undefined && { alias }),
        ...(dni !== undefined && { dni }),
        ...(cuil !== undefined && { cuil }),
        ...(birth_date !== undefined && { birth_date }),
        ...(personal_address !== undefined && { personal_address }),
        ...(emergency_contact !== undefined && { emergency_contact }),
        ...(emergency_phone !== undefined && { emergency_phone }),
        ...(hire_date !== undefined && { hire_date }),
        ...(hourly_rate !== undefined && { hourly_rate }),
        ...(monthly_hours_target !== undefined && { monthly_hours_target }),
        ...(registered_hours !== undefined && { registered_hours }),
        ...(bank_name !== undefined && { bank_name }),
        ...(cbu !== undefined && { cbu }),
        ...(internal_notes !== undefined && { internal_notes }),
        updated_at: now,
      }).where(eq(employee_data.id, existing.id));
      const row = await db.select().from(employee_data).where(eq(employee_data.id, existing.id)).get();
      res.json({ data: row });
    } else {
      const id = crypto.randomUUID();
      await db.insert(employee_data).values({
        id, user_id, branch_id, alias, dni, cuil, birth_date,
        personal_address, emergency_contact, emergency_phone,
        hire_date, hourly_rate, monthly_hours_target, registered_hours,
        bank_name, cbu, internal_notes,
        created_at: now, updated_at: now,
      });
      const row = await db.select().from(employee_data).where(eq(employee_data.id, id)).get();
      res.status(201).json({ data: row });
    }
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// SPECIAL DAYS (HOLIDAYS)
// ============================================================================

router.get('/special-days', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(special_days).orderBy(special_days.date);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/special-days', requireAuth, async (req, res, next) => {
  try {
    const { date, name, type, is_recurring, applies_to_branches } = req.body;
    if (!date || !name) throw new AppError(400, 'date and name are required');

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(special_days).values({
      id, date, name, type, is_recurring, applies_to_branches,
      created_by: req.user!.userId, created_at: now,
    });
    const row = await db.select().from(special_days).where(eq(special_days.id, id)).get();
    res.status(201).json({ data: row });
  } catch (err) {
    next(err);
  }
});

router.delete('/special-days/:id', requireAuth, async (req, res, next) => {
  try {
    await db.delete(special_days).where(eq(special_days.id, req.params.id));
    res.json({ message: 'Special day deleted' });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// WORK POSITIONS
// ============================================================================

router.get('/work-positions/:branchId', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(work_positions)
      .where(eq(work_positions.branch_id, req.params.branchId))
      .orderBy(work_positions.sort_order);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/work-positions', requireAuth, async (req, res, next) => {
  try {
    const { name, type, branch_id, sort_order } = req.body;
    if (!name || !branch_id) throw new AppError(400, 'name and branch_id are required');

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(work_positions).values({
      id, name, type, branch_id, is_active: true, sort_order,
      created_at: now,
    });
    const row = await db.select().from(work_positions).where(eq(work_positions.id, id)).get();
    res.status(201).json({ data: row });
  } catch (err) {
    next(err);
  }
});

router.put('/work-positions/:id', requireAuth, async (req, res, next) => {
  try {
    const { name, type, sort_order, is_active } = req.body;
    await db.update(work_positions).set({
      ...(name !== undefined && { name }),
      ...(type !== undefined && { type }),
      ...(sort_order !== undefined && { sort_order }),
      ...(is_active !== undefined && { is_active }),
    }).where(eq(work_positions.id, req.params.id));
    const row = await db.select().from(work_positions).where(eq(work_positions.id, req.params.id)).get();
    if (!row) throw new AppError(404, 'Work position not found');
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
});

export { router as hrRoutes };

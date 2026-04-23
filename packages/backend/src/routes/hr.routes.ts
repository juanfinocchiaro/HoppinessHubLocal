import { Router } from 'express';
import { db } from '../db/connection.js';
import * as schema from '../db/schema.js';
import { eq, and, gte, lte, inArray, desc, asc, isNull, sql } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_ROOT = path.resolve(__dirname, '../../data/uploads');

const router = Router();

// ============================================================================
// CLOCK ENTRIES
// ============================================================================

router.get('/clock-entries', requireAuth, async (req, res, next) => {
  try {
    const { branchId, startDate, endDate } = req.query as Record<string, string>;
    if (!branchId) throw new AppError(400, 'branchId is required');

    const conditions = [eq(schema.clock_entries.branch_id, branchId)];
    if (startDate) conditions.push(gte(schema.clock_entries.work_date, startDate));
    if (endDate) conditions.push(lte(schema.clock_entries.work_date, endDate));

    const rows = await db.select().from(schema.clock_entries)
      .where(and(...conditions))
      .orderBy(desc(schema.clock_entries.created_at));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/clock-entries/raw', requireAuth, async (req, res, next) => {
  try {
    const { branchId, workDate } = req.query as Record<string, string>;
    if (!branchId || !workDate) throw new AppError(400, 'branchId and workDate are required');

    const rows = await db.select().from(schema.clock_entries)
      .where(and(
        eq(schema.clock_entries.branch_id, branchId),
        eq(schema.clock_entries.work_date, workDate),
      ))
      .orderBy(asc(schema.clock_entries.created_at));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/clock-entries/last', requireAuth, async (req, res, next) => {
  try {
    const { userId, branchId } = req.query as Record<string, string>;
    if (!userId || !branchId) throw new AppError(400, 'userId and branchId are required');

    const row = await db.select().from(schema.clock_entries)
      .where(and(
        eq(schema.clock_entries.user_id, userId),
        eq(schema.clock_entries.branch_id, branchId),
      ))
      .orderBy(desc(schema.clock_entries.created_at))
      .limit(1)
      .get();
    res.json({ data: row ?? null });
  } catch (err) { next(err); }
});

router.get('/clock-entries/employee-month', requireAuth, async (req, res, next) => {
  try {
    const { userId, branchId, startIso, endIso } = req.query as Record<string, string>;
    if (!userId || !branchId) throw new AppError(400, 'userId and branchId are required');

    const conditions = [
      eq(schema.clock_entries.user_id, userId),
      eq(schema.clock_entries.branch_id, branchId),
    ];
    if (startIso) conditions.push(gte(schema.clock_entries.created_at, startIso));
    if (endIso) conditions.push(lte(schema.clock_entries.created_at, endIso));

    const rows = await db.select().from(schema.clock_entries)
      .where(and(...conditions))
      .orderBy(asc(schema.clock_entries.created_at));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/clock-entries/mine', requireAuth, async (req, res, next) => {
  try {
    const { userId, startIso, endIso } = req.query as Record<string, string>;
    if (!userId) throw new AppError(400, 'userId is required');

    const conditions = [eq(schema.clock_entries.user_id, userId)];
    if (startIso) conditions.push(gte(schema.clock_entries.created_at, startIso));
    if (endIso) conditions.push(lte(schema.clock_entries.created_at, endIso));

    const rows = await db.select().from(schema.clock_entries)
      .where(and(...conditions))
      .orderBy(asc(schema.clock_entries.created_at));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/clock-entries/manual', requireAuth, async (req, res, next) => {
  try {
    const { branchId, userId, entryType, timestamp, reason, managerId, earlyLeaveAuthorized, workDate } = req.body;
    if (!branchId || !userId || !entryType || !timestamp) {
      throw new AppError(400, 'branchId, userId, entryType, and timestamp are required');
    }

    const id = crypto.randomUUID();
    const effectiveWorkDate = workDate ?? timestamp.slice(0, 10);

    await db.insert(schema.clock_entries).values({
      id,
      user_id: userId,
      branch_id: branchId,
      entry_type: entryType,
      created_at: timestamp,
      is_manual: true,
      manual_by: managerId ?? req.user!.userId,
      manual_reason: reason ?? 'Manual entry',
      work_date: effectiveWorkDate,
      early_leave_authorized: earlyLeaveAuthorized ?? false,
    });

    const newState = entryType === 'clock_in' ? 'working' : 'off';
    const existing = await db.select().from(schema.employee_time_state)
      .where(eq(schema.employee_time_state.employee_id, userId)).get();

    if (existing) {
      await db.update(schema.employee_time_state).set({
        branch_id: branchId,
        current_state: newState,
        last_event_id: id,
        ...(entryType === 'clock_in' ? { open_clock_in_id: id } : { open_clock_in_id: null }),
        last_updated: new Date().toISOString(),
      }).where(eq(schema.employee_time_state.employee_id, userId));
    } else {
      await db.insert(schema.employee_time_state).values({
        employee_id: userId,
        branch_id: branchId,
        current_state: newState,
        last_event_id: id,
        open_clock_in_id: entryType === 'clock_in' ? id : null,
        last_updated: new Date().toISOString(),
      });
    }

    const row = await db.select().from(schema.clock_entries).where(eq(schema.clock_entries.id, id)).get();
    res.status(201).json({ data: row });
  } catch (err) { next(err); }
});

router.post('/clock-entries/next-day-outs', requireAuth, async (req, res, next) => {
  try {
    const { branchId, userIds, afterIso, beforeIso } = req.body;
    if (!branchId || !userIds?.length) return res.json({ data: [] });

    const conditions = [
      eq(schema.clock_entries.branch_id, branchId),
      eq(schema.clock_entries.entry_type, 'clock_out'),
      inArray(schema.clock_entries.user_id, userIds),
    ];
    if (afterIso) conditions.push(gte(schema.clock_entries.created_at, afterIso));
    if (beforeIso) conditions.push(lte(schema.clock_entries.created_at, beforeIso));

    const rows = await db.select().from(schema.clock_entries)
      .where(and(...conditions))
      .orderBy(asc(schema.clock_entries.created_at));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.put('/clock-entries/:entryId', requireAuth, async (req, res, next) => {
  try {
    const { entryId } = req.params;
    const existing = await db.select().from(schema.clock_entries)
      .where(eq(schema.clock_entries.id, entryId)).get();
    if (!existing) throw new AppError(404, 'Clock entry not found');

    const { patch, managerId, originalCreatedAt } = req.body;
    const updates: Record<string, unknown> = {
      is_manual: true,
      manual_by: managerId ?? req.user!.userId,
      manual_reason: patch?.reason ?? 'Manual edit',
    };
    if (patch?.entry_type !== undefined) updates.entry_type = patch.entry_type;
    if (patch?.created_at !== undefined) updates.created_at = patch.created_at;
    if (patch?.work_date !== undefined) updates.work_date = patch.work_date;
    if (patch?.schedule_id !== undefined) updates.schedule_id = patch.schedule_id;
    if (patch?.early_leave_authorized !== undefined) updates.early_leave_authorized = patch.early_leave_authorized;
    if (originalCreatedAt) updates.original_created_at = originalCreatedAt;

    await db.update(schema.clock_entries).set(updates).where(eq(schema.clock_entries.id, entryId));

    const row = await db.select().from(schema.clock_entries).where(eq(schema.clock_entries.id, entryId)).get();
    res.json({ data: row });
  } catch (err) { next(err); }
});

router.delete('/clock-entries/:entryId', requireAuth, async (req, res, next) => {
  try {
    await db.delete(schema.clock_entries).where(eq(schema.clock_entries.id, req.params.entryId));
    res.json({ message: 'Clock entry deleted' });
  } catch (err) { next(err); }
});

// ============================================================================
// CLOCK FLOW (fichaje)
// ============================================================================

router.post('/clock/branch', requireAuth, async (req, res, next) => {
  try {
    const { clockCode } = req.body;
    if (!clockCode) throw new AppError(400, 'clockCode is required');

    const branch = await db.select().from(schema.branches)
      .where(eq(schema.branches.clock_code, clockCode)).get();
    if (!branch) throw new AppError(404, 'Branch not found for this clock code');
    res.json({ data: branch });
  } catch (err) { next(err); }
});

router.post('/clock/validate-pin', requireAuth, async (req, res, next) => {
  try {
    const { branchCode, pin } = req.body;
    if (!branchCode || !pin) throw new AppError(400, 'branchCode and pin are required');

    const branch = await db.select().from(schema.branches)
      .where(eq(schema.branches.clock_code, branchCode)).get();
    if (!branch) throw new AppError(404, 'Branch not found');

    const assignments = await db.select({
      user_id: schema.user_role_assignments.user_id,
      clock_pin: schema.user_role_assignments.clock_pin,
    }).from(schema.user_role_assignments)
      .where(and(
        eq(schema.user_role_assignments.branch_id, branch.id),
        eq(schema.user_role_assignments.is_active, true),
      ));

    const match = assignments.find(a => a.clock_pin === pin);
    if (!match) {
      const profileMatch = await db.select({
        id: schema.profiles.id,
        clock_pin: schema.profiles.clock_pin,
      }).from(schema.profiles)
        .where(eq(schema.profiles.clock_pin, pin)).get();

      if (profileMatch) {
        const hasRole = assignments.find(a => a.user_id === profileMatch.id);
        if (hasRole) {
          const profile = await db.select().from(schema.profiles)
            .where(eq(schema.profiles.id, profileMatch.id)).get();
          return res.json({ data: { user_id: profileMatch.id, full_name: profile?.full_name } });
        }
      }
      throw new AppError(401, 'Invalid PIN');
    }

    const profile = await db.select().from(schema.profiles)
      .where(eq(schema.profiles.id, match.user_id)).get();

    res.json({ data: { user_id: match.user_id, full_name: profile?.full_name } });
  } catch (err) { next(err); }
});

router.post('/clock/validate-manager-pin', requireAuth, async (req, res, next) => {
  try {
    const { branchCode, pin } = req.body;
    if (!branchCode || !pin) throw new AppError(400, 'branchCode and pin are required');

    const branch = await db.select().from(schema.branches)
      .where(eq(schema.branches.clock_code, branchCode)).get();
    if (!branch) throw new AppError(404, 'Branch not found');

    const managerRoles = await db.select({ id: schema.roles.id }).from(schema.roles)
      .where(inArray(schema.roles.key, ['encargado', 'administrador', 'franquiciado']));
    const managerRoleIds = managerRoles.map(r => r.id);
    if (managerRoleIds.length === 0) return res.json({ data: null });

    const assignments = await db.select().from(schema.user_role_assignments)
      .where(and(
        eq(schema.user_role_assignments.branch_id, branch.id),
        eq(schema.user_role_assignments.is_active, true),
        inArray(schema.user_role_assignments.role_id, managerRoleIds),
      ));

    const match = assignments.find(a => a.clock_pin === pin);
    if (!match) {
      for (const a of assignments) {
        const profile = await db.select().from(schema.profiles)
          .where(and(eq(schema.profiles.id, a.user_id), eq(schema.profiles.clock_pin, pin))).get();
        if (profile) {
          return res.json({ data: { user_id: profile.id, full_name: profile.full_name } });
        }
      }
      return res.json({ data: null });
    }

    const profile = await db.select().from(schema.profiles)
      .where(eq(schema.profiles.id, match.user_id)).get();
    res.json({ data: { user_id: match.user_id, full_name: profile?.full_name } });
  } catch (err) { next(err); }
});

// ============================================================================
// SCHEDULES
// ============================================================================

router.get('/schedules/day', requireAuth, async (req, res, next) => {
  try {
    const { branchId, date } = req.query as Record<string, string>;
    if (!branchId || !date) throw new AppError(400, 'branchId and date are required');

    const rows = await db.select().from(schema.employee_schedules)
      .where(and(
        eq(schema.employee_schedules.branch_id, branchId),
        eq(schema.employee_schedules.schedule_date, date),
      ));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/schedules/branch/:branchId', requireAuth, async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const { startDate, endDate } = req.query as Record<string, string>;

    const conditions = [eq(schema.employee_schedules.branch_id, branchId)];
    if (startDate) conditions.push(gte(schema.employee_schedules.schedule_date, startDate));
    if (endDate) conditions.push(lte(schema.employee_schedules.schedule_date, endDate));

    const rows = await db.select().from(schema.employee_schedules)
      .where(and(...conditions))
      .orderBy(asc(schema.employee_schedules.schedule_date));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/schedules/branch/:branchId/range', requireAuth, async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const { startDate, endDate } = req.query as Record<string, string>;

    const conditions = [eq(schema.employee_schedules.branch_id, branchId)];
    if (startDate) conditions.push(gte(schema.employee_schedules.schedule_date, startDate));
    if (endDate) conditions.push(lte(schema.employee_schedules.schedule_date, endDate));

    const rows = await db.select().from(schema.employee_schedules)
      .where(and(...conditions))
      .orderBy(asc(schema.employee_schedules.schedule_date));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/schedules/user/:userId/has-published', requireAuth, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query as Record<string, string>;

    const conditions = [
      eq(schema.employee_schedules.user_id, userId),
      sql`${schema.employee_schedules.published_at} IS NOT NULL`,
    ];
    if (startDate) conditions.push(gte(schema.employee_schedules.schedule_date, startDate));
    if (endDate) conditions.push(lte(schema.employee_schedules.schedule_date, endDate));

    const row = await db.select().from(schema.employee_schedules)
      .where(and(...conditions)).limit(1).get();
    res.json({ data: !!row });
  } catch (err) { next(err); }
});

router.get('/schedules/user/:userId/mine', requireAuth, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query as Record<string, string>;

    const conditions = [
      eq(schema.employee_schedules.user_id, userId),
      sql`${schema.employee_schedules.published_at} IS NOT NULL`,
    ];
    if (startDate) conditions.push(gte(schema.employee_schedules.schedule_date, startDate));
    if (endDate) conditions.push(lte(schema.employee_schedules.schedule_date, endDate));

    const rows = await db.select().from(schema.employee_schedules)
      .where(and(...conditions))
      .orderBy(asc(schema.employee_schedules.schedule_date));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/schedules/user/:userId/branch/:branchId', requireAuth, async (req, res, next) => {
  try {
    const { userId, branchId } = req.params;
    const { startDate, endDate } = req.query as Record<string, string>;

    const conditions = [
      eq(schema.employee_schedules.user_id, userId),
      eq(schema.employee_schedules.branch_id, branchId),
    ];
    if (startDate) conditions.push(gte(schema.employee_schedules.schedule_date, startDate));
    if (endDate) conditions.push(lte(schema.employee_schedules.schedule_date, endDate));

    const rows = await db.select().from(schema.employee_schedules)
      .where(and(...conditions))
      .orderBy(asc(schema.employee_schedules.schedule_date));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/schedules/user/:userId', requireAuth, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query as Record<string, string>;

    const conditions = [eq(schema.employee_schedules.user_id, userId)];
    if (startDate) conditions.push(gte(schema.employee_schedules.schedule_date, startDate));
    if (endDate) conditions.push(lte(schema.employee_schedules.schedule_date, endDate));

    const rows = await db.select().from(schema.employee_schedules)
      .where(and(...conditions))
      .orderBy(asc(schema.employee_schedules.schedule_date));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/schedules/batch', requireAuth, async (req, res, next) => {
  try {
    const { records } = req.body;
    if (!Array.isArray(records)) throw new AppError(400, 'records must be an array');

    const now = new Date().toISOString();
    let count = 0;

    for (const r of records) {
      if (r.id) {
        const { id: _id, ...updates } = r;
        await db.update(schema.employee_schedules)
          .set({ ...updates, updated_at: now })
          .where(eq(schema.employee_schedules.id, r.id));
      } else {
        await db.insert(schema.employee_schedules).values({
          id: crypto.randomUUID(),
          ...r,
          created_at: now,
          updated_at: now,
        });
      }
      count++;
    }
    res.json({ data: { count } });
  } catch (err) { next(err); }
});

router.post('/schedules/batch-delete', requireAuth, async (req, res, next) => {
  try {
    const { entries } = req.body;
    if (!Array.isArray(entries)) throw new AppError(400, 'entries must be an array');

    let count = 0;
    for (const e of entries) {
      await db.delete(schema.employee_schedules)
        .where(and(
          eq(schema.employee_schedules.user_id, e.userId),
          eq(schema.employee_schedules.schedule_date, e.date),
          eq(schema.employee_schedules.branch_id, e.branchId),
        ));
      count++;
    }
    res.json({ data: { count } });
  } catch (err) { next(err); }
});

router.post('/schedules/notify', requireAuth, async (_req, res, next) => {
  try {
    res.json({ data: { success: true } });
  } catch (err) { next(err); }
});

router.post('/schedules/notify-communication', requireAuth, async (req, res, next) => {
  try {
    const { title, body, branch_id, user_id, sender_id } = req.body;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(schema.communications).values({
      id,
      title,
      body,
      type: 'schedule_notification',
      source_type: 'local',
      source_branch_id: branch_id,
      target_branch_ids: JSON.stringify([branch_id]),
      created_by: sender_id ?? req.user!.userId,
      is_published: true,
      published_at: now,
      created_at: now,
      updated_at: now,
    });

    res.json({ data: { id } });
  } catch (err) { next(err); }
});

router.post('/schedules/notify-email', requireAuth, async (_req, res, next) => {
  try {
    res.json({ data: { success: true } });
  } catch (err) { next(err); }
});

router.post('/schedules/notify-bulk', requireAuth, async (_req, res, next) => {
  try {
    res.json({ data: { success: true } });
  } catch (err) { next(err); }
});

router.post('/schedules', requireAuth, async (req, res, next) => {
  try {
    const { records } = req.body;
    if (!Array.isArray(records)) throw new AppError(400, 'records must be an array');

    const now = new Date().toISOString();
    const ids: string[] = [];

    for (const r of records) {
      const id = r.id ?? crypto.randomUUID();
      if (r.id) {
        const { id: _id, ...updates } = r;
        await db.update(schema.employee_schedules)
          .set({ ...updates, updated_at: now })
          .where(eq(schema.employee_schedules.id, r.id));
      } else {
        await db.insert(schema.employee_schedules).values({
          id,
          ...r,
          created_at: now,
          updated_at: now,
        });
      }
      ids.push(id);
    }
    res.json({ data: { count: ids.length } });
  } catch (err) { next(err); }
});

router.get('/schedules/:scheduleId', requireAuth, async (req, res, next) => {
  try {
    const row = await db.select().from(schema.employee_schedules)
      .where(eq(schema.employee_schedules.id, req.params.scheduleId)).get();
    if (!row) throw new AppError(404, 'Schedule not found');
    res.json({ data: row });
  } catch (err) { next(err); }
});

router.put('/schedules/:scheduleId', requireAuth, async (req, res, next) => {
  try {
    const { scheduleId } = req.params;
    const existing = await db.select().from(schema.employee_schedules)
      .where(eq(schema.employee_schedules.id, scheduleId)).get();
    if (!existing) throw new AppError(404, 'Schedule not found');

    await db.update(schema.employee_schedules)
      .set({ ...req.body, updated_at: new Date().toISOString() })
      .where(eq(schema.employee_schedules.id, scheduleId));

    const row = await db.select().from(schema.employee_schedules)
      .where(eq(schema.employee_schedules.id, scheduleId)).get();
    res.json({ data: row });
  } catch (err) { next(err); }
});

router.delete('/schedules/user/:userId/branch/:branchId', requireAuth, async (req, res, next) => {
  try {
    const { userId, branchId } = req.params;
    const { startDate, endDate } = (req.query as Record<string, string>) ?? {};

    const conditions = [
      eq(schema.employee_schedules.user_id, userId),
      eq(schema.employee_schedules.branch_id, branchId),
    ];
    if (startDate) conditions.push(gte(schema.employee_schedules.schedule_date, startDate));
    if (endDate) conditions.push(lte(schema.employee_schedules.schedule_date, endDate));

    await db.delete(schema.employee_schedules).where(and(...conditions));
    res.json({ message: 'Schedules deleted' });
  } catch (err) { next(err); }
});

router.delete('/schedules/user/:userId', requireAuth, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.body ?? {};

    const conditions = [eq(schema.employee_schedules.user_id, userId)];
    if (startDate) conditions.push(gte(schema.employee_schedules.schedule_date, startDate));
    if (endDate) conditions.push(lte(schema.employee_schedules.schedule_date, endDate));

    await db.delete(schema.employee_schedules).where(and(...conditions));
    res.json({ message: 'Schedules deleted' });
  } catch (err) { next(err); }
});

router.get('/schedules', requireAuth, async (req, res, next) => {
  try {
    const { branchId, startDate, endDate } = req.query as Record<string, string>;
    if (!branchId) throw new AppError(400, 'branchId is required');

    const conditions = [eq(schema.employee_schedules.branch_id, branchId)];
    if (startDate) conditions.push(gte(schema.employee_schedules.schedule_date, startDate));
    if (endDate) conditions.push(lte(schema.employee_schedules.schedule_date, endDate));

    const rows = await db.select().from(schema.employee_schedules)
      .where(and(...conditions))
      .orderBy(asc(schema.employee_schedules.schedule_date));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

// ============================================================================
// SCHEDULE REQUESTS
// ============================================================================

router.get('/schedule-requests/day', requireAuth, async (req, res, next) => {
  try {
    const { branchId, date } = req.query as Record<string, string>;
    if (!branchId || !date) throw new AppError(400, 'branchId and date are required');

    const rows = await db.select().from(schema.schedule_requests)
      .where(and(
        eq(schema.schedule_requests.branch_id, branchId),
        eq(schema.schedule_requests.request_date, date),
      ))
      .orderBy(desc(schema.schedule_requests.created_at));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/schedule-requests/branch/:branchId/pending', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(schema.schedule_requests)
      .where(and(
        eq(schema.schedule_requests.branch_id, req.params.branchId),
        eq(schema.schedule_requests.status, 'pending'),
      ))
      .orderBy(desc(schema.schedule_requests.created_at));

    const userIds = [...new Set(rows.map(r => r.user_id).filter(Boolean))] as string[];
    let profileMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const profiles = await db.select({ id: schema.profiles.id, full_name: schema.profiles.full_name })
        .from(schema.profiles).where(inArray(schema.profiles.id, userIds));
      profileMap = Object.fromEntries(profiles.map(p => [p.id, p.full_name]));
    }

    const enriched = rows.map(r => ({ ...r, full_name: profileMap[r.user_id!] ?? null }));
    res.json({ data: enriched });
  } catch (err) { next(err); }
});

router.get('/schedule-requests/branch/:branchId', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(schema.schedule_requests)
      .where(eq(schema.schedule_requests.branch_id, req.params.branchId))
      .orderBy(desc(schema.schedule_requests.created_at));

    const userIds = [...new Set(rows.map(r => r.user_id).filter(Boolean))] as string[];
    let profileMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const profiles = await db.select({ id: schema.profiles.id, full_name: schema.profiles.full_name })
        .from(schema.profiles).where(inArray(schema.profiles.id, userIds));
      profileMap = Object.fromEntries(profiles.map(p => [p.id, p.full_name]));
    }

    const enriched = rows.map(r => ({ ...r, full_name: profileMap[r.user_id!] ?? null }));
    res.json({ data: enriched });
  } catch (err) { next(err); }
});

router.get('/schedule-requests/user/:userId/recent', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(schema.schedule_requests)
      .where(eq(schema.schedule_requests.user_id, req.params.userId))
      .orderBy(desc(schema.schedule_requests.created_at))
      .limit(20);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/schedule-requests/user/:userId', requireAuth, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query as Record<string, string>;

    const conditions = [eq(schema.schedule_requests.user_id, userId)];
    if (startDate) conditions.push(gte(schema.schedule_requests.request_date, startDate));
    if (endDate) conditions.push(lte(schema.schedule_requests.request_date, endDate));

    const rows = await db.select().from(schema.schedule_requests)
      .where(and(...conditions))
      .orderBy(desc(schema.schedule_requests.created_at));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/schedule-requests/leave', requireAuth, async (req, res, next) => {
  try {
    const { branchId, userId, date, requestType, reason, respondedBy } = req.body;
    if (!branchId || !userId || !date || !requestType) {
      throw new AppError(400, 'branchId, userId, date, and requestType are required');
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(schema.schedule_requests).values({
      id,
      branch_id: branchId,
      user_id: userId,
      request_type: requestType,
      request_date: date,
      reason: reason ?? null,
      status: 'approved',
      responded_by: respondedBy ?? req.user!.userId,
      responded_at: now,
      created_at: now,
    });

    const row = await db.select().from(schema.schedule_requests).where(eq(schema.schedule_requests.id, id)).get();
    res.status(201).json({ data: row });
  } catch (err) { next(err); }
});

router.post('/schedule-requests/:requestId/respond', requireAuth, async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const { status, respondedBy, note } = req.body;
    if (!status) throw new AppError(400, 'status is required');

    const now = new Date().toISOString();
    await db.update(schema.schedule_requests).set({
      status,
      responded_by: respondedBy ?? req.user!.userId,
      responded_at: now,
      response_note: note ?? null,
    }).where(eq(schema.schedule_requests.id, requestId));

    const row = await db.select().from(schema.schedule_requests)
      .where(eq(schema.schedule_requests.id, requestId)).get();
    if (!row) throw new AppError(404, 'Schedule request not found');
    res.json({ data: row });
  } catch (err) { next(err); }
});

router.post('/schedule-requests', requireAuth, async (req, res, next) => {
  try {
    const { user_id, branch_id, request_type, request_date, reason, status, evidence_url, absence_type } = req.body;
    if (!branch_id || !request_type || !request_date) {
      throw new AppError(400, 'branch_id, request_type, and request_date are required');
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(schema.schedule_requests).values({
      id,
      user_id: user_id ?? req.user!.userId,
      branch_id,
      request_type,
      request_date,
      reason: reason ?? null,
      status: status ?? 'pending',
      evidence_url: evidence_url ?? null,
      absence_type: absence_type ?? null,
      created_at: now,
    });

    const row = await db.select().from(schema.schedule_requests).where(eq(schema.schedule_requests.id, id)).get();
    res.status(201).json({ data: row });
  } catch (err) { next(err); }
});

router.put('/schedule-requests/:requestId', requireAuth, async (req, res, next) => {
  try {
    const { requestId } = req.params;
    await db.update(schema.schedule_requests)
      .set(req.body)
      .where(eq(schema.schedule_requests.id, requestId));

    const row = await db.select().from(schema.schedule_requests)
      .where(eq(schema.schedule_requests.id, requestId)).get();
    if (!row) throw new AppError(404, 'Schedule request not found');
    res.json({ data: row });
  } catch (err) { next(err); }
});

// ============================================================================
// SHIFT CLOSURES
// ============================================================================

router.get('/shift-closures/branch/:branchId/range', requireAuth, async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const { from, to } = req.query as Record<string, string>;

    const conditions = [eq(schema.shift_closures.branch_id, branchId)];
    if (from) conditions.push(gte(schema.shift_closures.date, from));
    if (to) conditions.push(lte(schema.shift_closures.date, to));

    const rows = await db.select().from(schema.shift_closures)
      .where(and(...conditions))
      .orderBy(asc(schema.shift_closures.date));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/shift-closures/branch/:branchId/single', requireAuth, async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const { date, shift } = req.query as Record<string, string>;
    if (!date || !shift) throw new AppError(400, 'date and shift are required');

    const row = await db.select().from(schema.shift_closures)
      .where(and(
        eq(schema.shift_closures.branch_id, branchId),
        eq(schema.shift_closures.date, date),
        eq(schema.shift_closures.shift, shift),
      )).get();
    res.json({ data: row ?? null });
  } catch (err) { next(err); }
});

router.get('/shift-closures/branch/:branchId', requireAuth, async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const { date } = req.query as Record<string, string>;
    if (!date) throw new AppError(400, 'date is required');

    const rows = await db.select().from(schema.shift_closures)
      .where(and(
        eq(schema.shift_closures.branch_id, branchId),
        eq(schema.shift_closures.date, date),
      ));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/shift-closures', requireAuth, async (req, res, next) => {
  try {
    const { from, to } = req.query as Record<string, string>;
    const conditions: ReturnType<typeof eq>[] = [];
    if (from) conditions.push(gte(schema.shift_closures.date, from));
    if (to) conditions.push(lte(schema.shift_closures.date, to));

    const rows = conditions.length > 0
      ? await db.select().from(schema.shift_closures).where(and(...conditions)).orderBy(asc(schema.shift_closures.date))
      : await db.select().from(schema.shift_closures).orderBy(asc(schema.shift_closures.date));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/shift-closures', requireAuth, async (req, res, next) => {
  try {
    const data = req.body;
    const { branch_id, date, shift } = data;
    if (!branch_id || !date || !shift) throw new AppError(400, 'branch_id, date, and shift are required');

    const existing = await db.select().from(schema.shift_closures)
      .where(and(
        eq(schema.shift_closures.branch_id, branch_id),
        eq(schema.shift_closures.date, date),
        eq(schema.shift_closures.shift, shift),
      )).get();

    const now = new Date().toISOString();
    if (existing) {
      const { id: _id, ...updates } = data;
      await db.update(schema.shift_closures)
        .set({ ...updates, updated_at: now, updated_by: req.user!.userId })
        .where(eq(schema.shift_closures.id, existing.id));
      const row = await db.select().from(schema.shift_closures).where(eq(schema.shift_closures.id, existing.id)).get();
      return res.json({ data: row });
    }

    const id = crypto.randomUUID();
    await db.insert(schema.shift_closures).values({
      ...data,
      id,
      closed_by: req.user!.userId,
      closed_at: now,
      updated_at: now,
    });
    const row = await db.select().from(schema.shift_closures).where(eq(schema.shift_closures.id, id)).get();
    res.status(201).json({ data: row });
  } catch (err) { next(err); }
});

// ============================================================================
// SALARY ADVANCES
// ============================================================================

router.get('/salary-advances/mine', requireAuth, async (req, res, next) => {
  try {
    const { userId } = req.query as Record<string, string>;
    if (!userId) throw new AppError(400, 'userId is required');

    const rows = await db.select().from(schema.salary_advances)
      .where(sql`(${schema.salary_advances.employee_id} = ${userId} OR ${schema.salary_advances.user_id} = ${userId})`)
      .orderBy(desc(schema.salary_advances.created_at))
      .limit(10);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/salary-advances/my-full', requireAuth, async (req, res, next) => {
  try {
    const { userId } = req.query as Record<string, string>;
    if (!userId) throw new AppError(400, 'userId is required');

    const rows = await db.select().from(schema.salary_advances)
      .where(sql`(${schema.salary_advances.employee_id} = ${userId} OR ${schema.salary_advances.user_id} = ${userId})`)
      .orderBy(desc(schema.salary_advances.created_at));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/salary-advances/shift', requireAuth, async (req, res, next) => {
  try {
    const { shiftId } = req.query as Record<string, string>;
    if (!shiftId) throw new AppError(400, 'shiftId is required');

    const rows = await db.select().from(schema.salary_advances)
      .where(eq(schema.salary_advances.shift_id, shiftId))
      .orderBy(desc(schema.salary_advances.created_at));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/salary-advances/pending-transfer', requireAuth, async (req, res, next) => {
  try {
    const { branchId } = req.query as Record<string, string>;
    if (!branchId) throw new AppError(400, 'branchId is required');

    const rows = await db.select().from(schema.salary_advances)
      .where(and(
        eq(schema.salary_advances.branch_id, branchId),
        eq(schema.salary_advances.status, 'approved'),
        eq(schema.salary_advances.payment_method, 'transfer'),
        isNull(schema.salary_advances.transferred_at),
      ))
      .orderBy(desc(schema.salary_advances.created_at));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/salary-advances', requireAuth, async (req, res, next) => {
  try {
    const { branchId, selectedMonth } = req.query as Record<string, string>;
    if (!branchId) throw new AppError(400, 'branchId is required');

    const conditions = [eq(schema.salary_advances.branch_id, branchId)];
    if (selectedMonth) {
      const d = new Date(selectedMonth);
      const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString();
      conditions.push(gte(schema.salary_advances.created_at, startOfMonth));
      conditions.push(lte(schema.salary_advances.created_at, endOfMonth));
    }

    const rows = await db.select().from(schema.salary_advances)
      .where(and(...conditions))
      .orderBy(desc(schema.salary_advances.created_at));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/salary-advances/approve', requireAuth, async (req, res, next) => {
  try {
    const { advanceId, paymentMethod, shiftId } = req.body;
    if (!advanceId) throw new AppError(400, 'advanceId is required');

    const now = new Date().toISOString();
    await db.update(schema.salary_advances).set({
      status: 'approved',
      authorized_by: req.user!.userId,
      authorized_at: now,
      ...(paymentMethod && { payment_method: paymentMethod }),
      ...(shiftId && { shift_id: shiftId }),
      updated_at: now,
    }).where(eq(schema.salary_advances.id, advanceId));

    const row = await db.select().from(schema.salary_advances).where(eq(schema.salary_advances.id, advanceId)).get();
    res.json({ data: row });
  } catch (err) { next(err); }
});

router.post('/salary-advances/reject', requireAuth, async (req, res, next) => {
  try {
    const { advanceId } = req.body;
    if (!advanceId) throw new AppError(400, 'advanceId is required');

    const now = new Date().toISOString();
    await db.update(schema.salary_advances).set({
      status: 'rejected',
      authorized_by: req.user!.userId,
      authorized_at: now,
      updated_at: now,
    }).where(eq(schema.salary_advances.id, advanceId));

    const row = await db.select().from(schema.salary_advances).where(eq(schema.salary_advances.id, advanceId)).get();
    res.json({ data: row });
  } catch (err) { next(err); }
});

router.post('/salary-advances/mark-transferred', requireAuth, async (req, res, next) => {
  try {
    const { advanceId, reference } = req.body;
    if (!advanceId) throw new AppError(400, 'advanceId is required');

    const now = new Date().toISOString();
    await db.update(schema.salary_advances).set({
      transferred_by: req.user!.userId,
      transferred_at: now,
      transfer_reference: reference ?? null,
      updated_at: now,
    }).where(eq(schema.salary_advances.id, advanceId));

    const row = await db.select().from(schema.salary_advances).where(eq(schema.salary_advances.id, advanceId)).get();
    res.json({ data: row });
  } catch (err) { next(err); }
});

router.post('/salary-advances/request', requireAuth, async (req, res, next) => {
  try {
    const { branchId, amount, reason } = req.body;
    if (!branchId || amount === undefined) throw new AppError(400, 'branchId and amount are required');

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(schema.salary_advances).values({
      id,
      branch_id: branchId,
      employee_id: req.user!.userId,
      user_id: req.user!.userId,
      amount,
      reason: reason ?? null,
      status: 'pending',
      created_by: req.user!.userId,
      created_at: now,
      updated_at: now,
    });

    const row = await db.select().from(schema.salary_advances).where(eq(schema.salary_advances.id, id)).get();
    res.status(201).json({ data: row });
  } catch (err) { next(err); }
});

router.post('/salary-advances/cancel', requireAuth, async (req, res, next) => {
  try {
    const { advanceId } = req.body;
    if (!advanceId) throw new AppError(400, 'advanceId is required');

    const now = new Date().toISOString();
    await db.update(schema.salary_advances).set({
      status: 'cancelled',
      updated_at: now,
    }).where(eq(schema.salary_advances.id, advanceId));

    const row = await db.select().from(schema.salary_advances).where(eq(schema.salary_advances.id, advanceId)).get();
    res.json({ data: row });
  } catch (err) { next(err); }
});

router.post('/salary-advances', requireAuth, async (req, res, next) => {
  try {
    const { branchId, userId, amount, reason, paymentMethod, shiftId } = req.body;
    if (!branchId || !userId || amount === undefined) {
      throw new AppError(400, 'branchId, userId, and amount are required');
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(schema.salary_advances).values({
      id,
      branch_id: branchId,
      employee_id: userId,
      user_id: userId,
      amount,
      reason: reason ?? null,
      payment_method: paymentMethod ?? null,
      shift_id: shiftId ?? null,
      status: 'approved',
      authorized_by: req.user!.userId,
      authorized_at: now,
      created_by: req.user!.userId,
      created_at: now,
      updated_at: now,
    });

    const row = await db.select().from(schema.salary_advances).where(eq(schema.salary_advances.id, id)).get();
    res.status(201).json({ data: row });
  } catch (err) { next(err); }
});

// ============================================================================
// HOLIDAYS / SPECIAL DAYS
// ============================================================================

router.get('/holidays', requireAuth, async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query as Record<string, string>;
    const conditions: ReturnType<typeof eq>[] = [];
    if (startDate) conditions.push(gte(schema.special_days.day_date, startDate));
    if (endDate) conditions.push(lte(schema.special_days.day_date, endDate));

    const rows = conditions.length > 0
      ? await db.select().from(schema.special_days).where(and(...conditions)).orderBy(asc(schema.special_days.day_date))
      : await db.select().from(schema.special_days).orderBy(asc(schema.special_days.day_date));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/holidays/bulk', requireAuth, async (req, res, next) => {
  try {
    const { holidays } = req.body;
    if (!Array.isArray(holidays)) throw new AppError(400, 'holidays must be an array');

    const now = new Date().toISOString();
    const created: string[] = [];

    for (const h of holidays) {
      const id = crypto.randomUUID();
      await db.insert(schema.special_days).values({
        id,
        day_date: h.day_date,
        description: h.description,
        day_type: h.day_type ?? 'holiday',
        created_by: req.user!.userId,
        created_at: now,
      });
      created.push(id);
    }
    res.json({ data: { count: created.length } });
  } catch (err) { next(err); }
});

router.post('/holidays', requireAuth, async (req, res, next) => {
  try {
    const { day_date, description, day_type } = req.body;
    if (!day_date || !description) throw new AppError(400, 'day_date and description are required');

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(schema.special_days).values({
      id,
      day_date,
      description,
      day_type: day_type ?? 'holiday',
      created_by: req.user!.userId,
      created_at: now,
    });

    const row = await db.select().from(schema.special_days).where(eq(schema.special_days.id, id)).get();
    res.status(201).json({ data: row });
  } catch (err) { next(err); }
});

router.delete('/holidays/:id', requireAuth, async (req, res, next) => {
  try {
    await db.delete(schema.special_days).where(eq(schema.special_days.id, req.params.id));
    res.json({ message: 'Holiday deleted' });
  } catch (err) { next(err); }
});

router.get('/special-days', requireAuth, async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query as Record<string, string>;
    const conditions: ReturnType<typeof eq>[] = [];
    if (startDate) conditions.push(gte(schema.special_days.day_date, startDate));
    if (endDate) conditions.push(lte(schema.special_days.day_date, endDate));

    const rows = conditions.length > 0
      ? await db.select().from(schema.special_days).where(and(...conditions)).orderBy(asc(schema.special_days.day_date))
      : await db.select().from(schema.special_days).orderBy(asc(schema.special_days.day_date));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

// ============================================================================
// WORK POSITIONS
// ============================================================================

router.get('/work-positions/active', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(schema.work_positions)
      .where(eq(schema.work_positions.is_active, true))
      .orderBy(asc(schema.work_positions.sort_order));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/work-positions', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(schema.work_positions)
      .orderBy(asc(schema.work_positions.sort_order));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/work-positions', requireAuth, async (req, res, next) => {
  try {
    const { key, label, sort_order } = req.body;
    if (!key || !label) throw new AppError(400, 'key and label are required');

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(schema.work_positions).values({
      id, key, label, sort_order: sort_order ?? 0,
      is_active: true, created_at: now, updated_at: now,
    });

    const row = await db.select().from(schema.work_positions).where(eq(schema.work_positions.id, id)).get();
    res.status(201).json({ data: row });
  } catch (err) { next(err); }
});

router.put('/work-positions/:id', requireAuth, async (req, res, next) => {
  try {
    const { key, label, sort_order, is_active } = req.body;
    await db.update(schema.work_positions).set({
      ...(key !== undefined && { key }),
      ...(label !== undefined && { label }),
      ...(sort_order !== undefined && { sort_order }),
      ...(is_active !== undefined && { is_active }),
      updated_at: new Date().toISOString(),
    }).where(eq(schema.work_positions.id, req.params.id));

    const row = await db.select().from(schema.work_positions).where(eq(schema.work_positions.id, req.params.id)).get();
    if (!row) throw new AppError(404, 'Work position not found');
    res.json({ data: row });
  } catch (err) { next(err); }
});

router.delete('/work-positions/:id', requireAuth, async (req, res, next) => {
  try {
    await db.delete(schema.work_positions).where(eq(schema.work_positions.id, req.params.id));
    res.json({ message: 'Work position deleted' });
  } catch (err) { next(err); }
});

// ============================================================================
// ABSENCES
// ============================================================================

router.get('/absences', requireAuth, async (req, res, next) => {
  try {
    const { branchId, startDate, endDate } = req.query as Record<string, string>;
    if (!branchId) throw new AppError(400, 'branchId is required');

    const conditions = [
      eq(schema.schedule_requests.branch_id, branchId),
      eq(schema.schedule_requests.status, 'approved'),
    ];
    if (startDate) conditions.push(gte(schema.schedule_requests.request_date, startDate));
    if (endDate) conditions.push(lte(schema.schedule_requests.request_date, endDate));

    const rows = await db.select().from(schema.schedule_requests)
      .where(and(...conditions))
      .orderBy(asc(schema.schedule_requests.request_date));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

// ============================================================================
// WARNINGS
// ============================================================================

router.get('/warnings/branches/:branchId/team', requireAuth, async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const assignments = await db.select({ user_id: schema.user_role_assignments.user_id })
      .from(schema.user_role_assignments)
      .where(and(
        eq(schema.user_role_assignments.branch_id, branchId),
        eq(schema.user_role_assignments.is_active, true),
      ));

    const userIds = assignments.map(a => a.user_id).filter(Boolean) as string[];
    if (userIds.length === 0) return res.json({ data: [] });

    const profiles = await db.select({ id: schema.profiles.id, full_name: schema.profiles.full_name })
      .from(schema.profiles).where(inArray(schema.profiles.id, userIds));

    const result = profiles.map(p => ({ user_id: p.id, full_name: p.full_name }));
    res.json({ data: result });
  } catch (err) { next(err); }
});

router.get('/warnings/branches/:branchId/name', requireAuth, async (req, res, next) => {
  try {
    const branch = await db.select({ name: schema.branches.name })
      .from(schema.branches).where(eq(schema.branches.id, req.params.branchId)).get();
    res.json({ data: branch ?? null });
  } catch (err) { next(err); }
});

router.get('/warnings/employee-profile/:userId', requireAuth, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { branch_id } = req.query as Record<string, string>;

    const profile = await db.select().from(schema.profiles)
      .where(eq(schema.profiles.id, userId)).get();
    if (!profile) throw new AppError(404, 'Profile not found');

    let roleName = 'empleado';
    if (branch_id) {
      const assignment = await db.select({
        role_id: schema.user_role_assignments.role_id,
      }).from(schema.user_role_assignments)
        .where(and(
          eq(schema.user_role_assignments.user_id, userId),
          eq(schema.user_role_assignments.branch_id, branch_id),
          eq(schema.user_role_assignments.is_active, true),
        )).get();

      if (assignment?.role_id) {
        const role = await db.select({ key: schema.roles.key })
          .from(schema.roles).where(eq(schema.roles.id, assignment.role_id)).get();
        if (role) roleName = role.key;
      }
    }

    const empData = await db.select({ dni: schema.employee_data.dni })
      .from(schema.employee_data)
      .where(eq(schema.employee_data.user_id, userId)).get();

    res.json({ data: { fullName: profile.full_name, dni: empData?.dni ?? profile.dni, role: roleName } });
  } catch (err) { next(err); }
});

router.get('/warnings/issuer/:userId', requireAuth, async (req, res, next) => {
  try {
    const profile = await db.select({ full_name: schema.profiles.full_name })
      .from(schema.profiles).where(eq(schema.profiles.id, req.params.userId)).get();
    res.json({ data: profile ?? null });
  } catch (err) { next(err); }
});

router.get('/warnings/my/:userId', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(schema.warnings)
      .where(eq(schema.warnings.user_id, req.params.userId))
      .orderBy(desc(schema.warnings.created_at));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/warnings/branch/:branchId', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(schema.warnings)
      .where(eq(schema.warnings.branch_id, req.params.branchId))
      .orderBy(desc(schema.warnings.created_at));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/warnings/notify', requireAuth, async (_req, res, next) => {
  try {
    res.json({ data: { success: true } });
  } catch (err) { next(err); }
});

const warningSignatureUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dir = path.join(UPLOADS_ROOT, 'warning-signatures');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post('/warnings/:warningId/signature', requireAuth, (req, res, next) => {
  warningSignatureUpload.single('file')(req, res, async (err) => {
    if (err) return next(err);
    try {
      const { warningId } = req.params;
      const userId = req.body?.user_id;
      const acknowledge = req.body?.acknowledge === 'true';
      const fileUrl = req.file ? `/uploads/warning-signatures/${req.file.filename}` : null;

      const updates: Record<string, unknown> = {};
      if (fileUrl) updates.signed_document_url = fileUrl;
      if (acknowledge) updates.acknowledged_at = new Date().toISOString();

      if (Object.keys(updates).length > 0) {
        await db.update(schema.warnings).set(updates).where(eq(schema.warnings.id, warningId));
      }

      const row = await db.select().from(schema.warnings).where(eq(schema.warnings.id, warningId)).get();
      res.json({ data: row });
    } catch (e) { next(e); }
  });
});

router.post('/warnings', requireAuth, async (req, res, next) => {
  try {
    const { user_id, branch_id, warning_type, description, warning_date, issued_by } = req.body;
    if (!user_id || !branch_id) throw new AppError(400, 'user_id and branch_id are required');

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(schema.warnings).values({
      id,
      user_id,
      branch_id,
      warning_type: warning_type ?? null,
      description: description ?? null,
      warning_date: warning_date ?? now.slice(0, 10),
      issued_by: issued_by ?? req.user!.userId,
      is_active: true,
      created_at: now,
    });

    const row = await db.select().from(schema.warnings).where(eq(schema.warnings.id, id)).get();
    res.status(201).json({ data: row });
  } catch (err) { next(err); }
});

router.put('/warnings/:warningId/acknowledge', requireAuth, async (req, res, next) => {
  try {
    const { warningId } = req.params;
    await db.update(schema.warnings).set({
      acknowledged_at: new Date().toISOString(),
    }).where(eq(schema.warnings.id, warningId));

    const row = await db.select().from(schema.warnings).where(eq(schema.warnings.id, warningId)).get();
    if (!row) throw new AppError(404, 'Warning not found');
    res.json({ data: row });
  } catch (err) { next(err); }
});

// ============================================================================
// STAFF & BRANCH ROLES
// ============================================================================

router.get('/staff/find-by-email', requireAuth, async (req, res, next) => {
  try {
    const { email } = req.query as Record<string, string>;
    if (!email) throw new AppError(400, 'email is required');

    const profile = await db.select({
      id: schema.profiles.id,
      full_name: schema.profiles.full_name,
      email: schema.profiles.email,
    }).from(schema.profiles)
      .where(eq(schema.profiles.email, email.toLowerCase().trim())).get();
    res.json({ data: profile ?? null });
  } catch (err) { next(err); }
});

router.get('/branch-roles/find', requireAuth, async (req, res, next) => {
  try {
    const { user_id, branch_id } = req.query as Record<string, string>;
    if (!user_id || !branch_id) throw new AppError(400, 'user_id and branch_id are required');

    const assignment = await db.select().from(schema.user_role_assignments)
      .where(and(
        eq(schema.user_role_assignments.user_id, user_id),
        eq(schema.user_role_assignments.branch_id, branch_id),
      )).get();

    if (!assignment) return res.json({ data: null });

    let localRole = 'empleado';
    if (assignment.role_id) {
      const role = await db.select({ key: schema.roles.key })
        .from(schema.roles).where(eq(schema.roles.id, assignment.role_id)).get();
      if (role) localRole = role.key;
    }

    res.json({ data: { id: assignment.id, local_role: localRole, is_active: assignment.is_active } });
  } catch (err) { next(err); }
});

router.post('/branch-roles/reactivate', requireAuth, async (req, res, next) => {
  try {
    const { user_id, branch_id, local_role } = req.body;
    if (!user_id || !branch_id) throw new AppError(400, 'user_id and branch_id are required');

    const role = await db.select({ id: schema.roles.id }).from(schema.roles)
      .where(eq(schema.roles.key, local_role ?? 'empleado')).get();

    await db.update(schema.user_role_assignments).set({
      is_active: true,
      ...(role && { role_id: role.id }),
    }).where(and(
      eq(schema.user_role_assignments.user_id, user_id),
      eq(schema.user_role_assignments.branch_id, branch_id),
    ));

    res.json({ data: { success: true } });
  } catch (err) { next(err); }
});

router.post('/branch-roles/upsert', requireAuth, async (req, res, next) => {
  try {
    const { user_id, branch_id, local_role } = req.body;
    if (!user_id || !branch_id) throw new AppError(400, 'user_id and branch_id are required');

    const role = await db.select({ id: schema.roles.id }).from(schema.roles)
      .where(eq(schema.roles.key, local_role ?? 'empleado')).get();

    const existing = await db.select().from(schema.user_role_assignments)
      .where(and(
        eq(schema.user_role_assignments.user_id, user_id),
        eq(schema.user_role_assignments.branch_id, branch_id),
      )).get();

    if (existing) {
      await db.update(schema.user_role_assignments).set({
        role_id: role?.id ?? existing.role_id,
        is_active: true,
      }).where(eq(schema.user_role_assignments.id, existing.id));
      return res.json({ data: { id: existing.id } });
    }

    const id = crypto.randomUUID();
    await db.insert(schema.user_role_assignments).values({
      id,
      user_id,
      branch_id,
      role_id: role?.id ?? null,
      is_active: true,
      created_at: new Date().toISOString(),
    });
    res.status(201).json({ data: { id } });
  } catch (err) { next(err); }
});

router.put('/branch-roles/:roleId', requireAuth, async (req, res, next) => {
  try {
    const { roleId } = req.params;
    const updates = { ...req.body };

    if (updates.local_role) {
      const role = await db.select({ id: schema.roles.id }).from(schema.roles)
        .where(eq(schema.roles.key, updates.local_role)).get();
      if (role) updates.role_id = role.id;
      delete updates.local_role;
    }

    await db.update(schema.user_role_assignments)
      .set(updates)
      .where(eq(schema.user_role_assignments.id, roleId));

    const row = await db.select().from(schema.user_role_assignments)
      .where(eq(schema.user_role_assignments.id, roleId)).get();
    res.json({ data: row });
  } catch (err) { next(err); }
});

router.post('/branch-roles/:roleId/deactivate', requireAuth, async (req, res, next) => {
  try {
    await db.update(schema.user_role_assignments).set({ is_active: false })
      .where(eq(schema.user_role_assignments.id, req.params.roleId));
    res.json({ data: { success: true } });
  } catch (err) { next(err); }
});

// ============================================================================
// STAFF INVITATIONS
// ============================================================================

router.post('/staff-invitations/send', requireAuth, async (req, res, next) => {
  try {
    const { email, role, branch_id } = req.body;
    if (!email || !branch_id) throw new AppError(400, 'email and branch_id are required');

    const id = crypto.randomUUID();
    const token = crypto.randomUUID();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await db.insert(schema.staff_invitations).values({
      id,
      email: email.toLowerCase().trim(),
      branch_id,
      role: role ?? 'empleado',
      token,
      status: 'pending',
      invited_by: req.user!.userId,
      expires_at: expiresAt,
      created_at: now,
    });

    const row = await db.select().from(schema.staff_invitations).where(eq(schema.staff_invitations.id, id)).get();
    res.status(201).json({ data: row });
  } catch (err) { next(err); }
});

router.post('/staff-invitations/validate', requireAuth, async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) throw new AppError(400, 'token is required');

    const invitation = await db.select().from(schema.staff_invitations)
      .where(and(
        eq(schema.staff_invitations.token, token),
        eq(schema.staff_invitations.status, 'pending'),
      )).get();

    if (!invitation) throw new AppError(404, 'Invalid or expired invitation');
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      throw new AppError(410, 'Invitation has expired');
    }

    res.json({ data: invitation });
  } catch (err) { next(err); }
});

router.post('/staff-invitations/:invitationId/accept', requireAuth, async (req, res, next) => {
  try {
    const { invitationId } = req.params;
    const { user_id } = req.body;

    const now = new Date().toISOString();
    await db.update(schema.staff_invitations).set({
      status: 'accepted',
      accepted_by: user_id ?? req.user!.userId,
      accepted_at: now,
    }).where(eq(schema.staff_invitations.id, invitationId));

    const invitation = await db.select().from(schema.staff_invitations)
      .where(eq(schema.staff_invitations.id, invitationId)).get();

    if (invitation) {
      const role = await db.select({ id: schema.roles.id }).from(schema.roles)
        .where(eq(schema.roles.key, invitation.role ?? 'empleado')).get();

      const existingAssignment = await db.select().from(schema.user_role_assignments)
        .where(and(
          eq(schema.user_role_assignments.user_id, user_id ?? req.user!.userId),
          eq(schema.user_role_assignments.branch_id, invitation.branch_id!),
        )).get();

      if (existingAssignment) {
        await db.update(schema.user_role_assignments).set({
          is_active: true, role_id: role?.id ?? existingAssignment.role_id,
        }).where(eq(schema.user_role_assignments.id, existingAssignment.id));
      } else {
        await db.insert(schema.user_role_assignments).values({
          id: crypto.randomUUID(),
          user_id: user_id ?? req.user!.userId,
          branch_id: invitation.branch_id!,
          role_id: role?.id ?? null,
          is_active: true,
          created_at: now,
        });
      }
    }

    res.json({ data: invitation });
  } catch (err) { next(err); }
});

// ============================================================================
// BRANCH TEAM & EMPLOYEE DATA
// ============================================================================

router.get('/branch-team/:branchId', requireAuth, async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const { exclude_owners } = req.query as Record<string, string>;

    const assignments = await db.select().from(schema.user_role_assignments)
      .where(eq(schema.user_role_assignments.branch_id, branchId));

    const allRoles = await db.select().from(schema.roles);
    const roleMap = Object.fromEntries(allRoles.map(r => [r.id, r.key]));

    let filtered = assignments;
    if (exclude_owners === 'true') {
      const ownerRoleIds = allRoles.filter(r => r.key === 'franquiciado' || r.key === 'propietario').map(r => r.id);
      filtered = assignments.filter(a => !ownerRoleIds.includes(a.role_id!));
    }

    const roles = filtered.map(a => ({
      id: a.id,
      user_id: a.user_id,
      local_role: roleMap[a.role_id!] ?? 'empleado',
      default_position: a.default_position,
      is_active: a.is_active,
      created_at: a.created_at,
    }));

    const userIds = [...new Set(filtered.map(a => a.user_id).filter(Boolean))] as string[];
    let profiles: { id: string; full_name: string | null; email: string | null; phone: string | null }[] = [];
    let empData: { user_id: string | null; monthly_hours_target: number | null }[] = [];
    let clockEntries: { user_id: string | null; entry_type: string | null; created_at: string | null }[] = [];
    let warningsList: { user_id: string | null }[] = [];

    if (userIds.length > 0) {
      profiles = await db.select({
        id: schema.profiles.id,
        full_name: schema.profiles.full_name,
        email: schema.profiles.email,
        phone: schema.profiles.phone,
      }).from(schema.profiles).where(inArray(schema.profiles.id, userIds));

      empData = await db.select({
        user_id: schema.employee_data.user_id,
        monthly_hours_target: schema.employee_data.monthly_hours_target,
      }).from(schema.employee_data).where(and(
        inArray(schema.employee_data.user_id, userIds),
        eq(schema.employee_data.branch_id, branchId),
      ));

      const recentClock = await db.select({
        user_id: schema.clock_entries.user_id,
        entry_type: schema.clock_entries.entry_type,
        created_at: schema.clock_entries.created_at,
      }).from(schema.clock_entries)
        .where(and(
          inArray(schema.clock_entries.user_id, userIds),
          eq(schema.clock_entries.branch_id, branchId),
        ))
        .orderBy(desc(schema.clock_entries.created_at));

      const seenUsers = new Set<string>();
      clockEntries = recentClock.filter(c => {
        if (!c.user_id || seenUsers.has(c.user_id)) return false;
        seenUsers.add(c.user_id);
        return true;
      });

      warningsList = await db.select({ user_id: schema.warnings.user_id })
        .from(schema.warnings).where(and(
          inArray(schema.warnings.user_id, userIds),
          eq(schema.warnings.branch_id, branchId),
          eq(schema.warnings.is_active, true),
        ));
    }

    res.json({ data: { roles, profiles, employeeData: empData, clockEntries, warnings: warningsList } });
  } catch (err) { next(err); }
});

router.get('/employee-data', requireAuth, async (req, res, next) => {
  try {
    const { user_id, branch_id } = req.query as Record<string, string>;
    if (!user_id || !branch_id) throw new AppError(400, 'user_id and branch_id are required');

    const row = await db.select().from(schema.employee_data)
      .where(and(
        eq(schema.employee_data.user_id, user_id),
        eq(schema.employee_data.branch_id, branch_id),
      )).get();
    res.json({ data: row ?? null });
  } catch (err) { next(err); }
});

router.get('/employee-warnings', requireAuth, async (req, res, next) => {
  try {
    const { user_id, branch_id } = req.query as Record<string, string>;
    if (!user_id || !branch_id) throw new AppError(400, 'user_id and branch_id are required');

    const rows = await db.select().from(schema.warnings)
      .where(and(
        eq(schema.warnings.user_id, user_id),
        eq(schema.warnings.branch_id, branch_id),
      ))
      .orderBy(desc(schema.warnings.created_at));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/employee-data', requireAuth, async (req, res, next) => {
  try {
    const { existing_id, user_id, branch_id, ...data } = req.body;
    if (!user_id || !branch_id) throw new AppError(400, 'user_id and branch_id are required');

    const now = new Date().toISOString();

    if (existing_id) {
      await db.update(schema.employee_data)
        .set({ ...data, updated_at: now })
        .where(eq(schema.employee_data.id, existing_id));
      const row = await db.select().from(schema.employee_data)
        .where(eq(schema.employee_data.id, existing_id)).get();
      return res.json({ data: row });
    }

    const existing = await db.select().from(schema.employee_data)
      .where(and(
        eq(schema.employee_data.user_id, user_id),
        eq(schema.employee_data.branch_id, branch_id),
      )).get();

    if (existing) {
      await db.update(schema.employee_data)
        .set({ ...data, updated_at: now })
        .where(eq(schema.employee_data.id, existing.id));
      const row = await db.select().from(schema.employee_data)
        .where(eq(schema.employee_data.id, existing.id)).get();
      return res.json({ data: row });
    }

    const id = crypto.randomUUID();
    await db.insert(schema.employee_data).values({
      id, user_id, branch_id, ...data,
      created_at: now, updated_at: now,
    });
    const row = await db.select().from(schema.employee_data).where(eq(schema.employee_data.id, id)).get();
    res.status(201).json({ data: row });
  } catch (err) { next(err); }
});

router.put('/employee-notes', requireAuth, async (req, res, next) => {
  try {
    const { employee_data_id, user_id, branch_id, internal_notes } = req.body;
    if (!user_id || !branch_id) throw new AppError(400, 'user_id and branch_id are required');

    const now = new Date().toISOString();
    const notesJson = typeof internal_notes === 'string' ? internal_notes : JSON.stringify(internal_notes);

    if (employee_data_id) {
      await db.update(schema.employee_data)
        .set({ internal_notes: notesJson, updated_at: now })
        .where(eq(schema.employee_data.id, employee_data_id));
    } else {
      const existing = await db.select().from(schema.employee_data)
        .where(and(eq(schema.employee_data.user_id, user_id), eq(schema.employee_data.branch_id, branch_id))).get();

      if (existing) {
        await db.update(schema.employee_data)
          .set({ internal_notes: notesJson, updated_at: now })
          .where(eq(schema.employee_data.id, existing.id));
      } else {
        await db.insert(schema.employee_data).values({
          id: crypto.randomUUID(), user_id, branch_id,
          internal_notes: notesJson, created_at: now, updated_at: now,
        });
      }
    }

    res.json({ data: { success: true } });
  } catch (err) { next(err); }
});

router.get('/profiles/:userId/clock-pin', requireAuth, async (req, res, next) => {
  try {
    const profile = await db.select({ clock_pin: schema.profiles.clock_pin })
      .from(schema.profiles).where(eq(schema.profiles.id, req.params.userId)).get();
    res.json({ data: { clock_pin: profile?.clock_pin ?? null } });
  } catch (err) { next(err); }
});

router.post('/profiles/names', requireAuth, async (req, res, next) => {
  try {
    const { userIds } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0) return res.json({ data: {} });

    const profiles = await db.select({ id: schema.profiles.id, full_name: schema.profiles.full_name })
      .from(schema.profiles).where(inArray(schema.profiles.id, userIds));

    const map: Record<string, string> = {};
    for (const p of profiles) {
      map[p.id] = p.full_name ?? '';
    }
    res.json({ data: map });
  } catch (err) { next(err); }
});

router.post('/labor-users', requireAuth, async (req, res, next) => {
  try {
    const { branchId, userIds } = req.body;
    if (!branchId || !userIds?.length) return res.json({ data: [] });

    const empDataRows = await db.select().from(schema.employee_data)
      .where(and(
        inArray(schema.employee_data.user_id, userIds),
        eq(schema.employee_data.branch_id, branchId),
      ));

    const profiles = await db.select({
      id: schema.profiles.id,
      full_name: schema.profiles.full_name,
    }).from(schema.profiles).where(inArray(schema.profiles.id, userIds));

    const profileMap = Object.fromEntries(profiles.map(p => [p.id, p.full_name]));
    const result = empDataRows.map(e => ({ ...e, full_name: profileMap[e.user_id!] ?? null }));

    const missingIds = userIds.filter((id: string) => !empDataRows.some(e => e.user_id === id));
    for (const id of missingIds) {
      result.push({ user_id: id, full_name: profileMap[id] ?? null, branch_id: branchId } as typeof result[number]);
    }

    res.json({ data: result });
  } catch (err) { next(err); }
});

// ============================================================================
// BRANCHES (HR sub-routes)
// ============================================================================

router.get('/branches/:branchId/staff-clock', requireAuth, async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const assignments = await db.select().from(schema.user_role_assignments)
      .where(and(
        eq(schema.user_role_assignments.branch_id, branchId),
        eq(schema.user_role_assignments.is_active, true),
      ));

    const userIds = assignments.map(a => a.user_id).filter(Boolean) as string[];
    if (userIds.length === 0) return res.json({ data: [] });

    const profiles = await db.select({
      id: schema.profiles.id,
      full_name: schema.profiles.full_name,
      avatar_url: schema.profiles.avatar_url,
    }).from(schema.profiles).where(inArray(schema.profiles.id, userIds));

    const allRoles = await db.select().from(schema.roles);
    const roleMap = Object.fromEntries(allRoles.map(r => [r.id, r.key]));

    const timeStates = await db.select().from(schema.employee_time_state)
      .where(eq(schema.employee_time_state.branch_id, branchId));
    const stateMap = Object.fromEntries(timeStates.map(t => [t.employee_id, t]));

    const result = assignments.map(a => {
      const profile = profiles.find(p => p.id === a.user_id);
      const timeState = stateMap[a.user_id!];
      return {
        user_id: a.user_id,
        full_name: profile?.full_name ?? null,
        avatar_url: profile?.avatar_url ?? null,
        local_role: roleMap[a.role_id!] ?? 'empleado',
        current_state: timeState?.current_state ?? 'off',
        clock_pin: a.clock_pin,
      };
    });

    res.json({ data: result });
  } catch (err) { next(err); }
});

router.get('/branches/:branchId/clock-info', requireAuth, async (req, res, next) => {
  try {
    const branch = await db.select().from(schema.branches)
      .where(eq(schema.branches.id, req.params.branchId)).get();
    if (!branch) throw new AppError(404, 'Branch not found');

    const laborCfg = await db.select().from(schema.labor_config)
      .where(eq(schema.labor_config.branch_id, req.params.branchId)).get();

    res.json({ data: { ...branch, labor_config: laborCfg ?? null } });
  } catch (err) { next(err); }
});

router.get('/branches/:branchId/clock-info-maybe', requireAuth, async (req, res, next) => {
  try {
    const branch = await db.select().from(schema.branches)
      .where(eq(schema.branches.id, req.params.branchId)).get();
    if (!branch) return res.json({ data: null });

    const laborCfg = await db.select().from(schema.labor_config)
      .where(eq(schema.labor_config.branch_id, req.params.branchId)).get();

    res.json({ data: { ...branch, labor_config: laborCfg ?? null } });
  } catch (err) { next(err); }
});

// ============================================================================
// EMPLOYEES
// ============================================================================

router.get('/employees/birthdays', requireAuth, async (req, res, next) => {
  try {
    const { branchId } = req.query as Record<string, string>;
    if (!branchId) throw new AppError(400, 'branchId is required');

    const assignments = await db.select({ user_id: schema.user_role_assignments.user_id })
      .from(schema.user_role_assignments)
      .where(and(
        eq(schema.user_role_assignments.branch_id, branchId),
        eq(schema.user_role_assignments.is_active, true),
      ));

    const userIds = assignments.map(a => a.user_id).filter(Boolean) as string[];
    if (userIds.length === 0) return res.json({ data: [] });

    const profiles = await db.select({
      id: schema.profiles.id,
      full_name: schema.profiles.full_name,
      birth_date: schema.profiles.birth_date,
    }).from(schema.profiles).where(inArray(schema.profiles.id, userIds));

    const empDataList = await db.select({
      user_id: schema.employee_data.user_id,
      birth_date: schema.employee_data.birth_date,
    }).from(schema.employee_data).where(inArray(schema.employee_data.user_id, userIds));

    const empDateMap = Object.fromEntries(empDataList.map(e => [e.user_id!, e.birth_date]));

    const result = profiles
      .map(p => ({
        id: p.id,
        full_name: p.full_name,
        birth_date: empDateMap[p.id] ?? p.birth_date ?? null,
      }))
      .filter(p => p.birth_date);

    res.json({ data: result });
  } catch (err) { next(err); }
});

// ============================================================================
// REGULATIONS
// ============================================================================

router.get('/regulations/latest', requireAuth, async (_req, res, next) => {
  try {
    const row = await db.select().from(schema.regulations)
      .where(eq(schema.regulations.is_active, true))
      .orderBy(desc(schema.regulations.created_at))
      .limit(1)
      .get();
    res.json({ data: row ?? null });
  } catch (err) { next(err); }
});

router.get('/regulations/status', requireAuth, async (req, res, next) => {
  try {
    const { userId } = req.query as Record<string, string>;
    if (!userId) throw new AppError(400, 'userId is required');

    const latestReg = await db.select().from(schema.regulations)
      .where(eq(schema.regulations.is_active, true))
      .orderBy(desc(schema.regulations.created_at))
      .limit(1).get();

    if (!latestReg) return res.json({ data: { hasPendingRegulation: false } });

    const signature = await db.select().from(schema.regulation_signatures)
      .where(and(
        eq(schema.regulation_signatures.user_id, userId),
        eq(schema.regulation_signatures.regulation_id, latestReg.id),
      )).get();

    res.json({ data: { hasPendingRegulation: !signature, regulation: latestReg } });
  } catch (err) { next(err); }
});

router.get('/regulations/signature', requireAuth, async (req, res, next) => {
  try {
    const { userId, regulationId } = req.query as Record<string, string>;
    if (!userId || !regulationId) throw new AppError(400, 'userId and regulationId are required');

    const row = await db.select().from(schema.regulation_signatures)
      .where(and(
        eq(schema.regulation_signatures.user_id, userId),
        eq(schema.regulation_signatures.regulation_id, regulationId),
      )).get();
    res.json({ data: row ?? null });
  } catch (err) { next(err); }
});

router.get('/regulations/signatures', requireAuth, async (req, res, next) => {
  try {
    const { userId } = req.query as Record<string, string>;
    if (!userId) throw new AppError(400, 'userId is required');

    const rows = await db.select().from(schema.regulation_signatures)
      .where(eq(schema.regulation_signatures.user_id, userId))
      .orderBy(desc(schema.regulation_signatures.signed_at));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

// ============================================================================
// USER ROLES
// ============================================================================

router.get('/users/:userId/local-roles', requireAuth, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const assignments = await db.select().from(schema.user_role_assignments)
      .where(and(
        eq(schema.user_role_assignments.user_id, userId),
        eq(schema.user_role_assignments.is_active, true),
      ));

    const allRoles = await db.select().from(schema.roles);
    const roleMap = Object.fromEntries(allRoles.map(r => [r.id, r]));

    const result = assignments.map(a => ({
      id: a.id,
      branch_id: a.branch_id,
      role_id: a.role_id,
      local_role: roleMap[a.role_id!]?.key ?? 'empleado',
      role_display_name: roleMap[a.role_id!]?.display_name ?? 'Empleado',
    }));

    res.json({ data: result });
  } catch (err) { next(err); }
});

// ============================================================================
// STORAGE (HR sub-route)
// ============================================================================

router.get('/storage/signed-url', requireAuth, async (req, res, next) => {
  try {
    const { bucket, path: filePath } = req.query as Record<string, string>;
    if (!bucket || !filePath) return res.json({ data: null });
    res.json({ data: `/uploads/${bucket}/${filePath}` });
  } catch (err) { next(err); }
});

// ============================================================================
// PAYROLL CLOSING (via periods table)
// ============================================================================

router.get('/payroll-closing', requireAuth, async (req, res, next) => {
  try {
    const { branchId, month, year } = req.query as Record<string, string>;
    if (!branchId || !month || !year) throw new AppError(400, 'branchId, month, and year are required');

    const period = `${year}-${String(Number(month)).padStart(2, '0')}`;
    const row = await db.select().from(schema.periods)
      .where(and(
        eq(schema.periods.branch_id, branchId),
        eq(schema.periods.period, period),
      )).get();
    res.json({ data: row ?? null });
  } catch (err) { next(err); }
});

router.post('/payroll-closing/close', requireAuth, async (req, res, next) => {
  try {
    const { branchId, month, year, closedBy, notes } = req.body;
    if (!branchId || !month || !year) throw new AppError(400, 'branchId, month, and year are required');

    const period = `${year}-${String(Number(month)).padStart(2, '0')}`;
    const now = new Date().toISOString();

    const existing = await db.select().from(schema.periods)
      .where(and(eq(schema.periods.branch_id, branchId), eq(schema.periods.period, period))).get();

    if (existing) {
      await db.update(schema.periods).set({
        status: 'closed',
        closed_at: now,
        closed_by: closedBy ?? req.user!.userId,
        notes: notes ?? existing.notes,
        updated_at: now,
      }).where(eq(schema.periods.id, existing.id));
      const row = await db.select().from(schema.periods).where(eq(schema.periods.id, existing.id)).get();
      return res.json({ data: row });
    }

    const id = crypto.randomUUID();
    await db.insert(schema.periods).values({
      id, branch_id: branchId, period, status: 'closed',
      closed_at: now, closed_by: closedBy ?? req.user!.userId,
      notes: notes ?? null, created_at: now, updated_at: now,
    });
    const row = await db.select().from(schema.periods).where(eq(schema.periods.id, id)).get();
    res.json({ data: row });
  } catch (err) { next(err); }
});

router.post('/payroll-closing/reopen', requireAuth, async (req, res, next) => {
  try {
    const { branchId, month, year, notes } = req.body;
    if (!branchId || !month || !year) throw new AppError(400, 'branchId, month, and year are required');

    const period = `${year}-${String(Number(month)).padStart(2, '0')}`;
    const now = new Date().toISOString();

    const existing = await db.select().from(schema.periods)
      .where(and(eq(schema.periods.branch_id, branchId), eq(schema.periods.period, period))).get();
    if (!existing) throw new AppError(404, 'Period not found');

    await db.update(schema.periods).set({
      status: 'open',
      reopened_at: now,
      reopened_by: req.user!.userId,
      reopen_reason: notes ?? null,
      updated_at: now,
    }).where(eq(schema.periods.id, existing.id));

    const row = await db.select().from(schema.periods).where(eq(schema.periods.id, existing.id)).get();
    res.json({ data: row });
  } catch (err) { next(err); }
});

// ============================================================================
// EMPLOYEE CONSUMPTIONS
// ============================================================================

router.get('/employee-consumptions', requireAuth, async (req, res, next) => {
  try {
    const { branchId, startDate, endDate } = req.query as Record<string, string>;
    if (!branchId) throw new AppError(400, 'branchId is required');

    const conditions = [
      eq(schema.employee_consumptions.branch_id, branchId),
      isNull(schema.employee_consumptions.deleted_at),
    ];
    if (startDate) conditions.push(gte(schema.employee_consumptions.consumption_date, startDate));
    if (endDate) conditions.push(lte(schema.employee_consumptions.consumption_date, endDate));

    const rows = await db.select().from(schema.employee_consumptions)
      .where(and(...conditions))
      .orderBy(asc(schema.employee_consumptions.consumption_date));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

export { router as hrRoutes };

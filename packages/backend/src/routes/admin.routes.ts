import { Router } from 'express';
import { db } from '../db/connection.js';
import * as schema from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { requireSuperadmin, getUserRoles } from '../middleware/permissions.js';
import { AppError } from '../middleware/errorHandler.js';
import { eq, and, desc, inArray, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';

const router = Router();

// ── Users / Profiles ─────────────────────────────────────────────────

// GET /admin/users/profiles
router.get('/users/profiles', requireAuth, requireSuperadmin, async (_req, res, next) => {
  try {
    const rows = await db.select().from(schema.profiles);
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /admin/users/search
router.get('/users/search', requireAuth, async (req, res, next) => {
  try {
    const { email, limit } = req.query as { email?: string; limit?: string };
    if (!email) return res.json([]);

    const rows = await db
      .select({
        id: schema.profiles.id,
        full_name: schema.profiles.full_name,
        email: schema.profiles.email,
        avatar_url: schema.profiles.avatar_url,
      })
      .from(schema.profiles)
      .where(sql`lower(${schema.profiles.email}) LIKE lower(${'%' + email + '%'})`)
      .limit(Number(limit) || 5);

    res.json(rows);
  } catch (err) { next(err); }
});

// POST /admin/users/brand-roles
router.post('/users/brand-roles', requireAuth, requireSuperadmin, async (req, res, next) => {
  try {
    const { profileIds } = req.body;
    if (!profileIds || profileIds.length === 0) return res.json([]);

    const rows = await db
      .select({
        user_id: schema.user_role_assignments.user_id,
        role_key: schema.roles.key,
        role_display: schema.roles.display_name,
        assignment_id: schema.user_role_assignments.id,
      })
      .from(schema.user_role_assignments)
      .innerJoin(schema.roles, eq(schema.user_role_assignments.role_id, schema.roles.id))
      .where(
        and(
          inArray(schema.user_role_assignments.user_id, profileIds),
          eq(schema.user_role_assignments.is_active, true),
          eq(schema.roles.scope, 'brand')
        )
      );

    res.json(rows);
  } catch (err) { next(err); }
});

// POST /admin/users/branch-roles
router.post('/users/branch-roles', requireAuth, requireSuperadmin, async (req, res, next) => {
  try {
    const { profileIds } = req.body;
    if (!profileIds || profileIds.length === 0) return res.json([]);

    const rows = await db
      .select({
        user_id: schema.user_role_assignments.user_id,
        branch_id: schema.user_role_assignments.branch_id,
        role_key: schema.roles.key,
        assignment_id: schema.user_role_assignments.id,
        default_position: schema.user_role_assignments.default_position,
      })
      .from(schema.user_role_assignments)
      .innerJoin(schema.roles, eq(schema.user_role_assignments.role_id, schema.roles.id))
      .where(
        and(
          inArray(schema.user_role_assignments.user_id, profileIds),
          eq(schema.user_role_assignments.is_active, true),
          eq(schema.roles.scope, 'branch')
        )
      );

    res.json(rows);
  } catch (err) { next(err); }
});

// ── Central Team ─────────────────────────────────────────────────────

// GET /admin/central-team
router.get('/central-team', requireAuth, requireSuperadmin, async (_req, res, next) => {
  try {
    const assignments = await db
      .select({
        assignment_id: schema.user_role_assignments.id,
        user_id: schema.user_role_assignments.user_id,
        role_key: schema.roles.key,
        role_display: schema.roles.display_name,
      })
      .from(schema.user_role_assignments)
      .innerJoin(schema.roles, eq(schema.user_role_assignments.role_id, schema.roles.id))
      .where(
        and(
          eq(schema.user_role_assignments.is_active, true),
          eq(schema.roles.scope, 'brand')
        )
      );

    if (assignments.length === 0) return res.json([]);

    const userIds = [...new Set(assignments.map(a => a.user_id!))];
    const profiles = await db
      .select()
      .from(schema.profiles)
      .where(inArray(schema.profiles.id, userIds));

    const profileMap = new Map(profiles.map(p => [p.id, p]));
    const result = assignments.map(a => ({
      ...a,
      profile: profileMap.get(a.user_id!) || null,
    }));

    res.json(result);
  } catch (err) { next(err); }
});

// POST /admin/central-team
router.post('/central-team', requireAuth, requireSuperadmin, async (req, res, next) => {
  try {
    const { email, roleKey } = req.body;
    if (!email || !roleKey) throw new AppError(400, 'email and roleKey required');

    const profile = await db
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.email, email.toLowerCase().trim()))
      .limit(1);

    if (profile.length === 0) throw new AppError(404, 'User not found with that email');

    const role = await db
      .select()
      .from(schema.roles)
      .where(and(eq(schema.roles.key, roleKey), eq(schema.roles.scope, 'brand')))
      .limit(1);

    if (role.length === 0) throw new AppError(400, 'Invalid brand role key');

    const existing = await db
      .select()
      .from(schema.user_role_assignments)
      .where(
        and(
          eq(schema.user_role_assignments.user_id, profile[0].id),
          eq(schema.user_role_assignments.role_id, role[0].id),
          eq(schema.user_role_assignments.is_active, true)
        )
      )
      .limit(1);

    if (existing.length > 0) throw new AppError(409, 'User already has this brand role');

    const id = randomUUID();
    const now = new Date().toISOString();
    await db.insert(schema.user_role_assignments).values({
      id,
      user_id: profile[0].id,
      role_id: role[0].id,
      branch_id: null,
      is_active: true,
      created_at: now,
    });

    res.status(201).json({ id, user_id: profile[0].id, role_key: roleKey });
  } catch (err) { next(err); }
});

// DELETE /admin/central-team/:userId
router.delete('/central-team/:userId', requireAuth, requireSuperadmin, async (req, res, next) => {
  try {
    const brandRoles = await db
      .select({ id: schema.roles.id })
      .from(schema.roles)
      .where(eq(schema.roles.scope, 'brand'));

    const roleIds = brandRoles.map(r => r.id);
    if (roleIds.length === 0) return res.json({ success: true });

    await db.update(schema.user_role_assignments)
      .set({ is_active: false })
      .where(
        and(
          eq(schema.user_role_assignments.user_id, req.params.userId),
          inArray(schema.user_role_assignments.role_id, roleIds),
          eq(schema.user_role_assignments.is_active, true)
        )
      );

    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── Regulations ──────────────────────────────────────────────────────

// GET /admin/regulations
router.get('/regulations', requireAuth, requireSuperadmin, async (_req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(schema.regulations)
      .orderBy(desc(schema.regulations.created_at));
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /admin/regulations/:regulationId/signature-stats
router.get('/regulations/:regulationId/signature-stats', requireAuth, requireSuperadmin, async (req, res, next) => {
  try {
    const totalProfiles = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.profiles)
      .where(eq(schema.profiles.is_active, true));

    const signed = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.regulation_signatures)
      .where(eq(schema.regulation_signatures.regulation_id, req.params.regulationId));

    res.json({
      total: totalProfiles[0]?.count || 0,
      signed: signed[0]?.count || 0,
    });
  } catch (err) { next(err); }
});

// POST /admin/regulations
router.post('/regulations', requireAuth, requireSuperadmin, async (req, res, next) => {
  try {
    const id = randomUUID();
    const now = new Date().toISOString();
    await db.insert(schema.regulations).values({
      id,
      ...req.body,
      created_by: req.user!.userId,
      created_at: now,
    });
    res.status(201).json({ id });
  } catch (err) { next(err); }
});

// POST /admin/regulations/deactivate-all
router.post('/regulations/deactivate-all', requireAuth, requireSuperadmin, async (_req, res, next) => {
  try {
    await db.update(schema.regulations).set({ is_active: false });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// POST /admin/regulations/upload
router.post('/regulations/upload', requireAuth, requireSuperadmin, async (req, res, next) => {
  try {
    const filePath = req.query.path as string;
    res.json({ url: `/uploads/regulations/${filePath}` });
  } catch (err) { next(err); }
});

// GET /admin/regulations/signed-url
router.get('/regulations/signed-url', requireAuth, async (req, res, next) => {
  try {
    const path = req.query.path as string;
    if (!path) return res.json({ signedUrl: null });
    res.json({ signedUrl: `/uploads/regulations/${path}` });
  } catch (err) { next(err); }
});

// ── Impersonation ────────────────────────────────────────────────────

// GET /admin/impersonation/brand-role-user-ids
router.get('/impersonation/brand-role-user-ids', requireAuth, requireSuperadmin, async (_req, res, next) => {
  try {
    const rows = await db
      .select({ user_id: schema.user_role_assignments.user_id })
      .from(schema.user_role_assignments)
      .innerJoin(schema.roles, eq(schema.user_role_assignments.role_id, schema.roles.id))
      .where(
        and(
          eq(schema.user_role_assignments.is_active, true),
          eq(schema.roles.scope, 'brand')
        )
      );
    res.json([...new Set(rows.map(r => r.user_id))]);
  } catch (err) { next(err); }
});

// GET /admin/impersonation/branch-role-user-ids
router.get('/impersonation/branch-role-user-ids', requireAuth, requireSuperadmin, async (req, res, next) => {
  try {
    const { branchId } = req.query as { branchId?: string };
    const conditions = [
      eq(schema.user_role_assignments.is_active, true),
      eq(schema.roles.scope, 'branch'),
    ];
    if (branchId) {
      conditions.push(eq(schema.user_role_assignments.branch_id, branchId));
    }

    const rows = await db
      .select({ user_id: schema.user_role_assignments.user_id })
      .from(schema.user_role_assignments)
      .innerJoin(schema.roles, eq(schema.user_role_assignments.role_id, schema.roles.id))
      .where(and(...conditions));

    res.json([...new Set(rows.map(r => r.user_id))]);
  } catch (err) { next(err); }
});

// GET /admin/impersonation/operational-staff-user-ids
router.get('/impersonation/operational-staff-user-ids', requireAuth, requireSuperadmin, async (_req, res, next) => {
  try {
    const rows = await db
      .select({ user_id: schema.user_role_assignments.user_id })
      .from(schema.user_role_assignments)
      .innerJoin(schema.roles, eq(schema.user_role_assignments.role_id, schema.roles.id))
      .where(
        and(
          eq(schema.user_role_assignments.is_active, true),
          eq(schema.roles.scope, 'branch')
        )
      );
    res.json([...new Set(rows.map(r => r.user_id))]);
  } catch (err) { next(err); }
});

// GET /admin/impersonation/superadmin-user-ids
router.get('/impersonation/superadmin-user-ids', requireAuth, requireSuperadmin, async (_req, res, next) => {
  try {
    const rows = await db
      .select({ user_id: schema.user_role_assignments.user_id })
      .from(schema.user_role_assignments)
      .innerJoin(schema.roles, eq(schema.user_role_assignments.role_id, schema.roles.id))
      .where(
        and(
          eq(schema.user_role_assignments.is_active, true),
          eq(schema.roles.key, 'superadmin')
        )
      );
    res.json([...new Set(rows.map(r => r.user_id))]);
  } catch (err) { next(err); }
});

// POST /admin/impersonation/profiles
router.post('/impersonation/profiles', requireAuth, requireSuperadmin, async (req, res, next) => {
  try {
    const { userIds, search, limit } = req.body;
    if (!userIds || userIds.length === 0) return res.json([]);

    let q = db
      .select()
      .from(schema.profiles)
      .where(inArray(schema.profiles.id, userIds));

    const rows = await q;

    let filtered = rows;
    if (search) {
      const s = search.toLowerCase();
      filtered = rows.filter(r =>
        r.full_name?.toLowerCase().includes(s) ||
        r.email?.toLowerCase().includes(s)
      );
    }

    res.json(filtered.slice(0, limit || 50));
  } catch (err) { next(err); }
});

// POST /admin/impersonation/brand-roles
router.post('/impersonation/brand-roles', requireAuth, requireSuperadmin, async (req, res, next) => {
  try {
    const { userIds } = req.body;
    if (!userIds || userIds.length === 0) return res.json([]);

    const rows = await db
      .select({
        user_id: schema.user_role_assignments.user_id,
        role_key: schema.roles.key,
        assignment_id: schema.user_role_assignments.id,
      })
      .from(schema.user_role_assignments)
      .innerJoin(schema.roles, eq(schema.user_role_assignments.role_id, schema.roles.id))
      .where(
        and(
          inArray(schema.user_role_assignments.user_id, userIds),
          eq(schema.user_role_assignments.is_active, true),
          eq(schema.roles.scope, 'brand')
        )
      );

    res.json(rows);
  } catch (err) { next(err); }
});

// POST /admin/impersonation/branch-roles
router.post('/impersonation/branch-roles', requireAuth, requireSuperadmin, async (req, res, next) => {
  try {
    const { userIds } = req.body;
    if (!userIds || userIds.length === 0) return res.json([]);

    const rows = await db
      .select({
        user_id: schema.user_role_assignments.user_id,
        branch_id: schema.user_role_assignments.branch_id,
        role_key: schema.roles.key,
        assignment_id: schema.user_role_assignments.id,
      })
      .from(schema.user_role_assignments)
      .innerJoin(schema.roles, eq(schema.user_role_assignments.role_id, schema.roles.id))
      .where(
        and(
          inArray(schema.user_role_assignments.user_id, userIds),
          eq(schema.user_role_assignments.is_active, true),
          eq(schema.roles.scope, 'branch')
        )
      );

    res.json(rows);
  } catch (err) { next(err); }
});

// ── Closure Config ───────────────────────────────────────────────────

// GET /admin/closure-config
router.get('/closure-config', requireAuth, requireSuperadmin, async (_req, res, next) => {
  try {
    const rows = await db.select().from(schema.brand_closure_config);
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /admin/closure-config
router.post('/closure-config', requireAuth, requireSuperadmin, async (req, res, next) => {
  try {
    const id = randomUUID();
    const now = new Date().toISOString();
    await db.insert(schema.brand_closure_config).values({
      id,
      ...req.body,
      created_at: now,
      updated_at: now,
    });
    res.status(201).json({ id });
  } catch (err) { next(err); }
});

// PUT /admin/closure-config/:id/toggle
router.put('/closure-config/:id/toggle', requireAuth, requireSuperadmin, async (req, res, next) => {
  try {
    const { is_active } = req.body;
    const now = new Date().toISOString();
    await db.update(schema.brand_closure_config)
      .set({ is_active, updated_at: now })
      .where(eq(schema.brand_closure_config.id, req.params.id));
    res.json({ success: true });
  } catch (err) { next(err); }
});

// DELETE /admin/closure-config/:id
router.delete('/closure-config/:id', requireAuth, requireSuperadmin, async (req, res, next) => {
  try {
    await db.delete(schema.brand_closure_config)
      .where(eq(schema.brand_closure_config.id, req.params.id));
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── Communications ───────────────────────────────────────────────────

// GET /admin/communications
router.get('/communications', requireAuth, requireSuperadmin, async (_req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(schema.communications)
      .orderBy(desc(schema.communications.created_at));
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /admin/communications
router.post('/communications', requireAuth, requireSuperadmin, async (req, res, next) => {
  try {
    const id = randomUUID();
    const now = new Date().toISOString();
    await db.insert(schema.communications).values({
      id,
      ...req.body,
      created_by: req.user!.userId,
      created_at: now,
      updated_at: now,
    });
    res.status(201).json({ id });
  } catch (err) { next(err); }
});

// DELETE /admin/communications/:id
router.delete('/communications/:id', requireAuth, requireSuperadmin, async (req, res, next) => {
  try {
    await db.delete(schema.communications)
      .where(eq(schema.communications.id, req.params.id));
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── Reports ──────────────────────────────────────────────────────────

// GET /admin/reports/gastos-summary
router.get('/reports/gastos-summary', requireAuth, requireSuperadmin, async (req, res, next) => {
  try {
    const { periodo } = req.query as { periodo?: string };
    if (!periodo) throw new AppError(400, 'periodo is required');

    const rows = await db
      .select()
      .from(schema.expenses)
      .where(eq(schema.expenses.period, periodo));

    res.json(rows);
  } catch (err) { next(err); }
});

// GET /admin/reports/clock-entries-summary
router.get('/reports/clock-entries-summary', requireAuth, requireSuperadmin, async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    if (!startDate || !endDate) throw new AppError(400, 'startDate and endDate are required');

    const rows = await db
      .select()
      .from(schema.clock_entries)
      .where(
        sql`${schema.clock_entries.created_at} >= ${startDate} AND ${schema.clock_entries.created_at} <= ${endDate}`
      );

    res.json(rows);
  } catch (err) { next(err); }
});

// ── Ventas Mensuales ─────────────────────────────────────────────────

// GET /admin/ventas-mensuales
router.get('/ventas-mensuales', requireAuth, requireSuperadmin, async (req, res, next) => {
  try {
    const { periodo } = req.query as { periodo?: string };
    if (!periodo) throw new AppError(400, 'periodo is required');

    const rows = await db
      .select()
      .from(schema.branch_monthly_sales)
      .where(eq(schema.branch_monthly_sales.period, periodo));

    res.json(rows);
  } catch (err) { next(err); }
});

// ── Brand Monthly Stats ──────────────────────────────────────────────

// GET /admin/brand-monthly-stats
router.get('/brand-monthly-stats', requireAuth, requireSuperadmin, async (req, res, next) => {
  try {
    const { firstDay, lastDay } = req.query as { firstDay?: string; lastDay?: string };
    if (!firstDay || !lastDay) throw new AppError(400, 'firstDay and lastDay are required');

    const closures = await db
      .select()
      .from(schema.shift_closures)
      .where(
        sql`${schema.shift_closures.date} >= ${firstDay} AND ${schema.shift_closures.date} <= ${lastDay}`
      );

    const clockEntries = await db
      .select()
      .from(schema.clock_entries)
      .where(
        sql`${schema.clock_entries.created_at} >= ${firstDay} AND ${schema.clock_entries.created_at} <= ${lastDay + 'T23:59:59'}`
      );

    res.json({ closures, clockEntries });
  } catch (err) { next(err); }
});

// ── Brand Closures ───────────────────────────────────────────────────

// GET /admin/brand-closures
router.get('/brand-closures', requireAuth, requireSuperadmin, async (req, res, next) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };
    if (!from || !to) throw new AppError(400, 'from and to are required');

    const rows = await db
      .select()
      .from(schema.shift_closures)
      .where(
        sql`${schema.shift_closures.date} >= ${from} AND ${schema.shift_closures.date} <= ${to}`
      )
      .orderBy(desc(schema.shift_closures.date));

    res.json(rows);
  } catch (err) { next(err); }
});

// ── Recalculate Costs ────────────────────────────────────────────────

// POST /admin/recalculate-all-costs
// Fase 2 (rework): antes era stub. Ahora ejecuta el cost rollup engine
// completo (recetas → items → combos, leaf-first).
router.post('/recalculate-all-costs', requireAuth, requireSuperadmin, async (req, res, next) => {
  try {
    const { rollupAll } = await import('../services/costRollup.js');
    const stats = await rollupAll(req.user?.userId ?? null);
    res.json({
      success: true,
      message: 'Cost recalculation completed',
      stats,
    });
  } catch (err) { next(err); }
});

// ── Promotions ───────────────────────────────────────────────────────

// GET /admin/promotions/:promoId/items-with-extras
router.get('/promotions/:promoId/items-with-extras', requireAuth, async (req, res, next) => {
  try {
    const { promoId } = req.params;

    const items = await db
      .select()
      .from(schema.promotion_items)
      .where(eq(schema.promotion_items.promocion_id, promoId));

    const itemIds = items.map(i => i.id);
    let extras: any[] = [];
    if (itemIds.length > 0) {
      extras = await db
        .select()
        .from(schema.promotion_item_extras)
        .where(inArray(schema.promotion_item_extras.promocion_item_id, itemIds));
    }

    const menuItemIds = [...new Set(items.map(i => i.item_carta_id).filter(Boolean))];
    let menuItems: any[] = [];
    if (menuItemIds.length > 0) {
      menuItems = await db
        .select()
        .from(schema.menu_items)
        .where(inArray(schema.menu_items.id, menuItemIds as string[]));
    }

    const menuMap = new Map(menuItems.map(m => [m.id, m]));
    const extrasMap = new Map<string, any[]>();
    for (const e of extras) {
      const arr = extrasMap.get(e.promocion_item_id) || [];
      arr.push(e);
      extrasMap.set(e.promocion_item_id, arr);
    }

    const result = items.map(i => ({
      ...i,
      menu_item: menuMap.get(i.item_carta_id!) || null,
      extras: extrasMap.get(i.id) || [],
    }));

    res.json(result);
  } catch (err) { next(err); }
});

// ── Audit Logs ───────────────────────────────────────────────────────

// GET /admin/audit-logs
router.get('/audit-logs', requireAuth, requireSuperadmin, async (req, res, next) => {
  try {
    const { page, pageSize, search, tableFilter } = req.query as Record<string, string>;
    const p = Number(page) || 1;
    const ps = Number(pageSize) || 20;
    const offset = (p - 1) * ps;

    let conditions: any[] = [];
    if (tableFilter) {
      conditions.push(eq(schema.audit_logs.table_name, tableFilter));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select()
      .from(schema.audit_logs)
      .where(whereClause)
      .orderBy(desc(schema.audit_logs.created_at))
      .limit(ps)
      .offset(offset);

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.audit_logs)
      .where(whereClause);

    res.json({ logs: rows, total: countResult[0]?.count || 0 });
  } catch (err) { next(err); }
});

// GET /admin/audit-logs/tables
router.get('/audit-logs/tables', requireAuth, requireSuperadmin, async (_req, res, next) => {
  try {
    const rows = await db
      .select({ table_name: schema.audit_logs.table_name })
      .from(schema.audit_logs)
      .groupBy(schema.audit_logs.table_name);
    res.json(rows.map(r => r.table_name).filter(Boolean));
  } catch (err) { next(err); }
});

export { router as adminRoutes };

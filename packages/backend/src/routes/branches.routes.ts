import { Router } from 'express';
import { db } from '../db/connection.js';
import * as schema from '../db/schema.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { requireSuperadmin, getUserRoles } from '../middleware/permissions.js';
import { AppError } from '../middleware/errorHandler.js';
import { eq, and, desc, inArray, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';

const router = Router();

// ── Public branch endpoints (no auth) ────────────────────────────────

// GET /branches/public
router.get('/public', async (_req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(schema.branches)
      .where(eq(schema.branches.is_active, true));
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /branches/public/names
router.get('/public/names', async (_req, res, next) => {
  try {
    const rows = await db
      .select({ id: schema.branches.id, name: schema.branches.name })
      .from(schema.branches)
      .where(eq(schema.branches.is_active, true));
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /branches/public/ids
router.get('/public/ids', async (_req, res, next) => {
  try {
    const rows = await db
      .select({ id: schema.branches.id })
      .from(schema.branches)
      .where(eq(schema.branches.is_active, true));
    res.json(rows.map(r => r.id));
  } catch (err) { next(err); }
});

// GET /branches/public/pedir
router.get('/public/pedir', async (_req, res, next) => {
  try {
    const rows = await db
      .select({
        id: schema.branches.id,
        name: schema.branches.name,
        slug: schema.branches.slug,
        address: schema.branches.address,
        city: schema.branches.city,
        cover_image_url: schema.branches.cover_image_url,
        public_status: schema.branches.public_status,
        public_hours: schema.branches.public_hours,
      })
      .from(schema.branches)
      .where(eq(schema.branches.is_active, true));
    res.json(rows);
  } catch (err) { next(err); }
});

// ── Authenticated branch endpoints ───────────────────────────────────

// GET /branches
router.get('/', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(schema.branches);
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /branches/active
router.get('/active', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(schema.branches)
      .where(eq(schema.branches.is_active, true));
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /branches/active-names
router.get('/active-names', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db
      .select({ id: schema.branches.id, name: schema.branches.name })
      .from(schema.branches)
      .where(eq(schema.branches.is_active, true));
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /branches/id-name
router.get('/id-name', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db
      .select({ id: schema.branches.id, name: schema.branches.name })
      .from(schema.branches);
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /branches/slugs
router.get('/slugs', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db
      .select({ id: schema.branches.id, name: schema.branches.name, slug: schema.branches.slug })
      .from(schema.branches);
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /branches/by-ids
router.post('/by-ids', requireAuth, async (req, res, next) => {
  try {
    const { branchIds } = req.body;
    if (!branchIds || branchIds.length === 0) return res.json([]);
    const rows = await db
      .select({ id: schema.branches.id, name: schema.branches.name })
      .from(schema.branches)
      .where(inArray(schema.branches.id, branchIds));
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /branches/by-slug/:slug
router.get('/by-slug/:slug', requireAuth, async (req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(schema.branches)
      .where(eq(schema.branches.slug, req.params.slug))
      .limit(1);
    if (rows.length === 0) throw new AppError(404, 'Branch not found');
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// GET /branches/:id
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(schema.branches)
      .where(eq(schema.branches.id, req.params.id))
      .limit(1);
    if (rows.length === 0) throw new AppError(404, 'Branch not found');
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// GET /branches/:id/name
router.get('/:id/name', requireAuth, async (req, res, next) => {
  try {
    const rows = await db
      .select({ name: schema.branches.name })
      .from(schema.branches)
      .where(eq(schema.branches.id, req.params.id))
      .limit(1);
    res.json(rows[0] || null);
  } catch (err) { next(err); }
});

// GET /branches/:id/slug
router.get('/:id/slug', requireAuth, async (req, res, next) => {
  try {
    const rows = await db
      .select({ slug: schema.branches.slug, name: schema.branches.name })
      .from(schema.branches)
      .where(eq(schema.branches.id, req.params.id))
      .limit(1);
    res.json(rows[0] || null);
  } catch (err) { next(err); }
});

// POST /branches
router.post('/', requireAuth, requireSuperadmin, async (req, res, next) => {
  try {
    const id = randomUUID();
    const now = new Date().toISOString();
    await db.insert(schema.branches).values({
      id,
      ...req.body,
      created_at: now,
      updated_at: now,
    });
    const rows = await db.select().from(schema.branches).where(eq(schema.branches.id, id)).limit(1);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// PUT /branches/:id
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const now = new Date().toISOString();
    await db.update(schema.branches)
      .set({ ...req.body, updated_at: now })
      .where(eq(schema.branches.id, req.params.id));
    const rows = await db.select().from(schema.branches).where(eq(schema.branches.id, req.params.id)).limit(1);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// ── Branch Team ──────────────────────────────────────────────────────

// GET /branches/:branchId/team
router.get('/:branchId/team', requireAuth, async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const assignments = await db
      .select({
        assignment_id: schema.user_role_assignments.id,
        user_id: schema.user_role_assignments.user_id,
        role_key: schema.roles.key,
        role_display: schema.roles.display_name,
        is_active: schema.user_role_assignments.is_active,
        default_position: schema.user_role_assignments.default_position,
        clock_pin: schema.user_role_assignments.clock_pin,
      })
      .from(schema.user_role_assignments)
      .innerJoin(schema.roles, eq(schema.user_role_assignments.role_id, schema.roles.id))
      .where(
        and(
          eq(schema.user_role_assignments.branch_id, branchId),
          eq(schema.user_role_assignments.is_active, true),
          eq(schema.roles.scope, 'branch')
        )
      );

    if (assignments.length === 0) return res.json([]);

    const userIds = [...new Set(assignments.map(a => a.user_id!))];
    const profiles = await db
      .select()
      .from(schema.profiles)
      .where(inArray(schema.profiles.id, userIds));

    const profileMap = new Map(profiles.map(p => [p.id, p]));

    const team = assignments.map(a => ({
      ...a,
      profile: profileMap.get(a.user_id!) || null,
    }));

    res.json(team);
  } catch (err) { next(err); }
});

// POST /branches/:branchId/team
router.post('/:branchId/team', requireAuth, async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const { userId, roleKey, position } = req.body;

    const role = await db.select().from(schema.roles).where(eq(schema.roles.key, roleKey)).limit(1);
    if (role.length === 0) throw new AppError(400, 'Invalid role key');

    const id = randomUUID();
    const now = new Date().toISOString();
    await db.insert(schema.user_role_assignments).values({
      id,
      user_id: userId,
      role_id: role[0].id,
      branch_id: branchId,
      is_active: true,
      default_position: position || null,
      created_at: now,
    });

    res.status(201).json({ id, user_id: userId, branch_id: branchId, role_key: roleKey });
  } catch (err) { next(err); }
});

// PUT /branches/:branchId/team/:userId/role
router.put('/:branchId/team/:userId/role', requireAuth, async (req, res, next) => {
  try {
    const { branchId, userId } = req.params;
    const { roleKey } = req.body;

    const role = await db.select().from(schema.roles).where(eq(schema.roles.key, roleKey)).limit(1);
    if (role.length === 0) throw new AppError(400, 'Invalid role key');

    await db.update(schema.user_role_assignments)
      .set({ role_id: role[0].id })
      .where(
        and(
          eq(schema.user_role_assignments.user_id, userId),
          eq(schema.user_role_assignments.branch_id, branchId),
          eq(schema.user_role_assignments.is_active, true)
        )
      );

    res.json({ success: true });
  } catch (err) { next(err); }
});

// PUT /branches/:branchId/team/:userId/position
router.put('/:branchId/team/:userId/position', requireAuth, async (req, res, next) => {
  try {
    const { branchId, userId } = req.params;
    const { position } = req.body;

    await db.update(schema.user_role_assignments)
      .set({ default_position: position ?? null })
      .where(
        and(
          eq(schema.user_role_assignments.user_id, userId),
          eq(schema.user_role_assignments.branch_id, branchId),
          eq(schema.user_role_assignments.is_active, true)
        )
      );

    res.json({ success: true });
  } catch (err) { next(err); }
});

// DELETE /branches/:branchId/team/:userId
router.delete('/:branchId/team/:userId', requireAuth, async (req, res, next) => {
  try {
    const { branchId, userId } = req.params;
    await db.update(schema.user_role_assignments)
      .set({ is_active: false })
      .where(
        and(
          eq(schema.user_role_assignments.user_id, userId),
          eq(schema.user_role_assignments.branch_id, branchId),
          eq(schema.user_role_assignments.is_active, true)
        )
      );
    res.json({ success: true });
  } catch (err) { next(err); }
});

// GET /branches/:branchId/managers
router.get('/:branchId/managers', requireAuth, async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const managerRoles = await db
      .select({ id: schema.roles.id })
      .from(schema.roles)
      .where(
        and(
          eq(schema.roles.scope, 'branch'),
          inArray(schema.roles.key, ['encargado', 'sub_encargado', 'manager'])
        )
      );

    if (managerRoles.length === 0) return res.json([]);

    const roleIds = managerRoles.map(r => r.id);
    const assignments = await db
      .select({ user_id: schema.user_role_assignments.user_id })
      .from(schema.user_role_assignments)
      .where(
        and(
          eq(schema.user_role_assignments.branch_id, branchId),
          eq(schema.user_role_assignments.is_active, true),
          inArray(schema.user_role_assignments.role_id, roleIds)
        )
      );

    if (assignments.length === 0) return res.json([]);

    const userIds = assignments.map(a => a.user_id!);
    const profiles = await db
      .select()
      .from(schema.profiles)
      .where(inArray(schema.profiles.id, userIds));

    res.json(profiles);
  } catch (err) { next(err); }
});

// GET /branches/:branchId/staff
router.get('/:branchId/staff', requireAuth, async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const assignments = await db
      .select({
        user_id: schema.user_role_assignments.user_id,
        role_key: schema.roles.key,
        default_position: schema.user_role_assignments.default_position,
      })
      .from(schema.user_role_assignments)
      .innerJoin(schema.roles, eq(schema.user_role_assignments.role_id, schema.roles.id))
      .where(
        and(
          eq(schema.user_role_assignments.branch_id, branchId),
          eq(schema.user_role_assignments.is_active, true),
          eq(schema.roles.scope, 'branch')
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

// GET /branches/:branchId/delivery-info
router.get('/:branchId/delivery-info', requireAuth, async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const branch = await db
      .select({
        id: schema.branches.id,
        name: schema.branches.name,
        address: schema.branches.address,
        city: schema.branches.city,
        phone: schema.branches.phone,
        latitude: schema.branches.latitude,
        longitude: schema.branches.longitude,
      })
      .from(schema.branches)
      .where(eq(schema.branches.id, branchId))
      .limit(1);

    if (branch.length === 0) throw new AppError(404, 'Branch not found');

    const deliveryConfig = await db
      .select()
      .from(schema.branch_delivery_config)
      .where(eq(schema.branch_delivery_config.branch_id, branchId))
      .limit(1);

    const zones = await db
      .select()
      .from(schema.delivery_zones)
      .where(eq(schema.delivery_zones.branch_id, branchId));

    res.json({
      branch: branch[0],
      deliveryConfig: deliveryConfig[0] || null,
      zones,
    });
  } catch (err) { next(err); }
});

// ── POS Config ───────────────────────────────────────────────────────

// POST /branches/:branchId/pos-config
router.post('/:branchId/pos-config', requireAuth, async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const { pos_enabled } = req.body;
    const now = new Date().toISOString();

    const existing = await db
      .select()
      .from(schema.pos_config)
      .where(eq(schema.pos_config.branch_id, branchId))
      .limit(1);

    if (existing.length > 0) {
      await db.update(schema.pos_config)
        .set({ pos_enabled: pos_enabled ? 'true' : 'false', updated_at: now })
        .where(eq(schema.pos_config.id, existing[0].id));
    } else {
      await db.insert(schema.pos_config).values({
        id: randomUUID(),
        branch_id: branchId,
        pos_enabled: pos_enabled ? 'true' : 'false',
        updated_at: now,
      });
    }

    res.json({ success: true });
  } catch (err) { next(err); }
});

// GET /branches/:branchId/pos-config
router.get('/:branchId/pos-config', requireAuth, async (req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(schema.pos_config)
      .where(eq(schema.pos_config.branch_id, req.params.branchId))
      .limit(1);
    res.json(rows[0] || null);
  } catch (err) { next(err); }
});

// ── Branch Printers ──────────────────────────────────────────────────

// GET /branches/:branchId/printers
router.get('/:branchId/printers', requireAuth, async (req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(schema.branch_printers)
      .where(eq(schema.branch_printers.branch_id, req.params.branchId));
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /branches/:branchId/printers
router.post('/:branchId/printers', requireAuth, async (req, res, next) => {
  try {
    const id = randomUUID();
    const now = new Date().toISOString();
    await db.insert(schema.branch_printers).values({
      id,
      branch_id: req.params.branchId,
      ...req.body,
      created_at: now,
    });
    res.status(201).json({ id });
  } catch (err) { next(err); }
});

// PUT /branches/printers/:id
router.put('/printers/:id', requireAuth, async (req, res, next) => {
  try {
    await db.update(schema.branch_printers)
      .set(req.body)
      .where(eq(schema.branch_printers.id, req.params.id));
    res.json({ success: true });
  } catch (err) { next(err); }
});

// DELETE /branches/printers/:id
router.delete('/printers/:id', requireAuth, async (req, res, next) => {
  try {
    await db.delete(schema.branch_printers)
      .where(eq(schema.branch_printers.id, req.params.id));
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── Kitchen Stations ─────────────────────────────────────────────────

// GET /branches/:branchId/stations
router.get('/:branchId/stations', requireAuth, async (req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(schema.kitchen_stations)
      .where(
        and(
          eq(schema.kitchen_stations.branch_id, req.params.branchId),
          eq(schema.kitchen_stations.is_active, true)
        )
      );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /branches/:branchId/stations
router.post('/:branchId/stations', requireAuth, async (req, res, next) => {
  try {
    const id = randomUUID();
    const now = new Date().toISOString();
    await db.insert(schema.kitchen_stations).values({
      id,
      branch_id: req.params.branchId,
      ...req.body,
      created_at: now,
    });
    res.status(201).json({ id });
  } catch (err) { next(err); }
});

// PUT /branches/stations/:id
router.put('/stations/:id', requireAuth, async (req, res, next) => {
  try {
    await db.update(schema.kitchen_stations)
      .set(req.body)
      .where(eq(schema.kitchen_stations.id, req.params.id));
    res.json({ success: true });
  } catch (err) { next(err); }
});

// DELETE /branches/stations/:id
router.delete('/stations/:id', requireAuth, async (req, res, next) => {
  try {
    await db.update(schema.kitchen_stations)
      .set({ is_active: false })
      .where(eq(schema.kitchen_stations.id, req.params.id));
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── Branch Shifts ────────────────────────────────────────────────────

// GET /branches/:branchId/shifts
router.get('/:branchId/shifts', requireAuth, async (req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(schema.branch_shifts)
      .where(eq(schema.branch_shifts.branch_id, req.params.branchId));
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /branches/:branchId/shifts
router.post('/:branchId/shifts', requireAuth, async (req, res, next) => {
  try {
    const id = randomUUID();
    const now = new Date().toISOString();
    await db.insert(schema.branch_shifts).values({
      id,
      branch_id: req.params.branchId,
      ...req.body,
      created_at: now,
      updated_at: now,
    });
    res.status(201).json({ id });
  } catch (err) { next(err); }
});

// PUT /branches/:branchId/shifts/:shiftId
router.put('/:branchId/shifts/:shiftId', requireAuth, async (req, res, next) => {
  try {
    const now = new Date().toISOString();
    await db.update(schema.branch_shifts)
      .set({ ...req.body, updated_at: now })
      .where(eq(schema.branch_shifts.id, req.params.shiftId));
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── Clock Window ─────────────────────────────────────────────────────

// PUT /branches/:branchId/clock-window
router.put('/:branchId/clock-window', requireAuth, async (req, res, next) => {
  try {
    const { clock_window_before_min, clock_window_after_min } = req.body;
    const now = new Date().toISOString();
    await db.update(schema.branches)
      .set({ clock_window_before_min, clock_window_after_min, updated_at: now })
      .where(eq(schema.branches.id, req.params.branchId));
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── Manager Dashboard ────────────────────────────────────────────────

// GET /branches/:branchId/dashboard/today-closures
router.get('/:branchId/dashboard/today-closures', requireAuth, async (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const rows = await db
      .select()
      .from(schema.shift_closures)
      .where(
        and(
          eq(schema.shift_closures.branch_id, req.params.branchId),
          eq(schema.shift_closures.date, today)
        )
      );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /branches/:branchId/dashboard/recent-closures
router.get('/:branchId/dashboard/recent-closures', requireAuth, async (req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(schema.shift_closures)
      .where(eq(schema.shift_closures.branch_id, req.params.branchId))
      .orderBy(desc(schema.shift_closures.date))
      .limit(30);
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /branches/:branchId/dashboard/clock-entries
router.get('/:branchId/dashboard/clock-entries', requireAuth, async (req, res, next) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };
    let q = db
      .select()
      .from(schema.clock_entries)
      .where(eq(schema.clock_entries.branch_id, req.params.branchId))
      .orderBy(desc(schema.clock_entries.created_at))
      .limit(200);
    const rows = await q;
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /branches/:branchId/dashboard/orders-today
router.get('/:branchId/dashboard/orders-today', requireAuth, async (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const rows = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.branch_id, req.params.branchId))
      .orderBy(desc(schema.orders.created_at))
      .limit(100);
    res.json(rows);
  } catch (err) { next(err); }
});

export { router as branchRoutes };

import { Router } from 'express';
import { db } from '../db/connection.js';
import * as schema from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';

const router = Router();

// GET /profiles/clock-pin-available
router.get('/clock-pin-available', requireAuth, async (req, res, next) => {
  try {
    const { branch_id, pin, exclude_user_id } = req.query as Record<string, string>;
    if (!branch_id || !pin) throw new AppError(400, 'branch_id and pin required');

    const rows = await db
      .select({ user_id: schema.user_role_assignments.user_id })
      .from(schema.user_role_assignments)
      .where(
        and(
          eq(schema.user_role_assignments.branch_id, branch_id),
          eq(schema.user_role_assignments.clock_pin, pin),
          eq(schema.user_role_assignments.is_active, true)
        )
      );

    const available = exclude_user_id
      ? rows.every(r => r.user_id === exclude_user_id)
      : rows.length === 0;

    res.json(available);
  } catch (err) { next(err); }
});

// GET /profiles/regulations/latest
router.get('/regulations/latest', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(schema.regulations)
      .where(eq(schema.regulations.is_active, true))
      .orderBy(desc(schema.regulations.created_at))
      .limit(1);
    res.json(rows[0] || null);
  } catch (err) { next(err); }
});

// POST /profiles/by-ids
router.post('/by-ids', requireAuth, async (req, res, next) => {
  try {
    const { user_ids } = req.body;
    if (!user_ids || user_ids.length === 0) return res.json([]);
    const rows = await db
      .select({ id: schema.profiles.id, full_name: schema.profiles.full_name })
      .from(schema.profiles)
      .where(inArray(schema.profiles.id, user_ids));
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /profiles/employee-data-by-users
router.post('/employee-data-by-users', requireAuth, async (req, res, next) => {
  try {
    const { branch_id, user_ids } = req.body;
    if (!user_ids || user_ids.length === 0) return res.json([]);
    const rows = await db
      .select()
      .from(schema.employee_data)
      .where(
        and(
          eq(schema.employee_data.branch_id, branch_id),
          inArray(schema.employee_data.user_id, user_ids)
        )
      );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /profiles/regulation-signatures
router.post('/regulation-signatures', requireAuth, async (req, res, next) => {
  try {
    const { regulation_id, user_ids } = req.body;
    if (!user_ids || user_ids.length === 0) return res.json([]);
    const rows = await db
      .select()
      .from(schema.regulation_signatures)
      .where(
        and(
          eq(schema.regulation_signatures.regulation_id, regulation_id),
          inArray(schema.regulation_signatures.user_id, user_ids)
        )
      );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /profiles/regulation-signatures/create
router.post('/regulation-signatures/create', requireAuth, async (req, res, next) => {
  try {
    const id = randomUUID();
    const now = new Date().toISOString();
    await db.insert(schema.regulation_signatures).values({
      id,
      ...req.body,
      created_at: now,
    });
    res.status(201).json({ id });
  } catch (err) { next(err); }
});

// GET /profiles/branches/:branchId/name
router.get('/branches/:branchId/name', requireAuth, async (req, res, next) => {
  try {
    const rows = await db
      .select({ name: schema.branches.name })
      .from(schema.branches)
      .where(eq(schema.branches.id, req.params.branchId))
      .limit(1);
    res.json(rows[0] || null);
  } catch (err) { next(err); }
});

// GET /profiles/branches/:branchId/team-roles
router.get('/branches/:branchId/team-roles', requireAuth, async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const rows = await db
      .select({
        user_id: schema.user_role_assignments.user_id,
        local_role: schema.roles.key,
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
    res.json(rows);
  } catch (err) { next(err); }
});

// PUT /profiles/branch-roles/:roleId/clock-pin
router.put('/branch-roles/:roleId/clock-pin', requireAuth, async (req, res, next) => {
  try {
    const { pin } = req.body;
    await db.update(schema.user_role_assignments)
      .set({ clock_pin: pin })
      .where(eq(schema.user_role_assignments.id, req.params.roleId));
    res.json({ success: true });
  } catch (err) { next(err); }
});

// GET /profiles/branch-roles/:roleId/clock-pin
router.get('/branch-roles/:roleId/clock-pin', requireAuth, async (req, res, next) => {
  try {
    const rows = await db
      .select({ clock_pin: schema.user_role_assignments.clock_pin })
      .from(schema.user_role_assignments)
      .where(eq(schema.user_role_assignments.id, req.params.roleId))
      .limit(1);
    res.json(rows[0] || { clock_pin: null });
  } catch (err) { next(err); }
});

// GET /profiles/:id
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.id, req.params.id))
      .limit(1);
    if (rows.length === 0) throw new AppError(404, 'Profile not found');
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// PUT /profiles/:id
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const now = new Date().toISOString();
    await db.update(schema.profiles)
      .set({ ...req.body, updated_at: now })
      .where(eq(schema.profiles.id, req.params.id));
    const rows = await db.select().from(schema.profiles).where(eq(schema.profiles.id, req.params.id)).limit(1);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// PUT /profiles/:id/staff
router.put('/:id/staff', requireAuth, async (req, res, next) => {
  try {
    const now = new Date().toISOString();
    const { branch_id, ...profileData } = req.body;

    if (Object.keys(profileData).length > 0) {
      await db.update(schema.profiles)
        .set({ ...profileData, updated_at: now })
        .where(eq(schema.profiles.id, req.params.id));
    }

    if (branch_id && req.body.employee_data) {
      const existing = await db
        .select()
        .from(schema.employee_data)
        .where(
          and(
            eq(schema.employee_data.user_id, req.params.id),
            eq(schema.employee_data.branch_id, branch_id)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await db.update(schema.employee_data)
          .set({ ...req.body.employee_data, updated_at: now })
          .where(eq(schema.employee_data.id, existing[0].id));
      } else {
        await db.insert(schema.employee_data).values({
          id: randomUUID(),
          user_id: req.params.id,
          branch_id,
          ...req.body.employee_data,
          created_at: now,
          updated_at: now,
        });
      }
    }

    res.json({ success: true });
  } catch (err) { next(err); }
});

// GET /profiles/:id/full
router.get('/:id/full', requireAuth, async (req, res, next) => {
  try {
    const profile = await db
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.id, req.params.id))
      .limit(1);

    if (profile.length === 0) throw new AppError(404, 'Profile not found');

    const roleAssignments = await db
      .select({
        id: schema.user_role_assignments.id,
        branch_id: schema.user_role_assignments.branch_id,
        role_key: schema.roles.key,
        role_scope: schema.roles.scope,
        role_display: schema.roles.display_name,
        is_active: schema.user_role_assignments.is_active,
        default_position: schema.user_role_assignments.default_position,
        clock_pin: schema.user_role_assignments.clock_pin,
      })
      .from(schema.user_role_assignments)
      .innerJoin(schema.roles, eq(schema.user_role_assignments.role_id, schema.roles.id))
      .where(
        and(
          eq(schema.user_role_assignments.user_id, req.params.id),
          eq(schema.user_role_assignments.is_active, true)
        )
      );

    const employeeData = await db
      .select()
      .from(schema.employee_data)
      .where(eq(schema.employee_data.user_id, req.params.id));

    res.json({
      ...profile[0],
      roles: roleAssignments,
      employeeData: employeeData,
    });
  } catch (err) { next(err); }
});

// GET /profiles/:id/branch-roles
router.get('/:id/branch-roles', requireAuth, async (req, res, next) => {
  try {
    const rows = await db
      .select({
        id: schema.user_role_assignments.id,
        branch_id: schema.user_role_assignments.branch_id,
        local_role: schema.roles.key,
        clock_pin: schema.user_role_assignments.clock_pin,
      })
      .from(schema.user_role_assignments)
      .innerJoin(schema.roles, eq(schema.user_role_assignments.role_id, schema.roles.id))
      .where(
        and(
          eq(schema.user_role_assignments.user_id, req.params.id),
          eq(schema.user_role_assignments.is_active, true),
          eq(schema.roles.scope, 'branch')
        )
      );

    const branchIds = [...new Set(rows.map(r => r.branch_id!).filter(Boolean))];
    let branchMap = new Map<string, { id: string; name: string | null }>();
    if (branchIds.length > 0) {
      const branches = await db
        .select({ id: schema.branches.id, name: schema.branches.name })
        .from(schema.branches)
        .where(inArray(schema.branches.id, branchIds));
      branchMap = new Map(branches.map(b => [b.id, b]));
    }

    const result = rows.map(r => ({
      ...r,
      branches: branchMap.get(r.branch_id!) || { id: r.branch_id, name: null },
    }));

    res.json(result);
  } catch (err) { next(err); }
});

// GET /profiles/:id/completeness
router.get('/:id/completeness', requireAuth, async (req, res, next) => {
  try {
    const profile = await db
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.id, req.params.id))
      .limit(1);

    if (profile.length === 0) throw new AppError(404, 'Profile not found');

    const p = profile[0];
    const fields = ['full_name', 'email', 'phone', 'avatar_url'] as const;
    const filled = fields.filter(f => p[f]).length;
    const total = fields.length;

    res.json({ filled, total, percentage: Math.round((filled / total) * 100) });
  } catch (err) { next(err); }
});

// GET /profiles/:id/employee-completeness
router.get('/:id/employee-completeness', requireAuth, async (req, res, next) => {
  try {
    const empData = await db
      .select()
      .from(schema.employee_data)
      .where(eq(schema.employee_data.user_id, req.params.id))
      .limit(1);

    if (empData.length === 0) {
      return res.json({ filled: 0, total: 6, percentage: 0 });
    }

    const e = empData[0];
    const fields = ['dni', 'birth_date', 'personal_address', 'emergency_contact', 'bank_name', 'cbu'] as const;
    const filled = fields.filter(f => e[f]).length;

    res.json({ filled, total: fields.length, percentage: Math.round((filled / fields.length) * 100) });
  } catch (err) { next(err); }
});

// POST /profiles/link-guest-orders
router.post('/link-guest-orders', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const profile = await db
      .select({ email: schema.profiles.email, phone: schema.profiles.phone })
      .from(schema.profiles)
      .where(eq(schema.profiles.id, userId))
      .limit(1);

    if (profile.length === 0) throw new AppError(404, 'Profile not found');

    let linked = 0;
    if (profile[0].email) {
      const result = await db.update(schema.orders)
        .set({ cliente_user_id: userId })
        .where(
          and(
            eq(schema.orders.cliente_email, profile[0].email),
            eq(schema.orders.cliente_user_id, '')
          )
        );
      linked += (result as any).changes || 0;
    }

    res.json({ linked });
  } catch (err) { next(err); }
});

// POST /profiles/onboarding/complete
router.post('/onboarding/complete', requireAuth, async (req, res, next) => {
  try {
    const now = new Date().toISOString();
    await db.update(schema.profiles)
      .set({ onboarding_completed_at: now, updated_at: now })
      .where(eq(schema.profiles.id, req.user!.userId));
    res.json({ success: true });
  } catch (err) { next(err); }
});

// GET /profiles/onboarding-status
router.get('/onboarding-status', requireAuth, async (req, res, next) => {
  try {
    const rows = await db
      .select({ onboarding_completed_at: schema.profiles.onboarding_completed_at })
      .from(schema.profiles)
      .where(eq(schema.profiles.id, req.user!.userId))
      .limit(1);
    res.json({
      completed: !!rows[0]?.onboarding_completed_at,
      completed_at: rows[0]?.onboarding_completed_at || null,
    });
  } catch (err) { next(err); }
});

export { router as profileRoutes };

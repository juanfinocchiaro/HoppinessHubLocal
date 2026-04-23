import { Router } from 'express';
import { db } from '../db/connection.js';
import * as schema from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { getUserRoles, requireSuperadmin } from '../middleware/permissions.js';
import { AppError } from '../middleware/errorHandler.js';
import { eq, and, inArray } from 'drizzle-orm';
import { randomUUID } from 'crypto';

const router = Router();

// GET /permissions/my-roles
router.get('/my-roles', requireAuth, async (req, res, next) => {
  try {
    const roles = await getUserRoles(req.user!.userId);
    res.json(roles);
  } catch (err) { next(err); }
});

// GET /permissions/my-branches
router.get('/my-branches', requireAuth, async (req, res, next) => {
  try {
    const { brandRole, branchRoles } = await getUserRoles(req.user!.userId);

    if (brandRole === 'superadmin' || brandRole === 'admin') {
      const allBranches = await db
        .select({ id: schema.branches.id, name: schema.branches.name })
        .from(schema.branches)
        .where(eq(schema.branches.is_active, true));
      return res.json(allBranches);
    }

    const branchIds = branchRoles.map(r => r.branch_id);
    if (branchIds.length === 0) return res.json([]);

    const branches = await db
      .select({ id: schema.branches.id, name: schema.branches.name })
      .from(schema.branches)
      .where(
        and(
          inArray(schema.branches.id, branchIds),
          eq(schema.branches.is_active, true)
        )
      );

    res.json(branches);
  } catch (err) { next(err); }
});

// GET /permissions/roles
router.get('/roles', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(schema.roles);
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /permissions/permissions
router.get('/permissions', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(schema.permissions);
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /permissions/role-permissions
router.get('/role-permissions', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(schema.role_permissions);
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /permissions/role-permissions
router.post('/role-permissions', requireAuth, requireSuperadmin, async (req, res, next) => {
  try {
    const { role_id, permission_id } = req.body;
    if (!role_id || !permission_id) throw new AppError(400, 'role_id and permission_id required');

    await db.insert(schema.role_permissions).values({ role_id, permission_id });
    res.status(201).json({ success: true });
  } catch (err) { next(err); }
});

// DELETE /permissions/role-permissions
router.delete('/role-permissions', requireAuth, requireSuperadmin, async (req, res, next) => {
  try {
    const { role_id, permission_id } = req.body;
    if (!role_id || !permission_id) throw new AppError(400, 'role_id and permission_id required');

    await db.delete(schema.role_permissions)
      .where(
        and(
          eq(schema.role_permissions.role_id, role_id),
          eq(schema.role_permissions.permission_id, permission_id)
        )
      );
    res.json({ success: true });
  } catch (err) { next(err); }
});

// GET /permissions/user-profile/:userId
router.get('/user-profile/:userId', requireAuth, async (req, res, next) => {
  try {
    const profile = await db
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.id, req.params.userId))
      .limit(1);

    if (profile.length === 0) throw new AppError(404, 'Profile not found');
    res.json(profile[0]);
  } catch (err) { next(err); }
});

// GET /permissions/impersonation-data/:userId
router.get('/impersonation-data/:userId', requireAuth, async (req, res, next) => {
  try {
    const { userId } = req.params;

    const assignments = await db
      .select({
        branch_id: schema.user_role_assignments.branch_id,
        role_key: schema.roles.key,
        role_scope: schema.roles.scope,
        assignment_id: schema.user_role_assignments.id,
        default_position: schema.user_role_assignments.default_position,
      })
      .from(schema.user_role_assignments)
      .innerJoin(schema.roles, eq(schema.user_role_assignments.role_id, schema.roles.id))
      .where(
        and(
          eq(schema.user_role_assignments.user_id, userId),
          eq(schema.user_role_assignments.is_active, true)
        )
      );

    let brandRole: string | null = null;
    const branchRoles: Array<{
      id: string;
      branch_id: string | null;
      local_role: string | null;
      default_position: string | null;
    }> = [];

    for (const a of assignments) {
      if (a.role_scope === 'brand') {
        brandRole = a.role_key;
      } else if (a.role_scope === 'branch') {
        branchRoles.push({
          id: a.assignment_id,
          branch_id: a.branch_id,
          local_role: a.role_key,
          default_position: a.default_position,
        });
      }
    }

    res.json({ brandRole, branchRoles });
  } catch (err) { next(err); }
});

// ── Brand Role CRUD ──────────────────────────────────────────────────

// PUT /permissions/brand-role/:id
router.put('/brand-role/:id', requireAuth, requireSuperadmin, async (req, res, next) => {
  try {
    const { brandRoleKey } = req.body;
    const assignmentId = req.params.id;

    if (brandRoleKey === null) {
      await db.update(schema.user_role_assignments)
        .set({ is_active: false })
        .where(eq(schema.user_role_assignments.id, assignmentId));
      return res.json({ success: true, deactivated: true });
    }

    const role = await db
      .select()
      .from(schema.roles)
      .where(and(eq(schema.roles.key, brandRoleKey), eq(schema.roles.scope, 'brand')))
      .limit(1);

    if (role.length === 0) throw new AppError(400, 'Invalid brand role key');

    await db.update(schema.user_role_assignments)
      .set({ role_id: role[0].id })
      .where(eq(schema.user_role_assignments.id, assignmentId));

    res.json({ success: true });
  } catch (err) { next(err); }
});

// POST /permissions/brand-role
router.post('/brand-role', requireAuth, requireSuperadmin, async (req, res, next) => {
  try {
    const { userId, brandRoleKey } = req.body;
    if (!userId || !brandRoleKey) throw new AppError(400, 'userId and brandRoleKey required');

    const role = await db
      .select()
      .from(schema.roles)
      .where(and(eq(schema.roles.key, brandRoleKey), eq(schema.roles.scope, 'brand')))
      .limit(1);

    if (role.length === 0) throw new AppError(400, 'Invalid brand role key');

    const id = randomUUID();
    const now = new Date().toISOString();
    await db.insert(schema.user_role_assignments).values({
      id,
      user_id: userId,
      role_id: role[0].id,
      branch_id: null,
      is_active: true,
      created_at: now,
    });

    res.status(201).json({ id });
  } catch (err) { next(err); }
});

// ── Branch Role CRUD ─────────────────────────────────────────────────

// PUT /permissions/branch-role/:id/deactivate
router.put('/branch-role/:id/deactivate', requireAuth, requireSuperadmin, async (req, res, next) => {
  try {
    await db.update(schema.user_role_assignments)
      .set({ is_active: false })
      .where(eq(schema.user_role_assignments.id, req.params.id));
    res.json({ success: true });
  } catch (err) { next(err); }
});

// PUT /permissions/branch-role/:id
router.put('/branch-role/:id', requireAuth, requireSuperadmin, async (req, res, next) => {
  try {
    const { localRoleKey, defaultPosition } = req.body;

    const role = await db
      .select()
      .from(schema.roles)
      .where(and(eq(schema.roles.key, localRoleKey), eq(schema.roles.scope, 'branch')))
      .limit(1);

    if (role.length === 0) throw new AppError(400, 'Invalid branch role key');

    await db.update(schema.user_role_assignments)
      .set({
        role_id: role[0].id,
        default_position: defaultPosition ?? null,
      })
      .where(eq(schema.user_role_assignments.id, req.params.id));

    res.json({ success: true });
  } catch (err) { next(err); }
});

// POST /permissions/branch-role
router.post('/branch-role', requireAuth, requireSuperadmin, async (req, res, next) => {
  try {
    const { userId, branchId, localRoleKey, defaultPosition } = req.body;
    if (!userId || !branchId || !localRoleKey) {
      throw new AppError(400, 'userId, branchId, and localRoleKey required');
    }

    const role = await db
      .select()
      .from(schema.roles)
      .where(and(eq(schema.roles.key, localRoleKey), eq(schema.roles.scope, 'branch')))
      .limit(1);

    if (role.length === 0) throw new AppError(400, 'Invalid branch role key');

    const id = randomUUID();
    const now = new Date().toISOString();
    await db.insert(schema.user_role_assignments).values({
      id,
      user_id: userId,
      role_id: role[0].id,
      branch_id: branchId,
      is_active: true,
      default_position: defaultPosition ?? null,
      created_at: now,
    });

    res.status(201).json({ id });
  } catch (err) { next(err); }
});

export { router as permissionsRoutes };

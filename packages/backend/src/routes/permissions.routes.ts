import { Router } from 'express';
import { db } from '../db/connection.js';
import { user_role_assignments, roles, permissions, role_permissions, branches, profiles } from '../db/schema.js';
import { eq, and, inArray } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { getUserRoles } from '../middleware/permissions.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// GET /api/permissions/my-roles
router.get('/my-roles', requireAuth, async (req, res, next) => {
  try {
    const roleInfo = await getUserRoles(req.user!.userId);
    res.json({ data: roleInfo });
  } catch (err) {
    next(err);
  }
});

// GET /api/permissions/my-branches
router.get('/my-branches', requireAuth, async (req, res, next) => {
  try {
    const { brandRole, branchRoles } = await getUserRoles(req.user!.userId);

    let userBranches;
    if (brandRole === 'superadmin' || brandRole === 'admin') {
      userBranches = await db.select().from(branches).where(eq(branches.is_active, true));
    } else {
      const branchIds = branchRoles.map(r => r.branch_id);
      if (branchIds.length === 0) {
        return res.json({ data: [] });
      }
      userBranches = await db.select().from(branches).where(
        and(eq(branches.is_active, true), inArray(branches.id, branchIds))
      );
    }

    res.json({ data: userBranches });
  } catch (err) {
    next(err);
  }
});

// GET /api/permissions/roles
router.get('/roles', requireAuth, async (req, res, next) => {
  try {
    const allRoles = await db.select().from(roles);
    res.json({ data: allRoles });
  } catch (err) {
    next(err);
  }
});

// GET /api/permissions/permissions
router.get('/permissions', requireAuth, async (req, res, next) => {
  try {
    const allPerms = await db.select().from(permissions);
    res.json({ data: allPerms });
  } catch (err) {
    next(err);
  }
});

// GET /api/permissions/role-permissions
router.get('/role-permissions', requireAuth, async (req, res, next) => {
  try {
    const allRolePerms = await db.select().from(role_permissions);
    res.json({ data: allRolePerms });
  } catch (err) {
    next(err);
  }
});

// POST /api/permissions/role-permissions
router.post('/role-permissions', requireAuth, async (req, res, next) => {
  try {
    const { role_id, permission_id } = req.body;
    await db.insert(role_permissions).values({ role_id, permission_id });
    res.status(201).json({ message: 'Permission added' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/permissions/role-permissions
router.delete('/role-permissions', requireAuth, async (req, res, next) => {
  try {
    const { role_id, permission_id } = req.body;
    await db.delete(role_permissions).where(
      and(eq(role_permissions.role_id, role_id), eq(role_permissions.permission_id, permission_id))
    );
    res.json({ message: 'Permission removed' });
  } catch (err) {
    next(err);
  }
});

// GET /api/permissions/user-profile/:userId
router.get('/user-profile/:userId', requireAuth, async (req, res, next) => {
  try {
    const profile = await db.select().from(profiles).where(eq(profiles.id, req.params.userId)).get();
    if (!profile) throw new AppError(404, 'Profile not found');
    res.json({ data: profile });
  } catch (err) {
    next(err);
  }
});

// GET /api/permissions/impersonation-data/:userId
router.get('/impersonation-data/:userId', requireAuth, async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const { brandRole, branchRoles } = await getUserRoles(userId);

    let userBranches;
    if (brandRole === 'superadmin') {
      userBranches = await db.select().from(branches).where(eq(branches.is_active, true));
    } else {
      const branchIds = branchRoles.map(r => r.branch_id);
      if (branchIds.length === 0) {
        userBranches = [];
      } else {
        userBranches = await db.select().from(branches).where(
          and(eq(branches.is_active, true), inArray(branches.id, branchIds))
        );
      }
    }

    res.json({
      data: { brandRole, branchRoles, branches: userBranches },
    });
  } catch (err) {
    next(err);
  }
});

export { router as permissionsRoutes };

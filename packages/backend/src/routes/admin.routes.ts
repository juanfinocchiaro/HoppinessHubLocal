import { Router } from 'express';
import { db } from '../db/connection.js';
import {
  profiles,
  user_role_assignments,
  roles,
  audit_logs,
  brand_closure_config,
  brand_sidebar_order,
} from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { requireSuperadmin } from '../middleware/permissions.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// GET /users — list all users with roles (superadmin)
router.get('/users', requireAuth, requireSuperadmin, async (_req, res, next) => {
  try {
    const allProfiles = await db.select().from(profiles);

    const allAssignments = await db
      .select({
        id: user_role_assignments.id,
        user_id: user_role_assignments.user_id,
        role_id: user_role_assignments.role_id,
        branch_id: user_role_assignments.branch_id,
        is_active: user_role_assignments.is_active,
        role_key: roles.key,
        role_label: roles.label,
        role_scope: roles.scope,
      })
      .from(user_role_assignments)
      .innerJoin(roles, eq(user_role_assignments.role_id, roles.id));

    const usersWithRoles = allProfiles.map((profile) => ({
      ...profile,
      roles: allAssignments.filter((a) => a.user_id === profile.id),
    }));

    res.json({ data: usersWithRoles });
  } catch (err) {
    next(err);
  }
});

// POST /users/assign-role — assign role to user
router.post('/users/assign-role', requireAuth, requireSuperadmin, async (req, res, next) => {
  try {
    const { user_id, role_id, branch_id } = req.body;
    if (!user_id || !role_id) {
      throw new AppError(400, 'user_id and role_id are required');
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(user_role_assignments).values({
      id,
      user_id,
      role_id,
      branch_id: branch_id || null,
      assigned_by: req.user!.userId,
      is_active: true,
      created_at: now,
      updated_at: now,
    });

    const created = await db
      .select()
      .from(user_role_assignments)
      .where(eq(user_role_assignments.id, id))
      .get();
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

// DELETE /users/remove-role/:assignmentId — remove role assignment
router.delete('/users/remove-role/:assignmentId', requireAuth, requireSuperadmin, async (req, res, next) => {
  try {
    const { assignmentId } = req.params;
    const existing = await db
      .select()
      .from(user_role_assignments)
      .where(eq(user_role_assignments.id, assignmentId))
      .get();
    if (!existing) throw new AppError(404, 'Role assignment not found');

    await db
      .update(user_role_assignments)
      .set({ is_active: false, updated_at: new Date().toISOString() })
      .where(eq(user_role_assignments.id, assignmentId));

    res.json({ message: 'Role assignment removed' });
  } catch (err) {
    next(err);
  }
});

// GET /audit-logs — list audit logs
router.get('/audit-logs', requireAuth, requireSuperadmin, async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const offset = Number(req.query.offset) || 0;

    const rows = await db
      .select()
      .from(audit_logs)
      .orderBy(desc(audit_logs.created_at))
      .limit(limit)
      .offset(offset);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// POST /audit-logs — create audit log entry
router.post('/audit-logs', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    await db.insert(audit_logs).values({
      id,
      user_id: req.user!.userId,
      ...req.body,
      ip_address: req.ip,
      created_at: new Date().toISOString(),
    });

    const created = await db.select().from(audit_logs).where(eq(audit_logs.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

// GET /closure-config — list brand closure config
router.get('/closure-config', requireAuth, requireSuperadmin, async (_req, res, next) => {
  try {
    const rows = await db.select().from(brand_closure_config);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// PUT /closure-config/:id — update closure config
router.put('/closure-config/:id', requireAuth, requireSuperadmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await db
      .select()
      .from(brand_closure_config)
      .where(eq(brand_closure_config.id, id))
      .get();
    if (!existing) throw new AppError(404, 'Closure config not found');

    await db
      .update(brand_closure_config)
      .set({ ...req.body, updated_at: new Date().toISOString() })
      .where(eq(brand_closure_config.id, id));

    const updated = await db.select().from(brand_closure_config).where(eq(brand_closure_config.id, id)).get();
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// GET /sidebar-order — get sidebar order
router.get('/sidebar-order', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(brand_sidebar_order);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// PUT /sidebar-order — update sidebar order
router.put('/sidebar-order', requireAuth, requireSuperadmin, async (req, res, next) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      throw new AppError(400, 'items array is required');
    }

    for (const item of items) {
      if (item.id) {
        await db
          .update(brand_sidebar_order)
          .set({
            sort_order: item.sort_order,
            updated_by: req.user!.userId,
            updated_at: new Date().toISOString(),
          })
          .where(eq(brand_sidebar_order.id, item.id));
      } else {
        await db.insert(brand_sidebar_order).values({
          section_id: item.section_id,
          sort_order: item.sort_order,
          updated_by: req.user!.userId,
          updated_at: new Date().toISOString(),
        });
      }
    }

    const rows = await db.select().from(brand_sidebar_order);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

export { router as adminRoutes };

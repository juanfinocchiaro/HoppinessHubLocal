import { Router } from 'express';
import { db } from '../db/connection.js';
import { profiles, user_role_assignments, roles } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { requireBranchAccess } from '../middleware/permissions.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// GET /me — get current user's profile
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const profile = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, req.user!.userId))
      .get();
    if (!profile) throw new AppError(404, 'Profile not found');
    res.json({ data: profile });
  } catch (err) {
    next(err);
  }
});

// PUT /me — update current user's profile
router.put('/me', requireAuth, async (req, res, next) => {
  try {
    const { full_name, phone, avatar_url, onboarding_completed } = req.body;
    const userId = req.user!.userId;

    const existing = await db.select().from(profiles).where(eq(profiles.id, userId)).get();
    if (!existing) throw new AppError(404, 'Profile not found');

    await db
      .update(profiles)
      .set({
        ...(full_name !== undefined && { full_name }),
        ...(phone !== undefined && { phone }),
        ...(avatar_url !== undefined && { avatar_url }),
        ...(onboarding_completed !== undefined && { onboarding_completed }),
        updated_at: new Date().toISOString(),
      })
      .where(eq(profiles.id, userId));

    const updated = await db.select().from(profiles).where(eq(profiles.id, userId)).get();
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// GET /:userId — get profile by ID
router.get('/:userId', requireAuth, async (req, res, next) => {
  try {
    const profile = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, req.params.userId))
      .get();
    if (!profile) throw new AppError(404, 'Profile not found');
    res.json({ data: profile });
  } catch (err) {
    next(err);
  }
});

// GET /:userId/roles — get user's role assignments
router.get('/:userId/roles', requireAuth, async (req, res, next) => {
  try {
    const assignments = await db
      .select({
        id: user_role_assignments.id,
        user_id: user_role_assignments.user_id,
        role_id: user_role_assignments.role_id,
        branch_id: user_role_assignments.branch_id,
        is_active: user_role_assignments.is_active,
        assigned_by: user_role_assignments.assigned_by,
        created_at: user_role_assignments.created_at,
        role_key: roles.key,
        role_label: roles.label,
        role_scope: roles.scope,
      })
      .from(user_role_assignments)
      .innerJoin(roles, eq(user_role_assignments.role_id, roles.id))
      .where(
        and(
          eq(user_role_assignments.user_id, req.params.userId),
          eq(user_role_assignments.is_active, true)
        )
      );
    res.json({ data: assignments });
  } catch (err) {
    next(err);
  }
});

// PUT /:userId/clock-pin — update clock PIN
router.put('/:userId/clock-pin', requireAuth, async (req, res, next) => {
  try {
    const { clock_pin } = req.body;
    if (!clock_pin || typeof clock_pin !== 'string') {
      throw new AppError(400, 'Valid clock_pin is required');
    }

    const userId = req.params.userId;
    const isOwnProfile = req.user!.userId === userId;

    if (!isOwnProfile) {
      throw new AppError(403, 'Can only update your own clock PIN');
    }

    await db
      .update(profiles)
      .set({ clock_pin, updated_at: new Date().toISOString() })
      .where(eq(profiles.id, userId));

    res.json({ message: 'Clock PIN updated' });
  } catch (err) {
    next(err);
  }
});

// GET /:branchId/team — list all staff for a branch
router.get('/:branchId/team', requireAuth, requireBranchAccess, async (req, res, next) => {
  try {
    const team = await db
      .select({
        user_id: user_role_assignments.user_id,
        role_id: user_role_assignments.role_id,
        assignment_id: user_role_assignments.id,
        is_active: user_role_assignments.is_active,
        role_key: roles.key,
        role_label: roles.label,
        full_name: profiles.full_name,
        email: profiles.email,
        phone: profiles.phone,
        avatar_url: profiles.avatar_url,
        profile_is_active: profiles.is_active,
      })
      .from(user_role_assignments)
      .innerJoin(roles, eq(user_role_assignments.role_id, roles.id))
      .innerJoin(profiles, eq(user_role_assignments.user_id, profiles.id))
      .where(
        and(
          eq(user_role_assignments.branch_id, req.params.branchId),
          eq(user_role_assignments.is_active, true)
        )
      );
    res.json({ data: team });
  } catch (err) {
    next(err);
  }
});

export { router as profileRoutes };

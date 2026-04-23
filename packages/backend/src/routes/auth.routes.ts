import { Router } from 'express';
import { db } from '../db/connection.js';
import * as schema from '../db/schema.js';
import { requireAuth, generateTokens, verifyRefreshToken } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const router = Router();

// POST /auth/signup
router.post('/signup', async (req, res, next) => {
  try {
    const { email, password, full_name, invitation_token } = req.body;
    if (!email || !password) throw new AppError(400, 'Email and password are required');

    const existing = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, email.toLowerCase().trim()))
      .limit(1);

    if (existing.length > 0) throw new AppError(409, 'Email already registered');

    const id = randomUUID();
    const now = new Date().toISOString();
    const passwordHash = await bcrypt.hash(password, 10);

    await db.insert(schema.users).values({
      id,
      email: email.toLowerCase().trim(),
      password_hash: passwordHash,
      email_confirmed_at: now,
      last_sign_in_at: now,
      created_at: now,
      updated_at: now,
    });

    await db.insert(schema.profiles).values({
      id,
      full_name: full_name || email.split('@')[0],
      email: email.toLowerCase().trim(),
      is_active: true,
      created_at: now,
      updated_at: now,
    });

    if (invitation_token) {
      const inv = await db
        .select()
        .from(schema.staff_invitations)
        .where(eq(schema.staff_invitations.token, invitation_token))
        .limit(1);

      if (inv.length > 0 && inv[0].status === 'pending') {
        await db.update(schema.staff_invitations)
          .set({ status: 'accepted', accepted_at: now, accepted_by: id })
          .where(eq(schema.staff_invitations.id, inv[0].id));

        if (inv[0].branch_id && inv[0].role) {
          const role = await db
            .select({ id: schema.roles.id })
            .from(schema.roles)
            .where(eq(schema.roles.key, inv[0].role))
            .limit(1);

          if (role.length > 0) {
            await db.insert(schema.user_role_assignments).values({
              id: randomUUID(),
              user_id: id,
              role_id: role[0].id,
              branch_id: inv[0].branch_id,
              is_active: true,
              created_at: now,
            });
          }
        }
      }
    }

    const tokens = generateTokens({ userId: id, email: email.toLowerCase().trim() });
    const profile = await db.select().from(schema.profiles).where(eq(schema.profiles.id, id)).limit(1);

    res.status(201).json({
      data: {
        user: profile[0] || { id, email: email.toLowerCase().trim() },
        tokens,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) throw new AppError(400, 'Email and password are required');

    const rows = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email.toLowerCase().trim()))
      .limit(1);

    if (rows.length === 0) throw new AppError(401, 'Invalid credentials');

    const user = rows[0];
    if (!user.password_hash) throw new AppError(401, 'Invalid credentials');

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new AppError(401, 'Invalid credentials');

    const now = new Date().toISOString();
    await db.update(schema.users)
      .set({ last_sign_in_at: now, updated_at: now })
      .where(eq(schema.users.id, user.id));

    const tokens = generateTokens({ userId: user.id, email: user.email });
    const profile = await db.select().from(schema.profiles).where(eq(schema.profiles.id, user.id)).limit(1);

    res.json({
      data: {
        user: profile[0] || { id: user.id, email: user.email },
        tokens,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = req.body.refreshToken || req.body.refresh_token;
    if (!refreshToken) throw new AppError(400, 'Refresh token is required');

    const payload = verifyRefreshToken(refreshToken);
    const tokens = generateTokens({ userId: payload.userId, email: payload.email });
    const profile = await db.select().from(schema.profiles).where(eq(schema.profiles.id, payload.userId)).limit(1);

    res.json({
      data: {
        user: profile[0] || null,
        tokens,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /auth/me
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const profile = await db.select().from(schema.profiles).where(eq(schema.profiles.id, userId)).limit(1);
    if (profile.length === 0) throw new AppError(404, 'Profile not found');

    res.json({ data: profile[0] });
  } catch (err) {
    next(err);
  }
});

// POST /auth/change-password
router.post('/change-password', requireAuth, async (req, res, next) => {
  try {
    const { new_password } = req.body;
    if (!new_password || new_password.length < 6) {
      throw new AppError(400, 'Password must be at least 6 characters');
    }

    const passwordHash = await bcrypt.hash(new_password, 10);
    const now = new Date().toISOString();

    await db.update(schema.users)
      .set({ password_hash: passwordHash, updated_at: now })
      .where(eq(schema.users.id, req.user!.userId));

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export { router as authRoutes };

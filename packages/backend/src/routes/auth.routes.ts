import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/connection.js';
import { users, profiles } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { generateTokens, verifyRefreshToken, requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// POST /api/auth/signup
router.post('/signup', async (req, res, next) => {
  try {
    const { email, password, full_name, phone } = req.body;

    if (!email || !password) {
      throw new AppError(400, 'Email and password are required');
    }

    const existing = await db.select().from(users).where(eq(users.email, email.toLowerCase())).get();
    if (existing) {
      throw new AppError(409, 'Email already registered');
    }

    const password_hash = await bcrypt.hash(password, 12);
    const userId = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(users).values({
      id: userId,
      email: email.toLowerCase(),
      password_hash,
      email_confirmed_at: now,
      created_at: now,
      updated_at: now,
    });

    await db.insert(profiles).values({
      id: userId,
      email: email.toLowerCase(),
      full_name: full_name || null,
      phone: phone || null,
      is_active: true,
      onboarding_completed: false,
      created_at: now,
      updated_at: now,
    });

    const tokens = generateTokens({ userId, email: email.toLowerCase() });

    const profile = await db.select().from(profiles).where(eq(profiles.id, userId)).get();

    res.status(201).json({
      data: {
        user: profile,
        tokens,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError(400, 'Email and password are required');
    }

    const user = await db.select().from(users).where(eq(users.email, email.toLowerCase())).get();
    if (!user || !user.password_hash) {
      throw new AppError(401, 'Invalid credentials');
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      throw new AppError(401, 'Invalid credentials');
    }

    const now = new Date().toISOString();
    await db.update(users).set({ last_sign_in_at: now, updated_at: now }).where(eq(users.id, user.id));
    await db.update(profiles).set({ last_sign_in_at: now, updated_at: now }).where(eq(profiles.id, user.id));

    const tokens = generateTokens({ userId: user.id, email: user.email! });

    const profile = await db.select().from(profiles).where(eq(profiles.id, user.id)).get();

    res.json({
      data: {
        user: profile,
        tokens,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      throw new AppError(400, 'Refresh token required');
    }

    const payload = verifyRefreshToken(refreshToken);
    
    const user = await db.select().from(users).where(eq(users.id, payload.userId)).get();
    if (!user) {
      throw new AppError(401, 'User not found');
    }

    const tokens = generateTokens({ userId: user.id, email: user.email! });
    const profile = await db.select().from(profiles).where(eq(profiles.id, user.id)).get();

    res.json({
      data: {
        user: profile,
        tokens,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const profile = await db.select().from(profiles).where(eq(profiles.id, req.user!.userId)).get();
    if (!profile) {
      throw new AppError(404, 'Profile not found');
    }
    res.json({ data: profile });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/change-password
router.post('/change-password', requireAuth, async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    if (!new_password) {
      throw new AppError(400, 'New password required');
    }

    const user = await db.select().from(users).where(eq(users.id, req.user!.userId)).get();
    if (!user) throw new AppError(404, 'User not found');

    if (current_password && user.password_hash) {
      const valid = await bcrypt.compare(current_password, user.password_hash);
      if (!valid) throw new AppError(401, 'Current password is incorrect');
    }

    const password_hash = await bcrypt.hash(new_password, 12);
    await db.update(users).set({ password_hash, updated_at: new Date().toISOString() }).where(eq(users.id, user.id));

    res.json({ message: 'Password updated' });
  } catch (err) {
    next(err);
  }
});

export { router as authRoutes };

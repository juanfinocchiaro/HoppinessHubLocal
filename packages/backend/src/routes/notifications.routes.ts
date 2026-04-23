import { Router } from 'express';
import { db } from '../db/connection.js';
import { push_subscriptions } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// POST /subscribe — save push subscription
router.post('/subscribe', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { endpoint, keys } = req.body;

    const existing = await db
      .select()
      .from(push_subscriptions)
      .where(and(eq(push_subscriptions.user_id, userId), eq(push_subscriptions.endpoint, endpoint)))
      .get();

    const now = new Date().toISOString();
    if (existing) {
      await db
        .update(push_subscriptions)
        .set({ keys, updated_at: now })
        .where(eq(push_subscriptions.id, existing.id));
    } else {
      await db.insert(push_subscriptions).values({
        id: crypto.randomUUID(),
        user_id: userId,
        endpoint,
        keys,
        created_at: now,
        updated_at: now,
      });
    }

    res.json({ message: 'Subscription saved' });
  } catch (err) {
    next(err);
  }
});

// POST /send — send push notification (stub)
router.post('/send', requireAuth, async (req, res, next) => {
  try {
    const { user_ids, title, body } = req.body;
    console.log(`[Push Stub] Sending "${title}" to ${Array.isArray(user_ids) ? user_ids.length : 0} users`);

    res.json({
      data: {
        sent: true,
        message: 'Push notification — stub (web-push not configured yet)',
        recipients: Array.isArray(user_ids) ? user_ids.length : 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

export { router as notificationRoutes };

import { Router } from 'express';
import { db } from '../db/connection.js';
import * as schema from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════════
// Subscribe (save push subscription)
// ═══════════════════════════════════════════════════════════════════════════════

router.post('/subscribe', requireAuth, async (req, res, next) => {
  try {
    const userId = req.body.user_id || req.user!.userId;
    const { endpoint, keys } = req.body;
    const keysStr = typeof keys === 'string' ? keys : JSON.stringify(keys);

    const existing = await db
      .select()
      .from(schema.push_subscriptions)
      .where(
        and(
          eq(schema.push_subscriptions.user_id, userId),
          eq(schema.push_subscriptions.endpoint, endpoint),
        ),
      )
      .get();

    if (existing) {
      await db
        .update(schema.push_subscriptions)
        .set({ keys: keysStr })
        .where(eq(schema.push_subscriptions.id, existing.id));
    } else {
      await db.insert(schema.push_subscriptions).values({
        id: crypto.randomUUID(),
        user_id: userId,
        endpoint,
        keys: keysStr,
        created_at: new Date().toISOString(),
      });
    }

    res.json({ data: { message: 'Subscription saved' } });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Send Push Notification (stub — web-push not configured)
// ═══════════════════════════════════════════════════════════════════════════════

router.post('/send', requireAuth, async (req, res, next) => {
  try {
    const { cliente_user_id, pedido_id, estado, numero_pedido } = req.body;

    if (cliente_user_id) {
      const subscriptions = await db
        .select()
        .from(schema.push_subscriptions)
        .where(eq(schema.push_subscriptions.user_id, cliente_user_id));

      console.log(
        `[Push Stub] Order ${pedido_id} → ${estado} (${numero_pedido ?? '-'}), ${subscriptions.length} subscription(s) for user ${cliente_user_id}`,
      );
    }

    res.json({
      data: {
        sent: true,
        message: 'Push notification — stub (web-push not configured)',
      },
    });
  } catch (err) {
    next(err);
  }
});

export { router as notificationRoutes };

import { Router } from 'express';
import { db } from '../db/connection.js';
import { mercadopago_config, order_payments, orders } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// GET /config/:branchId — get MP config
router.get('/config/:branchId', requireAuth, async (req, res, next) => {
  try {
    const config = await db
      .select()
      .from(mercadopago_config)
      .where(eq(mercadopago_config.branch_id, req.params.branchId))
      .get();
    res.json({ data: config ?? null });
  } catch (err) {
    next(err);
  }
});

// PUT /config/:branchId — save MP config
router.put('/config/:branchId', requireAuth, async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const existing = await db
      .select()
      .from(mercadopago_config)
      .where(eq(mercadopago_config.branch_id, branchId))
      .get();

    const now = new Date().toISOString();
    if (existing) {
      await db
        .update(mercadopago_config)
        .set({ ...req.body, updated_at: now })
        .where(eq(mercadopago_config.branch_id, branchId));
    } else {
      await db.insert(mercadopago_config).values({
        branch_id: branchId,
        ...req.body,
        created_at: now,
        updated_at: now,
      });
    }

    const result = await db.select().from(mercadopago_config).where(eq(mercadopago_config.branch_id, branchId)).get();
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// POST /test-connection — test MP API connection (stub)
router.post('/test-connection', requireAuth, async (req, res, next) => {
  try {
    res.json({
      data: {
        success: true,
        message: 'MercadoPago connection test — stub (will connect when online)',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /checkout — create checkout preference (stub)
router.post('/checkout', async (req, res, next) => {
  try {
    const preferenceId = `PREF_${crypto.randomUUID().slice(0, 8)}`;
    res.json({
      data: {
        preference_id: preferenceId,
        init_point: `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=${preferenceId}`,
        sandbox_init_point: `https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=${preferenceId}`,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /webhook — MP webhook handler (no auth)
router.post('/webhook', async (req, res, next) => {
  try {
    const { type, data } = req.body;
    console.log(`[MP Webhook] type=${type}, id=${data?.id}`);

    if (type === 'payment' && data?.id) {
      const payment = await db
        .select()
        .from(order_payments)
        .where(eq(order_payments.mp_payment_id, String(data.id)))
        .get();

      if (payment) {
        await db
          .update(order_payments)
          .set({ mp_status: 'approved', updated_at: new Date().toISOString() })
          .where(eq(order_payments.id, payment.id));
      }
    }

    res.json({ received: true });
  } catch (err) {
    next(err);
  }
});

// POST /point/devices — list Point devices (stub)
router.post('/point/devices', requireAuth, async (_req, res, next) => {
  try {
    res.json({ data: { devices: [], message: 'Point devices — stub' } });
  } catch (err) {
    next(err);
  }
});

// POST /point/payment — create Point payment (stub)
router.post('/point/payment', requireAuth, async (req, res, next) => {
  try {
    res.json({
      data: {
        payment_intent_id: `PI_${crypto.randomUUID().slice(0, 8)}`,
        status: 'created',
        amount: req.body.amount,
        message: 'Point payment — stub',
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /point/setup — setup Point terminal (stub)
router.post('/point/setup', requireAuth, async (_req, res, next) => {
  try {
    res.json({ data: { success: true, message: 'Point setup — stub' } });
  } catch (err) {
    next(err);
  }
});

export { router as paymentRoutes };

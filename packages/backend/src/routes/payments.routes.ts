import { Router } from 'express';
import { db } from '../db/connection.js';
import * as schema from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════════
// MercadoPago Config
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/config/:branchId', requireAuth, async (req, res, next) => {
  try {
    const config = await db
      .select()
      .from(schema.mercadopago_config)
      .where(eq(schema.mercadopago_config.branch_id, req.params.branchId))
      .get();
    res.json({ data: config ?? null });
  } catch (err) {
    next(err);
  }
});

router.get('/config/:branchId/status', requireAuth, async (req, res, next) => {
  try {
    const row = await db
      .select({ connection_status: schema.mercadopago_config.connection_status })
      .from(schema.mercadopago_config)
      .where(eq(schema.mercadopago_config.branch_id, req.params.branchId))
      .get();
    res.json({ data: row ?? null });
  } catch (err) {
    next(err);
  }
});

router.put('/config/:branchId', requireAuth, async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const existing = await db
      .select()
      .from(schema.mercadopago_config)
      .where(eq(schema.mercadopago_config.branch_id, branchId))
      .get();

    const now = new Date().toISOString();
    if (existing) {
      await db
        .update(schema.mercadopago_config)
        .set({ ...req.body, updated_at: now })
        .where(eq(schema.mercadopago_config.branch_id, branchId));
    } else {
      await db.insert(schema.mercadopago_config).values({
        id: crypto.randomUUID(),
        branch_id: branchId,
        ...req.body,
        created_at: now,
        updated_at: now,
      });
    }

    const result = await db
      .select()
      .from(schema.mercadopago_config)
      .where(eq(schema.mercadopago_config.branch_id, branchId))
      .get();
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

router.delete('/config/:branchId', requireAuth, async (req, res, next) => {
  try {
    await db
      .delete(schema.mercadopago_config)
      .where(eq(schema.mercadopago_config.branch_id, req.params.branchId));
    res.json({ data: { message: 'MercadoPago config disconnected' } });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Connection Test (stub — requires live MercadoPago API)
// ═══════════════════════════════════════════════════════════════════════════════

router.post('/test-connection', requireAuth, async (req, res, next) => {
  try {
    const { branch_id } = req.body;
    const config = await db
      .select()
      .from(schema.mercadopago_config)
      .where(eq(schema.mercadopago_config.branch_id, branch_id))
      .get();

    if (!config?.access_token) {
      return res.json({ data: { success: false, message: 'No access token configured' } });
    }

    const now = new Date().toISOString();
    await db
      .update(schema.mercadopago_config)
      .set({ connection_status: 'connected', last_test: now, last_test_ok: now, updated_at: now })
      .where(eq(schema.mercadopago_config.branch_id, branch_id));

    res.json({ data: { success: true, message: 'Connection test — stub', timestamp: now } });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Checkout (stub — returns mock preference)
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
// Webhook
// ═══════════════════════════════════════════════════════════════════════════════

router.post('/webhook', async (req, res, next) => {
  try {
    const { type, data } = req.body;
    console.log(`[MP Webhook] type=${type}, id=${data?.id}`);

    if (type === 'payment' && data?.id) {
      const payment = await db
        .select()
        .from(schema.order_payments)
        .where(eq(schema.order_payments.mp_payment_id, String(data.id)))
        .get();

      if (payment) {
        await db
          .update(schema.order_payments)
          .set({ conciliado: 'approved', conciliado_at: new Date().toISOString() })
          .where(eq(schema.order_payments.id, payment.id));
      }
    }

    res.json({ received: true });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Point Terminal
// ═══════════════════════════════════════════════════════════════════════════════

router.post('/point/devices', requireAuth, async (req, res, next) => {
  try {
    const { branch_id } = req.body;
    const config = await db
      .select()
      .from(schema.mercadopago_config)
      .where(eq(schema.mercadopago_config.branch_id, branch_id))
      .get();

    const devices: Array<{
      id: string;
      pos_id: number | null;
      operating_mode: string;
      external_pos_id: string | null;
    }> = [];

    if (config?.device_id) {
      devices.push({
        id: config.device_id,
        pos_id: null,
        operating_mode: config.device_operating_mode ?? 'PDV',
        external_pos_id: null,
      });
    }

    res.json({ data: devices });
  } catch (err) {
    next(err);
  }
});

router.post('/point/setup', requireAuth, async (req, res, next) => {
  try {
    const { branch_id, terminal_id, device_name, operating_mode } = req.body;
    const now = new Date().toISOString();

    await db
      .update(schema.mercadopago_config)
      .set({
        device_id: terminal_id ?? undefined,
        device_name: device_name ?? undefined,
        device_operating_mode: operating_mode ?? undefined,
        updated_at: now,
      })
      .where(eq(schema.mercadopago_config.branch_id, branch_id));

    res.json({ data: { success: true } });
  } catch (err) {
    next(err);
  }
});

router.delete('/point/device/:branchId', requireAuth, async (req, res, next) => {
  try {
    await db
      .update(schema.mercadopago_config)
      .set({
        device_id: null,
        device_name: null,
        device_operating_mode: null,
        updated_at: new Date().toISOString(),
      })
      .where(eq(schema.mercadopago_config.branch_id, req.params.branchId));

    res.json({ data: { message: 'Device removed' } });
  } catch (err) {
    next(err);
  }
});

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

export { router as paymentRoutes };

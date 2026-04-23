import { Router } from 'express';
import { db } from '../db/connection.js';
import * as schema from '../db/schema.js';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════════
// Orders
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/orders/user/:userId', optionalAuth, async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 30;
    const rows = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.cliente_user_id, req.params.userId))
      .orderBy(desc(schema.orders.created_at))
      .limit(limit);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/orders/user/:userId/active', optionalAuth, async (req, res, next) => {
  try {
    const states = (req.query.states as string)?.split(',').filter(Boolean) ?? [];
    const rows = await db
      .select()
      .from(schema.orders)
      .where(
        and(
          eq(schema.orders.cliente_user_id, req.params.userId),
          states.length > 0 ? inArray(schema.orders.status, states) : undefined,
        ),
      );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/orders/user/:userId/active-with-branch', optionalAuth, async (req, res, next) => {
  try {
    const states = (req.query.states as string)?.split(',').filter(Boolean) ?? [];
    const activeOrders = await db
      .select()
      .from(schema.orders)
      .where(
        and(
          eq(schema.orders.cliente_user_id, req.params.userId),
          states.length > 0 ? inArray(schema.orders.status, states) : undefined,
        ),
      )
      .orderBy(desc(schema.orders.created_at))
      .limit(1);

    if (activeOrders.length === 0) return res.json({ data: null });

    const order = activeOrders[0];
    const branch = order.branch_id
      ? await db
          .select({ id: schema.branches.id, name: schema.branches.name, slug: schema.branches.slug })
          .from(schema.branches)
          .where(eq(schema.branches.id, order.branch_id))
          .get()
      : null;

    const items = await db
      .select()
      .from(schema.order_items)
      .where(eq(schema.order_items.pedido_id, order.id));

    res.json({ data: { ...order, branch, items } });
  } catch (err) {
    next(err);
  }
});

router.get('/orders/user/:userId/last', optionalAuth, async (req, res, next) => {
  try {
    const row = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.cliente_user_id, req.params.userId))
      .orderBy(desc(schema.orders.created_at))
      .limit(1)
      .get();
    res.json({ data: row ?? null });
  } catch (err) {
    next(err);
  }
});

router.get('/orders/tracking/:code/active', async (req, res, next) => {
  try {
    const states = (req.query.states as string)?.split(',').filter(Boolean) ?? [];
    const rows = await db
      .select()
      .from(schema.orders)
      .where(
        and(
          eq(schema.orders.webapp_tracking_code, req.params.code),
          states.length > 0 ? inArray(schema.orders.status, states) : undefined,
        ),
      );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/orders/tracking/:code/with-branch', async (req, res, next) => {
  try {
    const states = (req.query.states as string)?.split(',').filter(Boolean) ?? [];
    const order = await db
      .select()
      .from(schema.orders)
      .where(
        and(
          eq(schema.orders.webapp_tracking_code, req.params.code),
          states.length > 0 ? inArray(schema.orders.status, states) : undefined,
        ),
      )
      .get();

    if (!order) return res.json({ data: null });

    const branch = order.branch_id
      ? await db
          .select({ id: schema.branches.id, name: schema.branches.name, slug: schema.branches.slug })
          .from(schema.branches)
          .where(eq(schema.branches.id, order.branch_id))
          .get()
      : null;

    const items = await db
      .select()
      .from(schema.order_items)
      .where(eq(schema.order_items.pedido_id, order.id));

    res.json({ data: { ...order, branch, items } });
  } catch (err) {
    next(err);
  }
});

router.get('/orders/statuses', async (req, res, next) => {
  try {
    const codes = (req.query.codes as string)?.split(',').filter(Boolean) ?? [];
    if (codes.length === 0) return res.json({ data: [] });

    const rows = await db
      .select({
        webapp_tracking_code: schema.orders.webapp_tracking_code,
        status: schema.orders.status,
      })
      .from(schema.orders)
      .where(inArray(schema.orders.webapp_tracking_code, codes));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/orders', optionalAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const trackingCode = `HH-${Date.now().toString(36).toUpperCase()}`;
    const { items, ...orderData } = req.body;

    await db.insert(schema.orders).values({
      id,
      ...orderData,
      webapp_tracking_code: trackingCode,
      source: 'webapp',
      status: 'pendiente',
      cliente_user_id: req.user?.userId ?? orderData.cliente_user_id ?? null,
      created_at: now,
    });

    if (Array.isArray(items)) {
      for (const item of items) {
        await db.insert(schema.order_items).values({
          id: crypto.randomUUID(),
          pedido_id: id,
          ...item,
          created_at: now,
        });
      }
    }

    const created = await db.select().from(schema.orders).where(eq(schema.orders.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Branches (name / slug lookups)
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/branches/names', async (req, res, next) => {
  try {
    const ids = (req.query.ids as string)?.split(',').filter(Boolean) ?? [];
    if (ids.length === 0) return res.json({ data: {} });

    const rows = await db
      .select({ id: schema.branches.id, name: schema.branches.name, slug: schema.branches.slug })
      .from(schema.branches)
      .where(inArray(schema.branches.id, ids));

    const map: Record<string, { name: string; slug: string | null }> = {};
    for (const r of rows) {
      map[r.id] = { name: r.name ?? '', slug: r.slug ?? null };
    }
    res.json({ data: map });
  } catch (err) {
    next(err);
  }
});

router.get('/branches/:branchId/name', async (req, res, next) => {
  try {
    const row = await db
      .select({ name: schema.branches.name, slug: schema.branches.slug })
      .from(schema.branches)
      .where(eq(schema.branches.id, req.params.branchId))
      .get();
    res.json({ data: row ?? { name: '', slug: null } });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Webapp Config
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/config/:branchId/payments', async (req, res, next) => {
  try {
    const config = await db
      .select()
      .from(schema.webapp_config)
      .where(eq(schema.webapp_config.branch_id, req.params.branchId))
      .get();
    res.json({ data: config ?? null });
  } catch (err) {
    next(err);
  }
});

router.get('/google-maps-key', async (_req, res, next) => {
  try {
    const row = await db.select().from(schema.delivery_pricing_config).get();
    res.json({ data: { apiKey: row?.google_api_key_encrypted ?? null } });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Customer Addresses
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/addresses', optionalAuth, async (req, res, next) => {
  try {
    const userId = (req.query.user_id as string) || req.user?.userId;
    if (!userId) return res.json({ data: [] });

    const rows = await db
      .select()
      .from(schema.customer_addresses)
      .where(eq(schema.customer_addresses.user_id, userId));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/addresses', optionalAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const userId = req.body.user_id || req.user?.userId;

    await db.insert(schema.customer_addresses).values({
      id,
      ...req.body,
      user_id: userId,
      created_at: now,
      updated_at: now,
    });

    const created = await db
      .select()
      .from(schema.customer_addresses)
      .where(eq(schema.customer_addresses.id, id))
      .get();
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

router.put('/addresses/:id', optionalAuth, async (req, res, next) => {
  try {
    await db
      .update(schema.customer_addresses)
      .set({ ...req.body, updated_at: new Date().toISOString() })
      .where(eq(schema.customer_addresses.id, req.params.id));

    const updated = await db
      .select()
      .from(schema.customer_addresses)
      .where(eq(schema.customer_addresses.id, req.params.id))
      .get();
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

router.delete('/addresses/:id', requireAuth, async (req, res, next) => {
  try {
    await db.delete(schema.customer_addresses).where(eq(schema.customer_addresses.id, req.params.id));
    res.json({ data: { message: 'Address deleted' } });
  } catch (err) {
    next(err);
  }
});

export { router as webappRoutes };

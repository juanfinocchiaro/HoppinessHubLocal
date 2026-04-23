import { Router } from 'express';
import { db } from '../db/connection.js';
import {
  webapp_config,
  branches,
  menu_categories,
  menu_items,
  menu_item_extras,
  orders,
  order_items,
  webapp_order_messages,
  delivery_tracking,
  customer_addresses,
} from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// GET /config/:slug — public webapp config by branch slug
router.get('/config/:slug', async (req, res, next) => {
  try {
    const config = await db
      .select()
      .from(webapp_config)
      .where(eq(webapp_config.slug, req.params.slug))
      .get();
    if (!config) throw new AppError(404, 'Webapp config not found');

    const branch = await db
      .select({
        id: branches.id,
        name: branches.name,
        slug: branches.slug,
        address: branches.address,
        phone: branches.phone,
        is_open: branches.is_open,
        public_hours: branches.public_hours,
      })
      .from(branches)
      .where(eq(branches.id, config.branch_id!))
      .get();

    res.json({ data: { ...config, branch } });
  } catch (err) {
    next(err);
  }
});

// GET /menu/:branchId — public menu (categories + items + extras)
router.get('/menu/:branchId', async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const categories = await db
      .select()
      .from(menu_categories)
      .where(eq(menu_categories.is_active, true));

    const items = await db
      .select()
      .from(menu_items)
      .where(eq(menu_items.is_active, true));

    const extras = await db
      .select()
      .from(menu_item_extras)
      .where(eq(menu_item_extras.is_active, true));

    res.json({ data: { branchId, categories, items, extras } });
  } catch (err) {
    next(err);
  }
});

// POST /orders — create webapp order
router.post('/orders', optionalAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const trackingCode = `HH-${Date.now().toString(36).toUpperCase()}`;

    await db.insert(orders).values({
      id,
      ...req.body,
      is_webapp: true,
      webapp_tracking_code: trackingCode,
      source: 'webapp',
      status: 'pending',
      customer_user_id: req.user?.userId ?? null,
      created_at: now,
      updated_at: now,
    });

    if (Array.isArray(req.body.items)) {
      for (const item of req.body.items) {
        await db.insert(order_items).values({
          id: crypto.randomUUID(),
          order_id: id,
          ...item,
          created_at: now,
        });
      }
    }

    const created = await db.select().from(orders).where(eq(orders.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

// GET /tracking/:code — track order by code
router.get('/tracking/:code', async (req, res, next) => {
  try {
    const order = await db
      .select()
      .from(orders)
      .where(eq(orders.webapp_tracking_code, req.params.code))
      .get();
    if (!order) throw new AppError(404, 'Order not found');

    const items = await db.select().from(order_items).where(eq(order_items.order_id, order.id));
    res.json({ data: { ...order, items } });
  } catch (err) {
    next(err);
  }
});

// GET /orders/:orderId/messages — chat messages
router.get('/orders/:orderId/messages', async (req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(webapp_order_messages)
      .where(eq(webapp_order_messages.order_id, req.params.orderId));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// POST /orders/:orderId/messages — post chat message
router.post('/orders/:orderId/messages', async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    await db.insert(webapp_order_messages).values({
      id,
      order_id: req.params.orderId,
      ...req.body,
      created_at: new Date().toISOString(),
    });
    const created = await db.select().from(webapp_order_messages).where(eq(webapp_order_messages.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

// GET /delivery-tracking/:orderId — delivery GPS tracking
router.get('/delivery-tracking/:orderId', async (req, res, next) => {
  try {
    const tracking = await db
      .select()
      .from(delivery_tracking)
      .where(eq(delivery_tracking.order_id, req.params.orderId))
      .get();
    res.json({ data: tracking ?? null });
  } catch (err) {
    next(err);
  }
});

// GET /addresses — list user addresses
router.get('/addresses', requireAuth, async (req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(customer_addresses)
      .where(eq(customer_addresses.user_id, req.user!.userId));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// POST /addresses — create address
router.post('/addresses', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(customer_addresses).values({
      id,
      user_id: req.user!.userId,
      ...req.body,
      created_at: now,
      updated_at: now,
    });
    const created = await db.select().from(customer_addresses).where(eq(customer_addresses.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

// PUT /addresses/:id — update address
router.put('/addresses/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db
      .select()
      .from(customer_addresses)
      .where(and(eq(customer_addresses.id, req.params.id), eq(customer_addresses.user_id, req.user!.userId)))
      .get();
    if (!existing) throw new AppError(404, 'Address not found');

    await db
      .update(customer_addresses)
      .set({ ...req.body, updated_at: new Date().toISOString() })
      .where(eq(customer_addresses.id, req.params.id));

    const updated = await db.select().from(customer_addresses).where(eq(customer_addresses.id, req.params.id)).get();
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /addresses/:id — delete address
router.delete('/addresses/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db
      .select()
      .from(customer_addresses)
      .where(and(eq(customer_addresses.id, req.params.id), eq(customer_addresses.user_id, req.user!.userId)))
      .get();
    if (!existing) throw new AppError(404, 'Address not found');

    await db.delete(customer_addresses).where(eq(customer_addresses.id, req.params.id));
    res.json({ message: 'Address deleted' });
  } catch (err) {
    next(err);
  }
});

export { router as webappRoutes };

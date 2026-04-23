import { Router } from 'express';
import { db } from '../db/connection.js';
import {
  orders,
  order_items,
  order_item_modifiers,
  order_payments,
  webapp_order_messages,
} from '../db/schema.js';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { emitToRoom } from '../realtime/socketServer.js';

const router = Router();

function generateTrackingCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function getNextOrderNumber(branchId: string): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const result = await db.select({ maxNum: sql<number>`MAX(${orders.order_number})` })
    .from(orders)
    .where(and(
      eq(orders.branch_id, branchId),
      gte(orders.created_at, today),
      lte(orders.created_at, today + 'T23:59:59.999Z'),
    ))
    .get();
  return (result?.maxNum ?? 0) + 1;
}

// ============================================================================
// ORDERS LIST & DETAIL
// ============================================================================

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { branch_id, status, date_from, date_to, source } = req.query;

    const conditions = [];
    if (branch_id) conditions.push(eq(orders.branch_id, branch_id as string));
    if (status) conditions.push(eq(orders.status, status as string));
    if (source) conditions.push(eq(orders.source, source as string));
    if (date_from) conditions.push(gte(orders.created_at, date_from as string));
    if (date_to) conditions.push(lte(orders.created_at, date_to as string));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db.select().from(orders)
      .where(where)
      .orderBy(desc(orders.created_at));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const order = await db.select().from(orders).where(eq(orders.id, req.params.id)).get();
    if (!order) throw new AppError(404, 'Order not found');

    const items = await db.select().from(order_items)
      .where(eq(order_items.order_id, req.params.id));
    const payments = await db.select().from(order_payments)
      .where(eq(order_payments.order_id, req.params.id));

    res.json({ data: { ...order, items, payments } });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// CREATE ORDER
// ============================================================================

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const {
      branch_id, customer_name, customer_phone, customer_email,
      customer_address, customer_floor, customer_reference,
      customer_latitude, customer_longitude, order_type, area,
      notes, source, payment_method, assigned_to, estimated_prep_time,
      table_number, pager_number, items: orderItems,
    } = req.body;
    if (!branch_id) throw new AppError(400, 'branch_id is required');

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const order_number = await getNextOrderNumber(branch_id);
    const trackingCode = generateTrackingCode();

    let subtotal = 0;
    if (Array.isArray(orderItems)) {
      for (const item of orderItems) {
        subtotal += (item.unit_price ?? 0) * (item.quantity ?? 1);
      }
    }

    await db.insert(orders).values({
      id, branch_id, order_number, customer_name, customer_phone,
      customer_email, customer_address, customer_floor, customer_reference,
      customer_latitude, customer_longitude, order_type, area,
      status: 'pending', subtotal, total: subtotal,
      notes, source: source ?? 'pos', payment_method,
      created_by: req.user!.userId, assigned_to, estimated_prep_time,
      webapp_tracking_code: trackingCode, table_number, pager_number,
      created_at: now, updated_at: now,
    });

    if (Array.isArray(orderItems)) {
      for (const item of orderItems) {
        await db.insert(order_items).values({
          id: crypto.randomUUID(),
          order_id: id,
          menu_item_id: item.menu_item_id,
          item_name: item.item_name,
          quantity: item.quantity ?? 1,
          unit_price: item.unit_price,
          subtotal: (item.unit_price ?? 0) * (item.quantity ?? 1),
          notes: item.notes,
          kitchen_station_id: item.kitchen_station_id,
          status: 'pending',
          extras: item.extras,
          removals: item.removals,
          is_gift: item.is_gift,
          gift_reason: item.gift_reason,
          created_at: now,
        });
      }
    }

    const order = await db.select().from(orders).where(eq(orders.id, id)).get();
    const savedItems = await db.select().from(order_items).where(eq(order_items.order_id, id));

    emitToRoom(`kitchen:${branch_id}`, 'order:updated', { ...order, items: savedItems });

    res.status(201).json({ data: { ...order, items: savedItems } });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// UPDATE ORDER
// ============================================================================

router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const {
      customer_name, customer_phone, customer_email, customer_address,
      customer_floor, customer_reference, order_type, area, status,
      notes, payment_method, assigned_to, estimated_prep_time,
      discount_amount, discount_code, promotion_id, delivery_cost,
      total, table_number, pager_number, cancel_reason,
    } = req.body;
    const now = new Date().toISOString();
    await db.update(orders).set({
      ...(customer_name !== undefined && { customer_name }),
      ...(customer_phone !== undefined && { customer_phone }),
      ...(customer_email !== undefined && { customer_email }),
      ...(customer_address !== undefined && { customer_address }),
      ...(customer_floor !== undefined && { customer_floor }),
      ...(customer_reference !== undefined && { customer_reference }),
      ...(order_type !== undefined && { order_type }),
      ...(area !== undefined && { area }),
      ...(status !== undefined && { status }),
      ...(notes !== undefined && { notes }),
      ...(payment_method !== undefined && { payment_method }),
      ...(assigned_to !== undefined && { assigned_to }),
      ...(estimated_prep_time !== undefined && { estimated_prep_time }),
      ...(discount_amount !== undefined && { discount_amount }),
      ...(discount_code !== undefined && { discount_code }),
      ...(promotion_id !== undefined && { promotion_id }),
      ...(delivery_cost !== undefined && { delivery_cost }),
      ...(total !== undefined && { total }),
      ...(table_number !== undefined && { table_number }),
      ...(pager_number !== undefined && { pager_number }),
      ...(cancel_reason !== undefined && { cancel_reason }),
      updated_at: now,
    }).where(eq(orders.id, req.params.id));
    const order = await db.select().from(orders).where(eq(orders.id, req.params.id)).get();
    if (!order) throw new AppError(404, 'Order not found');

    emitToRoom(`kitchen:${order.branch_id}`, 'order:updated', order);
    emitToRoom(`order:${req.params.id}`, 'order:tracking', order);

    res.json({ data: order });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// UPDATE ORDER STATUS
// ============================================================================

router.put('/:id/status', requireAuth, async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) throw new AppError(400, 'status is required');

    const now = new Date().toISOString();
    const timestampField: Record<string, string> = {
      confirmed: 'confirmed_at',
      preparing: 'preparing_at',
      ready: 'ready_at',
      picked_up: 'picked_up_at',
      delivered: 'delivered_at',
      cancelled: 'cancelled_at',
    };

    const extra: Record<string, unknown> = {};
    const tsField = timestampField[status];
    if (tsField) extra[tsField] = now;

    await db.update(orders).set({
      status,
      ...extra,
      updated_at: now,
    }).where(eq(orders.id, req.params.id));

    const order = await db.select().from(orders).where(eq(orders.id, req.params.id)).get();
    if (!order) throw new AppError(404, 'Order not found');

    emitToRoom(`kitchen:${order.branch_id}`, 'order:updated', order);
    emitToRoom(`order:${req.params.id}`, 'order:tracking', order);

    res.json({ data: order });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// CANCEL ORDER
// ============================================================================

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const now = new Date().toISOString();
    await db.update(orders).set({
      status: 'cancelled',
      cancelled_at: now,
      cancel_reason: req.body?.reason ?? 'Cancelled by user',
      updated_at: now,
    }).where(eq(orders.id, req.params.id));
    res.json({ message: 'Order cancelled' });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// ORDER ITEMS
// ============================================================================

router.post('/:id/items', requireAuth, async (req, res, next) => {
  try {
    const { items: newItems } = req.body;
    if (!Array.isArray(newItems)) throw new AppError(400, 'items must be an array');

    const now = new Date().toISOString();
    for (const item of newItems) {
      await db.insert(order_items).values({
        id: crypto.randomUUID(),
        order_id: req.params.id,
        menu_item_id: item.menu_item_id,
        item_name: item.item_name,
        quantity: item.quantity ?? 1,
        unit_price: item.unit_price,
        subtotal: (item.unit_price ?? 0) * (item.quantity ?? 1),
        notes: item.notes,
        kitchen_station_id: item.kitchen_station_id,
        status: 'pending',
        extras: item.extras,
        removals: item.removals,
        created_at: now,
      });
    }

    const allItems = await db.select().from(order_items).where(eq(order_items.order_id, req.params.id));
    const newSubtotal = allItems.reduce((sum, i) => sum + (i.subtotal ?? 0), 0);
    await db.update(orders).set({ subtotal: newSubtotal, total: newSubtotal, updated_at: now })
      .where(eq(orders.id, req.params.id));

    res.status(201).json({ data: allItems });
  } catch (err) {
    next(err);
  }
});

router.put('/items/:itemId', requireAuth, async (req, res, next) => {
  try {
    const { quantity, unit_price, notes, status, extras, removals, is_gift, gift_reason } = req.body;

    const update: Record<string, unknown> = {};
    if (quantity !== undefined) update.quantity = quantity;
    if (unit_price !== undefined) update.unit_price = unit_price;
    if (notes !== undefined) update.notes = notes;
    if (status !== undefined) update.status = status;
    if (extras !== undefined) update.extras = extras;
    if (removals !== undefined) update.removals = removals;
    if (is_gift !== undefined) update.is_gift = is_gift;
    if (gift_reason !== undefined) update.gift_reason = gift_reason;

    if (quantity !== undefined || unit_price !== undefined) {
      const existing = await db.select().from(order_items)
        .where(eq(order_items.id, req.params.itemId)).get();
      const q = quantity ?? existing?.quantity ?? 1;
      const p = unit_price ?? existing?.unit_price ?? 0;
      update.subtotal = q * p;
    }

    await db.update(order_items).set(update).where(eq(order_items.id, req.params.itemId));
    const row = await db.select().from(order_items).where(eq(order_items.id, req.params.itemId)).get();
    if (!row) throw new AppError(404, 'Order item not found');
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
});

router.delete('/items/:itemId', requireAuth, async (req, res, next) => {
  try {
    const item = await db.select().from(order_items).where(eq(order_items.id, req.params.itemId)).get();
    if (!item) throw new AppError(404, 'Order item not found');

    await db.delete(order_item_modifiers).where(eq(order_item_modifiers.order_item_id, req.params.itemId));
    await db.delete(order_items).where(eq(order_items.id, req.params.itemId));

    const remaining = await db.select().from(order_items).where(eq(order_items.order_id, item.order_id));
    const newSubtotal = remaining.reduce((sum, i) => sum + (i.subtotal ?? 0), 0);
    const now = new Date().toISOString();
    await db.update(orders).set({ subtotal: newSubtotal, total: newSubtotal, updated_at: now })
      .where(eq(orders.id, item.order_id));

    res.json({ message: 'Order item removed' });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// PAYMENTS
// ============================================================================

router.post('/:id/payments', requireAuth, async (req, res, next) => {
  try {
    const { payment_method, amount, reference, status: payStatus } = req.body;
    if (!payment_method || amount === undefined) {
      throw new AppError(400, 'payment_method and amount are required');
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(order_payments).values({
      id, order_id: req.params.id, payment_method, amount,
      reference, status: payStatus ?? 'completed',
      created_at: now, updated_at: now,
    });
    const row = await db.select().from(order_payments).where(eq(order_payments.id, id)).get();

    emitToRoom(`order:${req.params.id}`, 'payment:created', row);

    res.status(201).json({ data: row });
  } catch (err) {
    next(err);
  }
});

router.put('/payments/:paymentId', requireAuth, async (req, res, next) => {
  try {
    const { payment_method, amount, reference, status: payStatus } = req.body;
    const now = new Date().toISOString();
    await db.update(order_payments).set({
      ...(payment_method !== undefined && { payment_method }),
      ...(amount !== undefined && { amount }),
      ...(reference !== undefined && { reference }),
      ...(payStatus !== undefined && { status: payStatus }),
      updated_at: now,
    }).where(eq(order_payments.id, req.params.paymentId));
    const row = await db.select().from(order_payments)
      .where(eq(order_payments.id, req.params.paymentId)).get();
    if (!row) throw new AppError(404, 'Payment not found');
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// WEBAPP (PUBLIC)
// ============================================================================

router.get('/webapp/tracking/:code', async (req, res, next) => {
  try {
    const order = await db.select().from(orders)
      .where(eq(orders.webapp_tracking_code, req.params.code)).get();
    if (!order) throw new AppError(404, 'Order not found');

    const items = await db.select().from(order_items).where(eq(order_items.order_id, order.id));
    res.json({ data: { ...order, items } });
  } catch (err) {
    next(err);
  }
});

router.post('/webapp', optionalAuth, async (req, res, next) => {
  try {
    const {
      branch_id, customer_name, customer_phone, customer_email,
      customer_address, customer_floor, customer_reference,
      customer_latitude, customer_longitude, order_type, area,
      notes, payment_method, items: orderItems, neighborhood_id,
    } = req.body;
    if (!branch_id) throw new AppError(400, 'branch_id is required');

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const order_number = await getNextOrderNumber(branch_id);
    const trackingCode = generateTrackingCode();

    let subtotal = 0;
    if (Array.isArray(orderItems)) {
      for (const item of orderItems) {
        subtotal += (item.unit_price ?? 0) * (item.quantity ?? 1);
      }
    }

    await db.insert(orders).values({
      id, branch_id, order_number, customer_name, customer_phone,
      customer_email, customer_address, customer_floor, customer_reference,
      customer_latitude, customer_longitude, order_type, area,
      status: 'pending', subtotal, total: subtotal,
      notes, source: 'webapp', payment_method,
      created_by: req.user?.userId ?? null,
      customer_user_id: req.user?.userId ?? null,
      webapp_tracking_code: trackingCode, is_webapp: true,
      neighborhood_id, created_at: now, updated_at: now,
    });

    if (Array.isArray(orderItems)) {
      for (const item of orderItems) {
        await db.insert(order_items).values({
          id: crypto.randomUUID(),
          order_id: id,
          menu_item_id: item.menu_item_id,
          item_name: item.item_name,
          quantity: item.quantity ?? 1,
          unit_price: item.unit_price,
          subtotal: (item.unit_price ?? 0) * (item.quantity ?? 1),
          notes: item.notes,
          status: 'pending',
          extras: item.extras,
          removals: item.removals,
          created_at: now,
        });
      }
    }

    const order = await db.select().from(orders).where(eq(orders.id, id)).get();

    emitToRoom(`kitchen:${branch_id}`, 'order:updated', order);
    emitToRoom(`branch:${branch_id}`, 'webapp-order:new', order);

    res.status(201).json({ data: { ...order, tracking_code: trackingCode } });
  } catch (err) {
    next(err);
  }
});

router.get('/webapp/:orderId/messages', async (req, res, next) => {
  try {
    const rows = await db.select().from(webapp_order_messages)
      .where(eq(webapp_order_messages.order_id, req.params.orderId))
      .orderBy(webapp_order_messages.created_at);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/webapp/:orderId/messages', optionalAuth, async (req, res, next) => {
  try {
    const { sender_type, sender_name, message } = req.body;
    if (!message) throw new AppError(400, 'message is required');

    const order = await db.select().from(orders).where(eq(orders.id, req.params.orderId)).get();
    if (!order) throw new AppError(404, 'Order not found');

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(webapp_order_messages).values({
      id, order_id: req.params.orderId,
      tracking_code: order.webapp_tracking_code,
      sender_type: sender_type ?? 'customer',
      sender_name: sender_name ?? order.customer_name,
      message, is_read: false, created_at: now,
    });
    const row = await db.select().from(webapp_order_messages).where(eq(webapp_order_messages.id, id)).get();

    emitToRoom(`order:${req.params.orderId}`, 'chat:message', row);

    res.status(201).json({ data: row });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// KITCHEN DISPLAY
// ============================================================================

router.get('/:branchId/kitchen', requireAuth, async (req, res, next) => {
  try {
    const activeStatuses = ['pending', 'confirmed', 'preparing'];
    const rows = await db.select().from(orders)
      .where(and(
        eq(orders.branch_id, req.params.branchId),
        sql`${orders.status} IN ('pending', 'confirmed', 'preparing')`,
      ))
      .orderBy(orders.created_at);

    const result = [];
    for (const order of rows) {
      const items = await db.select().from(order_items)
        .where(eq(order_items.order_id, order.id));
      result.push({ ...order, items });
    }
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// PRINT
// ============================================================================

router.post('/:id/print', requireAuth, async (req, res, next) => {
  try {
    const now = new Date().toISOString();
    await db.update(orders).set({ printed_at: now, updated_at: now })
      .where(eq(orders.id, req.params.id));
    res.json({ message: 'Order marked as printed' });
  } catch (err) {
    next(err);
  }
});

export { router as orderRoutes };

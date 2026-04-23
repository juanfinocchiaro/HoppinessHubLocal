import { Router } from 'express';
import { db } from '../db/connection.js';
import * as schema from '../db/schema.js';
import { eq, and, inArray, isNull, desc, gte, lte } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// ═══════════════════════════════════════════════════════════════════════
// Promotions CRUD
// ═══════════════════════════════════════════════════════════════════════

router.get('/', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(schema.promotions).where(isNull(schema.promotions.deleted_at));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/active', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(schema.promotions)
      .where(and(
        eq(schema.promotions.is_active, true),
        isNull(schema.promotions.deleted_at),
      ));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(schema.promotions).values({
      id, ...req.body,
      created_by: req.body.created_by ?? req.user!.userId,
      created_at: now, updated_at: now,
    });
    const created = await db.select().from(schema.promotions).where(eq(schema.promotions.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════════════
// Discount Codes (before /:id routes)
// ═══════════════════════════════════════════════════════════════════════

router.get('/discount-codes', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(schema.discount_codes).where(isNull(schema.discount_codes.deleted_at));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/discount-codes/find', requireAuth, async (req, res, next) => {
  try {
    const code = (req.query.code as string).trim();
    const row = await db.select().from(schema.discount_codes)
      .where(and(
        eq(schema.discount_codes.code, code),
        eq(schema.discount_codes.is_active, true),
        isNull(schema.discount_codes.deleted_at),
      )).get();
    res.json({ data: row ?? null });
  } catch (err) { next(err); }
});

router.post('/discount-codes', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(schema.discount_codes).values({
      id, ...req.body, current_uses: 0,
      created_by: req.body.created_by ?? req.user!.userId,
      created_at: now, updated_at: now,
    });
    const created = await db.select().from(schema.discount_codes).where(eq(schema.discount_codes.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) { next(err); }
});

router.get('/discount-codes/:codigoId/usage-count', requireAuth, async (req, res, next) => {
  try {
    const userId = req.query.userId as string;
    const rows = await db.select().from(schema.discount_code_uses)
      .where(and(
        eq(schema.discount_code_uses.code_id, req.params.codigoId),
        eq(schema.discount_code_uses.user_id, userId),
      ));
    res.json({ data: rows.length });
  } catch (err) { next(err); }
});

router.post('/discount-codes/:codigoId/use', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const { userId, pedidoId, montoDescontado } = req.body;
    await db.insert(schema.discount_code_uses).values({
      id,
      code_id: req.params.codigoId,
      user_id: userId ?? req.user!.userId,
      pedido_id: pedidoId ?? null,
      discount_amount: montoDescontado,
      created_at: new Date().toISOString(),
    });

    const code = await db.select().from(schema.discount_codes)
      .where(eq(schema.discount_codes.id, req.params.codigoId)).get();
    if (code) {
      await db.update(schema.discount_codes)
        .set({ current_uses: (code.current_uses ?? 0) + 1 })
        .where(eq(schema.discount_codes.id, req.params.codigoId));
    }

    const created = await db.select().from(schema.discount_code_uses).where(eq(schema.discount_code_uses.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) { next(err); }
});

router.put('/discount-codes/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(schema.discount_codes).where(eq(schema.discount_codes.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Discount code not found');
    await db.update(schema.discount_codes)
      .set({ ...req.body, updated_at: new Date().toISOString() })
      .where(eq(schema.discount_codes.id, req.params.id));
    const updated = await db.select().from(schema.discount_codes).where(eq(schema.discount_codes.id, req.params.id)).get();
    res.json({ data: updated });
  } catch (err) { next(err); }
});

router.delete('/discount-codes/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(schema.discount_codes).where(eq(schema.discount_codes.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Discount code not found');
    await db.update(schema.discount_codes)
      .set({ deleted_at: new Date().toISOString() })
      .where(eq(schema.discount_codes.id, req.params.id));
    res.json({ message: 'Discount code soft-deleted' });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════════════
// Price Lists (before /:id routes)
// ═══════════════════════════════════════════════════════════════════════

router.get('/price-lists', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(schema.price_lists);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/price-lists/channels', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select({ channel: schema.price_lists.channel }).from(schema.price_lists);
    const channels = [...new Set(rows.map(r => r.channel).filter(Boolean))] as string[];
    res.json({ data: channels });
  } catch (err) { next(err); }
});

router.post('/price-lists', requireAuth, async (req, res, next) => {
  try {
    const { rows: inputRows } = req.body as { rows: Array<Record<string, unknown>> };
    const now = new Date().toISOString();
    const inserted: unknown[] = [];
    for (const row of inputRows) {
      const id = crypto.randomUUID();
      await db.insert(schema.price_lists).values({ id, ...row, created_at: now, updated_at: now });
      const created = await db.select().from(schema.price_lists).where(eq(schema.price_lists.id, id)).get();
      inserted.push(created);
    }
    res.status(201).json({ data: inserted });
  } catch (err) { next(err); }
});

router.post('/price-lists/items-batch', requireAuth, async (req, res, next) => {
  try {
    const { priceListIds } = req.body as { priceListIds: string[] };
    if (!priceListIds?.length) return res.json({ data: [] });
    const rows = await db.select().from(schema.price_list_items)
      .where(inArray(schema.price_list_items.price_list_id, priceListIds));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/price-lists/by-channels', requireAuth, async (req, res, next) => {
  try {
    const { channels } = req.body as { channels: string[] };
    if (!channels?.length) return res.json({ data: [] });
    const rows = await db.select().from(schema.price_lists)
      .where(inArray(schema.price_lists.channel, channels));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/price-lists/:priceListId/items', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(schema.price_list_items)
      .where(eq(schema.price_list_items.price_list_id, req.params.priceListId));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.put('/price-lists/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(schema.price_lists).where(eq(schema.price_lists.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Price list not found');
    await db.update(schema.price_lists)
      .set({ ...req.body, updated_at: new Date().toISOString() })
      .where(eq(schema.price_lists.id, req.params.id));
    const updated = await db.select().from(schema.price_lists).where(eq(schema.price_lists.id, req.params.id)).get();
    res.json({ data: updated });
  } catch (err) { next(err); }
});

router.post('/price-lists/:priceListId/items/bulk', requireAuth, async (req, res, next) => {
  try {
    const priceListId = req.params.priceListId;
    const { items } = req.body as { items: Array<{ item_carta_id: string; precio: number }> };
    const now = new Date().toISOString();

    for (const item of items) {
      const existing = await db.select().from(schema.price_list_items)
        .where(and(
          eq(schema.price_list_items.price_list_id, priceListId),
          eq(schema.price_list_items.item_carta_id, item.item_carta_id),
        )).get();

      if (existing) {
        await db.update(schema.price_list_items)
          .set({ price: item.precio, updated_at: now })
          .where(eq(schema.price_list_items.id, existing.id));
      } else {
        await db.insert(schema.price_list_items).values({
          id: crypto.randomUUID(),
          price_list_id: priceListId,
          item_carta_id: item.item_carta_id,
          price: item.precio,
          created_at: now, updated_at: now,
        });
      }
    }

    const rows = await db.select().from(schema.price_list_items)
      .where(eq(schema.price_list_items.price_list_id, priceListId));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.delete('/price-lists/:priceListId/items/:itemCartaId', requireAuth, async (req, res, next) => {
  try {
    await db.delete(schema.price_list_items)
      .where(and(
        eq(schema.price_list_items.price_list_id, req.params.priceListId),
        eq(schema.price_list_items.item_carta_id, req.params.itemCartaId),
      ));
    res.json({ message: 'Price override deleted' });
  } catch (err) { next(err); }
});

router.delete('/price-lists/:id', requireAuth, async (req, res, next) => {
  try {
    await db.delete(schema.price_list_items)
      .where(eq(schema.price_list_items.price_list_id, req.params.id));
    await db.delete(schema.price_lists)
      .where(eq(schema.price_lists.id, req.params.id));
    res.json({ message: 'Price list deleted' });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════════════
// Promotion Items Batch / Extras (before /:id routes)
// ═══════════════════════════════════════════════════════════════════════

router.post('/items-batch', requireAuth, async (req, res, next) => {
  try {
    const { promoIds } = req.body as { promoIds: string[] };
    if (!promoIds?.length) return res.json({ data: [] });
    const rows = await db.select().from(schema.promotion_items)
      .where(inArray(schema.promotion_items.promocion_id, promoIds));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/preconfig-extras', requireAuth, async (req, res, next) => {
  try {
    const { promoItemIds } = req.body as { promoItemIds: string[] };
    if (!promoItemIds?.length) return res.json({ data: [] });
    const rows = await db.select().from(schema.promotion_item_extras)
      .where(inArray(schema.promotion_item_extras.promocion_item_id, promoItemIds));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/preconfig-extras/batch', requireAuth, async (req, res, next) => {
  try {
    const { rows: inputRows } = req.body as {
      rows: Array<{ promocion_item_id: string; extra_item_carta_id: string; quantity: number }>;
    };
    const now = new Date().toISOString();
    for (const row of inputRows) {
      await db.insert(schema.promotion_item_extras).values({
        id: crypto.randomUUID(), ...row, created_at: now,
      });
    }
    res.status(201).json({ data: { inserted: inputRows.length } });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════════════
// Menu Items Info (for promotions context)
// ═══════════════════════════════════════════════════════════════════════

router.post('/menu-items-price-info', requireAuth, async (req, res, next) => {
  try {
    const { ids } = req.body as { ids: string[] };
    if (!ids?.length) return res.json({ data: [] });
    const rows = await db.select({
      id: schema.menu_items.id,
      name: schema.menu_items.name,
      base_price: schema.menu_items.base_price,
      total_cost: schema.menu_items.total_cost,
      is_active: schema.menu_items.is_active,
    }).from(schema.menu_items).where(inArray(schema.menu_items.id, ids));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/menu-items-for-pricing', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select({
      id: schema.menu_items.id,
      name: schema.menu_items.name,
      base_price: schema.menu_items.base_price,
      categoria_carta_id: schema.menu_items.categoria_carta_id,
      is_active: schema.menu_items.is_active,
    }).from(schema.menu_items)
      .where(and(eq(schema.menu_items.is_active, true), isNull(schema.menu_items.deleted_at)));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/menu-items-prices', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select({
      id: schema.menu_items.id,
      name: schema.menu_items.name,
      base_price: schema.menu_items.base_price,
    }).from(schema.menu_items)
      .where(and(eq(schema.menu_items.is_active, true), isNull(schema.menu_items.deleted_at)));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════════════
// Branch Promo Discount Items
// ═══════════════════════════════════════════════════════════════════════

router.get('/branches/:branchId/discount-items', requireAuth, async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query as { startDate: string; endDate: string };
    const branchId = req.params.branchId;

    const orders = await db.select({ id: schema.orders.id })
      .from(schema.orders)
      .where(and(
        eq(schema.orders.branch_id, branchId),
        gte(schema.orders.created_at, startDate),
        lte(schema.orders.created_at, endDate + 'T23:59:59'),
      ));

    if (!orders.length) return res.json({ data: [] });

    const orderIds = orders.map(o => o.id);
    const items = await db.select().from(schema.order_items)
      .where(inArray(schema.order_items.pedido_id, orderIds));

    const discountItems = items.filter(i => i.promocion_id);
    res.json({ data: discountItems });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════════════
// Promotion Items / Toggle / Update / Delete (parametric /:id routes last)
// ═══════════════════════════════════════════════════════════════════════

router.get('/:promoId/items', requireAuth, async (req, res, next) => {
  try {
    const items = await db.select().from(schema.promotion_items)
      .where(eq(schema.promotion_items.promocion_id, req.params.promoId));

    const itemCartaIds = items.map(i => i.item_carta_id).filter(Boolean) as string[];
    let menuItems: Array<Record<string, unknown>> = [];
    if (itemCartaIds.length > 0) {
      menuItems = await db.select().from(schema.menu_items)
        .where(inArray(schema.menu_items.id, itemCartaIds));
    }

    const enriched = items.map(item => {
      const mi = menuItems.find((m: any) => m.id === item.item_carta_id);
      return { ...item, menu_item: mi ?? null };
    });
    res.json({ data: enriched });
  } catch (err) { next(err); }
});

router.post('/:promoId/items', requireAuth, async (req, res, next) => {
  try {
    const promoId = req.params.promoId;
    const existing = await db.select().from(schema.promotions).where(eq(schema.promotions.id, promoId)).get();
    if (!existing) throw new AppError(404, 'Promotion not found');

    const { items } = req.body as { items: Array<{ item_carta_id: string; precio_promo: number }> };
    const now = new Date().toISOString();
    const inserted: Array<{ id: string; item_carta_id: string }> = [];

    for (const item of items) {
      const id = crypto.randomUUID();
      await db.insert(schema.promotion_items).values({
        id, promocion_id: promoId,
        item_carta_id: item.item_carta_id,
        promo_price: item.precio_promo,
        created_at: now,
      });
      inserted.push({ id, item_carta_id: item.item_carta_id });
    }
    res.status(201).json({ data: inserted });
  } catch (err) { next(err); }
});

router.delete('/:promoId/items', requireAuth, async (req, res, next) => {
  try {
    const promoItems = await db.select({ id: schema.promotion_items.id })
      .from(schema.promotion_items)
      .where(eq(schema.promotion_items.promocion_id, req.params.promoId));

    if (promoItems.length > 0) {
      const itemIds = promoItems.map(pi => pi.id);
      await db.delete(schema.promotion_item_extras)
        .where(inArray(schema.promotion_item_extras.promocion_item_id, itemIds));
    }

    await db.delete(schema.promotion_items)
      .where(eq(schema.promotion_items.promocion_id, req.params.promoId));
    res.json({ message: 'Promotion items deleted' });
  } catch (err) { next(err); }
});

router.put('/:id/toggle-active', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(schema.promotions).where(eq(schema.promotions.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Promotion not found');
    await db.update(schema.promotions)
      .set({ is_active: req.body.is_active, updated_at: new Date().toISOString() })
      .where(eq(schema.promotions.id, req.params.id));
    const updated = await db.select().from(schema.promotions).where(eq(schema.promotions.id, req.params.id)).get();
    res.json({ data: updated });
  } catch (err) { next(err); }
});

router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(schema.promotions).where(eq(schema.promotions.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Promotion not found');
    await db.update(schema.promotions)
      .set({ ...req.body, updated_at: new Date().toISOString() })
      .where(eq(schema.promotions.id, req.params.id));
    const updated = await db.select().from(schema.promotions).where(eq(schema.promotions.id, req.params.id)).get();
    res.json({ data: updated });
  } catch (err) { next(err); }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(schema.promotions).where(eq(schema.promotions.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Promotion not found');
    await db.update(schema.promotions)
      .set({ deleted_at: new Date().toISOString() })
      .where(eq(schema.promotions.id, req.params.id));
    res.json({ message: 'Promotion soft-deleted' });
  } catch (err) { next(err); }
});

export { router as promotionRoutes };

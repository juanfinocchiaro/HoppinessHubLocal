import { Router } from 'express';
import { db } from '../db/connection.js';
import * as schema from '../db/schema.js';
import { eq, and, inArray, isNull, desc, gte, lte } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { logChannelChange, logChannelChangeBulk, isAppChannel } from '../services/channelChanges.js';

const router = Router();

// ═══════════════════════════════════════════════════════════════════════
// Promotions CRUD
// ═══════════════════════════════════════════════════════════════════════

/**
 * Trae, para un conjunto de promos, todas sus filas de
 * `promotion_channel_config` y las devuelve como un map `promoId -> configs[]`.
 */
async function fetchChannelConfigsMap(promoIds: string[]) {
  if (!promoIds.length) return new Map<string, Array<typeof schema.promotion_channel_config.$inferSelect>>();
  const rows = await db.select().from(schema.promotion_channel_config)
    .where(inArray(schema.promotion_channel_config.promotion_id, promoIds));
  const map = new Map<string, Array<typeof schema.promotion_channel_config.$inferSelect>>();
  for (const row of rows) {
    const list = map.get(row.promotion_id) ?? [];
    list.push(row);
    map.set(row.promotion_id, list);
  }
  return map;
}

/**
 * Reemplaza todas las filas de `promotion_channel_config` para una promo por
 * el array recibido (upsert por channel_code). Mantiene sincronizado el array
 * legacy `promotions.canales` para compat y rollback. También registra
 * cambios pendientes en canales externos (Fase 5).
 */
async function replaceChannelConfigs(
  promoId: string,
  configs: Array<{
    channel_code: string;
    is_active_in_channel?: boolean;
    custom_discount_value?: number | null;
    custom_final_price?: number | null;
    funded_by?: string | null;
    display_format?: string | null;
    banner_image_url?: string | null;
    promo_text?: string | null;
  }>,
  context: { createdBy?: string; isNewPromotion: boolean },
) {
  const now = new Date().toISOString();

  const previousConfigs = await db.select().from(schema.promotion_channel_config)
    .where(eq(schema.promotion_channel_config.promotion_id, promoId));
  const previousActiveByChannel = new Map(
    previousConfigs.map((c) => [c.channel_code, c.is_active_in_channel !== false] as const),
  );

  const promoRow = await db.select().from(schema.promotions).where(eq(schema.promotions.id, promoId)).get();

  await db.delete(schema.promotion_channel_config)
    .where(eq(schema.promotion_channel_config.promotion_id, promoId));
  for (const cfg of configs) {
    await db.insert(schema.promotion_channel_config).values({
      id: crypto.randomUUID(),
      promotion_id: promoId,
      channel_code: cfg.channel_code,
      is_active_in_channel: cfg.is_active_in_channel ?? true,
      custom_discount_value: cfg.custom_discount_value ?? null,
      custom_final_price: cfg.custom_final_price ?? null,
      funded_by: cfg.funded_by ?? null,
      display_format: cfg.display_format ?? null,
      banner_image_url: cfg.banner_image_url ?? null,
      promo_text: cfg.promo_text ?? null,
      created_at: now,
      updated_at: now,
    });
  }
  // Shadow sync: mantener `canales` como array con los canales activos.
  const activeChannels = configs.filter((c) => c.is_active_in_channel !== false).map((c) => c.channel_code);
  await db.update(schema.promotions)
    .set({ canales: JSON.stringify(activeChannels), updated_at: now })
    .where(eq(schema.promotions.id, promoId));

  for (const cfg of configs) {
    if (!isAppChannel(cfg.channel_code)) continue;
    const wasActive = previousActiveByChannel.get(cfg.channel_code) ?? false;
    const nowActive = cfg.is_active_in_channel !== false;

    if (context.isNewPromotion || (!wasActive && nowActive)) {
      await logChannelChange({
        channelCode: cfg.channel_code,
        changeType: 'new_promotion',
        entityType: 'promotion',
        entityId: promoId,
        payload: buildPromotionPayload(promoRow, cfg),
        createdBy: context.createdBy,
      });
    } else if (wasActive && !nowActive) {
      await logChannelChange({
        channelCode: cfg.channel_code,
        changeType: 'promotion_end',
        entityType: 'promotion',
        entityId: promoId,
        payload: buildPromotionPayload(promoRow, cfg),
        createdBy: context.createdBy,
      });
    } else if (wasActive && nowActive) {
      await logChannelChange({
        channelCode: cfg.channel_code,
        changeType: 'promotion_change',
        entityType: 'promotion',
        entityId: promoId,
        payload: buildPromotionPayload(promoRow, cfg),
        createdBy: context.createdBy,
      });
    }
  }

  for (const prev of previousConfigs) {
    if (!isAppChannel(prev.channel_code)) continue;
    const stillPresent = configs.some((c) => c.channel_code === prev.channel_code);
    if (!stillPresent && prev.is_active_in_channel !== false) {
      await logChannelChange({
        channelCode: prev.channel_code,
        changeType: 'promotion_end',
        entityType: 'promotion',
        entityId: promoId,
        payload: buildPromotionPayload(promoRow, prev),
        createdBy: context.createdBy,
      });
    }
  }
}

function buildPromotionPayload(
  promo: typeof schema.promotions.$inferSelect | null | undefined,
  cfg: {
    channel_code: string;
    custom_final_price?: number | null;
    custom_discount_value?: number | null;
    display_format?: string | null;
    promo_text?: string | null;
  },
) {
  return {
    promotion_name: promo?.name ?? null,
    promotion_type: promo?.type ?? null,
    promotion_value: promo?.value ?? null,
    dias_semana: promo?.dias_semana ?? null,
    hora_inicio: promo?.hora_inicio ?? null,
    hora_fin: promo?.hora_fin ?? null,
    channel_code: cfg.channel_code,
    custom_final_price: cfg.custom_final_price ?? null,
    custom_discount_value: cfg.custom_discount_value ?? null,
    display_format: cfg.display_format ?? null,
    promo_text: cfg.promo_text ?? null,
  };
}

router.get('/', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(schema.promotions).where(isNull(schema.promotions.deleted_at));
    const configsMap = await fetchChannelConfigsMap(rows.map((r) => r.id));
    const enriched = rows.map((r) => ({ ...r, channel_configs: configsMap.get(r.id) ?? [] }));
    res.json({ data: enriched });
  } catch (err) { next(err); }
});

router.get('/active', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(schema.promotions)
      .where(and(
        eq(schema.promotions.is_active, true),
        isNull(schema.promotions.deleted_at),
      ));
    const configsMap = await fetchChannelConfigsMap(rows.map((r) => r.id));
    const enriched = rows.map((r) => ({ ...r, channel_configs: configsMap.get(r.id) ?? [] }));
    res.json({ data: enriched });
  } catch (err) { next(err); }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    // Separamos `channel_configs` porque no es columna de `promotions`.
    const { channel_configs, ...promoFields } = req.body as Record<string, unknown> & {
      channel_configs?: Parameters<typeof replaceChannelConfigs>[1];
    };
    await db.insert(schema.promotions).values({
      id, ...promoFields,
      created_by: (promoFields.created_by as string | undefined) ?? req.user!.userId,
      created_at: now, updated_at: now,
    });
    if (Array.isArray(channel_configs)) {
      await replaceChannelConfigs(id, channel_configs, {
        createdBy: req.user!.userId,
        isNewPromotion: true,
      });
    }
    const created = await db.select().from(schema.promotions).where(eq(schema.promotions.id, id)).get();
    const channelConfigs = await db.select().from(schema.promotion_channel_config)
      .where(eq(schema.promotion_channel_config.promotion_id, id));
    res.status(201).json({ data: { ...created, channel_configs: channelConfigs } });
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
    const { items } = req.body as {
      items: Array<{
        item_carta_id: string;
        precio: number;
        is_visible?: boolean;
        custom_name?: string | null;
        custom_image_url?: string | null;
        custom_description?: string | null;
      }>;
    };
    const now = new Date().toISOString();

    const priceList = await db.select().from(schema.price_lists)
      .where(eq(schema.price_lists.id, priceListId)).get();
    const channelCode = priceList?.channel ?? null;

    for (const item of items) {
      const existing = await db.select().from(schema.price_list_items)
        .where(and(
          eq(schema.price_list_items.price_list_id, priceListId),
          eq(schema.price_list_items.item_carta_id, item.item_carta_id),
        )).get();

      const patch: Record<string, unknown> = { price: item.precio, updated_at: now };
      if (item.is_visible !== undefined) patch.is_visible = item.is_visible;
      if (item.custom_name !== undefined) patch.custom_name = item.custom_name;
      if (item.custom_image_url !== undefined) patch.custom_image_url = item.custom_image_url;
      if (item.custom_description !== undefined) patch.custom_description = item.custom_description;

      if (existing) {
        await db.update(schema.price_list_items)
          .set(patch)
          .where(eq(schema.price_list_items.id, existing.id));
      } else {
        await db.insert(schema.price_list_items).values({
          id: crypto.randomUUID(),
          price_list_id: priceListId,
          item_carta_id: item.item_carta_id,
          price: item.precio,
          is_visible: item.is_visible ?? true,
          custom_name: item.custom_name ?? null,
          custom_image_url: item.custom_image_url ?? null,
          custom_description: item.custom_description ?? null,
          created_at: now, updated_at: now,
        });
      }

      if (channelCode && isAppChannel(channelCode)) {
        const priceChanged = !existing || existing.price !== item.precio;
        const visibilityChanged = item.is_visible !== undefined && existing && existing.is_visible !== item.is_visible;
        if (priceChanged || visibilityChanged) {
          const menuItem = await db.select().from(schema.menu_items)
            .where(eq(schema.menu_items.id, item.item_carta_id)).get();
          await logChannelChange({
            channelCode,
            changeType: item.is_visible === false
              ? 'deactivation'
              : !existing
                ? 'new_article'
                : 'price_change',
            entityType: 'menu_item',
            entityId: item.item_carta_id,
            payload: {
              item_name: menuItem?.name ?? null,
              channel_code: channelCode,
              previous_price: existing?.price ?? null,
              new_price: item.precio,
              is_visible: item.is_visible,
              custom_name: item.custom_name ?? null,
              custom_description: item.custom_description ?? null,
            },
            createdBy: req.user!.userId,
          });
        }
      }
    }

    const rows = await db.select().from(schema.price_list_items)
      .where(eq(schema.price_list_items.price_list_id, priceListId));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

/**
 * Fase 3: patch puntual para un ítem × canal. Upsert que permite cambiar
 * `is_visible` y/o los overrides visuales sin tocar `price`.
 */
router.put('/price-lists/:priceListId/items/:itemCartaId', requireAuth, async (req, res, next) => {
  try {
    const { priceListId, itemCartaId } = req.params;
    const {
      is_visible,
      custom_name,
      custom_image_url,
      custom_description,
      price,
    } = req.body as {
      is_visible?: boolean;
      custom_name?: string | null;
      custom_image_url?: string | null;
      custom_description?: string | null;
      price?: number;
    };
    const now = new Date().toISOString();

    const priceList = await db.select().from(schema.price_lists)
      .where(eq(schema.price_lists.id, priceListId)).get();
    const channelCode = priceList?.channel ?? null;

    const existing = await db.select().from(schema.price_list_items)
      .where(and(
        eq(schema.price_list_items.price_list_id, priceListId),
        eq(schema.price_list_items.item_carta_id, itemCartaId),
      )).get();

    const patch: Record<string, unknown> = { updated_at: now };
    if (is_visible !== undefined) patch.is_visible = is_visible;
    if (custom_name !== undefined) patch.custom_name = custom_name;
    if (custom_image_url !== undefined) patch.custom_image_url = custom_image_url;
    if (custom_description !== undefined) patch.custom_description = custom_description;
    if (price !== undefined) patch.price = price;

    if (existing) {
      await db.update(schema.price_list_items)
        .set(patch)
        .where(eq(schema.price_list_items.id, existing.id));
    } else {
      await db.insert(schema.price_list_items).values({
        id: crypto.randomUUID(),
        price_list_id: priceListId,
        item_carta_id: itemCartaId,
        price: price ?? null,
        is_visible: is_visible ?? true,
        custom_name: custom_name ?? null,
        custom_image_url: custom_image_url ?? null,
        custom_description: custom_description ?? null,
        created_at: now,
        updated_at: now,
      });
    }

    if (channelCode && isAppChannel(channelCode)) {
      const visibilityChanged = is_visible !== undefined && existing?.is_visible !== is_visible;
      const priceChanged = price !== undefined && existing?.price !== price;
      if (visibilityChanged || priceChanged) {
        const menuItem = await db.select().from(schema.menu_items)
          .where(eq(schema.menu_items.id, itemCartaId)).get();
        await logChannelChange({
          channelCode,
          changeType: is_visible === false ? 'deactivation' : is_visible === true && existing?.is_visible === false ? 'activation' : priceChanged ? 'price_change' : 'price_change',
          entityType: 'menu_item',
          entityId: itemCartaId,
          payload: {
            item_name: menuItem?.name ?? null,
            channel_code: channelCode,
            previous_price: existing?.price ?? null,
            new_price: price ?? existing?.price ?? null,
            is_visible,
            custom_name,
            custom_description,
          },
          createdBy: req.user!.userId,
        });
      }
    }

    const updated = await db.select().from(schema.price_list_items)
      .where(and(
        eq(schema.price_list_items.price_list_id, priceListId),
        eq(schema.price_list_items.item_carta_id, itemCartaId),
      )).get();
    res.json({ data: updated });
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

    const configs = await db.select().from(schema.promotion_channel_config)
      .where(eq(schema.promotion_channel_config.promotion_id, req.params.id));
    const appConfigs = configs.filter((c) => isAppChannel(c.channel_code) && c.is_active_in_channel !== false);
    if (appConfigs.length > 0) {
      await logChannelChangeBulk(
        appConfigs.map((c) => c.channel_code),
        {
          changeType: req.body.is_active ? 'new_promotion' : 'promotion_end',
          entityType: 'promotion',
          entityId: req.params.id,
          payload: buildPromotionPayload(existing, { channel_code: 'all' }),
          createdBy: req.user!.userId,
        },
      );
    }

    const updated = await db.select().from(schema.promotions).where(eq(schema.promotions.id, req.params.id)).get();
    res.json({ data: updated });
  } catch (err) { next(err); }
});

router.get('/:id/channels', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(schema.promotion_channel_config)
      .where(eq(schema.promotion_channel_config.promotion_id, req.params.id));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.put('/:id/channels', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(schema.promotions).where(eq(schema.promotions.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Promotion not found');
    const { configs } = req.body as { configs: Parameters<typeof replaceChannelConfigs>[1] };
    if (!Array.isArray(configs)) throw new AppError(400, 'configs must be an array');
    await replaceChannelConfigs(req.params.id, configs, {
      createdBy: req.user!.userId,
      isNewPromotion: false,
    });
    const rows = await db.select().from(schema.promotion_channel_config)
      .where(eq(schema.promotion_channel_config.promotion_id, req.params.id));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(schema.promotions).where(eq(schema.promotions.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Promotion not found');
    const { channel_configs, ...promoFields } = req.body as Record<string, unknown> & {
      channel_configs?: Parameters<typeof replaceChannelConfigs>[1];
    };
    await db.update(schema.promotions)
      .set({ ...promoFields, updated_at: new Date().toISOString() })
      .where(eq(schema.promotions.id, req.params.id));
    if (Array.isArray(channel_configs)) {
      await replaceChannelConfigs(req.params.id, channel_configs, {
        createdBy: req.user!.userId,
        isNewPromotion: false,
      });
    }
    const updated = await db.select().from(schema.promotions).where(eq(schema.promotions.id, req.params.id)).get();
    const rows = await db.select().from(schema.promotion_channel_config)
      .where(eq(schema.promotion_channel_config.promotion_id, req.params.id));
    res.json({ data: { ...updated, channel_configs: rows } });
  } catch (err) { next(err); }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(schema.promotions).where(eq(schema.promotions.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Promotion not found');

    const configs = await db.select().from(schema.promotion_channel_config)
      .where(eq(schema.promotion_channel_config.promotion_id, req.params.id));
    const appConfigs = configs.filter((c) => isAppChannel(c.channel_code) && c.is_active_in_channel !== false);
    if (appConfigs.length > 0) {
      await logChannelChangeBulk(
        appConfigs.map((c) => c.channel_code),
        {
          changeType: 'promotion_end',
          entityType: 'promotion',
          entityId: req.params.id,
          payload: buildPromotionPayload(existing, { channel_code: 'all' }),
          createdBy: req.user!.userId,
        },
      );
    }

    await db.update(schema.promotions)
      .set({ deleted_at: new Date().toISOString() })
      .where(eq(schema.promotions.id, req.params.id));
    res.json({ message: 'Promotion soft-deleted' });
  } catch (err) { next(err); }
});

export { router as promotionRoutes };

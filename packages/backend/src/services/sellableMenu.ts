/**
 * Fase 1 — Builder server-authoritative de `SellableItem[]`.
 *
 * Responsabilidad: dado `{ channelCode, branchId, at }`, devolver el menú
 * vendible completamente resuelto (precio por canal, visibilidad, custom
 * name/image, combos, promo activa). Es la UNICA fuente de verdad que POS
 * y WebApp consumen. `orders.routes.ts` también lo usa para validar precios
 * recibidos.
 *
 * Reglas:
 *  - `menu_items.is_active = true AND deleted_at IS NULL`.
 *  - `price_list_items.is_visible` decide visibilidad por canal (Fase 3).
 *  - Precio: `price_list_items.price` si existe; sino `price_lists.pricing_mode`
 *    aplicado a `menu_items.base_price`.
 *  - Combos: si `menu_items.type = 'combo'`, se cruzan sus
 *    `menu_item_components`.
 *  - Promos: se filtran las activas por `promotion_channel_config.channel_code`,
 *    `promotions.is_active`, `dias_semana`, `hora_inicio/fin`, `start_date/end_date`.
 */

import { db } from '../db/connection.js';
import * as schema from '../db/schema.js';
import { and, eq, inArray, isNull, isNotNull } from 'drizzle-orm';
import type {
  SellableItem,
  SellableItemKind,
  SellableMenuResponse,
  SellableActivePromo,
  SellableComboComponent,
} from '@hoppiness/shared';

export interface BuildSellableMenuInput {
  channelCode: string;
  branchId?: string | null;
  /** ISO string. Default: now. */
  at?: string;
}

/**
 * Reglas de pricing equivalentes a `computeChannelPrice` del frontend.
 * Se duplica acá para mantener autoridad server-side.
 */
function applyPricingMode(
  basePrice: number,
  mode: string | null,
  value: number,
  override: number | null | undefined,
): number {
  if (override != null) return override;
  if (mode === 'base' || mode === 'manual' || mode == null) return basePrice;
  if (mode === 'percentage') return Math.round(basePrice * (1 + value / 100));
  if (mode === 'fixed_amount') return Math.round(basePrice + value);
  return basePrice;
}

function parseJsonArray<T = unknown>(raw: string | null | undefined): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function parseCanalesString(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === 'string');
    } catch { /* falls through */ }
  }
  return trimmed.split(',').map((s) => s.trim()).filter(Boolean);
}

interface ActivePromoRow {
  promo: typeof schema.promotions.$inferSelect;
  items: Array<typeof schema.promotion_items.$inferSelect>;
  extrasByItem: Map<string, Array<{ extra_item_carta_id: string; quantity: number; nombre: string | null; precio: number }>>;
  channelConfig: typeof schema.promotion_channel_config.$inferSelect | null;
}

/**
 * Trae promos activas para (channel, at). Aplica filtros de fecha/día/hora
 * y `promotion_channel_config.is_active_in_channel`. Fallback a array legacy
 * `promotions.canales` cuando no hay config específica para el canal.
 */
async function fetchActivePromos(
  channelCode: string,
  atDate: Date,
): Promise<ActivePromoRow[]> {
  const currentDay = atDate.getDay();
  const currentTime = `${String(atDate.getHours()).padStart(2, '0')}:${String(atDate.getMinutes()).padStart(2, '0')}`;
  const today = atDate.toISOString().slice(0, 10);

  const activePromos = await db.select().from(schema.promotions).where(and(
    eq(schema.promotions.is_active, true),
    isNull(schema.promotions.deleted_at),
  ));

  if (!activePromos.length) return [];

  const promoIds = activePromos.map((p) => p.id);

  const allConfigs = await db.select().from(schema.promotion_channel_config)
    .where(inArray(schema.promotion_channel_config.promotion_id, promoIds));
  const configByPromoChannel = new Map<string, typeof schema.promotion_channel_config.$inferSelect>();
  for (const cfg of allConfigs) {
    configByPromoChannel.set(`${cfg.promotion_id}:${cfg.channel_code}`, cfg);
  }

  // Filtrado temporal + por canal
  const applicable = activePromos.filter((p) => {
    const cfg = configByPromoChannel.get(`${p.id}:${channelCode}`);
    if (cfg) {
      if (cfg.is_active_in_channel === false) return false;
    } else {
      // Sin config específica: fallback a canales legacy
      const legacy = parseCanalesString(p.canales);
      if (legacy.length > 0 && !legacy.includes(channelCode)) return false;
    }
    // Días
    const dias = parseJsonArray<number>(p.dias_semana);
    if (dias.length > 0 && !dias.includes(currentDay)) return false;
    // Horas
    const hi = (p.hora_inicio ?? '').slice(0, 5);
    const hf = (p.hora_fin ?? '').slice(0, 5);
    if (hi && currentTime < hi) return false;
    if (hf && hf !== '00:00' && currentTime > hf) return false;
    // Fechas
    if (p.start_date && today < p.start_date) return false;
    if (p.end_date && today > p.end_date) return false;
    return true;
  });

  if (!applicable.length) return [];

  const applicableIds = applicable.map((p) => p.id);
  const promoItems = await db.select().from(schema.promotion_items)
    .where(inArray(schema.promotion_items.promocion_id, applicableIds));

  // Extras preconfigurados por promo_item
  const promoItemIds = promoItems.map((pi) => pi.id);
  let extrasByItem = new Map<string, Array<{ extra_item_carta_id: string; quantity: number; nombre: string | null; precio: number }>>();
  if (promoItemIds.length) {
    const extras = await db.select().from(schema.promotion_item_extras)
      .where(inArray(schema.promotion_item_extras.promocion_item_id, promoItemIds));
    const extraItemIds = [...new Set(extras.map((e) => e.extra_item_carta_id).filter(Boolean))] as string[];
    const extraInfo = extraItemIds.length ? await db.select({
      id: schema.menu_items.id,
      name: schema.menu_items.name,
      base_price: schema.menu_items.base_price,
    }).from(schema.menu_items).where(inArray(schema.menu_items.id, extraItemIds)) : [];
    const infoMap = new Map(extraInfo.map((i) => [i.id, i] as const));
    for (const ex of extras) {
      if (!ex.extra_item_carta_id || !ex.promocion_item_id) continue;
      const info = infoMap.get(ex.extra_item_carta_id);
      const list = extrasByItem.get(ex.promocion_item_id) ?? [];
      list.push({
        extra_item_carta_id: ex.extra_item_carta_id,
        quantity: ex.quantity ?? 1,
        nombre: info?.name ?? null,
        precio: Number(info?.base_price ?? 0),
      });
      extrasByItem.set(ex.promocion_item_id, list);
    }
  }

  return applicable.map((promo) => {
    const items = promoItems.filter((pi) => pi.promocion_id === promo.id);
    return {
      promo,
      items,
      extrasByItem,
      channelConfig: configByPromoChannel.get(`${promo.id}:${channelCode}`) ?? null,
    };
  });
}

function pickPromoForItem(
  itemId: string,
  promos: ActivePromoRow[],
  basePrice: number,
): SellableActivePromo | null {
  // Encontrar todos los promo_items que apuntan a este item, elegir el mejor descuento.
  let best: { row: ActivePromoRow; item: typeof schema.promotion_items.$inferSelect; originalPrice: number; promoPrice: number } | null = null;

  for (const row of promos) {
    for (const pi of row.items) {
      if (pi.item_carta_id !== itemId) continue;
      const extras = row.extrasByItem.get(pi.id) ?? [];
      const extrasTotal = extras.reduce((s, ex) => s + ex.precio * ex.quantity, 0);
      const originalPrice = basePrice + extrasTotal;
      const promoPrice = Number(pi.promo_price ?? 0);
      if (!(promoPrice < originalPrice)) continue;
      if (!best || originalPrice - promoPrice > best.originalPrice - best.promoPrice) {
        best = { row: row, item: pi, originalPrice, promoPrice };
      }
    }
  }

  if (!best) return null;
  const extras = best.row.extrasByItem.get(best.item.id) ?? [];
  const includedModifiers = extras
    .filter((ex) => !!ex.nombre)
    .map((ex) => ({ name: ex.nombre as string, quantity: ex.quantity }));
  const includedLabel = includedModifiers.length
    ? `Incluye: ${includedModifiers.map((m) => (m.quantity > 1 ? `${m.quantity}x ${m.name}` : m.name)).join(', ')}`
    : null;
  const preconfigExtrasFull = extras.map((ex) => ({
    extra_item_carta_id: ex.extra_item_carta_id,
    quantity: ex.quantity,
    name: ex.nombre ?? null,
    unit_price: ex.precio,
  }));

  const cfg = best.row.channelConfig;
  return {
    promotion_item_id: best.item.id,
    promotion_id: best.row.promo.id,
    promotion_name: best.row.promo.name ?? '',
    type: best.row.promo.type ?? '',
    value: Number(best.row.promo.value ?? 0),
    promo_price: cfg?.custom_final_price ?? best.promoPrice,
    original_price: best.originalPrice,
    included_modifiers: includedModifiers,
    included_label: includedLabel,
    preconfig_extras: preconfigExtrasFull,
    banner_image_url: cfg?.banner_image_url ?? null,
    display_format: (cfg?.display_format ?? best.row.promo.display_format ?? null) as SellableActivePromo['display_format'],
    funded_by: (cfg?.funded_by ?? best.row.promo.funded_by ?? null) as SellableActivePromo['funded_by'],
    promo_text: cfg?.promo_text ?? null,
    restriccion_pago: (best.row.promo.restriccion_pago as SellableActivePromo['restriccion_pago']) ?? 'cualquiera',
    show_in_webapp_section: best.row.promo.show_in_webapp_section !== false,
  };
}

export async function buildSellableMenu(input: BuildSellableMenuInput): Promise<SellableMenuResponse> {
  const { channelCode } = input;
  const branchId = input.branchId ?? null;
  const atIso = input.at ?? new Date().toISOString();
  const atDate = new Date(atIso);

  // 1) Canal + price list
  const priceLists = await db.select().from(schema.price_lists).where(eq(schema.price_lists.channel, channelCode));
  const activePriceList = priceLists.find((pl) => pl.is_active !== false) ?? priceLists[0] ?? null;

  // 2) Resolver modo de pricing (incluye mirror)
  let pricingMode = activePriceList?.pricing_mode ?? 'base';
  let pricingValue = Number(activePriceList?.pricing_value ?? 0);
  if (activePriceList?.pricing_mode === 'mirror' && activePriceList?.mirror_channel) {
    const mirrored = await db.select().from(schema.price_lists).where(eq(schema.price_lists.channel, activePriceList.mirror_channel)).get();
    if (mirrored && mirrored.pricing_mode !== 'mirror') {
      pricingMode = mirrored.pricing_mode ?? 'base';
      pricingValue = Number(mirrored.pricing_value ?? 0);
    }
  }

  // 3) Overrides por canal × item
  const overridesByItemId = new Map<string, typeof schema.price_list_items.$inferSelect>();
  if (activePriceList) {
    const rows = await db.select().from(schema.price_list_items)
      .where(eq(schema.price_list_items.price_list_id, activePriceList.id));
    for (const row of rows) {
      if (row.item_carta_id) overridesByItemId.set(row.item_carta_id, row);
    }
  }

  // 4) Menu items activos
  const items = await db.select().from(schema.menu_items).where(and(
    eq(schema.menu_items.is_active, true),
    isNull(schema.menu_items.deleted_at),
  ));

  // 5) Categorías (para nombre)
  const categoryIds = [...new Set(items.map((i) => i.categoria_carta_id).filter(Boolean))] as string[];
  const categories = categoryIds.length ? await db.select().from(schema.menu_categories)
    .where(inArray(schema.menu_categories.id, categoryIds)) : [];
  const categoryById = new Map(categories.map((c) => [c.id, c] as const));

  // 6) Combos: menu_item_components + nombres/costos de componentes
  const comboIds = items.filter((i) => i.type === 'combo').map((i) => i.id);
  const comboComponents = comboIds.length ? await db.select().from(schema.menu_item_components)
    .where(inArray(schema.menu_item_components.combo_id, comboIds)) : [];
  const componentMenuIds = [...new Set(comboComponents.map((c) => c.component_id).filter(Boolean))] as string[];
  const componentMenuItems = componentMenuIds.length ? await db.select({
    id: schema.menu_items.id,
    name: schema.menu_items.name,
    total_cost: schema.menu_items.total_cost,
  }).from(schema.menu_items).where(inArray(schema.menu_items.id, componentMenuIds)) : [];
  const componentById = new Map(componentMenuItems.map((c) => [c.id, c] as const));
  const componentsByCombo = new Map<string, SellableComboComponent[]>();
  for (const comp of comboComponents) {
    if (!comp.combo_id || !comp.component_id) continue;
    const info = componentById.get(comp.component_id);
    const list = componentsByCombo.get(comp.combo_id) ?? [];
    list.push({
      component_id: comp.component_id,
      quantity: comp.quantity ?? 1,
      name: info?.name ?? '',
      unit_cost: info?.total_cost ?? null,
    });
    componentsByCombo.set(comp.combo_id, list);
  }

  // 7) Promos activas para el canal
  const activePromos = await fetchActivePromos(channelCode, atDate);

  // 8) Branch availability (si hay branchId, filtrar por out_of_stock global)
  const branchAvailability = branchId ? await db.select().from(schema.branch_item_availability)
    .where(and(
      eq(schema.branch_item_availability.branch_id, branchId),
      isNotNull(schema.branch_item_availability.item_carta_id),
    )) : [];
  const availabilityByItem = new Map<string, typeof schema.branch_item_availability.$inferSelect>();
  for (const row of branchAvailability) {
    if (row.item_carta_id) availabilityByItem.set(row.item_carta_id, row);
  }

  // 8b) Fase 3: visibility unificada — sobreescribe cualquier visibilidad
  // derivada si hay una fila explícita en entity_channel_visibility.
  const unifiedVisibilityRows = await db.select().from(schema.entity_channel_visibility)
    .where(eq(schema.entity_channel_visibility.channel_code, channelCode));
  const explicitVisibility = new Map<string, boolean>();
  const hiddenCategories = new Set<string>();
  for (const row of unifiedVisibilityRows) {
    if (row.entity_type === 'menu_item') {
      explicitVisibility.set(row.entity_id, row.is_visible !== false);
    } else if (row.entity_type === 'menu_category' && row.is_visible === false) {
      hiddenCategories.add(row.entity_id);
    }
  }

  // 9) Construcción
  const sellableItems: SellableItem[] = [];
  for (const mi of items) {
    const override = overridesByItemId.get(mi.id);
    const basePrice = applyPricingMode(
      Number(mi.base_price ?? 0),
      pricingMode,
      pricingValue,
      override?.price,
    );

    // Visibilidad Fase 3 unificada:
    //  - entity_channel_visibility (fuente canónica) tiene prioridad.
    //  - Si no hay fila, fallback a columnas legacy (shadow period).
    let isVisible = true;
    const explicit = explicitVisibility.get(mi.id);
    if (explicit === false) {
      isVisible = false;
    } else if (explicit === undefined) {
      // Fallback legacy
      if (override?.is_visible === false) {
        isVisible = false;
      } else if (channelCode === 'webapp' && mi.available_webapp === false) {
        isVisible = false;
      } else if (['rappi', 'pedidos_ya', 'mp_delivery'].includes(channelCode) && mi.available_delivery === false) {
        isVisible = false;
      }
    }

    // Category hidden en el canal → ítem también oculto
    if (mi.categoria_carta_id && hiddenCategories.has(mi.categoria_carta_id)) {
      isVisible = false;
    }

    // Disponibilidad por sucursal (opcional)
    const avail = availabilityByItem.get(mi.id);
    if (avail) {
      if (avail.available === false) isVisible = false;
      if (avail.out_of_stock === true) isVisible = false;
      // Hint adicional por canal
      if (channelCode === 'webapp' && avail.available_webapp === false) isVisible = false;
      if (channelCode === 'mostrador' && avail.available_salon === false) isVisible = false;
    }

    const category = mi.categoria_carta_id ? categoryById.get(mi.categoria_carta_id) : null;
    const kind = (mi.type ?? 'simple') as SellableItemKind;
    const components = kind === 'combo' ? componentsByCombo.get(mi.id) ?? [] : [];
    const promo = pickPromoForItem(mi.id, activePromos, basePrice);

    sellableItems.push({
      id: mi.id,
      menu_item_id: mi.id,
      kind,
      name: override?.custom_name ?? mi.name ?? '',
      short_name: mi.short_name ?? null,
      description: override?.custom_description ?? mi.description ?? null,
      image_url: override?.custom_image_url ?? mi.image_url ?? null,
      category_id: mi.categoria_carta_id ?? null,
      category_name: category?.name ?? null,
      category_order: category?.sort_order ?? null,
      base_price: basePrice,
      reference_price: mi.reference_price ?? null,
      total_cost: mi.total_cost ?? null,
      fc_actual: mi.fc_actual ?? null,
      fc_objetivo: mi.fc_objetivo ?? null,
      is_visible: isVisible,
      components,
      promo,
    });
  }

  return {
    channel_code: channelCode,
    branch_id: branchId,
    at: atIso,
    items: sellableItems,
  };
}

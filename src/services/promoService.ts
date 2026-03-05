import { fromUntyped } from '@/lib/supabase-helpers';

// ── Promociones ─────────────────────────────────────────────────────

export async function fetchPromociones() {
  const { data, error } = await fromUntyped('promotions')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchActivePromociones() {
  const { data, error } = await fromUntyped('promotions')
    .select('*')
    .eq('activa', true)
    .is('deleted_at', null);
  if (error) throw error;
  return data;
}

export async function fetchPromocionItemsWithCarta(promoId: string) {
  const { data, error } = await fromUntyped('promotion_items')
    .select('*, menu_items!inner(nombre, imagen_url, precio_base)')
    .eq('promocion_id', promoId);
  if (error) throw error;
  return data || [];
}

export async function fetchPromoItemsByPromoIds(promoIds: string[]) {
  const { data, error } = await fromUntyped('promotion_items')
    .select('*, menu_items!inner(nombre, imagen_url, precio_base)')
    .in('promocion_id', promoIds);
  if (error) throw error;
  return data || [];
}

export async function fetchPreconfigExtras(promoItemIds: string[]) {
  const { data, error } = await fromUntyped('promotion_item_extras')
    .select('promocion_item_id, extra_item_carta_id, cantidad')
    .in('promocion_item_id', promoItemIds);
  if (error) throw error;
  return (data || []) as Array<Record<string, unknown>>;
}

export async function fetchItemsCartaPriceInfo(ids: string[]) {
  const { data, error } = await fromUntyped('menu_items')
    .select('id, nombre, precio_base')
    .in('id', ids);
  if (error) throw error;
  return data || [];
}

export async function createPromocion(
  payload: Record<string, unknown>,
  userId?: string,
) {
  const { data, error } = await fromUntyped('promotions')
    .insert({ ...payload, created_by: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePromocion(id: string, payload: Record<string, unknown>) {
  const { error } = await fromUntyped('promotions')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deletePromocionItems(promoId: string) {
  await fromUntyped('promotion_items').delete().eq('promocion_id', promoId);
}

export async function insertPromocionItems(
  promoId: string,
  items: { item_carta_id: string; precio_promo: number }[],
) {
  const { data, error } = await fromUntyped('promotion_items')
    .insert(
      items.map((i) => ({
        item_carta_id: i.item_carta_id,
        precio_promo: i.precio_promo,
        promocion_id: promoId,
      })),
    )
    .select('id, item_carta_id');
  if (error) throw error;
  return (data || []) as Array<{ id: string; item_carta_id: string }>;
}

export async function insertPreconfigExtras(
  rows: { promocion_item_id: string; extra_item_carta_id: string; cantidad: number }[],
) {
  if (rows.length === 0) return;
  const { error } = await fromUntyped('promotion_item_extras').insert(rows);
  if (error) throw error;
}

export async function togglePromocionActive(id: string, activa: boolean) {
  const { error } = await fromUntyped('promotions')
    .update({ activa, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function softDeletePromocion(id: string) {
  const { error } = await fromUntyped('promotions')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// ── Códigos Descuento ───────────────────────────────────────────────

export async function fetchCodigosDescuento() {
  const { data, error } = await fromUntyped('discount_codes')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function findCodigoDescuento(codigo: string) {
  const { data, error } = await fromUntyped('discount_codes')
    .select('*')
    .ilike('codigo', codigo.trim())
    .eq('activo', true)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function countCodigoUsageByUser(codigoId: string, userId: string) {
  const { count } = await fromUntyped('discount_code_uses')
    .select('id', { count: 'exact', head: true })
    .eq('codigo_id', codigoId)
    .eq('user_id', userId);
  return count ?? 0;
}

export async function registerCodeUsage(params: {
  codigoId: string;
  userId?: string;
  pedidoId?: string;
  montoDescontado: number;
}) {
  await fromUntyped('discount_code_uses').insert({
    codigo_id: params.codigoId,
    user_id: params.userId || null,
    pedido_id: params.pedidoId || null,
    monto_descontado: params.montoDescontado,
  } as any);

  const { data } = await fromUntyped('discount_codes')
    .select('usos_actuales')
    .eq('id', params.codigoId)
    .single();
  if (data) {
    await fromUntyped('discount_codes')
      .update({
        usos_actuales: ((data as any).usos_actuales as number) + 1,
      } as any)
      .eq('id', params.codigoId);
  }
}

export async function createCodigoDescuento(
  payload: Record<string, unknown>,
  userId?: string,
) {
  const { data, error } = await fromUntyped('discount_codes')
    .insert({ ...payload, created_by: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCodigoDescuento(
  id: string,
  payload: Record<string, unknown>,
) {
  const { error } = await fromUntyped('discount_codes')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function softDeleteCodigoDescuento(id: string) {
  const { error } = await fromUntyped('discount_codes')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// ── Channel Pricing ─────────────────────────────────────────────────

export async function fetchPriceLists() {
  const { data, error } = await fromUntyped('price_lists').select('*').order('channel');
  if (error) throw error;
  return (data || []) as unknown[];
}

export async function fetchPriceListItems(priceListId: string) {
  const { data, error } = await fromUntyped('price_list_items')
    .select('*')
    .eq('price_list_id', priceListId);
  if (error) throw error;
  return (data || []) as unknown[];
}

export async function fetchAllPriceListItems(priceListIds: string[]) {
  if (priceListIds.length === 0) return [];
  const { data, error } = await fromUntyped('price_list_items')
    .select('*')
    .in('price_list_id', priceListIds);
  if (error) throw error;
  return (data || []) as unknown[];
}

export async function fetchItemsCartaForPricing() {
  const { data, error } = await fromUntyped('menu_items')
    .select(
      'id, nombre, orden, precio_base, is_active, categoria_carta_id, menu_categories(id, nombre, orden)',
    )
    .eq('is_active', true)
    .order('orden');
  if (error) throw error;
  return data || [];
}

export async function updatePriceListConfig(params: {
  id: string;
  pricing_mode: string;
  pricing_value: number;
  mirror_channel?: string | null;
}) {
  const { error } = await fromUntyped('price_lists')
    .update({
      pricing_mode: params.pricing_mode,
      pricing_value: params.pricing_value,
      mirror_channel: params.mirror_channel ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id);
  if (error) throw error;
}

export async function bulkUpsertPriceListItems(
  price_list_id: string,
  items: Array<{ item_carta_id: string; precio: number }>,
) {
  const rows = items.map((i) => ({
    price_list_id,
    item_carta_id: i.item_carta_id,
    precio: i.precio,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await fromUntyped('price_list_items').upsert(rows, {
    onConflict: 'price_list_id,item_carta_id',
  });
  if (error) throw error;
}

export async function deletePriceOverride(price_list_id: string, item_carta_id: string) {
  const { error } = await fromUntyped('price_list_items')
    .delete()
    .eq('price_list_id', price_list_id)
    .eq('item_carta_id', item_carta_id);
  if (error) throw error;
}

export async function fetchActiveItemsPrices() {
  const { data, error } = await fromUntyped('menu_items')
    .select('id, precio_base')
    .eq('is_active', true);
  if (error) throw error;
  return data || [];
}

export async function fetchPriceListsByChannels(channels: string[]) {
  const { data } = await fromUntyped('price_lists')
    .select('id, channel')
    .in('channel', channels);
  return (data || []) as unknown[];
}

export async function fetchExistingPriceListChannels() {
  const { data } = await fromUntyped('price_lists').select('channel');
  return new Set(
    ((data || []) as Array<Record<string, unknown>>).map((e) => e.channel as string),
  );
}

export async function insertPriceLists(rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const { error } = await fromUntyped('price_lists').insert(rows);
  if (error) throw error;
}

// ── Promo Discount Data ─────────────────────────────────────────────

export async function fetchPromoDiscountItems(
  branchId: string,
  startDate: string,
  endDate: string,
) {
  const { data, error } = await fromUntyped('order_items')
    .select(
      'precio_unitario, precio_referencia, cantidad, subtotal, pedido_id, orders!inner(branch_id, created_at)',
    )
    .gte('orders.created_at', startDate)
    .lt('orders.created_at', endDate)
    .eq('orders.branch_id', branchId);
  if (error) throw error;
  return data || [];
}

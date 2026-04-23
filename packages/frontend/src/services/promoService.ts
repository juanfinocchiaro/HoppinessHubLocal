import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';

// ── Promociones ─────────────────────────────────────────────────────

export async function fetchPromociones() {
  return apiGet('/promotions');
}

export async function fetchActivePromociones() {
  return apiGet('/promotions/active');
}

export async function fetchPromocionItemsWithCarta(promoId: string) {
  return apiGet(`/promotions/${promoId}/items`);
}

export async function fetchPromoItemsByPromoIds(promoIds: string[]) {
  return apiPost('/promotions/items-batch', { promoIds });
}

export async function fetchPreconfigExtras(promoItemIds: string[]) {
  return apiPost<Array<Record<string, unknown>>>('/promotions/preconfig-extras', { promoItemIds });
}

export async function fetchItemsCartaPriceInfo(ids: string[]) {
  return apiPost('/promotions/menu-items-price-info', { ids });
}

export async function createPromocion(
  payload: Record<string, unknown>,
  userId?: string,
) {
  return apiPost('/promotions', { ...payload, created_by: userId });
}

export async function updatePromocion(id: string, payload: Record<string, unknown>) {
  return apiPut(`/promotions/${id}`, payload);
}

export async function deletePromocionItems(promoId: string) {
  return apiDelete(`/promotions/${promoId}/items`);
}

export async function insertPromocionItems(
  promoId: string,
  items: { item_carta_id: string; precio_promo: number }[],
) {
  return apiPost<Array<{ id: string; item_carta_id: string }>>(
    `/promotions/${promoId}/items`,
    { items },
  );
}

export async function insertPreconfigExtras(
  rows: { promocion_item_id: string; extra_item_carta_id: string; quantity: number }[],
) {
  if (rows.length === 0) return;
  return apiPost('/promotions/preconfig-extras/batch', { rows });
}

export async function togglePromocionActive(id: string, is_active: boolean) {
  return apiPut(`/promotions/${id}/toggle-active`, { is_active });
}

export async function softDeletePromocion(id: string) {
  return apiDelete(`/promotions/${id}`);
}

// ── Códigos Descuento ───────────────────────────────────────────────

export async function fetchCodigosDescuento() {
  return apiGet('/promotions/discount-codes');
}

export async function findCodigoDescuento(codigo: string) {
  return apiGet('/promotions/discount-codes/find', { code: codigo.trim() });
}

export async function countCodigoUsageByUser(codigoId: string, userId: string) {
  return apiGet<number>(`/promotions/discount-codes/${codigoId}/usage-count`, { userId });
}

export async function registerCodeUsage(params: {
  codigoId: string;
  userId?: string;
  pedidoId?: string;
  montoDescontado: number;
}) {
  return apiPost(`/promotions/discount-codes/${params.codigoId}/use`, params);
}

export async function createCodigoDescuento(
  payload: Record<string, unknown>,
  userId?: string,
) {
  return apiPost('/promotions/discount-codes', { ...payload, created_by: userId });
}

export async function updateCodigoDescuento(
  id: string,
  payload: Record<string, unknown>,
) {
  return apiPut(`/promotions/discount-codes/${id}`, payload);
}

export async function softDeleteCodigoDescuento(id: string) {
  return apiDelete(`/promotions/discount-codes/${id}`);
}

// ── Channel Pricing ─────────────────────────────────────────────────

export async function fetchPriceLists() {
  return apiGet<unknown[]>('/promotions/price-lists');
}

export async function fetchPriceListItems(priceListId: string) {
  return apiGet<unknown[]>(`/promotions/price-lists/${priceListId}/items`);
}

export async function fetchAllPriceListItems(priceListIds: string[]) {
  if (priceListIds.length === 0) return [];
  return apiPost<unknown[]>('/promotions/price-lists/items-batch', { priceListIds });
}

export async function fetchItemsCartaForPricing() {
  return apiGet('/promotions/menu-items-for-pricing');
}

export async function updatePriceListConfig(params: {
  id: string;
  pricing_mode: string;
  pricing_value: number;
  mirror_channel?: string | null;
}) {
  return apiPut(`/promotions/price-lists/${params.id}`, params);
}

export async function bulkUpsertPriceListItems(
  price_list_id: string,
  items: Array<{ item_carta_id: string; precio: number }>,
) {
  return apiPost(`/promotions/price-lists/${price_list_id}/items/bulk`, { items });
}

export async function deletePriceOverride(price_list_id: string, item_carta_id: string) {
  return apiDelete(`/promotions/price-lists/${price_list_id}/items/${item_carta_id}`);
}

export async function fetchActiveItemsPrices() {
  return apiGet('/promotions/menu-items-prices');
}

export async function fetchPriceListsByChannels(channels: string[]) {
  return apiPost<unknown[]>('/promotions/price-lists/by-channels', { channels });
}

export async function fetchExistingPriceListChannels() {
  const data = await apiGet<string[]>('/promotions/price-lists/channels');
  return new Set(data);
}

export async function insertPriceLists(rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  return apiPost('/promotions/price-lists', { rows });
}

export async function deletePriceList(id: string) {
  return apiDelete(`/promotions/price-lists/${id}`);
}

// ── Promo Discount Data ─────────────────────────────────────────────

export async function fetchPromoDiscountItems(
  branchId: string,
  startDate: string,
  endDate: string,
) {
  return apiGet(`/promotions/branches/${branchId}/discount-items`, { startDate, endDate });
}

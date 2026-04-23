/**
 * POS Service — All HTTP API operations for the Point of Sale system.
 */
import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';

// ─── Orders ───

export async function fetchOrders(branchId: string) {
  return apiGet('/orders', { branchId });
}

export async function generateOrderNumber(branchId: string): Promise<number> {
  const data = await apiPost<number>('/orders/generate-number', { branchId });
  return data ?? 1;
}

export async function insertPedido(payload: Record<string, unknown>) {
  return apiPost<{ id: string; order_number: number }>('/orders', payload);
}

export async function insertPedidoItems(items: Array<Record<string, unknown>>) {
  return apiPost('/orders/items', { items });
}

export async function insertPedidoPagos(pagos: Array<Record<string, unknown>>) {
  return apiPost('/orders/payments', { pagos });
}

export async function saveClienteAddress(userId: string, direccion: string) {
  return apiPost('/orders/customer-address', {
    user_id: userId,
    label: 'Otro',
    address: direccion.trim(),
    city: 'Córdoba',
    is_primary: false,
  });
}

export async function findOpenCashShift(branchId: string) {
  return apiGet('/orders/cash/open-shift', { branchId });
}

export async function insertCashMovement(movement: Record<string, unknown>) {
  try {
    await apiPost('/orders/cash/movement', movement);
    return { error: null };
  } catch (err: any) {
    return { error: err };
  }
}

// ─── Payments ───

export async function fetchPayments(pedidoId: string) {
  return apiGet('/orders/payments', { pedidoId });
}

// ─── Stock ───

export async function fetchStockData(branchId: string) {
  return apiGet<{ insumos: any[]; stockActual: any[]; movimientos: any[] }>('/orders/stock', {
    branchId,
  });
}

export async function fetchInsumoUnit(insumoId: string) {
  const data = await apiGet<{ base_unit: string }>(`/orders/stock/insumo-unit/${insumoId}`);
  return data?.base_unit ?? 'un';
}

export async function upsertStockActual(
  branchId: string,
  insumoId: string,
  cantidad: number,
  unidad: string,
) {
  return apiPost('/orders/stock/upsert', {
    branch_id: branchId,
    insumo_id: insumoId,
    quantity: cantidad,
    unit: unidad,
  });
}

export async function insertStockMovimiento(movement: Record<string, unknown>) {
  return apiPost('/orders/stock/movement', movement);
}

export async function fetchStockActualItem(branchId: string, insumoId: string) {
  const data = await apiGet('/orders/stock/actual-item', {
    branchId,
    insumoId,
  });
  return data ? { ...data, cantidad: data.quantity } : data;
}

export async function getAuthUser() {
  // Backend gets the user from the JWT token; this is a no-op on the frontend
  return null;
}

// ─── Operator Verification ───

export async function insertOperatorSessionLog(data: {
  branch_id: string;
  current_user_id: string;
  previous_user_id: string | null;
  action_type: string;
  triggered_by: string;
}) {
  return apiPost('/orders/operator-session-log', data);
}

export async function callValidateSupervisorPin(branchId: string, pin: string) {
  return apiPost('/orders/validate-supervisor-pin', {
    _branch_id: branchId,
    _pin: pin,
  });
}

export async function fetchUserRolesForVerification(userId: string) {
  return apiGet('/orders/user-roles-verification', { userId });
}

export async function fetchProfileFullName(userId: string) {
  return apiGet<{ full_name: string }>(`/orders/profile-name/${userId}`);
}

export async function signInWithPassword(email: string, password: string) {
  return apiPost('/auth/login', { email, password });
}

// ─── Order Items ───

export async function fetchOrderItems(pedidoId: string) {
  return apiGet('/orders/items', { pedidoId });
}

// ─── Order Heatmap ───

export async function fetchDeliveredOrders(branchId: string, fromDate: string) {
  return apiGet('/orders/delivered', { branchId, fromDate });
}

// ─── Closure Data ───

export async function fetchClosureOrders(
  branchId: string,
  fecha: string,
  turno: string,
) {
  return apiGet('/orders/closure', { branchId, fecha, turno });
}

// ─── Point Reconciliation ───

export async function fetchReconciliationPayments(
  branchId: string,
  desde: string | null,
  hasta: string | null,
) {
  const params: Record<string, string> = { branchId };
  if (desde) params.desde = desde;
  if (hasta) params.hasta = hasta;
  return apiGet('/orders/reconciliation-payments', params);
}

// ─── Kitchen ───

export async function fetchKitchenOrders(branchId: string) {
  return apiGet('/orders/kitchen', { branchId });
}

import { subscribeToEvent } from '@/hooks/useSocket';

export function subscribeToPedidosChanges(branchId: string, callback: () => void) {
  const unsub = subscribeToEvent('order:updated', callback, `kitchen:${branchId}`);
  return { unsubscribe: unsub };
}

export function removeSupabaseChannel(_channel: any) {
  // No-op: cleanup handled by unsubscribe
}

// ─── Order History ───

export async function fetchOrderHistory(branchId: string, fromDate: string) {
  return apiGet('/orders/history', { branchId, fromDate });
}

// ─── Register ───

export async function fetchOpenRegister(branchId: string) {
  return apiGet('/orders/cash/open-register', { branchId });
}

// ─── Frequent Items ───

export async function fetchFrequentItemSales(branchId: string, since: string) {
  return apiGet('/orders/frequent-item-sales', { branchId, since });
}

// ─── Delivery ───

export async function fetchActiveCadetes(branchId: string) {
  return apiGet('/orders/delivery/cadetes', { branchId });
}

// ─── Stock Cierre ───

export async function fetchStockMovimientosPeriod(
  branchId: string,
  start: string,
  end: string,
) {
  const data = await apiGet<any[]>('/orders/stock/movements-period', {
    branchId,
    start,
    end,
  });
  return (data ?? []).map((m: any) => ({ ...m, cantidad: m.quantity }));
}

export async function fetchCierreAnterior(branchId: string, periodo: string) {
  return apiGet('/orders/stock/cierre-anterior', { branchId, periodo });
}

export async function fetchStockActualWithNames(branchId: string) {
  const data = await apiGet<any[]>('/orders/stock/actual-with-names', { branchId });
  return (data ?? []).map((r: any) => ({ ...r, cantidad: r.quantity }));
}

export async function fetchInsumosById(ids: string[]) {
  return apiPost('/orders/stock/insumos-by-ids', { ids });
}

export async function fetchPrevCierreForInsumo(
  branchId: string,
  insumoId: string,
  periodo: string,
) {
  return apiGet('/orders/stock/prev-cierre-insumo', { branchId, insumoId, periodo });
}

export async function fetchStockMovimientosForInsumo(
  branchId: string,
  insumoId: string,
  from: string,
  to: string,
) {
  const data = await apiGet<any[]>('/orders/stock/movements-for-insumo', {
    branchId,
    insumoId,
    from,
    to,
  });
  return (data ?? []).map((m: any) => ({ ...m, cantidad: m.quantity }));
}

export async function upsertCierreMensual(record: Record<string, unknown>) {
  return apiPost('/orders/stock/upsert-cierre-mensual', record);
}

export async function fetchStockActualRow(branchId: string, insumoId: string) {
  const data = await apiGet('/orders/stock/actual-row', { branchId, insumoId });
  return data ? { ...data, cantidad: data.quantity } : data;
}

export async function fetchInsumoCostInfo(insumoId: string) {
  return apiGet(`/orders/stock/insumo-cost/${insumoId}`);
}

export async function insertConsumoManual(record: Record<string, unknown>) {
  return apiPost('/orders/stock/consumo-manual', record);
}

// ─── Stock Movimientos History ───

export async function fetchStockMovimientosHistory(
  branchId: string,
  insumoId: string,
  limit = 10,
) {
  return apiGet('/orders/stock/movements-history', {
    branchId,
    insumoId,
    limit: String(limit),
  });
}

// ─── Stock Conteos ───

export async function insertStockConteo(record: Record<string, unknown>) {
  return apiPost('/orders/stock/conteo', record);
}

export async function deleteStockConteoItems(conteoId: string) {
  return apiDelete(`/orders/stock/conteo/${conteoId}/items`);
}

export async function insertStockConteoItems(items: Array<Record<string, unknown>>) {
  return apiPost('/orders/stock/conteo-items', { items });
}

export async function updateStockConteo(conteoId: string, record: Record<string, unknown>) {
  return apiPut(`/orders/stock/conteo/${conteoId}`, record);
}

// ─── Stock Actual Updates ───

export async function updateStockActualFields(
  branchId: string,
  insumoId: string,
  fields: Record<string, unknown>,
) {
  return apiPut('/orders/stock/actual-fields', { branchId, insumoId, ...fields });
}

export async function insertStockActualRecord(record: Record<string, unknown>) {
  return apiPost('/orders/stock/actual-record', record);
}

// ─── Branch Info ───

export async function fetchBranchName(branchId: string) {
  return apiGet<{ name: string }>(`/branches/${branchId}/name`);
}

// ─── Google Maps ───

export async function fetchGoogleMapsApiKey() {
  try {
    const data = await apiPost<{ apiKey: string }>('/webapp/google-maps-key');
    return data?.apiKey ?? null;
  } catch {
    return null;
  }
}

// ─── Profile Lookup ───

export async function lookupProfileByPhone(phoneVariants: string[]) {
  const data = await apiPost('/orders/lookup-profile-by-phone', { phoneVariants });
  return data ?? null;
}

// ─── Hamburguesas Count (shift) ───

export async function fetchMenuCategoriesByName(pattern: string) {
  return apiGet('/orders/menu-categories-by-name', { pattern });
}

export async function fetchShiftPedidoIds(branchId: string, since: string) {
  return apiGet<string[]>('/orders/shift-pedido-ids', { branchId, since });
}

export async function fetchItemQuantitiesByCategories(
  categoryIds: string[],
  pedidoIds: string[],
) {
  return apiPost('/orders/item-quantities-by-categories', { categoryIds, pedidoIds });
}

// ─── Pedido Estado ───

export async function updatePedidoEstado(
  pedidoId: string,
  estado: string,
  extra?: Record<string, unknown>,
) {
  return apiPut(`/orders/${pedidoId}/status`, { status: estado, ...extra });
}

// ─── Cash Register Expenses ───

export async function fetchShiftExpenses(shiftId: string) {
  return apiGet('/orders/cash/shift-expenses', { shiftId });
}

export async function updateExpenseApproval(
  id: string,
  estado: 'aprobado' | 'rechazado',
) {
  return apiPut(`/orders/cash/expense/${id}/approval`, { estado_aprobacion: estado });
}

// ─── Webapp Orders ───

export async function fetchWebappPendingOrders(branchId: string) {
  return apiGet('/orders/webapp/pending', { branchId });
}

export async function fetchWebappActiveOrders(
  branchId: string,
  activeStates: string[],
) {
  return apiPost('/orders/webapp/active', { branchId, activeStates });
}

export async function fetchWebappRecentOrders(branchId: string, since: string) {
  return apiGet('/orders/webapp/recent', { branchId, since });
}

export function subscribeToWebappOrders(branchId: string, callback: () => void) {
  const unsub = subscribeToEvent('webapp-order:new', callback, `branch:${branchId}`);
  return { unsubscribe: unsub };
}

export async function acceptWebappOrder(orderId: string) {
  return apiPut(`/orders/${orderId}/accept`);
}

export async function rejectWebappOrder(orderId: string) {
  return apiPut(`/orders/${orderId}/reject`);
}

// ─── Item Extras / Removibles Prefetch ───

export async function fetchItemExtraAssignments(itemId: string) {
  return apiGet('/orders/item-extra-assignments', { itemId });
}

export async function fetchItemRemovibles(itemId: string) {
  return apiGet('/orders/item-removibles', { itemId });
}

// ─── User Roles (for expense approval check) ───

export async function fetchUserActiveRoles(userId: string) {
  return apiGet('/orders/user-active-roles', { userId });
}

// ─── Payment Edit ───

export async function deletePedidoPagos(pedidoId: string) {
  return apiDelete(`/orders/${pedidoId}/payments`);
}

export async function insertPaymentEditAudit(record: Record<string, unknown>) {
  return apiPost('/orders/payment-edit-audit', record);
}

export async function findOpenCashShiftForBranch(branchId: string) {
  return apiGet('/orders/cash/open-shift-for-branch', { branchId });
}

// ─── Point Smart ───

export async function invokeMpPointPayment(body: Record<string, unknown>) {
  return apiPost('/payments/point/payment', body);
}

export function subscribeToPedidoPagos(
  pedidoId: string,
  callback: (payload: Record<string, unknown>) => void,
) {
  const unsub = subscribeToEvent('payment:created', callback, `order:${pedidoId}`);
  return { unsubscribe: unsub };
}

// ─── Shift Analysis ───

export async function fetchBranchShifts(branchId: string) {
  return apiGet('/branches/' + branchId + '/shifts');
}

export async function fetchShiftAnalysisOrders(branchId: string, since: string) {
  return apiGet('/orders/shift-analysis', { branchId, since });
}

// ─── Order Chat ───

export async function fetchOrderChatMessages(pedidoId: string) {
  return apiGet(`/orders/${pedidoId}/chat`);
}

export async function insertOrderChatMessage(message: Record<string, unknown>) {
  return apiPost('/orders/chat/message', message);
}

export async function markChatMessagesRead(pedidoId: string) {
  return apiPut(`/orders/${pedidoId}/chat/mark-read`);
}

export function subscribeToChatMessages(pedidoId: string, callback: () => void) {
  const unsub = subscribeToEvent('chat:message', callback, `order:${pedidoId}`);
  return { unsubscribe: unsub };
}

// ─── Menu Categorias (for printing) ───

export async function fetchMenuCategoriasPrint() {
  return apiGet<{ id: string; name: string; print_type: string }[]>('/orders/menu-categorias-print');
}

// ─── Cancel Pedido ───

export async function cancelPedido(pedidoId: string) {
  return apiPut(`/orders/${pedidoId}/cancel`);
}

// ─── Delivery Page ───

export async function fetchDeliveryPedidos(branchId: string) {
  return apiGet('/orders/delivery/pedidos', { branchId });
}

export async function fetchValeCategoryIds(): Promise<Set<string>> {
  const data = await apiGet<string[]>('/orders/vale-category-ids');
  return new Set(data ?? []);
}

export async function assignCadeteToPedido(pedidoId: string, cadeteId: string) {
  return apiPut(`/orders/${pedidoId}/assign-cadete`, { cadeteId });
}

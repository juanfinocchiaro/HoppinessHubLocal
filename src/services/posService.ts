/**
 * POS Service — All database operations for the Point of Sale system.
 */
import { supabase } from './supabaseClient';
import { fromUntyped } from '@/lib/supabase-helpers';
import { normalizePhone as _normalizePhone } from '@/lib/normalizePhone'; // eslint-disable-line @typescript-eslint/no-unused-vars
import type {} from '@/types/pos';

// ─── Orders ───

export async function fetchOrders(branchId: string) {
  const { data, error } = await fromUntyped('orders')
    .select('*')
    .eq('branch_id', branchId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function generateOrderNumber(branchId: string): Promise<number> {
  const { data, error } = await supabase.rpc('generate_order_number', {
    p_branch_id: branchId,
  });
  if (error) throw error;
  return (data as number) ?? 1;
}

export async function insertPedido(payload: Record<string, unknown>) {
  const { data, error } = await fromUntyped('orders')
    .insert(payload as never)
    .select('id, order_number')
    .single();
  if (error) throw error;
  if (!data) throw new Error('No se creó el pedido');
  return data;
}

export async function insertPedidoItems(items: Array<Record<string, unknown>>) {
  const { error } = await fromUntyped('order_items').insert(items as never);
  if (error) throw error;
}

export async function insertPedidoPagos(pagos: Array<Record<string, unknown>>) {
  const { error } = await fromUntyped('order_payments').insert(pagos as never);
  if (error) throw error;
}

export async function saveClienteAddress(userId: string, direccion: string) {
  await fromUntyped('customer_addresses').insert({
    user_id: userId,
    label: 'Otro',
    address: direccion.trim(),
    city: 'Córdoba',
    is_primary: false,
  });
}

export async function findOpenCashShift(branchId: string) {
  const { data: registers } = await supabase
    .from('cash_registers')
    .select('id')
    .eq('branch_id', branchId)
    .eq('register_type', 'ventas')
    .eq('is_active', true);

  const registerIds = (registers || []).map((r) => r.id);
  if (registerIds.length === 0) return null;

  const { data } = await supabase
    .from('cash_register_shifts')
    .select('id')
    .eq('branch_id', branchId)
    .eq('status', 'open')
    .in('cash_register_id', registerIds)
    .limit(1)
    .maybeSingle();
  return data;
}

export async function insertCashMovement(movement: Record<string, unknown>) {
  const { error } = await supabase.from('cash_register_movements').insert(movement as any);
  return { error };
}

// ─── Payments ───

export async function fetchPayments(pedidoId: string) {
  const { data } = await fromUntyped('order_payments')
    .select('*')
    .eq('pedido_id', pedidoId);
  return data ?? [];
}

// ─── Stock ───

export async function fetchStockData(branchId: string) {
  const [insumosResult, stockResult, movimientosResult] = await Promise.all([
    fromUntyped('supplies')
       .select(
        'id, name, base_unit, categoria_id, base_unit_cost, supply_categories:supply_categories!insumos_categoria_id_fkey(name)',
      )
      .is('deleted_at', null)
      .neq('is_active', false)
      .order('name'),
    supabase.from('stock_actual').select('*').eq('branch_id', branchId),
    fromUntyped('stock_movements')
      .select('insumo_id, created_at, type, reason')
      .eq('branch_id', branchId)
      .order('created_at', { ascending: false }),
  ]);

  if (insumosResult.error) throw insumosResult.error;
  if (stockResult.error) throw stockResult.error;
  if (movimientosResult.error) throw movimientosResult.error;

  return {
    insumos: insumosResult.data ?? [],
    stockActual: stockResult.data ?? [],
    movimientos: movimientosResult.data ?? [],
  };
}

export async function fetchInsumoUnit(insumoId: string) {
  const { data } = await fromUntyped('supplies')
    .select('base_unit')
    .eq('id', insumoId)
    .single();
  return data?.base_unit ?? 'un';
}

export async function upsertStockActual(
  branchId: string,
  insumoId: string,
  cantidad: number,
  unidad: string,
) {
  const { error } = await supabase
    .from('stock_actual')
    .upsert(
      { branch_id: branchId, insumo_id: insumoId, quantity: cantidad, unit: unidad },
      { onConflict: 'branch_id,insumo_id' },
    );
  if (error) throw error;
}

export async function insertStockMovimiento(movement: Record<string, unknown>) {
  await fromUntyped('stock_movements').insert(movement as any);
}

export async function fetchStockActualItem(branchId: string, insumoId: string) {
  const { data } = await supabase
    .from('stock_actual')
    .select('quantity')
    .eq('branch_id', branchId)
    .eq('insumo_id', insumoId)
    .maybeSingle();
  return data ? { ...data, cantidad: data.quantity } : data;
}

export async function getAuthUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// ─── Operator Verification ───

export async function insertOperatorSessionLog(data: {
  branch_id: string;
  current_user_id: string;
  previous_user_id: string | null;
  action_type: string;
  triggered_by: string;
}) {
  await supabase.from('operator_session_logs').insert(data);
}

export async function callValidateSupervisorPin(branchId: string, pin: string) {
  return supabase.rpc('validate_supervisor_pin', {
    _branch_id: branchId,
    _pin: pin,
  });
}

export async function fetchUserRolesForVerification(userId: string) {
  const { data } = await supabase
    .from('user_role_assignments')
    .select('roles!inner(key, scope)')
    .eq('user_id', userId)
    .eq('is_active', true);
  return (data || []).map((d: any) => ({
    brand_role: d.roles.scope === 'brand' ? d.roles.key : null,
    local_role: d.roles.scope === 'branch' ? d.roles.key : null,
  }));
}

export async function fetchProfileFullName(userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .single();
  return data;
}

export async function signInWithPassword(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

// ─── Order Items ───

export async function fetchOrderItems(pedidoId: string) {
  const { data } = await fromUntyped('order_items').select('*').eq('pedido_id', pedidoId);
  return data ?? [];
}

// ─── Order Heatmap ───

export async function fetchDeliveredOrders(branchId: string, fromDate: string) {
  const { data, error } = await fromUntyped('orders')
    .select('created_at, total')
    .eq('branch_id', branchId)
    .eq('status', 'entregado')
    .gte('created_at', fromDate);
  if (error) throw error;
  return data ?? [];
}

// ─── Closure Data ───

export async function fetchClosureOrders(
  branchId: string,
  fecha: string,
  turno: string,
) {
  let query = fromUntyped('orders')
    .select('*, order_items(*), order_payments(*)')
    .eq('branch_id', branchId)
    .in('status', ['entregado', 'completado', 'listo'])
    .gte('created_at', `${fecha}T00:00:00`)
    .lt('created_at', `${fecha}T23:59:59`);

  if (turno === 'noche') {
    query = query.gte('created_at', `${fecha}T18:00:00`);
  } else if (turno === 'mediodia') {
    query = query.lt('created_at', `${fecha}T18:00:00`);
  }

  const { data } = await query;
  return data ?? [];
}

// ─── Point Reconciliation ───

export async function fetchReconciliationPayments(
  branchId: string,
  desde: string | null,
  hasta: string | null,
) {
  let query = fromUntyped('order_payments')
    .select('method, amount, conciliado, mp_payment_id, orders!inner(branch_id)')
    .eq('orders.branch_id', branchId);

  if (desde) query = query.gte('created_at', desde);
  if (hasta) query = query.lte('created_at', hasta);

  const { data, error } = await (query as any);
  if (error) throw error;
  return data ?? [];
}

// ─── Kitchen ───

export async function fetchKitchenOrders(branchId: string) {
  const { data, error } = await fromUntyped('orders')
     .select(
      'id, order_number, service_type, caller_number, canal_venta, customer_name, cliente_user_id, created_at, status, ready_at_time, prep_started_at_time, source, order_items(id, name, quantity, notes, estacion, status, order_item_modifiers(id, description, type, extra_price))',
    )
    .eq('branch_id', branchId)
    .in('status', ['pendiente', 'confirmado', 'en_preparacion', 'listo'])
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export function subscribeToPedidosChanges(branchId: string, callback: () => void) {
  return supabase
    .channel(`kitchen-${branchId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders', filter: `branch_id=eq.${branchId}` },
      callback,
    )
    .subscribe();
}

export function removeSupabaseChannel(channel: ReturnType<typeof supabase.channel>) {
  supabase.removeChannel(channel);
}

// ─── Order History ───

export async function fetchOrderHistory(branchId: string, fromDate: string) {
  const { data, error } = await fromUntyped('orders')
     .select(
      'id, order_number, caller_number, created_at, canal_venta, service_type, canal_app, customer_name, customer_phone, customer_address, status, subtotal, descuento, total, order_items(id, name, quantity, unit_price, subtotal, notes, categoria_carta_id), order_payments(id, method, amount), issued_invoices(id, receipt_type, point_of_sale, receipt_number, cae, cae_vencimiento, neto, iva, total, issue_date, receptor_cuit, receptor_razon_social, receptor_condicion_iva, anulada, linked_invoice_id)',
    )
    .eq('branch_id', branchId)
    .gte('created_at', fromDate)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ─── Register ───

export async function fetchOpenRegister(branchId: string) {
  const { data } = await fromUntyped('cash_register_shifts')
    .select('*')
    .eq('branch_id', branchId)
    .eq('status', 'abierto')
    .maybeSingle();
  return data;
}

// ─── Frequent Items ───

export async function fetchFrequentItemSales(branchId: string, since: string) {
  const { data, error } = await fromUntyped('order_items')
    .select(
      `
      item_carta_id,
      quantity,
      orders!inner(branch_id, created_at)
    `,
    )
    .eq('orders.branch_id', branchId)
    .gte('orders.created_at', since);
  if (error) throw error;
  return data ?? [];
}

// ─── Delivery ───

export async function fetchActiveCadetes(branchId: string) {
  const { data } = await supabase
    .from('delivery_drivers')
    .select('*')
    .eq('branch_id', branchId)
    .eq('is_active', true);
  return data ?? [];
}

// ─── Stock Cierre ───

export async function fetchStockMovimientosPeriod(
  branchId: string,
  start: string,
  end: string,
) {
  const { data } = await supabase
    .from('stock_movements' as any)
    .select('insumo_id, tipo, quantity, created_at')
    .eq('branch_id', branchId)
    .gte('created_at', start)
    .lt('created_at', end);
  return (data ?? []).map((m: any) => ({ ...m, cantidad: m.quantity }));
}

export async function fetchCierreAnterior(branchId: string, periodo: string) {
  const { data } = await fromUntyped('stock_cierre_mensual')
    .select('insumo_id, stock_cierre_fisico')
    .eq('branch_id', branchId)
    .eq('period', periodo);
  return data ?? [];
}

export async function fetchStockActualWithNames(branchId: string) {
  const { data } = await supabase
    .from('stock_actual')
    .select('insumo_id, quantity, unit, insumos:supplies!stock_actual_insumo_id_fkey(name)')
    .eq('branch_id', branchId);
  return (data ?? []).map((r: any) => ({ ...r, cantidad: r.quantity }));
}

export async function fetchInsumosById(ids: string[]) {
  const { data } = await fromUntyped('supplies')
    .select('id, name, base_unit')
    .in('id', ids);
  return data ?? [];
}

export async function fetchPrevCierreForInsumo(
  branchId: string,
  insumoId: string,
  periodo: string,
) {
  const { data } = await fromUntyped('stock_cierre_mensual')
    .select('stock_cierre_fisico')
    .eq('branch_id', branchId)
    .eq('insumo_id', insumoId)
    .eq('period', periodo)
    .maybeSingle();
  return data;
}

export async function fetchStockMovimientosForInsumo(
  branchId: string,
  insumoId: string,
  from: string,
  to: string,
) {
  const { data } = await (supabase
    .from('stock_movements' as any)
    .select('tipo, quantity') as any)
    .eq('branch_id', branchId)
    .eq('insumo_id', insumoId)
    .gte('created_at', from)
    .lt('created_at', to);
  return (data ?? []).map((m: any) => ({ ...m, cantidad: m.quantity }));
}

export async function upsertCierreMensual(record: Record<string, unknown>) {
  const { error } = await supabase
    .from('stock_cierre_mensual')
    .upsert(record as any, { onConflict: 'branch_id,insumo_id,periodo' });
  if (error) throw error;
}

export async function fetchStockActualRow(branchId: string, insumoId: string) {
  const { data } = await supabase
    .from('stock_actual')
    .select('quantity, unit')
    .eq('branch_id', branchId)
    .eq('insumo_id', insumoId)
    .maybeSingle();
  return data ? { ...data, cantidad: data.quantity } : data;
}

export async function fetchInsumoCostInfo(insumoId: string) {
  const { data } = await fromUntyped('supplies')
    .select('pl_category, base_unit_cost, name')
    .eq('id', insumoId)
    .single();
  return data;
}

export async function insertConsumoManual(record: Record<string, unknown>) {
  await fromUntyped('manual_consumptions').insert(record as any);
}

// ─── Stock Movimientos History ───

export async function fetchStockMovimientosHistory(
  branchId: string,
  insumoId: string,
  limit = 10,
) {
  const { data, error } = await fromUntyped('stock_movements')
    .select('*')
    .eq('branch_id', branchId)
    .eq('insumo_id', insumoId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// ─── Stock Conteos ───

export async function insertStockConteo(record: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('stock_conteos')
    .insert(record as any)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteStockConteoItems(conteoId: string) {
  await supabase.from('stock_conteo_items').delete().eq('conteo_id', conteoId);
}

export async function insertStockConteoItems(items: Array<Record<string, unknown>>) {
  const { error } = await supabase.from('stock_conteo_items').insert(items as any);
  if (error) throw error;
}

export async function updateStockConteo(conteoId: string, record: Record<string, unknown>) {
  await supabase.from('stock_conteos').update(record).eq('id', conteoId);
}

// ─── Stock Actual Updates ───

export async function updateStockActualFields(
  branchId: string,
  insumoId: string,
  fields: Record<string, unknown>,
) {
  const { error } = await supabase
    .from('stock_actual')
    .update(fields)
    .eq('branch_id', branchId)
    .eq('insumo_id', insumoId);
  if (error) throw error;
}

export async function insertStockActualRecord(record: Record<string, unknown>) {
  const { error } = await supabase.from('stock_actual').insert(record as any);
  if (error) throw error;
}

// ─── Branch Info ───

export async function fetchBranchName(branchId: string) {
  const { data } = await supabase.from('branches').select('name').eq('id', branchId).single();
  return data;
}

// ─── Google Maps ───

export async function fetchGoogleMapsApiKey() {
  const { data, error } = await supabase.functions.invoke('google-maps-key');
  if (error) return null;
  return (data?.apiKey as string) ?? null;
}

// ─── Profile Lookup ───

export async function lookupProfileByPhone(phoneVariants: string[]) {
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, phone')
    .in('phone', phoneVariants)
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

// ─── Hamburguesas Count (shift) ───

export async function fetchMenuCategoriesByName(pattern: string) {
  const { data } = await fromUntyped('menu_categories')
    .select('id')
    .ilike('name', pattern);
  return data ?? [];
}

export async function fetchShiftPedidoIds(branchId: string, since: string) {
  const { data } = await fromUntyped('orders')
    .select('id')
    .eq('branch_id', branchId)
    .gte('created_at', since)
    .not('status', 'eq', 'cancelado');
  return (data ?? []).map((p) => p.id);
}

export async function fetchItemQuantitiesByCategories(
  categoryIds: string[],
  pedidoIds: string[],
) {
  const { data } = await fromUntyped('order_items')
    .select('quantity')
    .in('categoria_carta_id', categoryIds)
    .in('pedido_id', pedidoIds);
  return data ?? [];
}

// ─── Pedido Estado ───

export async function updatePedidoEstado(
  pedidoId: string,
  estado: string,
  extra?: Record<string, unknown>,
) {
  const updateData: Record<string, unknown> = { status: estado, ...extra };
  if (estado === 'en_preparacion') updateData.prep_started_at_time = new Date().toISOString();
  if (estado === 'listo') updateData.ready_at_time = new Date().toISOString();
  if (estado === 'en_camino') updateData.on_route_at_time = new Date().toISOString();
  const { error } = await fromUntyped('orders').update(updateData).eq('id', pedidoId);
  if (error) throw error;
}

// ─── Cash Register Expenses ───

export async function fetchShiftExpenses(shiftId: string) {
  const { data, error } = await supabase
    .from('cash_register_movements')
    .select('*')
    .eq('shift_id', shiftId)
    .eq('type', 'expense')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function updateExpenseApproval(
  id: string,
  estado: 'aprobado' | 'rechazado',
) {
  const { error } = await supabase
    .from('cash_register_movements')
    .update({ estado_aprobacion: estado } as never)
    .eq('id', id);
  if (error) throw error;
}

// ─── Webapp Orders ───

const WEBAPP_SELECT = `
  id, order_number, service_type, customer_name,
  customer_phone, customer_address, cliente_user_id, canal_venta, total, status,
  created_at, webapp_tracking_code,
  order_items(id, name, quantity, unit_price, subtotal)
`;

export async function fetchWebappPendingOrders(branchId: string) {
  const { data, error } = await fromUntyped('orders')
    .select(WEBAPP_SELECT)
    .eq('branch_id', branchId)
    .eq('source', 'webapp')
    .in('status', ['pendiente'])
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchWebappActiveOrders(
  branchId: string,
  activeStates: string[],
) {
  const { data, error } = await fromUntyped('orders')
    .select(WEBAPP_SELECT)
    .eq('branch_id', branchId)
    .eq('source', 'webapp')
    .in('status', activeStates)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchWebappRecentOrders(branchId: string, since: string) {
  const { data, error } = await fromUntyped('orders')
    .select('id, order_number, service_type, total, status, created_at, customer_name')
    .eq('branch_id', branchId)
    .eq('source', 'webapp')
    .in('status', ['entregado', 'cancelado'])
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) throw error;
  return data ?? [];
}

export function subscribeToWebappOrders(branchId: string, callback: () => void) {
  return supabase
    .channel(`webapp-orders-${branchId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `branch_id=eq.${branchId}`,
      },
      callback,
    )
    .subscribe();
}

export async function acceptWebappOrder(orderId: string) {
  const { error } = await fromUntyped('orders')
    .update({ status: 'confirmado', confirmed_at_time: new Date().toISOString() })
    .eq('id', orderId);
  if (error) throw error;
}

export async function rejectWebappOrder(orderId: string) {
  const { error } = await fromUntyped('orders')
    .update({ status: 'cancelado' })
    .eq('id', orderId);
  if (error) throw error;
}

// ─── Item Extras / Removibles Prefetch ───

export async function fetchItemExtraAssignments(itemId: string) {
  const { data: asignaciones } = await fromUntyped('extra_assignments')
    .select('extra_id')
    .eq('item_carta_id', itemId);
  if (asignaciones && (asignaciones as any[]).length > 0) {
    const extraIds = (asignaciones as any[]).map((a: any) => a.extra_id);
     const { data: extras } = await fromUntyped('menu_items')
      .select('id, name, base_price, is_active')
      .in('id', extraIds)
      .eq('is_active', true)
      .is('deleted_at', null);
    return ((extras as any[]) || []).map((e: any, i: number) => ({
      id: e.id,
      item_carta_id: itemId,
      preparacion_id: null,
      insumo_id: null,
      orden: i,
      preparaciones: {
        id: e.id,
        nombre: e.name,
        costo_calculado: 0,
        precio_extra: e.base_price,
        puede_ser_extra: true,
      },
      insumos: null,
    }));
  }
   const { data } = await fromUntyped('menu_item_extras')
    .select(
      '*, recipes:recipes(id, name, calculated_cost, extra_price, can_be_extra), supplies:supplies(id, name, base_unit_cost, extra_price, can_be_extra)',
    )
    .eq('item_carta_id', itemId)
    .order('sort_order');
  return (data as any[]) ?? [];
}

export async function fetchItemRemovibles(itemId: string) {
  const { data } = await fromUntyped('removable_items')
    .select('*, supplies:supplies(id, name), recipes:recipes(id, name)')
    .eq('item_carta_id', itemId)
    .eq('is_active', true);
  return (data as any[]) ?? [];
}

// ─── User Roles (for expense approval check) ───

export async function fetchUserActiveRoles(userId: string) {
  const { data } = await supabase
    .from('user_role_assignments')
    .select('roles!inner(key, scope)')
    .eq('user_id', userId)
    .eq('is_active', true);
  return (data || []).map((d: any) => ({
    brand_role: d.roles.scope === 'brand' ? d.roles.key : null,
    local_role: d.roles.scope === 'branch' ? d.roles.key : null,
  }));
}

// ─── Payment Edit ───

export async function deletePedidoPagos(pedidoId: string) {
  const { error } = await fromUntyped('order_payments')
    .delete()
    .eq('pedido_id', pedidoId);
  if (error) throw error;
}

export async function insertPaymentEditAudit(record: Record<string, unknown>) {
  const from = supabase.from as unknown as (name: string) => ReturnType<typeof supabase.from>;
  const { error } = await from('order_payment_edits').insert(record);
  if (error) throw error;
}

export async function findOpenCashShiftForBranch(branchId: string) {
  const { data } = await supabase
    .from('cash_register_shifts')
    .select('id')
    .eq('branch_id', branchId)
    .eq('status', 'open')
    .limit(1)
    .maybeSingle();
  return data;
}

// ─── Point Smart ───

export async function invokeMpPointPayment(body: Record<string, unknown>) {
  return supabase.functions.invoke('mp-point-payment', { body });
}

export function subscribeToPedidoPagos(
  pedidoId: string,
  callback: (payload: Record<string, unknown>) => void,
) {
  return supabase
    .channel(`point-payment-${pedidoId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'order_payments',
        filter: `pedido_id=eq.${pedidoId}`,
      },
      (payload) => callback(payload.new as Record<string, unknown>),
    )
    .subscribe();
}

// ─── Shift Analysis ───

export async function fetchBranchShifts(branchId: string) {
  const { data, error } = await supabase
    .from('branch_shifts')
    .select('*')
    .eq('branch_id', branchId)
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw error;
  return data ?? [];
}

export async function fetchShiftAnalysisOrders(branchId: string, since: string) {
  const { data, error } = await fromUntyped('orders')
    .select('id, total, created_at, status')
    .eq('branch_id', branchId)
    .gte('created_at', since)
    .neq('status', 'cancelado');
  if (error) throw error;
  return data ?? [];
}

// ─── Order Chat ───

export async function fetchOrderChatMessages(pedidoId: string) {
  const { data, error } = await fromUntyped('webapp_order_messages')
    .select('id, sender_type, sender_name, message, leido, created_at')
    .eq('pedido_id', pedidoId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as any[]) ?? [];
}

export async function insertOrderChatMessage(message: Record<string, unknown>) {
  const { error } = await fromUntyped('webapp_order_messages')
    .insert(message as never);
  if (error) throw error;
}

export async function markChatMessagesRead(pedidoId: string) {
  await fromUntyped('webapp_order_messages')
    .update({ leido: true } as never)
    .eq('pedido_id', pedidoId)
    .eq('sender_type', 'cliente')
    .eq('leido', false);
}

export function subscribeToChatMessages(pedidoId: string, callback: () => void) {
  return supabase
    .channel(`pos-chat-${pedidoId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'webapp_order_messages',
        filter: `pedido_id=eq.${pedidoId}`,
      },
      callback,
    )
    .subscribe();
}

// ─── Menu Categorias (for printing) ───

export async function fetchMenuCategoriasPrint() {
   const { data } = await fromUntyped('menu_categories')
    .select('id, name, print_type')
    .eq('is_active', true);
  return (data ?? []) as { id: string; name: string; print_type: string }[];
}

// ─── Cancel Pedido ───

export async function cancelPedido(pedidoId: string) {
  await fromUntyped('orders').update({ status: 'cancelado' }).eq('id', pedidoId);
}

// ─── Delivery Page ───

export async function fetchDeliveryPedidos(branchId: string) {
  const { data } = await fromUntyped('orders')
    .select('*, order_items(name, quantity)')
    .eq('branch_id', branchId)
    .eq('type', 'delivery')
    .in('status', ['listo', 'en_camino'])
    .order('created_at', { ascending: true });
  return data ?? [];
}

export async function fetchValeCategoryIds(): Promise<Set<string>> {
  const { data } = await fromUntyped('menu_categories')
    .select('id, print_type')
    .eq('is_active', true);
  return new Set(
    ((data ?? []) as { id: string; print_type: string }[])
      .filter((c) => c.print_type === 'vale')
      .map((c) => c.id),
  );
}

export async function assignCadeteToPedido(pedidoId: string, cadeteId: string) {
  const { error } = await fromUntyped('orders')
    .update({
      cadete_id: cadeteId,
      status: 'en_camino',
      on_route_at_time: new Date().toISOString(),
    })
    .eq('id', pedidoId);
  if (error) throw error;
}

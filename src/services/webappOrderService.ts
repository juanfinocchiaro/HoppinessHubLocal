import { supabase } from './supabaseClient';
import { ORDER_ACTIVE_STATES } from '@/lib/constants';

const ACTIVE_STATES = ORDER_ACTIVE_STATES as unknown as string[];

export async function fetchUserOrders(userId: string, limit = 30) {
  const { data, error } = await fromUntyped('orders')
    .select(
      `id, numero_pedido, estado, tipo_servicio,
       total, created_at, webapp_tracking_code,
       branch_id,
       pedido_items(nombre, cantidad, precio_unitario, subtotal)`,
    )
    .eq('cliente_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function fetchBranchNamesAndSlugs(branchIds: string[]) {
  if (branchIds.length === 0) return {};
  const { data } = await supabase
    .from('branches')
    .select('id, name, slug')
    .in('id', branchIds);
  const map: Record<string, { name: string; slug: string | null }> = {};
  data?.forEach((b) => {
    map[b.id] = { name: b.name, slug: b.slug };
  });
  return map;
}

export async function fetchActiveOrdersForUser(userId: string) {
  const { data } = await supabase
    .from('pedidos')
    .select('numero_pedido, estado, webapp_tracking_code')
    .eq('cliente_user_id', userId)
    .eq('origen', 'webapp')
    .in('estado', ACTIVE_STATES)
    .order('created_at', { ascending: false });
  return data || [];
}

export async function fetchActiveOrdersByTrackingCode(code: string) {
  const { data } = await supabase
    .from('pedidos')
    .select('numero_pedido, estado, webapp_tracking_code')
    .eq('webapp_tracking_code', code)
    .in('estado', ACTIVE_STATES);
  return data || [];
}

export async function fetchActiveOrderWithBranch(userId: string) {
  const { data } = await supabase
    .from('pedidos')
    .select(
      'id, numero_pedido, estado, webapp_tracking_code, branch:branches!pedidos_branch_id_fkey(name)',
    )
    .eq('cliente_user_id', userId)
    .eq('origen', 'webapp')
    .in('estado', ACTIVE_STATES)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function fetchOrderByTrackingWithBranch(code: string) {
  const { data } = await supabase
    .from('pedidos')
    .select(
      'id, numero_pedido, estado, webapp_tracking_code, branch:branches!pedidos_branch_id_fkey(name)',
    )
    .eq('webapp_tracking_code', code)
    .in('estado', ACTIVE_STATES)
    .maybeSingle();
  return data;
}

export async function fetchPendingWebappCount(branchId: string): Promise<number> {
  const { count, error } = await supabase
    .from('pedidos')
    .select('*', { count: 'exact', head: true })
    .eq('branch_id', branchId)
    .eq('origen', 'webapp')
    .eq('estado', 'pendiente');
  if (error) throw error;
  return count ?? 0;
}

export function subscribeToPedidosChanges(
  branchId: string,
  channelName: string,
  callback: () => void,
) {
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'pedidos',
        filter: `branch_id=eq.${branchId}`,
      },
      callback,
    )
    .subscribe();

  return channel;
}

export function unsubscribeChannel(channel: ReturnType<typeof supabase.channel>) {
  supabase.removeChannel(channel);
}

export async function fetchOrderStatuses(trackingCodes: string[]) {
  if (trackingCodes.length === 0) return [];
  const { data } = await supabase
    .from('pedidos')
    .select('webapp_tracking_code, estado, numero_pedido')
    .in('webapp_tracking_code', trackingCodes);
  return data || [];
}

export async function fetchLastUserOrder(userId: string) {
  const { data, error } = await supabase
    .from('pedidos')
    .select(
      `id, numero_pedido, estado, total, created_at, webapp_tracking_code, branch_id,
       pedido_items(nombre, cantidad)`,
    )
    .eq('cliente_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchBranchNameAndSlug(branchId: string) {
  const { data } = await supabase
    .from('branches')
    .select('name, slug')
    .eq('id', branchId)
    .single();
  return data || { name: '', slug: null };
}

export function subscribeToTrackingUpdates(
  trackingCode: string,
  channelName: string,
  callback: () => void,
) {
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'pedidos',
        filter: `webapp_tracking_code=eq.${trackingCode}`,
      },
      callback,
    )
    .subscribe();
  return channel;
}

export function subscribeToChatMessages(
  pedidoId: string,
  channelName: string,
  callback: (payload: any) => void,
) {
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'webapp_pedido_mensajes',
        filter: `pedido_id=eq.${pedidoId}`,
      },
      callback,
    )
    .subscribe();
  return channel;
}

export function subscribeToDeliveryTracking(
  pedidoId: string,
  channelName: string,
  callback: (payload: any) => void,
) {
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'delivery_tracking',
        filter: `pedido_id=eq.${pedidoId}`,
      },
      callback,
    )
    .subscribe();
  return channel;
}

import { supabase } from './supabaseClient';
import { fromUntyped } from '@/lib/supabase-helpers';

export async function savePushSubscription(
  userId: string,
  subscription: { endpoint?: string; keys?: Record<string, string> },
) {
  const { error } = await fromUntyped('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: subscription.endpoint,
      keys: subscription.keys,
    },
    { onConflict: 'user_id,endpoint' },
  );
  if (error) throw error;
}

export function sendOrderPushNotification(params: {
  pedidoId: string;
  estado: string;
  numeroPedido?: number;
  clienteUserId?: string | null;
}) {
  if (!params.clienteUserId) return;

  supabase.functions
    .invoke('send-order-push', {
      body: {
        pedido_id: params.pedidoId,
        estado: params.estado,
        numero_pedido: params.numeroPedido,
        cliente_user_id: params.clienteUserId,
      },
    })
    .catch(() => {});
}

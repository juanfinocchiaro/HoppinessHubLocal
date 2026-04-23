import { apiPost } from './apiClient';

export async function savePushSubscription(
  userId: string,
  subscription: { endpoint?: string; keys?: Record<string, string> },
) {
  return apiPost('/notifications/subscribe', {
    user_id: userId,
    endpoint: subscription.endpoint,
    keys: subscription.keys,
  });
}

export function sendOrderPushNotification(params: {
  pedidoId: string;
  estado: string;
  numeroPedido?: number;
  clienteUserId?: string | null;
}) {
  if (!params.clienteUserId) return;

  apiPost('/notifications/send', {
    pedido_id: params.pedidoId,
    estado: params.estado,
    numero_pedido: params.numeroPedido,
    cliente_user_id: params.clienteUserId,
  }).catch(() => {});
}

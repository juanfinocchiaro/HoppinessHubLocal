/**
 * ActiveOrderBanner — Shows a banner in the store when user has active orders.
 * Supports multiple active orders.
 */
import { Flame, Clock, CheckCircle2, Truck, Package } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import {
  fetchActiveOrdersForUser,
  fetchActiveOrdersByTrackingCode,
} from '@/services/webappOrderService';

import { ORDER_ACTIVE_STATES as _ORDER_ACTIVE_STATES } from '@/lib/constants'; // eslint-disable-line @typescript-eslint/no-unused-vars

const ESTADO_CONFIG: Record<string, { label: string; icon: typeof Flame }> = {
  pendiente: { label: 'fue enviado', icon: Clock },
  confirmado: { label: 'fue aceptado', icon: CheckCircle2 },
  en_preparacion: { label: 'se está preparando', icon: Flame },
  listo: { label: 'está listo', icon: Package },
  listo_retiro: { label: 'está listo para retirar', icon: Package },
  listo_mesa: { label: 'está listo', icon: Package },
  listo_envio: { label: 'está listo para enviar', icon: Package },
  en_camino: { label: 'está en camino', icon: Truck },
};

interface Props {
  onShowTracking: (trackingCode: string) => void;
}

export function ActiveOrderBanner({ onShowTracking }: Props) {
  const { user } = useAuth();

  const { data: activeOrders } = useQuery({
    queryKey: ['active-order-banner', user?.id],
    queryFn: async () => {
      if (user) return fetchActiveOrdersForUser(user.id);
      const code = localStorage.getItem('hoppiness_last_tracking');
      if (!code) return [];
      return fetchActiveOrdersByTrackingCode(code);
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });

  if (!activeOrders || activeOrders.length === 0) return null;

  // Multiple orders
  if (activeOrders.length > 1) {
    return (
      <button
        onClick={() => onShowTracking(activeOrders[0].webapp_tracking_code)}
        className="w-full bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center gap-2 hover:bg-primary/15 transition-colors text-left"
      >
        <Package className="w-4 h-4 text-primary shrink-0" />
        <p className="text-xs font-medium text-foreground flex-1">
          Tenés <span className="font-bold">{activeOrders.length} pedidos activos</span>
        </p>
        <span className="text-[10px] font-semibold text-primary shrink-0">Ver estado →</span>
      </button>
    );
  }

  // Single order
  const order = activeOrders[0];
  const config = ESTADO_CONFIG[order.estado] || ESTADO_CONFIG.pendiente;
  const Icon = config.icon;

  return (
    <button
      onClick={() => onShowTracking(order.webapp_tracking_code)}
      className="w-full bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center gap-2 hover:bg-primary/15 transition-colors text-left"
    >
      <Icon className="w-4 h-4 text-primary shrink-0" />
      <p className="text-xs font-medium text-foreground flex-1">
        Tu pedido <span className="font-bold">#{order.numero_pedido}</span> {config.label}
      </p>
      <span className="text-[10px] font-semibold text-primary shrink-0">Ver estado →</span>
    </button>
  );
}

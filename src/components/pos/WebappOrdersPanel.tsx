/**
 * WebappOrdersPanel — Panel completo de pedidos webapp
 *
 * Muestra el ciclo de vida completo: Nuevos → En curso → Recientes
 * Con chat disponible en pedidos nuevos y en curso.
 */
import { useState, useEffect } from 'react';
import { sendOrderPushNotification } from '@/utils/orderPush';
import {
  Globe,
  Check,
  X,
  Clock,
  ShoppingBag,
  Truck,
  Utensils,
  ChefHat,
  CheckCircle,
  Package,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchBranchName,
  fetchWebappPendingOrders,
  fetchWebappActiveOrders,
  fetchWebappRecentOrders,
  subscribeToWebappOrders,
  removeSupabaseChannel,
  acceptWebappOrder,
  rejectWebappOrder,
  updatePedidoEstado,
} from '@/services/posService';
import { toast } from 'sonner';
import { OrderChatDialog } from './OrderChatDialog';
import { usePrintConfig } from '@/hooks/usePrintConfig';
import { useBranchPrinters } from '@/hooks/useBranchPrinters';
import { useAfipConfig } from '@/hooks/useAfipConfig';
import {
  printReadyTicketByPedidoId,
  printDeliveryTicketByPedidoId,
  extractErrorMessage,
} from '@/lib/ready-ticket';
import { cn } from '@/lib/utils';
import { WEBAPP_PENDING_COUNT_QUERY_KEY } from '@/hooks/useWebappPendingCount';

const SERVICIO_ICONS: Record<string, typeof ShoppingBag> = {
  retiro: ShoppingBag,
  takeaway: ShoppingBag,
  delivery: Truck,
  comer_aca: Utensils,
};

const SERVICIO_LABELS: Record<string, string> = {
  retiro: 'Retiro',
  takeaway: 'Retiro',
  delivery: 'Delivery',
  comer_aca: 'Comer acá',
};

import { formatCurrency } from '@/lib/formatters';

interface WebappOrder {
  id: string;
  numero_pedido: number;
  tipo_servicio: string | null;
  cliente_nombre: string | null;
  cliente_telefono: string | null;
  cliente_direccion: string | null;
  cliente_user_id: string | null;
  canal_venta: string | null;
  total: number;
  estado: string;
  created_at: string;
  webapp_tracking_code: string | null;
  pedido_items: Array<{
    id: string;
    nombre: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
  }>;
}

const ACTIVE_STATES = [
  'confirmado',
  'en_preparacion',
  'listo',
  'listo_retiro',
  'listo_mesa',
  'listo_envio',
  'en_camino',
];

const ESTADO_NEXT: Record<string, { next: string; label: string; icon: typeof Clock }> = {
  confirmado: { next: 'en_preparacion', label: 'Preparar', icon: ChefHat },
  en_preparacion: { next: 'listo', label: 'Listo', icon: CheckCircle },
  listo: { next: 'entregado', label: 'Entregar', icon: Package },
  listo_retiro: { next: 'entregado', label: 'Entregar', icon: Package },
  listo_mesa: { next: 'entregado', label: 'Entregar', icon: Package },
  listo_envio: { next: 'en_camino', label: 'En camino', icon: Truck },
  en_camino: { next: 'entregado', label: 'Entregado', icon: CheckCircle },
};

const ESTADO_BADGE: Record<string, { label: string; className: string }> = {
  confirmado: { label: 'Confirmado', className: 'bg-warning/15 text-warning border-warning/30' },
  en_preparacion: { label: 'Preparando', className: 'bg-info/15 text-info border-info/30' },
  listo: { label: 'Listo', className: 'bg-success/15 text-success border-success/30' },
  listo_retiro: {
    label: 'Listo retiro',
    className: 'bg-success/15 text-success border-success/30',
  },
  listo_mesa: { label: 'Listo mesa', className: 'bg-success/15 text-success border-success/30' },
  listo_envio: { label: 'Listo envío', className: 'bg-success/15 text-success border-success/30' },
  en_camino: { label: 'En camino', className: 'bg-primary/15 text-primary border-primary/30' },
};

export function WebappOrdersPanel({ branchId }: { branchId: string }) {
  const [expanded, setExpanded] = useState(false);
  const queryClient = useQueryClient();

  const { data: branchData } = useQuery({
    queryKey: ['branch-name', branchId],
    queryFn: () => fetchBranchName(branchId),
    enabled: !!branchId,
    staleTime: Infinity,
  });
  const branchName = branchData?.name ?? 'Local';

  const { data: printConfig } = usePrintConfig(branchId);
  const { data: printersData } = useBranchPrinters(branchId);
  const { data: afipConfig } = useAfipConfig(branchId);
  const allPrinters = printersData ?? [];

  // ─── Query 1: Nuevos (pendientes) ───
  const { data: newOrders, isLoading: loadingNew } = useQuery({
    queryKey: ['webapp-pending-orders', branchId],
    queryFn: async () => {
      const data = await fetchWebappPendingOrders(branchId);
      return data as unknown as WebappOrder[];
    },
    refetchInterval: 5000,
  });

  // ─── Query 2: En curso ───
  const { data: activeOrders, isLoading: loadingActive } = useQuery({
    queryKey: ['webapp-active-orders', branchId],
    queryFn: async () => {
      const data = await fetchWebappActiveOrders(branchId, ACTIVE_STATES);
      return data as unknown as WebappOrder[];
    },
    refetchInterval: 15000,
  });

  // ─── Query 3: Recientes ───
  const { data: recentOrders } = useQuery({
    queryKey: ['webapp-recent-orders', branchId],
    queryFn: async () => {
      const since = new Date(Date.now() - 3600000).toISOString();
      return fetchWebappRecentOrders(branchId, since);
    },
    refetchInterval: 30000,
  });

  // ─── Realtime ───
  useEffect(() => {
    if (!branchId) return;
    const channel = subscribeToWebappOrders(branchId, () => {
      queryClient.invalidateQueries({ queryKey: ['webapp-pending-orders', branchId] });
      queryClient.invalidateQueries({ queryKey: ['webapp-active-orders', branchId] });
      queryClient.invalidateQueries({ queryKey: ['webapp-recent-orders', branchId] });
      queryClient.invalidateQueries({
        queryKey: [...WEBAPP_PENDING_COUNT_QUERY_KEY, branchId],
      });
    });
    return () => {
      removeSupabaseChannel(channel);
    };
  }, [branchId, queryClient]);

  // ─── Mutations ───
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['webapp-pending-orders', branchId] });
    queryClient.invalidateQueries({ queryKey: ['webapp-active-orders', branchId] });
    queryClient.invalidateQueries({ queryKey: ['webapp-recent-orders', branchId] });
    queryClient.invalidateQueries({ queryKey: ['pos-kitchen', branchId] });
    queryClient.invalidateQueries({ queryKey: [...WEBAPP_PENDING_COUNT_QUERY_KEY, branchId] });
  };

  const acceptOrder = useMutation({
    mutationFn: async (orderId: string) => {
      await acceptWebappOrder(orderId);
    },
    onSuccess: (_, orderId) => {
      invalidateAll();
      toast.success('Pedido aceptado');
      const order = newOrders?.find((o) => o.id === orderId);
      if (order)
        sendOrderPushNotification({
          pedidoId: orderId,
          estado: 'confirmado',
          numeroPedido: order.numero_pedido,
          clienteUserId: order.cliente_user_id,
        });
    },
  });

  const rejectOrder = useMutation({
    mutationFn: async (orderId: string) => {
      await rejectWebappOrder(orderId);
    },
    onSuccess: (_, orderId) => {
      invalidateAll();
      toast.success('Pedido rechazado');
      const order = newOrders?.find((o) => o.id === orderId);
      if (order)
        sendOrderPushNotification({
          pedidoId: orderId,
          estado: 'cancelado',
          numeroPedido: order.numero_pedido,
          clienteUserId: order.cliente_user_id,
        });
    },
  });

  const advanceOrder = useMutation({
    mutationFn: async ({ orderId, estado }: { orderId: string; estado: string }) => {
      await updatePedidoEstado(orderId, estado);
    },
    onSuccess: async (_, { orderId, estado }) => {
      invalidateAll();
      queryClient.invalidateQueries({ queryKey: ['shift-hamburguesas', branchId] });
      toast.success(
        estado === 'entregado' ? 'Pedido entregado' : `Pedido → ${estado.replace('_', ' ')}`,
      );

      const allOrders = [...(newOrders ?? []), ...(activeOrders ?? [])];
      const order = allOrders.find((o) => o.id === orderId);
      if (order) {
        sendOrderPushNotification({
          pedidoId: orderId,
          estado,
          numeroPedido: order.numero_pedido,
          clienteUserId: order.cliente_user_id,
        });
      }

      if (
        estado === 'listo' ||
        estado === 'listo_retiro' ||
        estado === 'listo_mesa' ||
        estado === 'listo_envio'
      ) {
        const isDelivery = order?.tipo_servicio === 'delivery' || order?.canal_venta === 'apps';
        if (isDelivery) {
          try {
            await printDeliveryTicketByPedidoId({
              branchId,
              pedidoId: orderId,
              branchName: branchName || 'Hoppiness',
              printConfig,
              printers: allPrinters,
            });
            toast.success('Ticket delivery impreso');
          } catch (err) {
            console.error('[WebappOrdersPanel] delivery ticket error:', err);
            toast.error('Error al imprimir ticket delivery', {
              description: extractErrorMessage(err),
            });
          }
        }
        if (printConfig?.ticket_trigger === 'on_ready') {
          try {
            await printReadyTicketByPedidoId({
              branchId,
              pedidoId: orderId,
              branchName: branchName || 'Hoppiness',
              printConfig,
              printers: allPrinters,
              afipConfig: afipConfig as unknown as {
                razon_social?: string | null;
                cuit?: string | null;
                direccion_fiscal?: string | null;
                inicio_actividades?: string | null;
                iibb?: string | null;
                condicion_iva?: string | null;
              } | null,
            });
            toast.success('Ticket impreso al marcar listo');
          } catch (err) {
            console.error('[WebappOrdersPanel] on_ready ticket error:', err);
            toast.error('Error al imprimir ticket on_ready', {
              description: extractErrorMessage(err),
            });
          }
        }
      }
    },
    onError: () => toast.error('Error al actualizar estado'),
  });

  const pendingCount = newOrders?.length || 0;
  const activeCount = activeOrders?.length || 0;
  const totalActive = pendingCount + activeCount;

  // Auto-expand when there are pending orders
  useEffect(() => {
    if (pendingCount > 0 && !expanded) {
      setExpanded(true);
    }
  }, [pendingCount]);

  const renderOrderCard = (order: WebappOrder, actions: React.ReactNode) => {
    const ServiceIcon = SERVICIO_ICONS[order.tipo_servicio || ''] || ShoppingBag;
    const minutesAgo = Math.round((Date.now() - new Date(order.created_at).getTime()) / 60000);

    return (
      <div key={order.id} className="border rounded-lg p-3 space-y-2 active:scale-[0.99]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">
              #{order.numero_pedido}
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <ServiceIcon className="w-3 h-3" />
              {SERVICIO_LABELS[order.tipo_servicio || ''] || 'Retiro'}
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {minutesAgo}m
            </span>
          </div>
          <span className="font-bold text-sm">{formatCurrency(order.total)}</span>
        </div>

        {order.cliente_nombre && <p className="text-sm">{order.cliente_nombre}</p>}
        {order.cliente_direccion && (
          <p className="text-xs text-muted-foreground">{order.cliente_direccion}</p>
        )}

        <div className="text-xs text-muted-foreground">
          {order.pedido_items.map((item) => (
            <span key={item.id} className="mr-2">
              {item.cantidad}x {item.nombre}
            </span>
          ))}
        </div>

        <div className="flex gap-2 pt-1">
          {actions}
          <OrderChatDialog
            pedidoId={order.id}
            branchId={branchId}
            branchName={branchName}
            numeroPedido={order.numero_pedido}
            clienteNombre={order.cliente_nombre}
          />
        </div>
      </div>
    );
  };

  return (
    <Card className="mx-4 mt-2">
      <CardHeader className="pb-2 py-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Pedidos WebApp
            {pendingCount > 0 && (
              <Badge variant="destructive" className="animate-pulse text-xs">
                {pendingCount} nuevo{pendingCount > 1 ? 's' : ''}
              </Badge>
            )}
            {activeCount > 0 && (
              <Badge variant="outline" className="text-xs bg-info/15 text-info border-info/30">
                {activeCount} en curso
              </Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
            {expanded ? 'Ocultar' : 'Mostrar'}
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-3 pt-0">
          {(loadingNew || loadingActive) && <Skeleton className="h-24 w-full" />}

          {!loadingNew && !loadingActive && totalActive === 0 && !recentOrders?.length && (
            <div className="text-center py-6 text-muted-foreground">
              <Globe className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Sin pedidos webapp</p>
            </div>
          )}

          {/* ── NUEVOS (pendientes) ── */}
          {newOrders && newOrders.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-warning flex items-center gap-1">
                🔔 Nuevos
              </p>
              {newOrders.map((order) =>
                renderOrderCard(
                  order,
                  <>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => acceptOrder.mutate(order.id)}
                      disabled={acceptOrder.isPending}
                    >
                      <Check className="w-4 h-4 mr-1" /> Aceptar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => rejectOrder.mutate(order.id)}
                      disabled={rejectOrder.isPending}
                    >
                      <X className="w-4 h-4 mr-1" /> Rechazar
                    </Button>
                  </>,
                ),
              )}
            </div>
          )}

          {/* ── EN CURSO ── */}
          {activeOrders && activeOrders.length > 0 && (
            <div className="space-y-2">
              {newOrders && newOrders.length > 0 && <div className="border-t" />}
              <p className="text-xs font-bold uppercase tracking-wider text-info flex items-center gap-1">
                🔥 En curso
              </p>
              {activeOrders.map((order) => {
                const nextConfig = ESTADO_NEXT[order.estado];
                const estadoBadge = ESTADO_BADGE[order.estado];
                return renderOrderCard(
                  order,
                  <>
                    {estadoBadge && (
                      <Badge variant="outline" className={cn('text-xs', estadoBadge.className)}>
                        {estadoBadge.label}
                      </Badge>
                    )}
                    {nextConfig && (
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() =>
                          advanceOrder.mutate({ orderId: order.id, estado: nextConfig.next })
                        }
                        disabled={advanceOrder.isPending}
                      >
                        <nextConfig.icon className="w-4 h-4 mr-1" />
                        {nextConfig.label}
                      </Button>
                    )}
                  </>,
                );
              })}
            </div>
          )}

          {/* ── RECIENTES ── */}
          {recentOrders && recentOrders.length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-2">Últimos procesados</p>
              {recentOrders.map((o) => (
                <div key={o.id} className="flex items-center justify-between text-xs py-1">
                  <span>
                    #{o.numero_pedido} {o.cliente_nombre || ''}
                  </span>
                  <div className="flex items-center gap-2">
                    <span>{formatCurrency(o.total)}</span>
                    <Badge
                      variant={o.estado === 'cancelado' ? 'destructive' : 'secondary'}
                      className="text-[10px]"
                    >
                      {o.estado}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

/**
 * TrackingInlineView — Compact order tracking for CartSidePanel and CartSheet.
 * Fetches order status via edge function, shows timeline, items, and chat.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  Clock,
  Package,
  XCircle,
  ShoppingBag,
} from 'lucide-react';
import { SpinnerLoader } from '@/components/ui/loaders';
import { Button } from '@/components/ui/button';
import { subscribeToTrackingUpdates, unsubscribeChannel } from '@/services/webappOrderService';
import { OrderChat } from './OrderChat';
import { formatPrice, formatTime } from '@/lib/formatters';

interface TrackingData {
  pedido: {
    id: string;
    numero_pedido: number;
    estado: string;
    tipo_servicio: string | null;
    subtotal: number;
    costo_delivery: number | null;
    total: number;
    created_at: string;
    cliente_nombre: string | null;
  };
  items: Array<{
    nombre: string;
    cantidad: number;
    subtotal: number;
    modificadores: Array<{ tipo: string; descripcion: string }>;
  }>;
  branch: { name: string } | null;
  timeline: Array<{ estado: string; timestamp: string | null }>;
}

function getEstadoOrder(tipoServicio: string | null): string[] {
  if (tipoServicio === 'delivery') {
    return ['pendiente', 'confirmado', 'en_preparacion', 'listo', 'en_camino', 'entregado'];
  }
  return ['pendiente', 'confirmado', 'en_preparacion', 'listo', 'entregado'];
}

function getEstadoConfig(estado: string, tipo: string | null) {
  const isDelivery = tipo === 'delivery';
  const map: Record<string, { label: string; color: string }> = {
    pendiente: { label: 'Enviado', color: 'text-blue-500' },
    confirmado: { label: 'Aceptado', color: 'text-blue-600' },
    en_preparacion: { label: 'Preparando', color: 'text-orange-500' },
    listo: {
      label: isDelivery ? 'Listo para enviar' : 'Listo para retirar',
      color: 'text-green-500',
    },
    en_camino: { label: 'En camino', color: 'text-purple-500' },
    entregado: { label: 'Entregado', color: 'text-green-600' },
    cancelado: { label: 'Cancelado', color: 'text-destructive' },
  };
  return map[estado] ?? map.pendiente;
}

interface Props {
  trackingCode: string;
  onNewOrder: () => void;
}

export function TrackingInlineView({ trackingCode, onNewOrder }: Props) {
  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTracking = useCallback(async () => {
    if (!trackingCode) return;
    try {
      const baseUrl = import.meta.env.VITE_SUPABASE_URL;
      const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(
        `${baseUrl}/functions/v1/webapp-order-tracking?code=${trackingCode}`,
        {
          headers: { apikey: apiKey },
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Pedido no encontrado');
      }
      setData(await res.json());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, [trackingCode]);

  useEffect(() => {
    fetchTracking();
  }, [fetchTracking]);

  useEffect(() => {
    if (!trackingCode) return;
    const channel = subscribeToTrackingUpdates(
      trackingCode,
      `tracking-inline-${trackingCode}`,
      () => fetchTracking(),
    );
    return () => {
      unsubscribeChannel(channel);
    };
  }, [trackingCode, fetchTracking]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <SpinnerLoader size="md" text="Cargando pedido..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <XCircle className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">{error || 'No encontrado'}</p>
          <Button size="sm" variant="outline" onClick={onNewOrder}>
            Pedir algo más
          </Button>
        </div>
      </div>
    );
  }

  const { pedido, items, branch, timeline } = data;
  const isFinal = pedido.estado === 'entregado' || pedido.estado === 'cancelado';
  const estadoOrder = getEstadoOrder(pedido.tipo_servicio);
  const currentCfg = getEstadoConfig(pedido.estado, pedido.tipo_servicio);

  return (
    <>
      {/* Header */}
      <div className="px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-primary" />
          <h2 className="font-bold text-sm">Pedido #{pedido.numero_pedido}</h2>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {branch?.name} · {currentCfg.label}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Timeline */}
        <div className="space-y-0">
          {estadoOrder.map((estado, i) => {
            const timelineEntry = timeline.find((t) => t.estado === estado);
            const isPast = timeline.some((t) => t.estado === estado);
            const isCurrent = pedido.estado === estado;

            return (
              <div key={estado} className="flex items-start gap-2.5">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                      isPast
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    } ${isCurrent ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                  >
                    {isPast ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                  </div>
                  {i < estadoOrder.length - 1 && (
                    <div className={`w-0.5 h-5 ${isPast ? 'bg-primary' : 'bg-muted'}`} />
                  )}
                </div>
                <div className="pt-0.5">
                  <p
                    className={`text-xs font-medium ${isPast ? 'text-foreground' : 'text-muted-foreground'}`}
                  >
                    {getEstadoConfig(estado, pedido.tipo_servicio).label}
                  </p>
                  {timelineEntry?.timestamp && (
                    <p className="text-[10px] text-muted-foreground">
                      {formatTime(timelineEntry.timestamp)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {pedido.estado === 'cancelado' && (
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-full flex items-center justify-center bg-destructive text-destructive-foreground shrink-0">
                <XCircle className="w-3 h-3" />
              </div>
              <p className="text-xs font-medium text-destructive pt-0.5">Cancelado</p>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="rounded-lg border p-3 space-y-1.5">
          <h3 className="text-xs font-bold">Tu pedido</h3>
          {items.map((item, i) => (
            <div key={i} className="flex justify-between text-xs">
              <div className="min-w-0">
                <span className="text-muted-foreground">{item.cantidad}x </span>
                <span>{item.nombre}</span>
              </div>
              <span className="font-medium shrink-0 ml-2">{formatPrice(item.subtotal)}</span>
            </div>
          ))}
          <div className="border-t pt-1.5 mt-1.5 flex justify-between text-xs font-bold">
            <span>Total</span>
            <span>{formatPrice(pedido.total)}</span>
          </div>
        </div>

        {/* Chat */}
        <OrderChat
          trackingCode={trackingCode}
          pedidoId={pedido.id}
          branchName={branch?.name ?? 'Local'}
          clienteNombre={pedido.cliente_nombre ?? 'Cliente'}
          chatActive={!isFinal}
        />
      </div>

      {/* Footer */}
      <div className="border-t px-4 py-3 space-y-2">
        <Button variant="outline" size="sm" className="w-full" onClick={onNewOrder}>
          <ShoppingBag className="w-4 h-4 mr-1" />
          Pedir algo más
        </Button>
      </div>
    </>
  );
}

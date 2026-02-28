import { useEffect, useState, lazy, Suspense } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  subscribeToTrackingUpdates,
  subscribeToDeliveryTracking,
  unsubscribeChannel,
} from '@/services/webappOrderService';
import {
  CheckCircle2,
  Clock,
  Flame,
  Package,
  Truck,
  PartyPopper,
  XCircle,
  Send,
} from 'lucide-react';
import { SpinnerLoader } from '@/components/ui/loaders';
import { Button } from '@/components/ui/button';
import { SEO } from '@/components/SEO';
import { OrderChat } from '@/components/webapp/OrderChat';
import { PostPurchaseSignup } from '@/components/webapp/PostPurchaseSignup';
import { WebappHeader } from '@/components/webapp/WebappHeader';
import { formatPrice, formatTime } from '@/lib/formatters';

const DeliveryTrackingMap = lazy(() =>
  import('@/components/webapp/DeliveryTrackingMap').then((m) => ({
    default: m.DeliveryTrackingMap,
  })),
);

interface DeliveryTrackingData {
  active: boolean;
  cadete_lat: number | null;
  cadete_lng: number | null;
  store_lat: number | null;
  store_lng: number | null;
  dest_lat: number | null;
  dest_lng: number | null;
  completed: boolean;
}

interface TrackingData {
  pedido: {
    id: string;
    numero_pedido: number;
    estado: string;
    tipo_servicio: string | null;
    subtotal: number;
    costo_delivery: number | null;
    descuento: number | null;
    total: number;
    pago_estado: string | null;
    tiempo_prometido: string | null;
    created_at: string;
    cliente_nombre: string | null;
  };
  items: Array<{
    nombre: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
    notas: string | null;
    modificadores: Array<{ tipo: string; descripcion: string; precio_extra: number | null }>;
  }>;
  branch: {
    name: string;
    address: string | null;
    city: string | null;
    phone: string | null;
  } | null;
  timeline: Array<{ estado: string; timestamp: string | null }>;
  delivery_tracking: DeliveryTrackingData | null;
}

/** Returns the ordered list of timeline steps based on service type */
function getEstadoOrder(tipoServicio: string | null): string[] {
  if (tipoServicio === 'delivery') {
    return ['pendiente', 'confirmado', 'en_preparacion', 'listo', 'en_camino', 'entregado'];
  }
  // takeaway / comer_aca / default
  return ['pendiente', 'confirmado', 'en_preparacion', 'listo', 'entregado'];
}

/** Returns label + icon for each estado, adapting "listo" and "en_camino" based on service type */
function getEstadoConfig(
  estado: string,
  tipoServicio: string | null,
): { label: string; icon: React.ReactNode; color: string } {
  const isDelivery = tipoServicio === 'delivery';

  const map: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    pendiente: { label: 'Enviado', icon: <Send className="w-5 h-5" />, color: 'text-blue-500' },
    confirmado: {
      label: 'Aceptado',
      icon: <CheckCircle2 className="w-5 h-5" />,
      color: 'text-blue-600',
    },
    en_preparacion: {
      label: 'Preparando',
      icon: <Flame className="w-5 h-5" />,
      color: 'text-orange-500',
    },
    listo: {
      label: isDelivery
        ? 'Listo para enviar'
        : tipoServicio === 'comer_aca'
          ? 'Listo para consumir'
          : 'Listo para retirar',
      icon: <Package className="w-5 h-5" />,
      color: 'text-green-500',
    },
    en_camino: {
      label: 'En camino',
      icon: <Truck className="w-5 h-5" />,
      color: 'text-purple-500',
    },
    entregado: {
      label: 'Entregado',
      icon: <PartyPopper className="w-5 h-5" />,
      color: 'text-green-600',
    },
    cancelado: {
      label: 'Cancelado',
      icon: <XCircle className="w-5 h-5" />,
      color: 'text-destructive',
    },
  };

  return map[estado] ?? map.pendiente;
}

export default function TrackingPage() {
  const { trackingCode } = useParams<{ trackingCode: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTracking = async () => {
    if (!trackingCode) return;
    try {
      const baseUrl = import.meta.env.VITE_SUPABASE_URL;
      const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const url = `${baseUrl}/functions/v1/webapp-order-tracking?code=${trackingCode}`;
      const res = await fetch(url, {
        headers: { apikey: apiKey },
      });

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
  };

  useEffect(() => {
    fetchTracking();
  }, [trackingCode]);

  useEffect(() => {
    if (!trackingCode) return;
    const channel = subscribeToTrackingUpdates(
      trackingCode,
      `tracking-${trackingCode}`,
      () => fetchTracking(),
    );
    return () => {
      unsubscribeChannel(channel);
    };
  }, [trackingCode]);

  useEffect(() => {
    if (!data?.pedido?.id || !data?.delivery_tracking) return;

    const channel = subscribeToDeliveryTracking(
      data.pedido.id,
      `delivery-pos-${data.pedido.id}`,
      (payload: any) => {
          const row = payload.new;
          setData((prev) =>
            prev
              ? {
                  ...prev,
                  delivery_tracking: {
                    active: !!row.tracking_started_at && !row.tracking_completed_at,
                    cadete_lat: row.cadete_lat ? Number(row.cadete_lat) : null,
                    cadete_lng: row.cadete_lng ? Number(row.cadete_lng) : null,
                    store_lat: prev.delivery_tracking?.store_lat ?? null,
                    store_lng: prev.delivery_tracking?.store_lng ?? null,
                    dest_lat: prev.delivery_tracking?.dest_lat ?? null,
                    dest_lng: prev.delivery_tracking?.dest_lng ?? null,
                    completed: !!row.tracking_completed_at,
                  },
                }
              : prev,
          );
        },
    );

    return () => {
      unsubscribeChannel(channel);
    };
  }, [data?.pedido?.id, !!data?.delivery_tracking]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <SpinnerLoader size="lg" text="Cargando pedido..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-4 max-w-sm">
          <XCircle className="w-12 h-12 text-muted-foreground mx-auto" />
          <h1 className="text-xl font-bold">Pedido no encontrado</h1>
          <p className="text-muted-foreground text-sm">
            {error || 'Verificá el link e intentá de nuevo.'}
          </p>
          <Link to="/pedir">
            <Button>Hacer un pedido</Button>
          </Link>
        </div>
      </div>
    );
  }

  const { pedido, items, branch, timeline, delivery_tracking: dt } = data;
  const tipoServicio = pedido.tipo_servicio;
  const currentCfg = getEstadoConfig(pedido.estado, tipoServicio);
  const isFinal = pedido.estado === 'entregado' || pedido.estado === 'cancelado';
  const estadoOrder = getEstadoOrder(tipoServicio);

  const tiempoRestante = pedido.tiempo_prometido
    ? Math.max(0, Math.round((new Date(pedido.tiempo_prometido).getTime() - Date.now()) / 60_000))
    : null;

  return (
    <div className="min-h-screen bg-background">
      <WebappHeader title="Hoppiness" showBack onBack={() => navigate('/pedir')} />
      <SEO title={`Pedido #${pedido.numero_pedido} | Hoppiness`} path={`/pedido/${trackingCode}`} />

      {/* Header */}
      <div className="bg-primary text-primary-foreground px-5 pt-8 pb-6">
        <p className="text-sm opacity-80">{branch?.name ?? 'Hoppiness'}</p>
        <h1 className="text-2xl font-black mt-1">Pedido #{pedido.numero_pedido}</h1>
        <div
          className={`mt-3 flex items-center gap-2 ${currentCfg.color} bg-white/90 rounded-xl px-4 py-2.5 w-fit`}
        >
          {currentCfg.icon}
          <span className="font-bold text-sm">{currentCfg.label}</span>
        </div>
      </div>

      <div className="px-5 py-6 space-y-6 max-w-lg mx-auto">
        {/* Estimated time */}
        {!isFinal && tiempoRestante !== null && (
          <div className="bg-accent/10 rounded-xl p-4 text-center">
            <p className="text-sm text-muted-foreground">Tiempo estimado</p>
            <p className="text-2xl font-black text-accent mt-1">
              {tiempoRestante > 0 ? `~${tiempoRestante} min` : 'En cualquier momento'}
            </p>
          </div>
        )}

        {/* Delivery tracking map */}
        {dt &&
          dt.active &&
          dt.store_lat != null &&
          dt.store_lng != null &&
          dt.dest_lat != null &&
          dt.dest_lng != null && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Truck className="w-4 h-4" /> Seguí tu pedido en vivo
              </h3>
              <Suspense fallback={<div className="h-[280px] rounded-xl bg-muted animate-pulse" />}>
                <DeliveryTrackingMap
                  storeLat={Number(dt.store_lat)}
                  storeLng={Number(dt.store_lng)}
                  destLat={Number(dt.dest_lat)}
                  destLng={Number(dt.dest_lng)}
                  cadeteLat={dt.cadete_lat != null ? Number(dt.cadete_lat) : null}
                  cadeteLng={dt.cadete_lng != null ? Number(dt.cadete_lng) : null}
                  trackingActive={dt.active}
                  branchName={branch?.name}
                />
              </Suspense>
            </div>
          )}

        {dt && dt.completed && (
          <div className="bg-green-50 dark:bg-green-950/30 rounded-xl p-4 text-center">
            <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-green-700 dark:text-green-400">
              Tu pedido fue entregado
            </p>
          </div>
        )}

        {/* Timeline */}
        <div className="space-y-1">
          {estadoOrder.map((estado, i) => {
            const timelineEntry = timeline.find((t) => t.estado === estado);
            const isPast = timeline.some((t) => t.estado === estado);
            const isCurrent = pedido.estado === estado;
            const cfg = getEstadoConfig(estado, tipoServicio);

            return (
              <div key={estado} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      isPast
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    } ${isCurrent ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                  >
                    {isPast ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </div>
                  {i < estadoOrder.length - 1 && (
                    <div className={`w-0.5 h-8 ${isPast ? 'bg-primary' : 'bg-muted'}`} />
                  )}
                </div>
                <div className="pt-1">
                  <p
                    className={`text-sm font-semibold ${isPast ? 'text-foreground' : 'text-muted-foreground'}`}
                  >
                    {cfg.label}
                  </p>
                  {timelineEntry?.timestamp && (
                    <p className="text-xs text-muted-foreground">
                      {formatTime(timelineEntry.timestamp)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {pedido.estado === 'cancelado' && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-destructive text-destructive-foreground shrink-0">
                <XCircle className="w-4 h-4" />
              </div>
              <div className="pt-1">
                <p className="text-sm font-semibold text-destructive">Cancelado</p>
              </div>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="space-y-2 rounded-xl border p-4">
          <h3 className="text-sm font-bold">Tu pedido</h3>
          {items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm py-1">
              <div className="flex-1 min-w-0">
                <span className="text-muted-foreground">{item.cantidad}x </span>
                <span>{item.nombre}</span>
                {item.modificadores.length > 0 && (
                  <p className="text-xs text-muted-foreground ml-4">
                    {item.modificadores
                      .map((m) =>
                        m.tipo === 'extra' ? `+ ${m.descripcion}` : `Sin ${m.descripcion}`,
                      )
                      .join(', ')}
                  </p>
                )}
              </div>
              <span className="font-medium shrink-0 ml-2">{formatPrice(item.subtotal)}</span>
            </div>
          ))}
          <div className="border-t pt-2 mt-2 space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatPrice(pedido.subtotal)}</span>
            </div>
            {(pedido.costo_delivery ?? 0) > 0 && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Envío</span>
                <span>{formatPrice(pedido.costo_delivery!)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold pt-1">
              <span>Total</span>
              <span>{formatPrice(pedido.total)}</span>
            </div>
          </div>
        </div>

        {/* Branch info */}
        {branch && (
          <div className="rounded-xl border p-4 space-y-1">
            <h3 className="text-sm font-bold">{branch.name}</h3>
            {branch.address && (
              <p className="text-xs text-muted-foreground">
                {branch.address}
                {branch.city ? `, ${branch.city}` : ''}
              </p>
            )}
          </div>
        )}

        {/* Chat */}
        <OrderChat
          trackingCode={trackingCode!}
          pedidoId={pedido.id}
          branchName={branch?.name ?? 'Local'}
          clienteNombre={pedido.cliente_nombre ?? 'Cliente'}
          chatActive={!isFinal}
        />

        {/* Post-purchase signup for guests */}
        <PostPurchaseSignup trackingCode={trackingCode!} />

        {/* Actions */}
        <div className="space-y-2">
          <Link to="/pedir" className="block">
            <Button variant="ghost" className="w-full text-muted-foreground">
              Volver al menú
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

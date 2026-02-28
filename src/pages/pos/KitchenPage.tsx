/**
 * KitchenPage - KDS Profesional (Kitchen Display System)
 *
 * Features:
 * - Modo fullscreen oscuro profesional
 * - Flujo solo-avance (tap to advance, long-press to undo)
 * - Timer de urgencia por pedido
 * - Jerarquía visual de modificadores (SIN rojo, EXTRA naranja, CAMBIO azul)
 * - Auto-limpieza de pedidos listos (fade 3min, remove 5min)
 * - Barra de métricas en vivo
 * - Selector de estación (localStorage)
 * - Responsive: columnas desktop, tabs mobile
 */
import { useParams } from 'react-router-dom';
import {
  ChefHat,
  Maximize2,
  Minimize2,
  Check,
  Clock,
  UtensilsCrossed,
  ShoppingBag,
  Truck,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/states/empty-state';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchBranchName, updatePedidoEstado } from '@/services/posService';
import { toast } from 'sonner';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useKitchen, type KitchenPedido, type KitchenItem } from '@/hooks/pos/useKitchen';
import { useKitchenStations } from '@/hooks/useKitchenStations';
import { cn } from '@/lib/utils';
import { usePrintConfig } from '@/hooks/usePrintConfig';
import { useBranchPrinters } from '@/hooks/useBranchPrinters';
import { useAfipConfig } from '@/hooks/useAfipConfig';
import {
  printReadyTicketByPedidoId,
  printDeliveryTicketByPedidoId,
  extractErrorMessage,
} from '@/lib/ready-ticket';

// ─── Constants ──────────────────────────────────────────────
const REMOVE_AFTER_MS = 5 * 60 * 1000; // 5 minutes
const OVERDUE_MINUTES = 10;

// ─── Timer Component ────────────────────────────────────────
function KdsTimer({ createdAt, isKds }: { createdAt: string; isKds: boolean }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(createdAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const urgency = minutes < 5 ? 'ok' : minutes < OVERDUE_MINUTES ? 'warn' : 'urgent';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-mono font-bold rounded-full px-2.5 py-1',
        isKds ? 'text-base' : 'text-xs',
        urgency === 'ok' && 'bg-emerald-500/20 text-emerald-400',
        urgency === 'warn' && 'bg-amber-500/20 text-amber-400',
        urgency === 'urgent' && 'bg-red-500/20 text-red-400 animate-pulse',
      )}
    >
      <Clock className={isKds ? 'w-4 h-4' : 'w-3 h-3'} />
      {minutes}:{seconds.toString().padStart(2, '0')}
    </span>
  );
}

// ─── Service Icon ───────────────────────────────────────────
function ServiceIcon({ tipo }: { tipo: string | null }) {
  switch (tipo) {
    case 'comer_aca':
      return <UtensilsCrossed className="w-4 h-4" />;
    case 'delivery':
      return <Truck className="w-4 h-4" />;
    default:
      return <ShoppingBag className="w-4 h-4" />;
  }
}

function serviceLabel(tipo: string | null) {
  switch (tipo) {
    case 'comer_aca':
      return 'Salón';
    case 'delivery':
      return 'Delivery';
    default:
      return 'Takeaway';
  }
}

// ─── Modifier styling ───────────────────────────────────────
function ModifierLine({ tipo, descripcion }: { tipo: string; descripcion: string }) {
  if (tipo === 'sin') {
    return <div className="text-red-400 font-bold uppercase text-sm">🚫 SIN {descripcion}</div>;
  }
  if (tipo === 'extra') {
    return <div className="text-orange-400 font-semibold text-sm">➕ {descripcion}</div>;
  }
  return <div className="text-blue-400 text-sm">🔄 {descripcion}</div>;
}

// ─── Item Row (display only, no individual interaction) ─────
function KdsItemRow({ item, isKds }: { item: KitchenItem; isKds: boolean }) {
  return (
    <div
      className={cn(
        'w-full flex items-start gap-3 p-3 rounded-lg text-left border',
        isKds ? 'min-h-[56px]' : 'min-h-[48px]',
        'border-zinc-700 bg-zinc-900/50',
      )}
    >
      <div className="flex-1 min-w-0">
        <div className={cn('font-bold text-zinc-100', isKds ? 'text-lg' : 'text-base')}>
          {item.cantidad}× {item.nombre || 'Producto'}
        </div>

        {item.pedido_item_modificadores?.length > 0 && (
          <div className="mt-1 space-y-0.5">
            {item.pedido_item_modificadores.map((mod) => (
              <ModifierLine key={mod.id} tipo={mod.tipo} descripcion={mod.descripcion} />
            ))}
          </div>
        )}

        {item.notas && (
          <div className="mt-1 text-sm bg-amber-900/40 text-amber-200 rounded px-2 py-1 italic">
            {item.notas}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Order Card ─────────────────────────────────────────────
function KdsOrderCard({
  pedido,
  onPedidoAction,
  isKds,
  fadingOut,
}: {
  pedido: KitchenPedido;
  onPedidoAction: (pedidoId: string, action: string) => void;
  isKds: boolean;
  fadingOut: boolean;
}) {
  const isPendiente = pedido.estado === 'pendiente';
  const isEnPrep = pedido.estado === 'en_preparacion';
  const isListo = pedido.estado === 'listo';

  const elapsed = Math.floor((Date.now() - new Date(pedido.created_at).getTime()) / 1000 / 60);
  const urgencyBorder =
    elapsed < 5
      ? 'border-emerald-600'
      : elapsed < OVERDUE_MINUTES
        ? 'border-amber-600'
        : 'border-red-600';

  return (
    <div
      className={cn(
        'rounded-xl border-2 overflow-hidden bg-zinc-900 transition-opacity duration-1000',
        urgencyBorder,
        fadingOut && 'opacity-30',
        isListo && 'opacity-50',
      )}
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between bg-zinc-800/60">
        <div className="flex items-center gap-3">
          <span className={cn('font-black text-zinc-100', isKds ? 'text-3xl' : 'text-2xl')}>
            #{pedido.numero_pedido}
          </span>
          <Badge variant="secondary" className="gap-1 text-xs bg-zinc-700 text-zinc-200 border-0">
            <ServiceIcon tipo={pedido.tipo_servicio} />
            {serviceLabel(pedido.tipo_servicio)}
          </Badge>
        </div>
        <KdsTimer createdAt={pedido.created_at} isKds={isKds} />
      </div>

      {/* Llamador / Cliente */}
      {(pedido.numero_llamador || pedido.cliente_nombre) && (
        <div className="px-4 py-2 border-b border-zinc-800 text-sm text-zinc-400 flex gap-3">
          {pedido.numero_llamador && (
            <span className="font-semibold text-zinc-200">#{pedido.numero_llamador}</span>
          )}
          {pedido.cliente_nombre && <span>{pedido.cliente_nombre}</span>}
        </div>
      )}

      {/* Items (display only) */}
      <div className="p-3 space-y-2">
        {pedido.pedido_items.map((item) => (
          <KdsItemRow key={item.id} item={item} isKds={isKds} />
        ))}
      </div>

      {/* Action Footer — order-level only */}
      <div className="p-3 pt-0">
        {isPendiente && (
          <Button
            className="w-full h-14 text-lg font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => onPedidoAction(pedido.id, 'en_preparacion')}
          >
            EMPEZAR PREPARACIÓN
          </Button>
        )}

        {isEnPrep && (
          <Button
            className="w-full h-14 text-lg font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => onPedidoAction(pedido.id, 'listo')}
          >
            <Check className="w-5 h-5 mr-2" />
            PEDIDO LISTO - DESPACHAR
          </Button>
        )}

        {isListo && (
          <Button
            className="w-full h-12 font-bold bg-zinc-700 hover:bg-zinc-600 text-zinc-200"
            onClick={() => onPedidoAction(pedido.id, 'entregado')}
          >
            ENTREGADO ✓
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Column ─────────────────────────────────────────────────
function KdsColumn({
  title,
  pedidos,
  count,
  colorClass,
  onPedidoAction,
  isKds,
}: {
  title: string;
  pedidos: KitchenPedido[];
  count: number;
  colorClass: string;
  onPedidoAction: (pedidoId: string, action: string) => void;
  isKds: boolean;
}) {
  return (
    <div className="flex flex-col min-h-0">
      <div
        className={cn('rounded-lg px-3 py-2 mb-3 flex items-center justify-between', colorClass)}
      >
        <span className="font-bold text-sm">{title}</span>
        <Badge variant="secondary" className="text-xs bg-zinc-800 text-zinc-200 border-0">
          {count}
        </Badge>
      </div>
      <div className="space-y-3 overflow-y-auto flex-1 pb-4 scrollbar-thin">
        {pedidos.map((p) => (
          <KdsOrderCard
            key={p.id}
            pedido={p}
            onPedidoAction={onPedidoAction}
            isKds={isKds}
            fadingOut={false}
          />
        ))}
        {pedidos.length === 0 && (
          <p className="text-sm text-zinc-500 text-center py-8">Sin pedidos</p>
        )}
      </div>
    </div>
  );
}

// ─── Metrics Bar ────────────────────────────────────────────
function MetricsBar({ pedidos }: { pedidos: KitchenPedido[] }) {
  const activos = pedidos.filter((p) => p.estado !== 'listo' && p.estado !== 'entregado');
  const now = Date.now();

  const avgMinutes =
    activos.length > 0
      ? Math.round(
          activos.reduce((sum, p) => sum + (now - new Date(p.created_at).getTime()) / 60000, 0) /
            activos.length,
        )
      : 0;

  const overdue = activos.filter(
    (p) => (now - new Date(p.created_at).getTime()) / 60000 > OVERDUE_MINUTES,
  ).length;

  return (
    <div className="flex items-center gap-4 text-xs text-zinc-400">
      <span className="font-semibold text-zinc-200">
        {activos.length} activo{activos.length !== 1 ? 's' : ''}
      </span>
      <span>⏱ Prom: {avgMinutes}min</span>
      {overdue > 0 && (
        <span className="text-red-400 font-semibold animate-pulse">
          ⚠️ {overdue} atrasado{overdue !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────
export default function KitchenPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const qc = useQueryClient();
  const isMobile = useIsMobile();
  const { data: pedidos, isLoading, consumeNewOrderAlert } = useKitchen(branchId!);
  const { data: _stations } = useKitchenStations(branchId!);
  const { data: printConfig } = usePrintConfig(branchId!);
  const { data: printersData } = useBranchPrinters(branchId!);
  const { data: afipConfig } = useAfipConfig(branchId);
  const allPrinters = printersData ?? [];
  const { data: branchInfo } = useQuery({
    queryKey: ['branch-name', branchId],
    queryFn: () => fetchBranchName(branchId!),
    enabled: !!branchId,
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isKdsMode, setIsKdsMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Sound
  useEffect(() => {
    audioRef.current = new Audio('/sounds/notification.mp3');
    audioRef.current.volume = 0.7;
  }, []);

  useEffect(() => {
    if (consumeNewOrderAlert() && soundEnabled) {
      audioRef.current?.play().catch(() => {});
      toast('🔔 Nuevo pedido!', { duration: 3000 });
    }
  }, [pedidos, consumeNewOrderAlert, soundEnabled]);

  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsKdsMode(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsKdsMode(false);
    }
  }, []);

  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) setIsKdsMode(false);
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Mutations
  const updatePedidoEstadoMutation = useMutation({
    mutationFn: async ({ pedidoId, estado }: { pedidoId: string; estado: string }) => {
      await updatePedidoEstado(pedidoId, estado);
    },
    onSuccess: async (_, { pedidoId, estado }) => {
      qc.invalidateQueries({ queryKey: ['pos-kitchen', branchId] });
      if (estado === 'listo') toast.success('Pedido marcado como listo');
      if (estado === 'entregado') toast.success('Pedido entregado');

      if (estado === 'listo' && branchId) {
        const pedido = pedidos?.find((p) => p.id === pedidoId);
        const isDelivery = pedido?.tipo_servicio === 'delivery' || pedido?.canal_venta === 'apps';

        // Delivery ticket: always print when delivery/apps order is ready
        if (isDelivery) {
          try {
            await printDeliveryTicketByPedidoId({
              branchId,
              pedidoId,
              branchName: branchInfo?.name || 'Hoppiness',
              printConfig,
              printers: allPrinters,
            });
            toast.success('Ticket delivery impreso');
          } catch (err) {
            console.error('[KitchenPage] delivery ticket error:', err);
            toast.error('Error al imprimir ticket delivery', {
              description: extractErrorMessage(err),
            });
          }
        }

        // Client ticket: only when configured to print on_ready
        if (printConfig?.ticket_trigger === 'on_ready') {
          try {
            await printReadyTicketByPedidoId({
              branchId,
              pedidoId,
              branchName: branchInfo?.name || 'Hoppiness',
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
            console.error('[KitchenPage] on_ready ticket error:', err);
            toast.error('Error al imprimir ticket on_ready', {
              description: extractErrorMessage(err),
            });
          }
        }
      }
    },
  });

  const handlePedidoAction = useCallback(
    (pedidoId: string, action: string) => {
      updatePedidoEstadoMutation.mutate({ pedidoId, estado: action });
    },
    [updatePedidoEstadoMutation],
  );

  // Tick every 30s so that listo auto-expire and urgency borders update
  const [_tick, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(iv);
  }, []);

  const visiblePedidos = useMemo(() => {
    if (!pedidos) return [];
    const now = Date.now();
    return pedidos.filter((p) => {
      if (p.estado === 'listo' && p.tiempo_listo) {
        const listoTime = new Date(p.tiempo_listo).getTime();
        return now - listoTime < REMOVE_AFTER_MS;
      }
      if (p.estado === 'entregado') return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidos, _tick]);

  const { pendientes, enPreparacion, listos } = useMemo(
    () => ({
      pendientes: visiblePedidos.filter((p) => p.estado === 'pendiente'),
      enPreparacion: visiblePedidos.filter((p) => p.estado === 'en_preparacion'),
      listos: visiblePedidos.filter((p) => p.estado === 'listo'),
    }),
    [visiblePedidos],
  );

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const isEmpty = visiblePedidos.length === 0;

  // KDS fullscreen wrapper
  const content = (
    <div
      className={cn('flex flex-col h-full', isKdsMode && 'fixed inset-0 z-[100] bg-[#1C1C1E] p-4')}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <ChefHat className={cn('text-zinc-400', isKdsMode ? 'w-7 h-7' : 'w-5 h-5')} />
          <h1 className={cn('font-black text-zinc-100', isKdsMode ? 'text-2xl' : 'text-xl')}>
            Cocina
          </h1>
          {!isEmpty && <MetricsBar pedidos={visiblePedidos} />}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="text-zinc-400 hover:text-zinc-200"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="text-zinc-400 hover:text-zinc-200"
          >
            {isKdsMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span className="ml-1 text-xs">{isKdsMode ? 'Salir' : 'Modo KDS'}</span>
          </Button>
        </div>
      </div>

      {isEmpty ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={ChefHat}
            title="Todo en orden 👨‍🍳"
            description="No hay pedidos pendientes. Cuando llegue uno nuevo, aparecerá aquí automáticamente con una alerta sonora."
          />
        </div>
      ) : isMobile && !isKdsMode ? (
        <Tabs defaultValue="pendientes" className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full grid grid-cols-3 bg-zinc-800">
            <TabsTrigger
              value="pendientes"
              className="data-[state=active]:bg-red-900/40 data-[state=active]:text-red-300"
            >
              Pendientes {pendientes.length > 0 && `(${pendientes.length})`}
            </TabsTrigger>
            <TabsTrigger
              value="preparacion"
              className="data-[state=active]:bg-amber-900/40 data-[state=active]:text-amber-300"
            >
              Prep {enPreparacion.length > 0 && `(${enPreparacion.length})`}
            </TabsTrigger>
            <TabsTrigger
              value="listos"
              className="data-[state=active]:bg-emerald-900/40 data-[state=active]:text-emerald-300"
            >
              Listos {listos.length > 0 && `(${listos.length})`}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="pendientes" className="flex-1 overflow-y-auto space-y-3 mt-3">
            {pendientes.map((p) => (
              <KdsOrderCard
                key={p.id}
                pedido={p}
                onPedidoAction={handlePedidoAction}
                isKds={isKdsMode}
                fadingOut={false}
              />
            ))}
            {pendientes.length === 0 && (
              <p className="text-center text-zinc-500 py-8">Sin pendientes</p>
            )}
          </TabsContent>
          <TabsContent value="preparacion" className="flex-1 overflow-y-auto space-y-3 mt-3">
            {enPreparacion.map((p) => (
              <KdsOrderCard
                key={p.id}
                pedido={p}
                onPedidoAction={handlePedidoAction}
                isKds={isKdsMode}
                fadingOut={false}
              />
            ))}
            {enPreparacion.length === 0 && (
              <p className="text-center text-zinc-500 py-8">Nada en preparación</p>
            )}
          </TabsContent>
          <TabsContent value="listos" className="flex-1 overflow-y-auto space-y-3 mt-3">
            {listos.map((p) => (
              <KdsOrderCard
                key={p.id}
                pedido={p}
                onPedidoAction={handlePedidoAction}
                isKds={isKdsMode}
                fadingOut={false}
              />
            ))}
            {listos.length === 0 && (
              <p className="text-center text-zinc-500 py-8">Sin pedidos listos</p>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="grid grid-cols-3 gap-4 flex-1 min-h-0">
          <KdsColumn
            title="🔴 Pendientes"
            pedidos={pendientes}
            count={pendientes.length}
            colorClass="bg-red-900/30 text-red-300"
            onPedidoAction={handlePedidoAction}
            isKds={isKdsMode}
          />
          <KdsColumn
            title="🟡 En preparación"
            pedidos={enPreparacion}
            count={enPreparacion.length}
            colorClass="bg-amber-900/30 text-amber-300"
            onPedidoAction={handlePedidoAction}
            isKds={isKdsMode}
          />
          <KdsColumn
            title="🟢 Listos"
            pedidos={listos}
            count={listos.length}
            colorClass="bg-emerald-900/30 text-emerald-300"
            onPedidoAction={handlePedidoAction}
            isKds={isKdsMode}
          />
        </div>
      )}
    </div>
  );

  // When NOT in KDS mode, wrap with dark background inline
  return (
    <div className={cn('h-full rounded-lg', !isKdsMode && 'bg-[#1C1C1E] text-zinc-100 p-2')}>
      {content}
    </div>
  );
}

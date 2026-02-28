/**
 * PendingOrdersBar - Pedidos Mostrador (origen !== 'webapp')
 * Muestra pedidos pendiente/en_preparacion/listo con acciones de cambio de estado.
 * Diseño: Card con expand/collapse + zona scrollable horizontal de chips agrupados por estado.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchBranchName,
  fetchMenuCategoriesByName,
  fetchShiftPedidoIds,
  fetchItemQuantitiesByCategories,
  updatePedidoEstado,
} from '@/services/posService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, ChefHat, CheckCircle, ShoppingBag, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import type { KitchenPedido } from '@/hooks/pos/useKitchen';
import { cn } from '@/lib/utils';
import { usePrintConfig } from '@/hooks/usePrintConfig';
import { useBranchPrinters } from '@/hooks/useBranchPrinters';
import { useAfipConfig } from '@/hooks/useAfipConfig';
import {
  printReadyTicketByPedidoId,
  printDeliveryTicketByPedidoId,
  extractErrorMessage,
} from '@/lib/ready-ticket';
import { sendOrderPushNotification } from '@/utils/orderPush';

interface Props {
  pedidos: KitchenPedido[];
  branchId: string;
  shiftOpenedAt: string | null;
}

const ESTADO_CONFIG: Record<
  string,
  {
    label: string;
    color: string;
    chipBg: string;
    icon: typeof Clock;
    next: string;
    nextLabel: string;
  }
> = {
  pendiente: {
    label: 'Pendiente',
    color: 'bg-warning/15 text-warning border-warning/30',
    chipBg: 'bg-warning/10 text-warning-foreground border-warning/30 hover:bg-warning/20',
    icon: Clock,
    next: 'en_preparacion',
    nextLabel: 'Preparar',
  },
  confirmado: {
    label: 'Pendiente',
    color: 'bg-warning/15 text-warning border-warning/30',
    chipBg: 'bg-warning/10 text-warning-foreground border-warning/30 hover:bg-warning/20',
    icon: Clock,
    next: 'en_preparacion',
    nextLabel: 'Preparar',
  },
  en_preparacion: {
    label: 'Preparando',
    color: 'bg-info/15 text-info border-info/30',
    chipBg: 'bg-info/10 text-info-foreground border-info/30 hover:bg-info/20',
    icon: ChefHat,
    next: 'listo',
    nextLabel: 'Listo',
  },
  listo: {
    label: 'Listo',
    color: 'bg-success/15 text-success border-success/30',
    chipBg: 'bg-success/10 text-success-foreground border-success/30 hover:bg-success/20',
    icon: CheckCircle,
    next: 'entregado',
    nextLabel: 'Entregar',
  },
};

function getElapsedMin(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
}

function serviceIcon(tipo: string | null) {
  switch (tipo) {
    case 'delivery':
      return '🛵';
    case 'comer_aca':
      return '🍽️';
    default:
      return '🛍️';
  }
}

function useHamburguesasCount(branchId: string, shiftOpenedAt: string | null) {
  return useQuery({
    queryKey: ['shift-hamburguesas', branchId, shiftOpenedAt],
    queryFn: async () => {
      if (!shiftOpenedAt) return 0;
      const cats = await fetchMenuCategoriesByName('%hamburguesa%');
      const catIds = cats.map((c) => c.id);
      if (catIds.length === 0) return 0;
      const pedidoIds = await fetchShiftPedidoIds(branchId, shiftOpenedAt);
      if (pedidoIds.length === 0) return 0;
      const items = await fetchItemQuantitiesByCategories(catIds, pedidoIds);
      if (items.length === 0) return 0;
      return items.reduce((sum, i) => sum + (i.cantidad ?? 0), 0);
    },
    enabled: !!branchId && !!shiftOpenedAt,
    refetchInterval: 30000,
  });
}

/* ── Scroll indicators hook ── */
function useScrollIndicators(ref: React.RefObject<HTMLDivElement | null>) {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const check = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, [ref]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    check();
    el.addEventListener('scroll', check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', check);
      ro.disconnect();
    };
  }, [ref, check]);

  return { canScrollLeft, canScrollRight, check };
}

export function PendingOrdersBar({ pedidos, branchId, shiftOpenedAt }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { canScrollLeft, canScrollRight } = useScrollIndicators(scrollRef);
  const qc = useQueryClient();
  const { data: printConfig } = usePrintConfig(branchId);
  const { data: printersData } = useBranchPrinters(branchId);
  const { data: afipConfig } = useAfipConfig(branchId);
  const allPrinters = printersData ?? [];
  const { data: branchInfo } = useQuery({
    queryKey: ['branch-name', branchId],
    queryFn: () => fetchBranchName(branchId),
    enabled: !!branchId,
  });

  const { data: hamburguesasCount = 0 } = useHamburguesasCount(branchId, shiftOpenedAt);

  const updateEstado = useMutation({
    mutationFn: async ({ pedidoId, estado }: { pedidoId: string; estado: string }) => {
      await updatePedidoEstado(pedidoId, estado);
    },
    onSuccess: async (_, { pedidoId, estado }) => {
      qc.invalidateQueries({ queryKey: ['pos-kitchen', branchId] });
      qc.invalidateQueries({ queryKey: ['shift-hamburguesas', branchId] });
      if (estado === 'listo') toast.success('Pedido marcado como listo');
      if (estado === 'entregado') toast.success('Pedido entregado');
      setSelectedId(null);

      const pedido = pedidos.find((p) => p.id === pedidoId);
      if (pedido) {
        sendOrderPushNotification({
          pedidoId,
          estado,
          numeroPedido: pedido.numero_pedido,
          clienteUserId: pedido.cliente_user_id,
        });
      }

      if (estado === 'listo') {
        const pedido = pedidos.find((p) => p.id === pedidoId);
        const isDelivery = pedido?.tipo_servicio === 'delivery' || pedido?.canal_venta === 'apps';
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
            console.error('[PendingOrdersBar] delivery ticket error:', err);
            toast.error('Error al imprimir ticket delivery', {
              description: extractErrorMessage(err),
            });
          }
        }
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
            console.error('[PendingOrdersBar] on_ready ticket error:', err);
            toast.error('Error al imprimir ticket on_ready', {
              description: extractErrorMessage(err),
            });
          }
        }
      }
    },
    onError: () => toast.error('Error al actualizar estado'),
  });

  const handleAdvance = useCallback(
    (pedidoId: string, nextEstado: string) => {
      updateEstado.mutate({ pedidoId, estado: nextEstado });
    },
    [updateEstado],
  );

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' });
  };

  const pendientes = pedidos.filter((p) => p.estado === 'pendiente');
  const preparando = pedidos.filter((p) => p.estado === 'en_preparacion');
  const listos = pedidos.filter((p) => p.estado === 'listo');

  const groups = [
    { key: 'pendiente', items: pendientes, config: ESTADO_CONFIG.pendiente },
    { key: 'en_preparacion', items: preparando, config: ESTADO_CONFIG.en_preparacion },
    { key: 'listo', items: listos, config: ESTADO_CONFIG.listo },
  ].filter((g) => g.items.length > 0);

  // Auto-expand when there are active orders
  useEffect(() => {
    if (pedidos.length > 0 && !expanded) {
      setExpanded(true);
    }
  }, [pedidos.length]);

  return (
    <Card className="mx-4 mt-2">
      <CardHeader className="pb-2 py-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" />
            Pedidos Mostrador
            <div className="flex gap-1.5 items-center">
              {pendientes.length > 0 && (
                <Badge
                  variant="outline"
                  className={cn('text-xs font-medium', ESTADO_CONFIG.pendiente.color)}
                >
                  {pendientes.length} pendiente{pendientes.length > 1 ? 's' : ''}
                </Badge>
              )}
              {preparando.length > 0 && (
                <Badge
                  variant="outline"
                  className={cn('text-xs font-medium', ESTADO_CONFIG.en_preparacion.color)}
                >
                  {preparando.length} preparando
                </Badge>
              )}
              {listos.length > 0 && (
                <Badge
                  variant="outline"
                  className={cn('text-xs font-medium', ESTADO_CONFIG.listo.color)}
                >
                  {listos.length} listo{listos.length > 1 ? 's' : ''}
                </Badge>
              )}
              {pedidos.length === 0 && (
                <span className="text-xs text-muted-foreground">Sin pedidos activos</span>
              )}
            </div>
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm font-semibold tabular-nums whitespace-nowrap">
              <span>🍔</span>
              <span>{hamburguesasCount}</span>
            </div>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
              {expanded ? 'Ocultar' : 'Mostrar'}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && pedidos.length > 0 && (
        <CardContent className="pt-0 pb-2">
          <div className="relative flex items-center">
            {canScrollLeft && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  scroll('left');
                }}
                className="absolute left-0 z-10 h-full w-8 flex items-center justify-center bg-gradient-to-r from-background to-transparent"
                aria-label="Scroll izquierda"
              >
                <ChevronLeft className="h-4 w-4 text-muted-foreground" />
              </button>
            )}

            <div
              ref={scrollRef}
              className="flex-1 overflow-x-auto flex items-stretch gap-4"
              style={{ scrollbarWidth: 'none' }}
            >
              {groups.map((group) => (
                <div key={group.key} className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={cn(
                      'text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0',
                      group.config.color,
                    )}
                  >
                    {group.config.label}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {group.items.map((pedido) => {
                      const config = ESTADO_CONFIG[pedido.estado]!;
                      const mins = getElapsedMin(pedido.created_at);
                      const isSelected = selectedId === pedido.id;
                      const isUrgent = pedido.estado === 'pendiente' && mins >= 10;

                      return (
                        <div key={pedido.id} className="flex items-center gap-1 shrink-0">
                          <button
                            className={cn(
                              'flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all whitespace-nowrap',
                              config.chipBg,
                              isUrgent && 'ring-2 ring-destructive/60 animate-pulse',
                              isSelected && 'ring-2 ring-primary shadow-soft',
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedId(isSelected ? null : pedido.id);
                            }}
                          >
                            <span className="text-xs">{serviceIcon(pedido.tipo_servicio)}</span>
                            <span className="font-bold tabular-nums">
                              #{String(pedido.numero_pedido).slice(-3)}
                            </span>
                            <span className="text-xs tabular-nums opacity-70 flex items-center gap-0.5">
                              <Clock className="h-3 w-3" />
                              {mins}m
                            </span>
                          </button>

                          {isSelected && (
                            <Button
                              size="sm"
                              className="h-8 text-xs shrink-0 animate-fade-in"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAdvance(pedido.id, config.next);
                              }}
                              disabled={updateEstado.isPending}
                            >
                              {config.nextLabel}
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="w-px h-6 bg-border/50 ml-2 shrink-0 last:hidden" />
                </div>
              ))}
            </div>

            {canScrollRight && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  scroll('right');
                }}
                className="absolute right-0 z-10 h-full w-8 flex items-center justify-center bg-gradient-to-l from-background to-transparent"
                aria-label="Scroll derecha"
              >
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

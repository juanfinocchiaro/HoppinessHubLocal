/**
 * MisPedidosSheet — Inline order history sheet for the webapp store.
 * Opens as a Sheet on mobile. Shows active + past orders with tracking & reorder actions.
 */
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { fetchUserOrders, fetchBranchNamesAndSlugs } from '@/services/webappOrderService';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Eye, RotateCcw, ShoppingBag, Package } from 'lucide-react';
import { SpinnerLoader } from '@/components/ui/loaders';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const estadoLabels: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  pendiente: { label: 'Pendiente', variant: 'outline' },
  confirmado: { label: 'Confirmado', variant: 'secondary' },
  en_preparacion: { label: 'Preparando', variant: 'default' },
  listo: { label: 'Listo', variant: 'default' },
  en_camino: { label: 'En camino', variant: 'default' },
  entregado: { label: 'Entregado', variant: 'secondary' },
  cancelado: { label: 'Cancelado', variant: 'destructive' },
  rechazado: { label: 'Rechazado', variant: 'destructive' },
};

const activeStates = ['pendiente', 'confirmado', 'en_preparacion', 'listo', 'en_camino'];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShowTracking: (trackingCode: string) => void;
  currentBranchSlug?: string;
}

export function MisPedidosSheet({ open, onOpenChange, onShowTracking, currentBranchSlug }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['my-orders-sheet', user?.id],
    queryFn: () => fetchUserOrders(user!.id, 30),
    enabled: !!user && open,
  });

  const branchIds = [...new Set((orders || []).map((o: any) => o.branch_id).filter(Boolean))] as string[];
  const { data: branches } = useQuery({
    queryKey: ['branches-names-slugs-sheet', branchIds],
    queryFn: () => fetchBranchNamesAndSlugs(branchIds),
    enabled: branchIds.length > 0,
  });

  const handleTrack = (trackingCode: string) => {
    onOpenChange(false);
    // Small delay so sheet closes before tracking opens
    setTimeout(() => onShowTracking(trackingCode), 150);
  };

  const handleReorder = (order: any) => {
    const branchInfo = branches?.[order.branch_id];
    if (!branchInfo?.slug) return;
    const items = order.pedido_items || [];
    const reorderItems = items.map((i: any) => ({
      cartId: crypto.randomUUID(),
      itemId: '',
      nombre: i.nombre,
      imagen_url: null,
      precioUnitario: i.precio_unitario ?? 0,
      cantidad: i.cantidad,
      extras: [],
      removidos: [],
      notas: '',
    }));
    localStorage.setItem('hoppiness_reorder', JSON.stringify(reorderItems));
    onOpenChange(false);
    // If same branch, just reload; otherwise navigate
    if (branchInfo.slug === currentBranchSlug) {
      window.location.reload();
    } else {
      navigate(`/pedir/${branchInfo.slug}`);
    }
  };

  const activeOrders = (orders || []).filter((o) => activeStates.includes(o.estado));
  const pastOrders = (orders || []).filter((o) => !activeStates.includes(o.estado));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl px-0 flex flex-col">
        <SheetHeader className="px-5 pb-3 border-b shrink-0">
          <SheetTitle className="flex items-center gap-2 text-left">
            <Package className="w-5 h-5 text-primary" />
            Mis pedidos
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <SpinnerLoader size="sm" text="Cargando pedidos..." />
            </div>
          ) : !orders || orders.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingBag className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Aún no tenés pedidos</p>
            </div>
          ) : (
            <>
              {activeOrders.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    En curso
                  </h3>
                  {activeOrders.map((order) => (
                    <InlineOrderCard
                      key={order.id}
                      order={order}
                      branchName={branches?.[order.branch_id]?.name || ''}
                      branchSlug={branches?.[order.branch_id]?.slug || undefined}
                      isActive
                      onTrack={() =>
                        order.webapp_tracking_code && handleTrack(order.webapp_tracking_code)
                      }
                    />
                  ))}
                </div>
              )}

              {pastOrders.length > 0 && (
                <div className="space-y-2">
                  {activeOrders.length > 0 && (
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Anteriores
                    </h3>
                  )}
                  {pastOrders.map((order) => (
                    <InlineOrderCard
                      key={order.id}
                      order={order}
                      branchName={branches?.[order.branch_id]?.name || ''}
                      branchSlug={branches?.[order.branch_id]?.slug || undefined}
                      onTrack={() =>
                        order.webapp_tracking_code && handleTrack(order.webapp_tracking_code)
                      }
                      onReorder={() => handleReorder(order)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function InlineOrderCard({
  order,
  branchName,
  branchSlug,
  isActive,
  onTrack,
  onReorder,
}: {
  order: any;
  branchName: string;
  branchSlug?: string;
  isActive?: boolean;
  onTrack: () => void;
  onReorder?: () => void;
}) {
  const estado = estadoLabels[order.estado] || { label: order.estado, variant: 'outline' as const };
  const items = order.pedido_items || [];
  const itemsSummary = items
    .slice(0, 3)
    .map((i: any) => `${i.cantidad}x ${i.nombre}`)
    .join(' · ');
  const moreItems = items.length > 3 ? ` +${items.length - 3} más` : '';
  const canReorder = !isActive && branchSlug && items.length > 0;

  return (
    <div
      className={`rounded-xl border p-3 space-y-2 ${isActive ? 'border-primary/50 bg-primary/5' : 'bg-card'}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm">#{order.numero_pedido}</span>
          {branchName && <span className="text-xs text-muted-foreground">· {branchName}</span>}
        </div>
        <Badge variant={estado.variant}>{estado.label}</Badge>
      </div>

      <p className="text-xs text-muted-foreground">
        {format(new Date(order.created_at), 'd MMM yyyy · HH:mm', { locale: es })}
      </p>

      <p className="text-sm text-muted-foreground truncate">
        {itemsSummary}
        {moreItems}
      </p>

      <Separator />

      <div className="flex items-center justify-between">
        <span className="font-bold text-sm">${order.total?.toLocaleString('es-AR')}</span>
        <div className="flex gap-2">
          {canReorder && onReorder && (
            <Button variant="outline" size="sm" onClick={onReorder}>
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Repetir
            </Button>
          )}
          {order.webapp_tracking_code && (
            <Button variant="outline" size="sm" onClick={onTrack}>
              <Eye className="w-3.5 h-3.5 mr-1" />
              {isActive ? 'Ver tracking' : 'Ver detalle'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

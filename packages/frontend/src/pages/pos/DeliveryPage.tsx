/**
 * DeliveryPage - Asignación de cadetes y pedidos para entrega
 */
import { useParams } from 'react-router-dom';
import { Truck } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchDeliveryPedidos,
  fetchActiveCadetes,
  assignCadeteToPedido,
} from '@/services/posService';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function DeliveryPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const qc = useQueryClient();

  const { data: pedidos, isLoading } = useQuery({
    queryKey: ['pos-delivery', branchId],
    queryFn: () => fetchDeliveryPedidos(branchId!),
    enabled: !!branchId,
  });

  const { data: cadetes } = useQuery({
    queryKey: ['pos-cadetes', branchId],
    queryFn: () => fetchActiveCadetes(branchId!),
    enabled: !!branchId,
  });

  const asignarCadete = useMutation({
    mutationFn: async ({ pedidoId, cadeteId }: { pedidoId: string; cadeteId: string }) => {
      await assignCadeteToPedido(pedidoId, cadeteId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pos-delivery', branchId] });
      toast.success('Cadete asignado');
    },
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  const list = pedidos ?? [];
  const listos = list.filter((p: any) => p.status === 'listo');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Entrega"
        subtitle="Pedidos para delivery"
        icon={<Truck className="w-5 h-5" />}
      />

      {listos.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Listos para asignar</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {listos.map((p: any) => (
              <Card key={p.id}>
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold">#{p.order_number}</span>
                    <Badge>{p.status}</Badge>
                  </div>
                  {p.customer_address && (
                    <p className="text-sm text-muted-foreground mb-2">{p.customer_address}</p>
                  )}
                  <ul className="text-sm mb-3">
                    {(p.order_items ?? []).map((it: any, i: number) => (
                      <li key={i}>
                        {it.quantity}× {it.name}
                      </li>
                    ))}
                  </ul>
                  {(cadetes ?? []).filter((c: any) => c.user_id).length > 0 ? (
                    <div className="flex gap-2 flex-wrap">
                      {(cadetes ?? [])
                        .filter((c: any) => c.user_id)
                        .map((c: any) => (
                          <Badge
                            key={c.id}
                            variant="outline"
                            className="cursor-pointer"
                            onClick={() =>
                              asignarCadete.mutate({ pedidoId: p.id, cadeteId: c.user_id })
                            }
                          >
                            {c.nombre}
                          </Badge>
                        ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Sin cadetes configurados</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {list.filter((p: any) => p.status === 'en_camino').length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">En camino</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {list
              .filter((p: any) => p.status === 'en_camino')
              .map((p: any) => (
                <Card key={p.id}>
                  <CardContent className="pt-4">
                    <span className="font-bold">#{p.order_number}</span>
                    <Badge variant="secondary" className="ml-2">
                      En camino
                    </Badge>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      )}

      {list.length === 0 && (
        <p className="text-center text-muted-foreground py-12">Sin pedidos para entrega</p>
      )}
    </div>
  );
}

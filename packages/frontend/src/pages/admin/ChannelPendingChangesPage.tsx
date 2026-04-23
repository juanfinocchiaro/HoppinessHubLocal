/**
 * Fase 5: Cambios pendientes por canal.
 *
 * Muestra el log de cambios (`channel_pending_changes`) agrupado por canal
 * externo (Rappi / PedidosYa / MP Delivery). El admin puede:
 *  - Ver la lista detallada de cambios por canal.
 *  - Generar un PDF "checklist" para que el encargado lo cargue manualmente.
 *  - Ver histórico de PDFs generados + confirmar cuándo el encargado los cargó.
 */
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FileText, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  fetchPendingChanges,
  fetchChannelExports,
  generateChannelExport,
  confirmChannelExport,
  type ChannelPendingChange,
  type ChannelPdfExport,
} from '@/services/channelChangesService';
import { generateChannelChangesPdf } from '@/lib/menu/channelChangesPdf';

const CHANNELS: Array<{ code: string; label: string }> = [
  { code: 'rappi', label: 'Rappi' },
  { code: 'pedidos_ya', label: 'PedidosYa' },
  { code: 'mp_delivery', label: 'MP Delivery' },
];

const CHANGE_TYPE_LABELS: Record<string, string> = {
  new_article: 'Nuevo artículo',
  price_change: 'Cambio de precio',
  deactivation: 'Desactivar',
  activation: 'Reactivar',
  new_promotion: 'Nueva promo',
  promotion_change: 'Editar promo',
  promotion_end: 'Dar de baja promo',
};

const CHANGE_TYPE_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  new_article: 'default',
  price_change: 'secondary',
  deactivation: 'destructive',
  activation: 'default',
  new_promotion: 'default',
  promotion_change: 'secondary',
  promotion_end: 'destructive',
};

function describeChange(change: ChannelPendingChange): string {
  const p = (change.payload as Record<string, unknown> | null) ?? {};
  const name = (p.item_name as string | null) ?? (p.promotion_name as string | null) ?? change.entity_id;
  if (change.entity_type === 'menu_item') {
    const prev = p.previous_price as number | null | undefined;
    const next = p.new_price as number | null | undefined;
    if (prev != null && next != null && prev !== next) {
      return `${name}: $${prev.toLocaleString('es-AR')} → $${next.toLocaleString('es-AR')}`;
    }
    if (next != null) return `${name} ($${next.toLocaleString('es-AR')})`;
    return String(name);
  }
  return String(name);
}

export default function ChannelPendingChangesPage() {
  const [activeChannel, setActiveChannel] = useState<string>('rappi');
  const qc = useQueryClient();

  const pendingQuery = useQuery({
    queryKey: ['channel-pending-changes', activeChannel],
    queryFn: () => fetchPendingChanges(activeChannel),
  });

  const exportsQuery = useQuery({
    queryKey: ['channel-exports', activeChannel],
    queryFn: () => fetchChannelExports(activeChannel),
  });

  const exportMutation = useMutation({
    mutationFn: async () => generateChannelExport(activeChannel),
    onSuccess: (data) => {
      generateChannelChangesPdf({
        channelCode: data.channel_code,
        generatedAt: data.generated_at,
        changes: data.changes,
      });
      toast.success(`PDF generado con ${data.change_count} cambios`);
      qc.invalidateQueries({ queryKey: ['channel-pending-changes', activeChannel] });
      qc.invalidateQueries({ queryKey: ['channel-exports', activeChannel] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Error al generar PDF';
      toast.error(msg);
    },
  });

  const confirmMutation = useMutation({
    mutationFn: confirmChannelExport,
    onSuccess: () => {
      toast.success('Export confirmado como cargado');
      qc.invalidateQueries({ queryKey: ['channel-exports', activeChannel] });
    },
  });

  const pending = pendingQuery.data ?? [];
  const exports = exportsQuery.data ?? [];

  const counts = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const p of pending) acc[p.change_type] = (acc[p.change_type] ?? 0) + 1;
    return acc;
  }, [pending]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cambios pendientes por canal"
        subtitle="Cambios que acumulaste y tu encargado tiene que cargar en el portal de cada app"
        breadcrumb={[{ label: 'Mi Marca', href: '/mimarca' }, { label: 'Cambios por canal' }]}
      />

      <Tabs value={activeChannel} onValueChange={setActiveChannel}>
        <TabsList>
          {CHANNELS.map((c) => (
            <TabsTrigger key={c.code} value={c.code}>
              {c.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {CHANNELS.map((c) => (
          <TabsContent key={c.code} value={c.code} className="space-y-4">
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">Cambios pendientes</h3>
                    <p className="text-xs text-muted-foreground">
                      {pending.length === 0
                        ? 'No hay cambios pendientes en este canal.'
                        : `${pending.length} cambio${pending.length === 1 ? '' : 's'} desde el último export.`}
                    </p>
                  </div>
                  <Button
                    onClick={() => exportMutation.mutate()}
                    disabled={pending.length === 0 || exportMutation.isPending}
                    size="sm"
                  >
                    {exportMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <FileText className="w-4 h-4 mr-1" />
                    )}
                    Generar PDF
                  </Button>
                </div>

                {pending.length > 0 && (
                  <>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(counts).map(([ct, n]) => (
                        <Badge key={ct} variant={CHANGE_TYPE_VARIANTS[ct] ?? 'outline'} className="text-[10px]">
                          {n} {CHANGE_TYPE_LABELS[ct] ?? ct}
                        </Badge>
                      ))}
                    </div>

                    <div className="border rounded-lg divide-y">
                      {pending.map((change) => (
                        <div key={change.id} className="px-3 py-2 flex items-center gap-2 text-sm">
                          <Badge variant={CHANGE_TYPE_VARIANTS[change.change_type] ?? 'outline'} className="text-[9px] shrink-0">
                            {CHANGE_TYPE_LABELS[change.change_type] ?? change.change_type}
                          </Badge>
                          <span className="flex-1 truncate">{describeChange(change)}</span>
                          {change.created_at && (
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {new Date(change.created_at).toLocaleDateString('es-AR', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 space-y-3">
                <div>
                  <h3 className="text-sm font-semibold">Histórico de exports</h3>
                  <p className="text-xs text-muted-foreground">
                    Cada vez que generás un PDF queda registrado acá. Confirmá cuando tu encargado cargó los cambios.
                  </p>
                </div>
                {exports.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Todavía no generaste ningún PDF para este canal.</p>
                ) : (
                  <div className="border rounded-lg divide-y">
                    {exports.map((row) => (
                      <ExportRow key={row.id} row={row} onConfirm={() => confirmMutation.mutate(row.id)} confirming={confirmMutation.isPending} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function ExportRow({ row, onConfirm, confirming }: { row: ChannelPdfExport; onConfirm: () => void; confirming: boolean }) {
  const generated = row.generated_at ? new Date(row.generated_at) : null;
  const confirmed = row.confirmed_loaded_at ? new Date(row.confirmed_loaded_at) : null;
  return (
    <div className="px-3 py-2 flex items-center gap-2 text-sm">
      <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium">
          {row.change_count ?? 0} cambios ·{' '}
          {generated?.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
        </div>
        {row.delivered_to && <div className="text-[10px] text-muted-foreground truncate">Para: {row.delivered_to}</div>}
      </div>
      {confirmed ? (
        <Badge variant="default" className="text-[10px] gap-1">
          <CheckCircle2 className="w-3 h-3" />
          Cargado
        </Badge>
      ) : (
        <Button variant="outline" size="sm" onClick={onConfirm} disabled={confirming} className="h-7 text-xs">
          <Clock className="w-3 h-3 mr-1" />
          Marcar cargado
        </Button>
      )}
    </div>
  );
}

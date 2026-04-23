/**
 * Fase 6 follow-up: botón "Publicar" + histórico de snapshots.
 *
 * Publica el estado actual del menú para un (scope, channel) dado, persiste
 * snapshot y refresca consumers. Por ahora se usa solo para branches —
 * multi-brand viene con el roadmap.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, Clock, CheckCircle2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { fetchMenuSnapshots, publishMenu } from '@/services/menuPublishService';

interface Props {
  scopeType: 'brand' | 'branch';
  scopeId: string;
  channelCode: string;
  label?: string;
}

export function PublishMenuButton({ scopeType, scopeId, channelCode, label }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const snapshotsQuery = useQuery({
    queryKey: ['menu-snapshots', scopeType, scopeId, channelCode],
    queryFn: () => fetchMenuSnapshots({ scope_type: scopeType, scope_id: scopeId, channel_code: channelCode }),
    enabled: open,
  });

  const publish = useMutation({
    mutationFn: () => publishMenu({ scope_type: scopeType, scope_id: scopeId, channel_code: channelCode }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['sellable-menu'] });
      qc.invalidateQueries({ queryKey: ['menu-snapshots'] });
      toast.success(`Publicado: ${data.item_count} ítems en ${data.channel_code}`);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Error al publicar';
      toast.error(msg);
    },
  });

  const currentSnapshot = snapshotsQuery.data?.find((s) => s.is_current);
  const lastPublishedAt = currentSnapshot?.published_at
    ? new Date(currentSnapshot.published_at)
    : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="default" disabled={publish.isPending}>
          {publish.isPending ? (
            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
          ) : (
            <Upload className="w-4 h-4 mr-1.5" />
          )}
          {label ?? 'Publicar'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-semibold">Publicar menú</h4>
            <p className="text-[11px] text-muted-foreground">
              Toma el estado actual de productos, precios, visibilidad y promos activas, y lo
              persiste como snapshot. POS y WebApp leen del snapshot.
            </p>
          </div>

          <div className="rounded-md border bg-muted/20 px-3 py-2">
            <div className="text-[11px] text-muted-foreground">Canal</div>
            <div className="text-xs font-medium">{channelCode}</div>
          </div>

          {lastPublishedAt && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <CheckCircle2 className="w-3 h-3" />
              Último publish:{' '}
              {lastPublishedAt.toLocaleString('es-AR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
              {currentSnapshot?.item_count != null && (
                <span> · {currentSnapshot.item_count} ítems</span>
              )}
            </div>
          )}

          <Button
            size="sm"
            className="w-full"
            onClick={() => publish.mutate()}
            disabled={publish.isPending}
          >
            {publish.isPending ? 'Publicando...' : 'Publicar ahora'}
          </Button>

          {snapshotsQuery.data && snapshotsQuery.data.length > 1 && (
            <div className="space-y-1">
              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" /> Histórico
              </div>
              <div className="max-h-40 overflow-y-auto text-[11px] space-y-1">
                {snapshotsQuery.data.slice(0, 10).map((row) => (
                  <div key={row.id} className="flex items-center justify-between px-1">
                    <span>
                      {row.published_at
                        ? new Date(row.published_at).toLocaleString('es-AR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </span>
                    <span className="text-muted-foreground">{row.item_count ?? 0} ítems</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

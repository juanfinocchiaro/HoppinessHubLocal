import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useItemCartaHistorial } from '@/hooks/useItemsCarta';
import { fmt } from './helpers';
import type { Tables } from '@/integrations/supabase/types';

interface HistorialModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: Tables<'items_carta'>;
}

export function HistorialModal({ open, onOpenChange, item }: HistorialModalProps) {
  const { data: historial } = useItemCartaHistorial(item?.id);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Historial: {item.nombre}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {historial?.length ? (
            historial.map((h) => (
              <div key={h.id} className="flex justify-between items-center p-2 border rounded text-sm">
                <div>
                  <span className="font-mono">{fmt(h.precio_anterior || 0)} → {fmt(h.precio_nuevo)}</span>
                  {h.motivo && <p className="text-xs text-muted-foreground">{h.motivo}</p>}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(h.created_at).toLocaleDateString('es-AR')}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Sin historial de precios</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

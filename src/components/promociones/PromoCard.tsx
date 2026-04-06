import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Trash2, Calendar, Copy, ChevronDown, ChevronRight } from 'lucide-react';
import { usePromocionItems, type Promocion } from '@/hooks/usePromociones';
import { formatTimeRange, formatChannels, buildItemLabel } from './helpers';
import { PAGO_LABELS } from './constants';

interface PromoCardProps {
  promo: Promocion;
  isEditing?: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggle: (active: boolean) => void;
}

export function PromoCard({ promo, isEditing, onEdit, onDuplicate, onDelete, onToggle }: PromoCardProps) {
  const { data: items = [] } = usePromocionItems(promo.id);
  const timeLabel = formatTimeRange(promo.hora_inicio, promo.hora_fin);
  const channelsLabel = formatChannels(promo.canales);
  const discountLabel = promo.tipo === 'descuento_porcentaje' && promo.valor > 0 ? `${promo.valor}% OFF` : null;

  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-2.5 border-b last:border-b-0 transition-colors cursor-pointer ${isEditing ? 'bg-primary/5' : 'hover:bg-muted/30'}`}
      onClick={onEdit}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {isEditing ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
          <h3 className="font-semibold text-sm truncate">{promo.name}</h3>
          {!promo.is_active && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Inactiva</Badge>}
          {discountLabel && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{discountLabel}</Badge>}
          {promo.restriccion_pago !== 'cualquiera' && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{PAGO_LABELS[promo.restriccion_pago]}</Badge>
          )}
        </div>
        {items.length > 0 && (
          <div className="text-xs text-muted-foreground mt-0.5 space-y-0.5">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-1 flex-wrap">
                <span className="font-medium text-foreground/80">{buildItemLabel(item)}</span>
                <span className="text-muted-foreground/60">→</span>
                <span className="line-through text-muted-foreground/50">${(item.precio_base ?? 0).toLocaleString('es-AR')}</span>
                <span className="font-semibold text-green-600">${(item.precio_promo ?? 0).toLocaleString('es-AR')}</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
          <span>{timeLabel}</span>
          <span className="text-muted-foreground/40">·</span>
          <span>{channelsLabel}</span>
          {(promo.fecha_inicio || promo.fecha_fin) && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <span className="flex items-center gap-0.5"><Calendar className="w-3 h-3" />{promo.fecha_inicio || '...'} — {promo.fecha_fin || '...'}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Switch checked={promo.is_active} onCheckedChange={onToggle} onClick={(e) => e.stopPropagation()} />
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onDuplicate(); }} title="Duplicar"><Copy className="w-3.5 h-3.5" /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Eliminar"><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
      </div>
    </div>
  );
}

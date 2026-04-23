/**
 * Fase 7 follow-up: vista unificada de modifiers en el hub de producto.
 *
 * Consume el endpoint canónico `/api/menu/items/:id/modifiers` que ya
 * unifica los 4 modelos legacy (extras, removibles, grupos opcionales,
 * item_modifiers). Reemplaza las 3 UIs separadas de `ComposicionInline`
 * para la sección de modifiers.
 *
 * Esta es la vista read-only + toggle básico. La edición full (crear
 * group, reordenar, etc.) viene en un siguiente PR cuando se implementen
 * los endpoints de mutación unificados.
 */
import { Package, CheckCircle2, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useUnifiedModifiers, type UnifiedModifierOption } from '@/hooks/useUnifiedModifiers';

interface Props {
  itemId: string;
}

function formatCurrency(value: number) {
  if (!value) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}$${value.toLocaleString('es-AR')}`;
}

function ModifierOptionRow({ option }: { option: UnifiedModifierOption }) {
  const isFree = Math.abs(option.price_delta) < 0.005;
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 text-sm">
      {option.is_default_selected && (
        <CheckCircle2 className="w-3 h-3 text-green-600 shrink-0" />
      )}
      <span className="flex-1 truncate">{option.display_name || '(sin nombre)'}</span>
      <Badge variant="outline" className="text-[10px] font-mono">
        {option.type}
      </Badge>
      <span className={`tabular-nums text-xs ${isFree ? 'text-muted-foreground' : 'font-semibold'}`}>
        {isFree ? 'incluido' : formatCurrency(option.price_delta)}
      </span>
    </div>
  );
}

export function ModifiersInline({ itemId }: Props) {
  const { data: groups, isLoading, error } = useUnifiedModifiers(itemId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="w-4 h-4 animate-spin" /> Cargando modifiers…
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-destructive py-4">
        Error al cargar modifiers. {error instanceof Error ? error.message : ''}
      </div>
    );
  }

  if (!groups || groups.length === 0) {
    return (
      <div className="rounded-lg border bg-muted/10 px-3 py-4 text-center text-sm text-muted-foreground">
        <Package className="w-6 h-6 mx-auto mb-2 opacity-40" />
        Este producto no tiene modifier groups configurados.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-bold">Modifier groups</h4>
        <p className="text-[11px] text-muted-foreground">
          Modelo unificado (Fase 7): extras, removibles y grupos opcionales en un solo lugar.
          Las 4 tablas legacy se mantienen como shadow durante el shadow period.
        </p>
      </div>
      {groups.map((group) => (
        <div key={group.id} className="rounded-lg border overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b">
            <span className="text-sm font-semibold">{group.name}</span>
            {group.is_required && (
              <Badge variant="destructive" className="text-[10px]">Requerido</Badge>
            )}
            <span className="text-[10px] text-muted-foreground ml-auto">
              {group.min_selected}–{group.max_selected ?? '∞'} opciones ·{' '}
              {group.pricing_mode === 'group_average' ? 'Costo promedio' : 'Costo individual'}
            </span>
          </div>
          <div className="divide-y">
            {group.options.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">Sin opciones.</div>
            ) : (
              group.options.map((opt) => <ModifierOptionRow key={opt.id} option={opt} />)
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

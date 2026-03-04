import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { FormSection } from '@/components/ui/forms-pro';
import { Link2 } from 'lucide-react';
import { useExtraAssignableItems } from '@/hooks/useExtraAutoDiscovery';
import { useToggleExtra } from '@/hooks/useToggleExtra';
import type { DiscoveredExtra } from '@/hooks/useExtraAutoDiscovery';
import { formatCurrency } from '@/lib/formatters';
import { fromUntyped } from '@/lib/supabase-helpers';

interface ItemCartaWithCategory {
  id: string;
  nombre: string;
  menu_categorias?: { id: string; nombre: string; orden: number | null } | null;
  [key: string]: any;
}

// ═══ ASIGNADOS TAB (for tipo='extra') ═══
export function AsignadosInline({ item }: { item: any }) {
  const { productItems, assignedSet } = useExtraAssignableItems(item);
  const assignedProducts = (productItems as any[]).filter((p: any) => assignedSet.has(p.id));

  return (
    <div className="space-y-4">
      <FormSection title="Productos que ofrecen este extra" icon={Link2}>
        <p className="text-xs text-muted-foreground mb-2">
          Productos que actualmente incluyen este extra en su carta. Para modificar, usá la pestaña
          Composición de cada producto.
        </p>
        {assignedProducts.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground border rounded-lg">
            Ningún producto ofrece este extra. Asignalo desde la pestaña{' '}
            <strong>Composición</strong> de cada producto.
          </div>
        ) : (
          <div className="space-y-1">
            {assignedProducts.map((prod: ItemCartaWithCategory) => (
              <div
                key={prod.id}
                className="flex items-center gap-2 text-sm border rounded-lg px-3 py-2"
              >
                <span className="flex-1">{prod.nombre}</span>
                {prod.menu_categorias && (
                  <Badge variant="outline" className="text-xs">
                    {prod.menu_categorias.nombre}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </FormSection>
    </div>
  );
}

// ═══ EXTRA ROW (with editable nombre_carta) ═══
export function ExtraRow({ d, itemId, toggleExtra }: { d: DiscoveredExtra; itemId: string; toggleExtra: ReturnType<typeof useToggleExtra> }) {
  const [localNombre, setLocalNombre] = useState(d.extra_nombre || '');
  useEffect(() => {
    setLocalNombre(d.extra_nombre || '');
  }, [d.extra_nombre]);

  const handleSaveNombre = async () => {
    if (!d.extra_id || localNombre === d.extra_nombre) return;
    await fromUntyped('menu_items')
      .update({ nombre: localNombre })
      .eq('id', d.extra_id!);
  };

  return (
    <div
      className={`flex items-center gap-1.5 text-sm border rounded-lg px-3 py-2 ${d.activo ? 'border-primary/40 bg-primary/5' : ''}`}
    >
      <span className="flex-1 text-sm font-medium truncate">{d.nombre}</span>
      <span className="w-[120px] text-xs text-muted-foreground truncate">{d.origen}</span>
      <div className="w-[140px]">
        {d.activo && d.extra_id ? (
          <Input
            value={localNombre}
            onChange={(e) => setLocalNombre(e.target.value)}
            onBlur={handleSaveNombre}
            className="h-6 text-xs"
            placeholder="Extra ..."
          />
        ) : null}
      </div>
      <div className="w-14 flex justify-center">
        <Switch
          checked={d.activo}
          onCheckedChange={(v) =>
            toggleExtra.mutate({
              item_carta_id: itemId,
              tipo: d.tipo,
              ref_id: d.ref_id,
              nombre: d.nombre,
              costo: d.costo,
              cantidad: d.cantidad,
              activo: v,
            })
          }
          className="scale-75"
          disabled={toggleExtra.isPending}
        />
      </div>
      <span className="w-20 text-right text-xs font-mono">
        {d.activo ? (
          d.extra_precio > 0 ? (
            <span className="text-foreground">{formatCurrency(d.extra_precio)}</span>
          ) : (
            <span className="text-amber-600">⚠ $0</span>
          )
        ) : null}
      </span>
    </div>
  );
}

// ═══ REMOVIBLE ROW (with editable nombre_display) ═══
export function RemovibleRow({
  nombre,
  origen,
  isActive,
  nombreDisplay,
  onToggle,
  onUpdateNombre,
  isPending,
  hasExisting,
}: {
  nombre: string;
  origen: string;
  isActive: boolean;
  nombreDisplay: string;
  onToggle: (v: boolean) => void;
  onUpdateNombre: (n: string) => void;
  isPending: boolean;
  hasExisting: boolean;
}) {
  const [localNombre, setLocalNombre] = useState(nombreDisplay);
  useEffect(() => {
    setLocalNombre(nombreDisplay);
  }, [nombreDisplay]);

  return (
    <div
      className={`flex items-center gap-1.5 text-sm border rounded-lg px-3 py-2 ${isActive ? 'border-primary/40 bg-primary/5' : ''}`}
    >
      <span className="flex-1 text-sm truncate">{nombre}</span>
      <span className="w-[120px] text-xs text-muted-foreground truncate">{origen}</span>
      <div className="w-[140px]">
        {isActive && hasExisting ? (
          <Input
            value={localNombre}
            onChange={(e) => setLocalNombre(e.target.value)}
            onBlur={() => {
              if (localNombre !== nombreDisplay) onUpdateNombre(localNombre);
            }}
            className="h-6 text-xs"
            placeholder="Sin ..."
          />
        ) : null}
      </div>
      <div className="w-14 flex justify-center">
        <Switch
          checked={isActive}
          onCheckedChange={onToggle}
          className="scale-75"
          disabled={isPending}
        />
      </div>
    </div>
  );
}

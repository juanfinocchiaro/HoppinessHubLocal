/**
 * Fase 6 — Editor de composición de un combo.
 *
 * Permite buscar productos "simples" de la carta, agregarlos al combo con una
 * cantidad, reordenarlos o quitarlos, y guardar. Al guardar se recalcula
 * automáticamente el `total_cost` y `fc_actual` del combo.
 *
 * Pensado para ir en `ItemExpandedPanel` como tab "Combo" cuando el
 * `type` del ítem es `'combo'`.
 */
import { useMemo, useState, useEffect } from 'react';
import { Plus, Trash2, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useItemsCarta } from '@/hooks/useItemsCarta';
import { useComboComponents, useReplaceComboComponents } from '@/hooks/useComboComponents';

interface Props {
  item: { id: string; name?: string };
}

interface DraftRow {
  component_id: string;
  quantity: number;
  name: string;
  base_price: number | null;
  total_cost: number | null;
}

function formatCurrency(v: number | null | undefined) {
  if (v == null) return '—';
  return `$${Number(v).toLocaleString('es-AR')}`;
}

export function ComboInline({ item }: Props) {
  const { data: existing, isLoading } = useComboComponents(item.id);
  const { data: allItems = [] } = useItemsCarta();
  const save = useReplaceComboComponents();

  const simpleItems = useMemo(
    () => (allItems as Array<Record<string, unknown>>)
      .filter((i) => i.id !== item.id && (i as { type?: string }).type !== 'extra' && (i as { type?: string }).type !== 'combo')
      .map((i) => ({
        id: i.id as string,
        name: (i as { name?: string; nombre?: string }).name ?? (i as { name?: string; nombre?: string }).nombre ?? '',
        base_price: Number((i as { base_price?: number; precio_base?: number }).base_price ?? (i as { base_price?: number; precio_base?: number }).precio_base ?? 0),
        total_cost: Number((i as { total_cost?: number }).total_cost ?? 0),
      })),
    [allItems, item.id],
  );

  const [rows, setRows] = useState<DraftRow[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!existing) return;
    setRows(existing.map((r) => ({
      component_id: r.component_id,
      quantity: r.quantity,
      name: r.component?.name ?? r.component_id,
      base_price: r.component?.base_price ?? null,
      total_cost: r.component?.total_cost ?? null,
    })));
  }, [existing]);

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    const existingIds = new Set(rows.map((r) => r.component_id));
    return simpleItems
      .filter((i) => !existingIds.has(i.id) && i.name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [search, simpleItems, rows]);

  const handleAdd = (comp: typeof simpleItems[number]) => {
    setRows((prev) => [...prev, {
      component_id: comp.id,
      quantity: 1,
      name: comp.name,
      base_price: comp.base_price,
      total_cost: comp.total_cost,
    }]);
    setSearch('');
  };

  const handleRemove = (componentId: string) =>
    setRows((prev) => prev.filter((r) => r.component_id !== componentId));

  const handleQtyChange = (componentId: string, value: number) =>
    setRows((prev) => prev.map((r) => r.component_id === componentId ? { ...r, quantity: value } : r));

  const totalCost = useMemo(
    () => rows.reduce((sum, r) => sum + (r.total_cost ?? 0) * r.quantity, 0),
    [rows],
  );
  const suggestedPrice = useMemo(
    () => rows.reduce((sum, r) => sum + (r.base_price ?? 0) * r.quantity, 0),
    [rows],
  );

  const isDirty = useMemo(() => {
    if (!existing) return rows.length > 0;
    if (existing.length !== rows.length) return true;
    const byId = new Map(existing.map((e) => [e.component_id, e.quantity]));
    return rows.some((r) => byId.get(r.component_id) !== r.quantity);
  }, [existing, rows]);

  const handleSave = () => {
    save.mutate({
      comboId: item.id,
      components: rows.map((r, idx) => ({
        component_id: r.component_id,
        quantity: r.quantity,
        sort_order: idx,
      })),
    });
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Cargando composición…</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-bold">Composición del combo</h4>
          <p className="text-[11px] text-muted-foreground">
            Elegí los productos simples que arman este combo. El costo se recalcula automáticamente al guardar.
          </p>
        </div>
        <Button onClick={handleSave} disabled={!isDirty || save.isPending} size="sm">
          {save.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null}
          Guardar y recalcular
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar producto a agregar…"
          className="pl-9 h-9"
        />
        {searchResults.length > 0 && (
          <div className="absolute inset-x-0 top-full mt-1 z-10 border rounded-lg bg-background max-h-48 overflow-auto divide-y shadow-lg">
            {searchResults.map((r) => (
              <button
                key={r.id}
                onClick={() => handleAdd(r)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted/50"
              >
                <span className="truncate flex items-center gap-2">
                  <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                  {r.name}
                </span>
                <span className="text-[11px] text-muted-foreground shrink-0 ml-2">
                  Costo {formatCurrency(r.total_cost)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border bg-muted/10 px-3 py-3 text-xs text-muted-foreground">
          Este combo todavía no tiene componentes. Buscá productos arriba para agregarlos.
        </div>
      ) : (
        <div className="border rounded-lg divide-y">
          {rows.map((r) => (
            <div key={r.component_id} className="flex items-center gap-2 px-3 py-2">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{r.name}</div>
                <div className="text-[11px] text-muted-foreground">
                  Costo unitario: {formatCurrency(r.total_cost)} · PVP unitario: {formatCurrency(r.base_price)}
                </div>
              </div>
              <Input
                type="number"
                min={1}
                value={r.quantity}
                onChange={(e) => handleQtyChange(r.component_id, Math.max(1, Number(e.target.value) || 1))}
                className="w-16 h-8 text-right tabular-nums"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => handleRemove(r.component_id)}
                aria-label="Quitar componente"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2 text-xs">
        <div>
          <span className="font-medium">Costo total del combo: </span>
          <span className="tabular-nums">{formatCurrency(totalCost)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Suma PVP de componentes: </span>
          <span className="tabular-nums">{formatCurrency(suggestedPrice)}</span>
        </div>
      </div>
    </div>
  );
}

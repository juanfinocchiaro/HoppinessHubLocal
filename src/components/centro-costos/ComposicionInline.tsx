import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingButton } from '@/components/ui/loading-button';
import { FormSection } from '@/components/ui/forms-pro';
import { Layers, Tag, Plus, Trash2, Save, Sparkles, Ban } from 'lucide-react';
import {
  useItemCartaComposicion,
  useItemCartaMutations,
} from '@/hooks/useItemsCarta';
import { useGruposOpcionales, useGruposOpcionalesMutations } from '@/hooks/useGruposOpcionales';
import { usePreparaciones } from '@/hooks/usePreparaciones';
import { useInsumos } from '@/hooks/useInsumos';
import { useItemIngredientesDeepList } from '@/hooks/useItemIngredientesDeepList';
import { useItemRemovibles, useItemRemoviblesMutations } from '@/hooks/useItemRemovibles';
import { useExtraAutoDiscovery } from '@/hooks/useExtraAutoDiscovery';
import { useToggleExtra } from '@/hooks/useToggleExtra';
import type { GrupoOpcional } from '@/hooks/useGruposOpcionales';
import type { DeepIngredient, DeepSubPrep } from '@/hooks/useItemIngredientesDeepList';
import { formatCurrency } from '@/lib/formatters';
import { fmtPct, calcFC, fcColor, badgeVar } from './helpers';
import { ExtraRow, RemovibleRow } from './AsignadosSection';
import { GrupoEditorInline } from './GrupoEditorInline';

type ItemCartaMutations = ReturnType<typeof useItemCartaMutations>;

interface CompositionRow {
  tipo: string;
  preparacion_id: string;
  insumo_id: string;
  cantidad: number;
  _label: string;
  _costo: number;
}

interface RemovibleRecord {
  id: string;
  insumo_id: string | null;
  preparacion_id: string | null;
  nombre_display: string | null;
}

export function ComposicionInline({ item, mutations }: { item: any; mutations: ItemCartaMutations }) {
  const { data: composicionActual } = useItemCartaComposicion(item?.id);
  const { data: grupos } = useGruposOpcionales(item?.id);
  const { data: preparaciones } = usePreparaciones();
  const { data: insumos } = useInsumos();
  const gruposMutations = useGruposOpcionalesMutations();

  const { data: deepGroups } = useItemIngredientesDeepList(item?.id);
  const { data: removibles } = useItemRemovibles(item?.id);
  const removiblesMutations = useItemRemoviblesMutations();

  const discoveredExtras = useExtraAutoDiscovery(item?.id);
  const toggleExtra = useToggleExtra();

  const [rows, setRows] = useState<CompositionRow[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [grupoNuevoNombre, setGrupoNuevoNombre] = useState('');
  const [showNewGrupo, setShowNewGrupo] = useState(false);

  useEffect(() => {
    if (composicionActual) {
      setRows(
        (composicionActual as any[]).map((c: any) => ({
          tipo: c.preparacion_id ? 'preparacion' : 'insumo',
          preparacion_id: c.preparacion_id || '',
          insumo_id: c.insumo_id || '',
          cantidad: c.cantidad,
          _label: c.recipes?.nombre || c.preparaciones?.nombre || c.supplies?.nombre || c.insumos?.nombre || '',
          _costo: c.recipes?.costo_calculado || c.preparaciones?.costo_calculado || c.supplies?.costo_por_unidad_base || c.insumos?.costo_por_unidad_base || 0,
        })),
      );
      setHasChanges(false);
    }
  }, [composicionActual]);

  const addRow = () => {
    setRows([
      ...rows,
      {
        tipo: 'preparacion',
        preparacion_id: '',
        insumo_id: '',
        cantidad: 1,
        _label: '',
        _costo: 0,
      },
    ]);
    setHasChanges(true);
  };
  const removeRow = (i: number) => {
    setRows(rows.filter((_, idx) => idx !== i));
    setHasChanges(true);
  };
  const updateRow = (i: number, field: string, value: string | number) => {
    const nr = [...rows];
    nr[i] = { ...nr[i], [field]: value };
    if (field === 'tipo') {
      nr[i].preparacion_id = '';
      nr[i].insumo_id = '';
      nr[i]._costo = 0;
      nr[i]._label = '';
    }
    if (field === 'preparacion_id') {
      const p = ((preparaciones || []) as any[]).find((x: any) => x.id === value);
      nr[i]._label = p?.nombre || '';
      nr[i]._costo = p?.costo_calculado || 0;
    }
    if (field === 'insumo_id') {
      const ins = ((insumos || []) as any[]).find((x: any) => x.id === value);
      nr[i]._label = ins?.nombre || '';
      nr[i]._costo = ins?.costo_por_unidad_base || 0;
    }
    setRows(nr);
    setHasChanges(true);
  };

  const baseRows = rows.filter((r) => r.cantidad > 0);

  const costoFijo = baseRows.reduce((t, r) => t + r.cantidad * r._costo, 0);
  const costoGrupos = (grupos || []).reduce((t: number, g: GrupoOpcional) => t + (g.costo_promedio || 0), 0);
  const costoTotal = costoFijo + costoGrupos;

  const removibleInsumoSet = useMemo(
    () => new Set((removibles || []).filter((r: RemovibleRecord) => r.insumo_id).map((r: RemovibleRecord) => r.insumo_id)),
    [removibles],
  );
  const removiblePrepSet = useMemo(
    () =>
      new Set(
        (removibles || []).filter((r: RemovibleRecord) => r.preparacion_id).map((r: RemovibleRecord) => r.preparacion_id),
      ),
    [removibles],
  );
  const removiblesMap = useMemo(() => {
    const map = new Map<string, RemovibleRecord>();
    for (const r of (removibles || []) as RemovibleRecord[]) {
      const key = r.insumo_id || r.preparacion_id;
      if (key) map.set(key, r);
    }
    return map;
  }, [removibles]);

  const allDeepIngredients = useMemo(() => {
    if (!deepGroups) return [];
    return deepGroups.flatMap((g) =>
      g.ingredientes.map((ing) => ({ ...ing, receta_nombre: g.receta_nombre })),
    );
  }, [deepGroups]);
  const uniqueIngredients = useMemo(() => {
    const map = new Map<string, DeepIngredient & { receta_nombre: string }>();
    for (const ing of allDeepIngredients) {
      if (!map.has(ing.insumo_id)) map.set(ing.insumo_id, ing);
    }
    return Array.from(map.values());
  }, [allDeepIngredients]);
  const deepSubPreps = useMemo(() => {
    if (!deepGroups) return [];
    const map = new Map<string, DeepSubPrep & { receta_nombre: string }>();
    for (const g of deepGroups) {
      for (const sp of g.sub_preparaciones || []) {
        if (!map.has(sp.preparacion_id)) {
          map.set(sp.preparacion_id, { ...sp, receta_nombre: g.receta_nombre });
        }
      }
    }
    return Array.from(map.values());
  }, [deepGroups]);

  const handleToggleRemovibleInsumo = async (insumoId: string, nombre: string, activo: boolean) => {
    await removiblesMutations.toggleInsumo.mutateAsync({
      item_carta_id: item.id,
      insumo_id: insumoId,
      activo,
      nombre_display: activo ? `Sin ${nombre}` : undefined,
    });
  };
  const handleToggleRemoviblePrep = async (prepId: string, nombre: string, activo: boolean) => {
    await removiblesMutations.togglePreparacion.mutateAsync({
      item_carta_id: item.id,
      preparacion_id: prepId,
      activo,
      nombre_display: activo ? `Sin ${nombre}` : undefined,
    });
  };

  const handleSave = async () => {
    await mutations.saveComposicion.mutateAsync({
      item_carta_id: item.id,
      items: rows
        .filter((r) => (r.preparacion_id || r.insumo_id) && r.cantidad > 0)
        .map((r) => ({
          preparacion_id: r.tipo === 'preparacion' ? r.preparacion_id : undefined,
          insumo_id: r.tipo === 'insumo' ? r.insumo_id : undefined,
          cantidad: r.cantidad,
        })),
    });
    setHasChanges(false);
  };

  const handleCreateGrupo = async () => {
    if (!grupoNuevoNombre.trim()) return;
    await gruposMutations.createGrupo.mutateAsync({
      item_carta_id: item.id,
      nombre: grupoNuevoNombre.trim(),
      orden: grupos?.length || 0,
    });
    setGrupoNuevoNombre('');
    setShowNewGrupo(false);
  };

  const renderComponentSelect = (row: CompositionRow, i: number) => {
    if (row.tipo === 'preparacion') {
      return (
        <Select
          value={row.preparacion_id || 'none'}
          onValueChange={(v) => updateRow(i, 'preparacion_id', v === 'none' ? '' : v)}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder="Seleccionar..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Seleccionar...</SelectItem>
            {((preparaciones || []) as any[]).map((p: any) => (
              <SelectItem key={p.id} value={p.id}>
                {p.nombre} ({formatCurrency(p.costo_calculado || 0)})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    const allInsumos = ((insumos || []) as any[]);
    const productos = allInsumos.filter((x: any) => x.tipo_item === 'producto');
    const ingredientes = allInsumos.filter((x: any) => x.tipo_item === 'ingrediente');
    const insumosItems = allInsumos.filter((x: any) => x.tipo_item === 'insumo' || !x.tipo_item);
    return (
      <Select
        value={row.insumo_id || 'none'}
        onValueChange={(v) => updateRow(i, 'insumo_id', v === 'none' ? '' : v)}
      >
        <SelectTrigger className="h-7 text-xs">
          <SelectValue placeholder="Seleccionar..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Seleccionar...</SelectItem>
          {productos.length > 0 && (
            <>
              <SelectItem
                value="__h_prod"
                disabled
                className="text-xs font-semibold text-muted-foreground"
              >
                ── Productos ──
              </SelectItem>
              {productos.map((ins: any) => (
                <SelectItem key={ins.id} value={ins.id}>
                  {ins.nombre} ({formatCurrency(ins.costo_por_unidad_base || 0)})
                </SelectItem>
              ))}
            </>
          )}
          {ingredientes.length > 0 && (
            <>
              <SelectItem
                value="__h_ing"
                disabled
                className="text-xs font-semibold text-muted-foreground"
              >
                ── Ingredientes ──
              </SelectItem>
              {ingredientes.map((ins: any) => (
                <SelectItem key={ins.id} value={ins.id}>
                  {ins.nombre} ({formatCurrency(ins.costo_por_unidad_base || 0)})
                </SelectItem>
              ))}
            </>
          )}
          {insumosItems.length > 0 && (
            <>
              <SelectItem
                value="__h_ins"
                disabled
                className="text-xs font-semibold text-muted-foreground"
              >
                ── Insumos ──
              </SelectItem>
              {insumosItems.map((ins: any) => (
                <SelectItem key={ins.id} value={ins.id}>
                  {ins.nombre} ({formatCurrency(ins.costo_por_unidad_base || 0)})
                </SelectItem>
              ))}
            </>
          )}
        </SelectContent>
      </Select>
    );
  };

  return (
    <div className="space-y-4">
      {/* ── COMPOSICIÓN FIJA ── */}
      <FormSection title="Composición Fija" icon={Layers}>
        <p className="text-xs text-muted-foreground mb-2">Componentes base del producto.</p>
        {baseRows.length === 0 ? (
          <div className="py-4 text-center text-muted-foreground border rounded-lg text-sm">
            Sin componentes fijos
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-3 py-1">
              <span className="w-[100px] shrink-0">Tipo</span>
              <span className="flex-1">Componente</span>
              <span className="w-16 shrink-0 text-right">Cant.</span>
              <span className="w-20 shrink-0 text-right">Subtotal</span>
              <span className="w-6 shrink-0" />
            </div>
            {rows.map((row, i) => {
              if (row.cantidad <= 0) return null;
              return (
                <div
                  key={i}
                  className="flex items-center gap-1.5 text-sm border rounded-lg px-3 py-2"
                >
                  <Select value={row.tipo} onValueChange={(v) => updateRow(i, 'tipo', v)}>
                    <SelectTrigger className="h-7 w-[100px] text-xs shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="preparacion">Receta</SelectItem>
                      <SelectItem value="insumo">Catálogo</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex-1 min-w-0">{renderComponentSelect(row, i)}</div>
                  <Input
                    type="number"
                    className="h-7 w-16 text-xs shrink-0"
                    value={row.cantidad}
                    onChange={(e) => updateRow(i, 'cantidad', Number(e.target.value))}
                  />
                  <span className="font-mono text-xs font-semibold w-20 text-right shrink-0">
                    {formatCurrency(row.cantidad * row._costo)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => removeRow(i)}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
        <Button variant="outline" onClick={addRow} className="w-full mt-2">
          <Plus className="w-4 h-4 mr-2" /> Agregar Componente
        </Button>
      </FormSection>

      {/* ── EXTRAS DISPONIBLES (auto-discovery V3) ── */}
      <FormSection title="Extras Disponibles" icon={Sparkles}>
        <p className="text-xs text-muted-foreground mb-2">
          Componentes que se pueden ofrecer como extra con cargo. Los extras se gestionan y les
          ponés precio en EXTRAS/MODIFICADORES del Análisis.
        </p>
        {discoveredExtras.length === 0 ? (
          <div className="py-3 text-center text-xs text-muted-foreground border rounded-lg">
            Sin componentes descubiertos. Agregá recetas a la composición.
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-3 py-1">
              <span className="flex-1">Componente</span>
              <span className="w-[120px]">Origen</span>
              <span className="w-[140px]">Nombre carta</span>
              <span className="w-14 text-center">Extra</span>
              <span className="w-20 text-right">Estado</span>
            </div>
            {discoveredExtras.map((d) => (
              <ExtraRow
                key={`${d.tipo}:${d.ref_id}`}
                d={d}
                itemId={item.id}
                toggleExtra={toggleExtra}
              />
            ))}
          </div>
        )}
      </FormSection>

      {/* ── REMOVIBLES (deep ingredients + sub-preps, NOT composition-level recipes) ── */}
      <FormSection title="Removibles" icon={Ban}>
        <p className="text-xs text-muted-foreground mb-2">
          Ingredientes que el cliente puede pedir SIN (sin descuento).
        </p>
        {uniqueIngredients.length === 0 && deepSubPreps.length === 0 ? (
          <div className="py-3 text-center text-xs text-muted-foreground border rounded-lg">
            Sin ingredientes descubiertos. Agregá recetas a la composición.
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-3 py-1">
              <span className="flex-1">Componente</span>
              <span className="w-[120px]">Origen</span>
              <span className="w-[140px]">Nombre carta</span>
              <span className="w-14 text-center">SIN</span>
            </div>
            {deepSubPreps.map((sp) => {
              const isActive = removiblePrepSet.has(sp.preparacion_id);
              const existing = removiblesMap.get(sp.preparacion_id);
              return (
                <RemovibleRow
                  key={`prep-${sp.preparacion_id}`}
                  nombre={sp.nombre}
                  origen={sp.receta_nombre}
                  isActive={isActive}
                  nombreDisplay={existing?.nombre_display || ''}
                  onToggle={(v) => handleToggleRemoviblePrep(sp.preparacion_id, sp.nombre, v)}
                  onUpdateNombre={(nombre) =>
                    removiblesMutations.updateNombreDisplay.mutate({
                      id: existing?.id,
                      nombre_display: nombre,
                    })
                  }
                  isPending={removiblesMutations.togglePreparacion.isPending}
                  hasExisting={!!existing}
                />
              );
            })}
            {uniqueIngredients.map((ing) => {
              const isActive = removibleInsumoSet.has(ing.insumo_id);
              const existing = removiblesMap.get(ing.insumo_id);
              return (
                <RemovibleRow
                  key={ing.insumo_id}
                  nombre={ing.nombre}
                  origen={ing.receta_nombre}
                  isActive={isActive}
                  nombreDisplay={existing?.nombre_display || ''}
                  onToggle={(v) => handleToggleRemovibleInsumo(ing.insumo_id, ing.nombre, v)}
                  onUpdateNombre={(nombre) =>
                    removiblesMutations.updateNombreDisplay.mutate({
                      id: existing?.id,
                      nombre_display: nombre,
                    })
                  }
                  isPending={removiblesMutations.toggleInsumo.isPending}
                  hasExisting={!!existing}
                />
              );
            })}
          </div>
        )}
      </FormSection>

      {/* ── GRUPOS OPCIONALES ── */}
      <FormSection title="Grupos Opcionales" icon={Tag}>
        <p className="text-xs text-muted-foreground mb-2">
          Para componentes variables (ej: bebida).
        </p>
        {(grupos || []).map((grupo: GrupoOpcional) => (
          <GrupoEditorInline
            key={grupo.id}
            grupo={grupo}
            itemId={item.id}
            insumos={insumos || []}
            preparaciones={preparaciones || []}
            mutations={gruposMutations}
          />
        ))}
        {showNewGrupo ? (
          <div className="flex items-center gap-2 p-3 border-2 border-dashed rounded-lg">
            <Input
              value={grupoNuevoNombre}
              onChange={(e) => setGrupoNuevoNombre(e.target.value)}
              placeholder="Nombre del grupo (ej: Bebida)"
              className="text-sm h-8"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateGrupo()}
            />
            <Button
              size="sm"
              className="h-8"
              onClick={handleCreateGrupo}
              disabled={!grupoNuevoNombre.trim() || gruposMutations.createGrupo.isPending}
            >
              Crear
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => {
                setShowNewGrupo(false);
                setGrupoNuevoNombre('');
              }}
            >
              Cancelar
            </Button>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setShowNewGrupo(true)} className="w-full">
            <Plus className="w-4 h-4 mr-2" /> Agregar Grupo Opcional
          </Button>
        )}
      </FormSection>

      {/* Summary */}
      <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Comp. fija:</span>
            <span className="font-mono">{formatCurrency(costoFijo)}</span>
          </div>
          {costoGrupos > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Grupos (prom.):</span>
              <span className="font-mono">{formatCurrency(costoGrupos)}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-2 border-t">
            <div>
              <p className="text-sm text-muted-foreground">Costo Total</p>
              <p className="text-2xl font-bold font-mono text-primary">{formatCurrency(costoTotal)}</p>
            </div>
            {item.precio_base > 0 && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">FC% (s/neto)</p>
                <Badge
                  variant={
                    badgeVar[fcColor(calcFC(costoTotal, item.precio_base), item.fc_objetivo || 32)]
                  }
                  className="text-lg px-3 py-1"
                >
                  {fmtPct(calcFC(costoTotal, item.precio_base))}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </div>

      {hasChanges && (
        <div className="flex justify-end gap-2">
          <LoadingButton loading={mutations.saveComposicion.isPending} onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" /> Guardar Composición
          </LoadingButton>
        </div>
      )}
    </div>
  );
}

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingButton } from '@/components/ui/loading-button';
import { Plus, Trash2, ChefHat, Save } from 'lucide-react';
import {
  usePreparacionIngredientes,
  usePreparaciones,
} from '@/hooks/usePreparaciones';
import { useInsumos } from '@/hooks/useInsumos';
import { formatCurrency } from '@/lib/formatters';
import { calcSubtotal } from './types';
import type { IngredienteLine, PreparacionMutations } from './types';

export function FichaTecnicaTab({
  preparacionId,
  mutations,
  onClose: _onClose,
}: {
  preparacionId: string;
  mutations: PreparacionMutations;
  onClose: () => void;
}) {
  const { data: ingredientesActuales } = usePreparacionIngredientes(preparacionId);
  const { data: insumos } = useInsumos();
  const { data: preparaciones } = usePreparaciones();

  const ingredientesDisponibles = useMemo(() => {
    return (
      insumos?.filter((i) => i.item_type === 'ingrediente' || i.item_type === 'insumo') || []
    );
  }, [insumos]);

  const preparacionesDisponibles = useMemo(() => {
    return preparaciones?.filter((p) => p.id !== preparacionId) || [];
  }, [preparaciones, preparacionId]);

  const [items, setItems] = useState<IngredienteLine[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (ingredientesActuales) {
      const mapped: IngredienteLine[] = ingredientesActuales.map((item) => ({
        tipo_linea: item.sub_preparacion_id ? 'preparacion' : 'insumo',
        insumo_id: item.insumo_id || '',
        sub_preparacion_id: item.sub_preparacion_id || '',
        cantidad: item.quantity,
        unidad: item.unit,
        insumo: item.supplies,
        sub_preparacion: item.recipes,
      }));
      mapped.sort((a, b) => {
        const costA =
          a.tipo_linea === 'preparacion'
            ? (a.quantity || 0) * (a.sub_preparacion?.calculated_cost || 0)
            : calcSubtotal(a.quantity, a.insumo?.base_unit_cost || 0, a.unidad);
        const costB =
          b.tipo_linea === 'preparacion'
            ? (b.quantity || 0) * (b.sub_preparacion?.calculated_cost || 0)
            : calcSubtotal(b.quantity, b.insumo?.base_unit_cost || 0, b.unidad);
        return costB - costA;
      });
      setItems(mapped);
      setHasChanges(false);
    }
  }, [ingredientesActuales]);

  const addItem = (tipo: 'insumo' | 'preparacion' = 'insumo') => {
    setItems([
      ...items,
      {
        tipo_linea: tipo,
        insumo_id: '',
        sub_preparacion_id: '',
        quantity: 0,
        unidad: tipo === 'preparacion' ? 'un' : '',
        insumo: null,
        sub_preparacion: null,
      },
    ]);
    setHasChanges(true);
  };
  const removeItem = (i: number) => {
    setItems(items.filter((_, idx) => idx !== i));
    setHasChanges(true);
  };
  const updateItem = (index: number, field: string, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === 'tipo_linea') {
      newItems[index].insumo_id = '';
      newItems[index].sub_preparacion_id = '';
      newItems[index].insumo = null;
      newItems[index].sub_preparacion = null;
      newItems[index].unidad = value === 'preparacion' ? 'un' : '';
    }
    if (field === 'insumo_id') {
      const ins = ingredientesDisponibles.find((i) => i.id === value);
      newItems[index].insumo = ins ?? null;
      newItems[index].unidad = ins?.base_unit || 'g';
    }
    if (field === 'sub_preparacion_id') {
      const prep = preparacionesDisponibles.find((p) => p.id === value);
      newItems[index].sub_preparacion = prep ?? null;
      newItems[index].unidad = 'un';
    }
    setItems(newItems);
    setHasChanges(true);
  };

  const costoTotal = useMemo(
    () =>
      items.reduce((t, item) => {
        if (item.tipo_linea === 'preparacion') {
          return t + (item.quantity || 0) * (item.sub_preparacion?.calculated_cost || 0);
        }
        return (
          t + calcSubtotal(item.quantity, item.insumo?.base_unit_cost || 0, item.unidad)
        );
      }, 0),
    [items],
  );

  const handleSave = async () => {
    await mutations.saveIngredientes.mutateAsync({
      preparacion_id: preparacionId,
      items: items
        .filter((i) => (i.insumo_id || i.sub_preparacion_id) && i.quantity > 0)
        .map((i) => ({
          insumo_id: i.tipo_linea === 'insumo' ? i.insumo_id : null,
          sub_preparacion_id: i.tipo_linea === 'preparacion' ? i.sub_preparacion_id : null,
          quantity: i.quantity,
          unit: i.unidad,
        })),
    });
    setHasChanges(false);
  };

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <div className="py-10 text-center text-muted-foreground border rounded-lg">
          Sin ingredientes — agregá el primero
        </div>
      ) : (
        <div className="space-y-1">
          {items.map((item, index) => {
            const isPrep = item.tipo_linea === 'preparacion';
            const costoUnit = isPrep
              ? item.sub_preparacion?.calculated_cost || 0
              : item.insumo?.base_unit_cost || 0;
            const subtotal = isPrep
              ? (item.quantity || 0) * costoUnit
              : calcSubtotal(item.quantity, costoUnit, item.unidad);
            const usedInsumoIds = items
              .filter((_, idx) => idx !== index)
              .map((i) => i.insumo_id)
              .filter(Boolean);
            const usedPrepIds = items
              .filter((_, idx) => idx !== index)
              .map((i) => i.sub_preparacion_id)
              .filter(Boolean);
            const filteredInsumos = ingredientesDisponibles.filter(
              (i) => !usedInsumoIds.includes(i.id),
            );
            const filteredPreps = preparacionesDisponibles.filter(
              (p) => !usedPrepIds.includes(p.id),
            );
            return (
              <div
                key={index}
                className="flex items-center gap-1.5 border rounded px-2 py-1.5 text-sm"
              >
                <Select
                  value={item.tipo_linea}
                  onValueChange={(v) => updateItem(index, 'tipo_linea', v)}
                >
                  <SelectTrigger className="h-7 w-[90px] text-xs shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="insumo">Insumo</SelectItem>
                    <SelectItem value="preparacion">Preparación</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex-1 min-w-0">
                  {isPrep ? (
                    <Select
                      value={item.sub_preparacion_id || 'none'}
                      onValueChange={(v) =>
                        updateItem(index, 'sub_preparacion_id', v === 'none' ? '' : v)
                      }
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Seleccionar...</SelectItem>
                        {filteredPreps.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} ({formatCurrency(p.calculated_cost || 0)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Select
                      value={item.insumo_id || 'none'}
                      onValueChange={(v) => updateItem(index, 'insumo_id', v === 'none' ? '' : v)}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Seleccionar...</SelectItem>
                        {filteredInsumos.map((ing) => (
                          <SelectItem key={ing.id} value={ing.id}>
                            {ing.name} (${ing.base_unit_cost?.toFixed(2)}/{ing.base_unit}
                            )
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <Input
                  type="number"
                  step="0.01"
                  value={item.quantity || ''}
                  onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                  className="h-7 w-16 text-xs shrink-0"
                />
                <span className="text-xs text-muted-foreground w-6 shrink-0">
                  {item.unidad || '—'}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">×</span>
                <span className="font-mono text-xs w-16 text-right shrink-0">
                  {costoUnit > 0 ? formatCurrency(costoUnit) : '—'}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">=</span>
                <span className="font-mono text-xs font-semibold w-20 text-right shrink-0">
                  {subtotal > 0 ? formatCurrency(subtotal) : '—'}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => removeItem(index)}
                >
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => addItem('insumo')} className="flex-1">
          <Plus className="w-4 h-4 mr-1" /> Insumo
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => addItem('preparacion')}
          className="flex-1"
        >
          <ChefHat className="w-4 h-4 mr-1" /> Preparación
        </Button>
      </div>

      <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg flex justify-between items-center">
        <div>
          <p className="text-xs text-muted-foreground">Costo Total</p>
          <p className="text-xl font-bold font-mono text-primary">{formatCurrency(costoTotal)}</p>
        </div>
        {hasChanges && (
          <LoadingButton
            loading={mutations.saveIngredientes.isPending}
            onClick={handleSave}
            size="sm"
          >
            <Save className="w-4 h-4 mr-1" /> Guardar Ficha
          </LoadingButton>
        )}
      </div>
    </div>
  );
}

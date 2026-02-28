import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import type { NewRemovibleFormProps, InsumoLike } from './modificadores-types';

export function NewRemovibleForm({
  itemId,
  ingredientes,
  deepGroups,
  insumos,
  composicion,
  onCreate,
  onClose,
}: NewRemovibleFormProps) {
  const [selectedId, setSelectedId] = useState('');
  const [selectedType, setSelectedType] = useState<'insumo' | 'receta'>('insumo');
  const [nombre, setNombre] = useState('');

  const recetasDelItem = useMemo(() => {
    if (!composicion) return [];
    return composicion
      .filter((c) => c.preparacion_id && c.preparaciones)
      .map((c) => ({
        id: c.preparacion_id,
        nombre: c.preparaciones!.nombre,
        costo_calculado: c.preparaciones!.costo_calculado || 0,
        cantidad: c.cantidad,
      }));
  }, [composicion]);

  const allInsumos = useMemo((): InsumoLike[] => {
    const fromItem = ingredientes.map((i) => ({ ...i, _fromItem: true }));
    const others = (insumos || []).filter(
      (i) => !ingredientes.some((fi) => fi.id === i.id),
    );
    return [...fromItem, ...others];
  }, [ingredientes, insumos]);

  const selectedInsumo =
    selectedType === 'insumo' ? allInsumos.find((i) => i.id === selectedId) : null;
  const selectedReceta =
    selectedType === 'receta' ? recetasDelItem.find((r) => r.id === selectedId) : null;

  const handleSelect = (v: string) => {
    if (v.startsWith('receta:')) {
      const recetaId = v.slice(7);
      setSelectedId(recetaId);
      setSelectedType('receta');
      const rec = recetasDelItem.find((r) => r.id === recetaId);
      setNombre(`Sin ${rec?.nombre || ''}`);
    } else {
      setSelectedId(v);
      setSelectedType('insumo');
      const ins = allInsumos.find((i) => i.id === v);
      setNombre(`Sin ${ins?.nombre || ''}`);
    }
  };

  const costoAhorro =
    selectedType === 'receta' && selectedReceta
      ? selectedReceta.costo_calculado * (selectedReceta.cantidad || 1)
      : selectedInsumo
        ? (selectedInsumo.costo_por_unidad_base || 0) * (selectedInsumo.cantidad || 1)
        : 0;

  const handleSave = async () => {
    if (!selectedId) return;
    const displayName =
      nombre.trim() ||
      `Sin ${selectedType === 'receta' ? selectedReceta?.nombre : selectedInsumo?.nombre}`;

    if (selectedType === 'receta') {
      await onCreate.mutateAsync({
        item_carta_id: itemId,
        tipo: 'removible',
        nombre: displayName,
        receta_id: selectedId,
        ingrediente_id: null,
        cantidad_ahorro: selectedReceta?.cantidad || 1,
        unidad_ahorro: 'un',
        costo_ahorro: costoAhorro,
      });
    } else {
      await onCreate.mutateAsync({
        item_carta_id: itemId,
        tipo: 'removible',
        nombre: displayName,
        ingrediente_id: selectedId,
        cantidad_ahorro: selectedInsumo?.cantidad || 0,
        unidad_ahorro: selectedInsumo?.unidad || selectedInsumo?.unidad_base || 'un',
        costo_ahorro: costoAhorro,
      });
    }
    onClose();
  };

  const hasDeepGroups = deepGroups && deepGroups.length > 0;
  const otherInsumos = (insumos || []).filter(
    (i) => !ingredientes.some((fi) => fi.id === i.id),
  );
  const selectValue = selectedType === 'receta' ? `receta:${selectedId}` : selectedId;

  return (
    <div className="p-4 border-2 border-dashed rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Nuevo removible</p>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
      <Select value={selectValue} onValueChange={handleSelect}>
        <SelectTrigger>
          <SelectValue placeholder="Seleccionar ingrediente o receta..." />
        </SelectTrigger>
        <SelectContent>
          {recetasDelItem.length > 0 && (
            <SelectGroup>
              <SelectLabel className="text-xs font-semibold text-amber-600">
                — Recetas del item —
              </SelectLabel>
              {recetasDelItem.map((rec) => (
                <SelectItem key={`receta-${rec.id}`} value={`receta:${rec.id}`}>
                  {rec.nombre} ({formatCurrency(rec.costo_calculado * (rec.cantidad || 1))})
                </SelectItem>
              ))}
            </SelectGroup>
          )}
          {hasDeepGroups ? (
            <>
              {deepGroups.map((group) => (
                <SelectGroup key={group.receta_id}>
                  <SelectLabel className="text-xs font-semibold text-primary">
                    — {group.receta_nombre} —
                  </SelectLabel>
                  {group.ingredientes.map((ing) => (
                    <SelectItem key={`${group.receta_id}-${ing.insumo_id}`} value={ing.insumo_id}>
                      {ing.nombre}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
              {otherInsumos.length > 0 && (
                <SelectGroup>
                  <SelectLabel className="text-xs font-semibold text-muted-foreground">
                    — Otros insumos —
                  </SelectLabel>
                  {otherInsumos.map((ins) => (
                    <SelectItem key={ins.id} value={ins.id}>
                      {ins.nombre}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
            </>
          ) : (
            allInsumos.map((ing) => (
              <SelectItem key={ing.id} value={ing.id}>
                {ing.nombre} {ing._fromItem ? '(del item)' : ''}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      <Input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Nombre (ej: Sin Queso)"
        className="text-sm"
      />
      {(selectedInsumo || selectedReceta) && (
        <div className="p-2 bg-muted/50 rounded text-xs">
          <strong>{nombre || `Sin ${selectedReceta?.nombre || selectedInsumo?.nombre}`}</strong>
          <span className="ml-2 text-muted-foreground">
            Ahorro: {formatCurrency(costoAhorro)}
            {selectedType === 'receta' && (
              <Badge
                variant="outline"
                className="ml-2 text-amber-600 border-amber-600/30 text-[10px]"
              >
                Receta
              </Badge>
            )}
          </span>
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>
          Cancelar
        </Button>
        <Button size="sm" onClick={handleSave} disabled={!selectedId || onCreate.isPending}>
          Guardar
        </Button>
      </div>
    </div>
  );
}

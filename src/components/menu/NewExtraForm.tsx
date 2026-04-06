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
import type { NewExtraFormProps, SelectedExtraItem } from './modificadores-types';

export function NewExtraForm({
  itemId,
  ingredientes,
  deepGroups,
  insumos,
  recetas,
  onCreate,
  onClose,
}: NewExtraFormProps) {
  const [tipo, setTipo] = useState<'ingrediente' | 'receta'>('ingrediente');
  const [selectedId, setSelectedId] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [unidad, setUnidad] = useState('un');
  const [precio, setPrecio] = useState(0);
  const [nombre, setNombre] = useState('');

  const hasDeepGroups = deepGroups && deepGroups.length > 0;

  const selectedItem = useMemo((): SelectedExtraItem | undefined => {
    if (tipo === 'receta') return recetas?.find((r) => r.id === selectedId);
    const fromDeep = ingredientes?.find((i) => i.id === selectedId);
    if (fromDeep) return fromDeep;
    return insumos?.find((i) => i.id === selectedId);
  }, [tipo, selectedId, ingredientes, insumos, recetas]);

  const costoCalculado = selectedItem
    ? tipo === 'ingrediente'
      ? (selectedItem.base_unit_cost || 0) * cantidad
      : (selectedItem.calculated_cost || 0) * cantidad
    : 0;

  const handleSelect = (v: string) => {
    setSelectedId(v);
    const item =
      tipo === 'ingrediente'
        ? ingredientes?.find((i) => i.id === v) || insumos?.find((i) => i.id === v)
        : recetas?.find((r) => r.id === v);
    setNombre(`Extra ${item?.name || ''}`);
  };

  const handleSave = async () => {
    if (!selectedId || !precio) return;
    const displayName = nombre.trim() || `Extra ${selectedItem?.name}`;
    await onCreate.mutateAsync({
      item_carta_id: itemId,
      tipo: 'extra',
      nombre: displayName,
      ingrediente_extra_id: tipo === 'ingrediente' ? selectedId : null,
      receta_extra_id: tipo === 'receta' ? selectedId : null,
      cantidad_extra: cantidad,
      unidad_extra: unidad,
      precio_extra: precio,
      costo_extra: costoCalculado,
    });
    onClose();
  };

  return (
    <div className="p-4 border-2 border-dashed rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Nuevo extra</p>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Select
          value={tipo}
          onValueChange={(v) => {
            setTipo(v as 'ingrediente' | 'receta');
            setSelectedId('');
          }}
        >
          <SelectTrigger className="text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ingrediente">Ingrediente</SelectItem>
            <SelectItem value="receta">Receta</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedId} onValueChange={handleSelect}>
          <SelectTrigger className="text-sm">
            <SelectValue placeholder="Seleccionar..." />
          </SelectTrigger>
          <SelectContent>
            {tipo === 'ingrediente' ? (
              hasDeepGroups ? (
                <>
                  {deepGroups.map((group) => (
                    <SelectGroup key={group.receta_id}>
                      <SelectLabel className="text-xs font-semibold text-primary">
                        — {group.receta_nombre} —
                      </SelectLabel>
                      {group.ingredientes.map((ing) => (
                        <SelectItem
                          key={`${group.receta_id}-${ing.insumo_id}`}
                          value={ing.insumo_id}
                        >
                          {ing.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </>
              ) : (
                insumos?.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name}
                  </SelectItem>
                ))
              )
            ) : (
              recetas?.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
      <Input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Nombre (ej: Extra Bacon)"
        className="text-sm"
      />
      <div className="grid grid-cols-3 gap-3">
        <Input
          type="number"
          value={cantidad || ''}
          onChange={(e) => setCantidad(Number(e.target.value))}
          placeholder="Cantidad"
          min={0.01}
          step={0.01}
        />
        <Select value={unidad} onValueChange={setUnidad}>
          <SelectTrigger className="text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="un">unidad</SelectItem>
            <SelectItem value="g">g</SelectItem>
            <SelectItem value="ml">ml</SelectItem>
            <SelectItem value="porcion">porción</SelectItem>
            <SelectItem value="feta">feta</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="number"
          value={precio || ''}
          onChange={(e) => setPrecio(Number(e.target.value))}
          placeholder="Precio ($)"
          min={0}
        />
      </div>
      {selectedItem && precio > 0 && (
        <div className="p-2 bg-muted/50 rounded text-xs space-y-1">
          <div className="flex justify-between">
            <span>Costo:</span>
            <span className="font-mono">{formatCurrency(costoCalculado)}</span>
          </div>
          <div className="flex justify-between">
            <span>Precio:</span>
            <span className="font-mono">{formatCurrency(precio)}</span>
          </div>
          <div className="flex justify-between">
            <span>FC%:</span>
            <Badge
              variant={
                costoCalculado / precio <= 0.32
                  ? 'default'
                  : costoCalculado / precio <= 0.4
                    ? 'secondary'
                    : 'destructive'
              }
              className="text-xs"
            >
              {((costoCalculado / precio) * 100).toFixed(1)}%
            </Badge>
          </div>
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!selectedId || !precio || onCreate.isPending}
        >
          Guardar
        </Button>
      </div>
    </div>
  );
}

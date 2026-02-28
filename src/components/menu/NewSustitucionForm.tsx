import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import type { NewSustitucionFormProps } from './modificadores-types';

export function NewSustitucionForm({ itemId, insumos, onCreate, onClose }: NewSustitucionFormProps) {
  const [originalId, setOriginalId] = useState('');
  const [nuevoId, setNuevoId] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [unidad, setUnidad] = useState('un');
  const [diferenciaPrecio, setDiferenciaPrecio] = useState(0);
  const [nombre, setNombre] = useState('');

  const allInsumos = insumos || [];
  const original = allInsumos.find((i) => i.id === originalId);
  const nuevo = allInsumos.find((i) => i.id === nuevoId);

  const diferenciaCosto =
    original && nuevo
      ? (nuevo.costo_por_unidad_base || 0) * cantidad -
        (original.costo_por_unidad_base || 0) * cantidad
      : 0;

  const handleSave = async () => {
    if (!originalId || !nuevoId) return;
    const displayName = nombre.trim() || `Cambiar ${original?.nombre} por ${nuevo?.nombre}`;
    await onCreate.mutateAsync({
      item_carta_id: itemId,
      tipo: 'sustitucion',
      nombre: displayName,
      ingrediente_original_id: originalId,
      ingrediente_nuevo_id: nuevoId,
      cantidad_nuevo: cantidad,
      unidad_nuevo: unidad,
      diferencia_precio: diferenciaPrecio,
      diferencia_costo: diferenciaCosto,
    });
    onClose();
  };

  return (
    <div className="p-4 border-2 border-dashed rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Nueva sustitución</p>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Original (se reemplaza)
          </label>
          <Select
            value={originalId}
            onValueChange={(v) => {
              setOriginalId(v);
              const o = allInsumos.find((i) => i.id === v);
              if (nuevo) setNombre(`Cambiar ${o?.nombre} por ${nuevo.nombre}`);
            }}
          >
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Seleccionar..." />
            </SelectTrigger>
            <SelectContent>
              {allInsumos.map((i) => (
                <SelectItem key={i.id} value={i.id}>
                  {i.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Nuevo (se agrega)</label>
          <Select
            value={nuevoId}
            onValueChange={(v) => {
              setNuevoId(v);
              const n = allInsumos.find((i) => i.id === v);
              if (original) setNombre(`Cambiar ${original.nombre} por ${n?.nombre}`);
            }}
          >
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Seleccionar..." />
            </SelectTrigger>
            <SelectContent>
              {allInsumos
                .filter((i) => i.id !== originalId)
                .map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.nombre}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Nombre (ej: Cambiar Cheddar por Provoleta)"
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
            <SelectItem value="feta">feta</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="number"
          value={diferenciaPrecio}
          onChange={(e) => setDiferenciaPrecio(Number(e.target.value))}
          placeholder="Dif. precio ($)"
        />
      </div>
      {original && nuevo && (
        <div className="p-2 bg-muted/50 rounded text-xs space-y-1">
          <div className="flex justify-between">
            <span>Dif. costo:</span>
            <span
              className={`font-mono ${diferenciaCosto > 0 ? 'text-destructive' : 'text-green-600'}`}
            >
              {diferenciaCosto > 0 ? '+' : ''}
              {formatCurrency(diferenciaCosto)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Cargo al cliente:</span>
            <span className="font-mono">
              {diferenciaPrecio === 0 ? 'Gratis' : formatCurrency(diferenciaPrecio)}
            </span>
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
          disabled={!originalId || !nuevoId || onCreate.isPending}
        >
          Guardar
        </Button>
      </div>
    </div>
  );
}

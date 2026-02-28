import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, Save, Package } from 'lucide-react';
import { LoadingButton } from '@/components/ui/loading-button';
import { useFichaTecnica, useFichaTecnicaMutations } from '@/hooks/useMenu';
import { useInsumos } from '@/hooks/useInsumos';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/states';
import { formatCurrency } from '@/lib/formatters';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  producto: any;
}

const UNIDADES = [
  { value: 'g', label: 'Gramos (g)' },
  { value: 'kg', label: 'Kilogramos (kg)' },
  { value: 'ml', label: 'Mililitros (ml)' },
  { value: 'l', label: 'Litros (l)' },
  { value: 'un', label: 'Unidades' },
];



function calcSubtotal(cantidad: number, costoUnit: number, unidad: string) {
  if (!cantidad || !costoUnit) return 0;
  const mult = unidad === 'kg' || unidad === 'l' ? 1000 : 1;
  return cantidad * costoUnit * mult;
}

export function FichaTecnicaModal({ open, onOpenChange, producto }: Props) {
  const { data: fichaActual } = useFichaTecnica(producto?.id);
  const { save } = useFichaTecnicaMutations();
  const { data: insumos } = useInsumos();

  const ingredientesDisponibles = useMemo(() => {
    return (
      insumos?.filter((i: any) => i.tipo_item === 'ingrediente' || i.tipo_item === 'insumo') || []
    );
  }, [insumos]);

  const [items, setItems] = useState<any[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (fichaActual) {
      setItems(
        fichaActual.map((item: any) => ({
          id: item.id,
          insumo_id: item.insumo_id,
          cantidad: item.cantidad,
          unidad: item.unidad,
          insumo: item.insumos,
        })),
      );
      setHasChanges(false);
    }
  }, [fichaActual, open]);

  const addItem = () => {
    setItems([...items, { id: null, insumo_id: '', cantidad: 0, unidad: 'g', insumo: null }]);
    setHasChanges(true);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === 'insumo_id') {
      newItems[index].insumo = ingredientesDisponibles.find((i: any) => i.id === value);
    }
    setItems(newItems);
    setHasChanges(true);
  };

  const costoTotal = useMemo(() => {
    return items.reduce((total, item) => {
      const costoUnit = item.insumo?.costo_por_unidad_base || 0;
      return total + calcSubtotal(item.cantidad, costoUnit, item.unidad);
    }, 0);
  }, [items]);

  const handleSave = async () => {
    if (!producto?.id) return;
    await save.mutateAsync({
      menu_producto_id: producto.id,
      items: items
        .filter((i) => i.insumo_id && i.cantidad > 0)
        .map((item) => ({
          insumo_id: item.insumo_id,
          cantidad: item.cantidad,
          unidad: item.unidad,
        })),
    });
    setHasChanges(false);
  };

  if (!producto) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ficha Técnica: {producto.nombre}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Ingrediente / Insumo</TableHead>
                  <TableHead className="w-[100px]">Cantidad</TableHead>
                  <TableHead className="w-[120px]">Unidad</TableHead>
                  <TableHead className="text-right">Costo Unit.</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32">
                      <EmptyState
                        icon={Package}
                        title="Sin ingredientes"
                        description="Agregá ingredientes a la ficha técnica"
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item, index) => {
                    const costoUnit = item.insumo?.costo_por_unidad_base || 0;
                    const subtotal = calcSubtotal(item.cantidad, costoUnit, item.unidad);
                    const usedIds = items
                      .filter((_, idx) => idx !== index)
                      .map((i) => i.insumo_id)
                      .filter(Boolean);
                    const filteredInsumos = ingredientesDisponibles.filter(
                      (i: any) => !usedIds.includes(i.id),
                    );

                    return (
                      <TableRow key={index}>
                        <TableCell>
                          <Select
                            value={item.insumo_id || 'none'}
                            onValueChange={(v) =>
                              updateItem(index, 'insumo_id', v === 'none' ? '' : v)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Seleccionar...</SelectItem>
                              {filteredInsumos.map((ing: any) => (
                                <SelectItem key={ing.id} value={ing.id}>
                                  {ing.nombre} (${ing.costo_por_unidad_base?.toFixed(2)}/
                                  {ing.unidad_base})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.cantidad || ''}
                            onChange={(e) => updateItem(index, 'cantidad', Number(e.target.value))}
                            className="w-24"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={item.unidad}
                            onValueChange={(v) => updateItem(index, 'unidad', v)}
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {UNIDADES.map((u) => (
                                <SelectItem key={u.value} value={u.value}>
                                  {u.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {costoUnit > 0 ? formatCurrency(costoUnit) : '—'}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {subtotal > 0 ? formatCurrency(subtotal) : '—'}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => removeItem(index)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <Button variant="outline" onClick={addItem} className="w-full">
            <Plus className="w-4 h-4 mr-2" /> Agregar Ingrediente
          </Button>

          {/* RESUMEN */}
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Costo Total de la Receta</p>
                <p className="text-2xl font-bold font-mono text-primary">
                  {formatCurrency(costoTotal)}
                </p>
              </div>
              {producto.menu_precios?.precio_base > 0 && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Food Cost</p>
                  <Badge
                    variant={
                      (costoTotal / producto.menu_precios.precio_base) * 100 <= 32
                        ? 'default'
                        : (costoTotal / producto.menu_precios.precio_base) * 100 <= 40
                          ? 'secondary'
                          : 'destructive'
                    }
                    className="text-lg px-3 py-1"
                  >
                    {((costoTotal / producto.menu_precios.precio_base) * 100).toFixed(1)}%
                  </Badge>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {hasChanges ? 'Cancelar' : 'Cerrar'}
            </Button>
            {hasChanges && (
              <LoadingButton loading={save.isPending} onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" /> Guardar Cambios
              </LoadingButton>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

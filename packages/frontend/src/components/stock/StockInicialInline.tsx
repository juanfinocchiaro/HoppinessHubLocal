import { useState } from 'react';
import { Save, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useStockInicialMasivo, type StockItem } from '@/hooks/pos/useStock';

interface StockInicialInlineProps {
  branchId: string;
  items: StockItem[];
}

export function StockInicialInline({ branchId, items }: StockInicialInlineProps) {
  const [cantidades, setCantidades] = useState<Record<string, string>>({});
  const mutation = useStockInicialMasivo(branchId);

  const handleChange = (insumoId: string, value: string) => {
    setCantidades((prev) => ({ ...prev, [insumoId]: value }));
  };

  const handleSave = () => {
    const payload = items
      .map((it) => ({
        insumo_id: it.insumo_id,
        cantidad: parseFloat(cantidades[it.insumo_id] || '0') || 0,
      }))
      .filter((it) => it.cantidad > 0);
    mutation.mutate(payload);
  };

  const filledCount = Object.values(cantidades).filter((v) => parseFloat(v) > 0).length;

  return (
    <div className="space-y-4">
      <Alert>
        <Package className="h-4 w-4" />
        <AlertDescription>
          Tu local tiene <strong>{items.length} insumos</strong> configurados. Cargá las cantidades
          iniciales para comenzar a trackear stock.
        </AlertDescription>
      </Alert>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Insumo</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead className="w-32">Cantidad</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((it) => (
              <TableRow key={it.insumo_id}>
                <TableCell className="font-medium">{it.nombre}</TableCell>
                <TableCell className="text-muted-foreground">{it.unidad}</TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={cantidades[it.insumo_id] ?? ''}
                    onChange={(e) => handleChange(it.insumo_id, e.target.value)}
                    placeholder="0"
                    className="h-8 w-28 tabular-nums"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filledCount} de {items.length} con cantidad
        </p>
        <Button onClick={handleSave} disabled={mutation.isPending || filledCount === 0}>
          <Save className="w-4 h-4 mr-1" />
          Guardar stock inicial
        </Button>
      </div>
    </div>
  );
}

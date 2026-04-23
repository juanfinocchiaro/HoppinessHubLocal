/**
 * CierreStockModal - Cargar stock de cierre mensual (físico por insumo, calcula merma)
 */
import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useStockCierrePeriod,
  useSaveCierreMensual,
  type CierreInsumoRow,
} from '@/hooks/pos/useStockCierre';

interface CierreStockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
}

const MONTHS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const current = new Date();
const defaultYear = current.getFullYear();
const defaultMonth = String(current.getMonth() + 1).padStart(2, '0');

export function CierreStockModal({ open, onOpenChange, branchId }: CierreStockModalProps) {
  const [year, setYear] = useState(defaultYear);
  const [month, setMonth] = useState(defaultMonth);
  const periodo = `${year}-${month}`;
  const { data: rows = [], isLoading } = useStockCierrePeriod(branchId, periodo);
  const saveMutation = useSaveCierreMensual(branchId);
  const [fisico, setFisico] = useState<Record<string, string>>({});

  const itemsToSave = useMemo(() => {
    return rows
      .filter((r) => {
        const v = fisico[r.insumo_id];
        return v != null && v !== '' && !Number.isNaN(Number(v)) && Number(v) >= 0;
      })
      .map((r) => ({
        insumo_id: r.insumo_id,
        stock_cierre_fisico: Number(fisico[r.insumo_id] ?? 0),
      }));
  }, [rows, fisico]);

  const handleSave = async () => {
    if (itemsToSave.length === 0) return;
    await saveMutation.mutateAsync({ periodo, items: itemsToSave });
    setFisico({});
    onOpenChange(false);
  };

  const years = Array.from({ length: 5 }, (_, i) => defaultYear - i);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cargar stock de cierre mensual</DialogTitle>
          <DialogDescription>
            Elegí el período. Se muestra stock esperado (apertura + compras - ventas). Ingresá el
            stock físico por insumo; se calculará la merma al guardar.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <div>
            <Label className="text-xs">Año</Label>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Mes</Label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Cargando datos del período…</div>
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No hay insumos con movimiento en este período ni stock actual.
          </p>
        ) : (
          <ScrollArea className="h-[280px] rounded-md border p-2">
            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-2 text-xs font-medium text-muted-foreground">
                <span>Insumo</span>
                <span className="text-right">Esperado</span>
                <span className="text-right">Físico</span>
                <span className="text-right">Merma</span>
              </div>
              {rows.map((r: CierreInsumoRow) => {
                const f = fisico[r.insumo_id];
                const fisicoNum = f !== undefined && f !== '' ? Number(f) : NaN;
                const merma =
                  !Number.isNaN(fisicoNum) && fisicoNum >= 0
                    ? Math.max(0, r.stock_esperado - fisicoNum)
                    : null;
                return (
                  <div key={r.insumo_id} className="grid grid-cols-4 gap-2 items-center">
                    <span className="truncate text-sm">{r.insumo_nombre}</span>
                    <span className="text-right tabular-nums text-sm">
                      {r.stock_esperado} {r.unidad}
                    </span>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      placeholder="0"
                      className="h-8 text-right"
                      value={fisico[r.insumo_id] ?? ''}
                      onChange={(e) =>
                        setFisico((prev) => ({ ...prev, [r.insumo_id]: e.target.value }))
                      }
                    />
                    <span className="text-right tabular-nums text-sm">
                      {merma != null ? `${merma} ${r.unidad}` : '-'}
                    </span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={itemsToSave.length === 0 || saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Guardando…' : 'Guardar cierre'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

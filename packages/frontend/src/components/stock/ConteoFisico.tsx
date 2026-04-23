import { useState, useMemo } from 'react';
import { Save, CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useStockConteo, type StockItem } from '@/hooks/pos/useStock';
import { format } from 'date-fns';

interface ConteoFisicoProps {
  branchId: string;
  items: StockItem[];
  onClose: () => void;
}

export function ConteoFisico({ branchId, items, onClose }: ConteoFisicoProps) {
  const [reales, setReales] = useState<Record<string, string>>({});
  const [notaGeneral, setNotaGeneral] = useState('');
  const [conteoId, setConteoId] = useState<string | null>(null);
  const { crearBorrador, guardarItems, confirmarConteo } = useStockConteo(branchId);

  const hoy = format(new Date(), 'yyyy-MM-dd');
  const periodo = format(new Date(), 'yyyy-MM');

  const contados = Object.values(reales).filter((v) => v !== '').length;
  const progress = items.length > 0 ? (contados / items.length) * 100 : 0;

  const resumen = useMemo(() => {
    let conDif = 0,
      sinDif = 0,
      valorDif = 0;
    items.forEach((it) => {
      const real = reales[it.insumo_id];
      if (real === '' || real === undefined) return;
      const realNum = parseFloat(real);
      if (isNaN(realNum)) return;
      const dif = realNum - it.cantidad;
      if (Math.abs(dif) > 0.01) {
        conDif++;
        valorDif += Math.abs(dif * it.costo_unitario);
      } else {
        sinDif++;
      }
    });
    return { conDif, sinDif, valorDif };
  }, [reales, items]);

  const handleGuardarProgreso = async () => {
    let id = conteoId;
    if (!id) {
      const result = await crearBorrador.mutateAsync({
        fecha: hoy,
        periodo,
        nota_general: notaGeneral,
      });
      id = result.id;
      setConteoId(id);
    }
    await guardarItems.mutateAsync({
      conteo_id: id,
      items: items.map((it) => ({
        insumo_id: it.insumo_id,
        stock_teorico: it.cantidad,
        stock_real:
          reales[it.insumo_id] !== undefined && reales[it.insumo_id] !== ''
            ? parseFloat(reales[it.insumo_id])
            : null,
        costo_unitario: it.costo_unitario,
      })),
    });
  };

  const handleConfirmar = async () => {
    let id = conteoId;
    if (!id) {
      const result = await crearBorrador.mutateAsync({
        fecha: hoy,
        periodo,
        nota_general: notaGeneral,
      });
      id = result.id;
      setConteoId(id);
    }
    const filledItems = items
      .filter((it) => reales[it.insumo_id] !== undefined && reales[it.insumo_id] !== '')
      .map((it) => ({
        insumo_id: it.insumo_id,
        stock_teorico: it.cantidad,
        stock_real: parseFloat(reales[it.insumo_id]),
        costo_unitario: it.costo_unitario,
      }));
    await confirmarConteo.mutateAsync({
      conteo_id: id,
      items: filledItems,
      nota_general: notaGeneral,
    });
    onClose();
  };

  const getDifColor = (teorico: number, realStr: string) => {
    if (realStr === '' || realStr === undefined) return '';
    const real = parseFloat(realStr);
    if (isNaN(real)) return '';
    const dif = real - teorico;
    if (Math.abs(dif) < 0.01) return 'text-success';
    const pct = teorico > 0 ? Math.abs(dif / teorico) * 100 : 100;
    return pct > 10 ? 'text-destructive' : 'text-warning';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Volver
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGuardarProgreso}
            disabled={crearBorrador.isPending || guardarItems.isPending}
          >
            <Save className="w-4 h-4 mr-1" /> Guardar progreso
          </Button>
          <Button
            size="sm"
            onClick={handleConfirmar}
            disabled={contados === 0 || confirmarConteo.isPending}
          >
            <CheckCircle className="w-4 h-4 mr-1" /> Confirmar conteo
          </Button>
        </div>
      </div>

      {/* Progress + resumen */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">
            {contados} de {items.length} contados
          </span>
          <Progress value={progress} className="flex-1 h-2" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold text-success">{resumen.sinDif}</p>
              <p className="text-[10px] text-muted-foreground">Sin diferencia</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold text-destructive">{resumen.conDif}</p>
              <p className="text-[10px] text-muted-foreground">Con diferencia</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold">${resumen.valorDif.toFixed(0)}</p>
              <p className="text-[10px] text-muted-foreground">Valor diferencias</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Textarea
        value={notaGeneral}
        onChange={(e) => setNotaGeneral(e.target.value)}
        placeholder="Nota general del conteo (opcional)..."
        rows={2}
        className="text-sm"
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Insumo</TableHead>
              <TableHead className="text-right">Teórico</TableHead>
              <TableHead className="w-28">Real</TableHead>
              <TableHead className="text-right">Dif</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((it) => {
              const realStr = reales[it.insumo_id] ?? '';
              const realNum = parseFloat(realStr);
              const dif = !isNaN(realNum) ? realNum - it.cantidad : null;
              return (
                <TableRow key={it.insumo_id}>
                  <TableCell className="font-medium text-sm">{it.nombre}</TableCell>
                  <TableCell className="text-right tabular-nums">{it.cantidad}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={realStr}
                      onChange={(e) =>
                        setReales((prev) => ({ ...prev, [it.insumo_id]: e.target.value }))
                      }
                      placeholder="-"
                      className="h-8 w-24 tabular-nums"
                    />
                  </TableCell>
                  <TableCell
                    className={`text-right tabular-nums font-medium ${getDifColor(it.cantidad, realStr)}`}
                  >
                    {dif !== null ? (dif >= 0 ? '+' : '') + dif.toFixed(1) : '-'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

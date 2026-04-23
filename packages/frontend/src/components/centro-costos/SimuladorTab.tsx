import { useState, useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/states';
import { Calculator, Target, ArrowRight } from 'lucide-react';
import { fmt, fmtPct, neto, calcSugerido, fcColor, badgeVar } from './helpers';
import type { EI, GlobalStats } from './types';

interface SimuladorTabProps {
  items: EI[];
  gs: GlobalStats;
  sim: Record<string, number>;
  setSim: (v: Record<string, number>) => void;
  onApply: () => void;
}

export function SimuladorTab({ items, gs, sim, setSim, onApply }: SimuladorTabProps) {
  const [bulkPct, setBulkPct] = useState<number>(0);
  const workable = useMemo(() => items.filter((i) => i.hasComp && i.hasPrice), [items]);

  const simItems = useMemo(
    () =>
      workable.map((i) => {
        const np = sim[i.id] ?? i.precio;
        const nn = neto(np);
        const nfc = np > 0 ? (i.costo / nn) * 100 : 0;
        const nm = nn - i.costo;
        const changed = Math.abs(np - i.precio) > 0.5;
        return { ...i, np, nfc, nm, changed, dm: nm - i.margen };
      }),
    [workable, sim],
  );

  const impact = useMemo(() => {
    const n = simItems.length || 1;
    const cmv = simItems.reduce((s, i) => s + i.nfc, 0) / n;
    return { cmv, count: simItems.filter((i) => i.changed).length };
  }, [simItems]);

  const doBulk = () => {
    if (!bulkPct) return;
    const n: Record<string, number> = {};
    workable.forEach((i) => { n[i.id] = Math.round(i.precio * (1 + bulkPct / 100)); });
    setSim(n);
  };
  const doTarget = () => {
    const n: Record<string, number> = {};
    workable.forEach((i) => { n[i.id] = Math.round(calcSugerido(i.costo, i.fcObj) / 100) * 100; });
    setSim(n);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Simular ajuste de precios</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Input type="number" className="w-20 h-8" placeholder="%" value={bulkPct || ''} onChange={(e) => setBulkPct(parseFloat(e.target.value) || 0)} />
                <Button size="sm" variant="outline" onClick={doBulk} disabled={!bulkPct}>Subir todo {bulkPct > 0 ? `+${bulkPct}%` : ''}</Button>
              </div>
              <Button size="sm" variant="outline" onClick={doTarget}><Target className="w-3.5 h-3.5 mr-1.5" /> Ajustar a CMV objetivo</Button>
              <Button size="sm" variant="ghost" onClick={() => setSim({})}>Limpiar</Button>
            </div>
            <p className="text-xs text-muted-foreground">También podés editar precios individuales en la tabla.</p>
          </CardContent>
        </Card>
        <Card className={impact.count > 0 ? 'border-primary' : ''}>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Impacto simulado</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm"><span>CMV actual:</span><span className="font-mono font-medium">{fmtPct(gs.cmv)}</span></div>
            <div className="flex justify-between text-sm">
              <span>CMV simulado:</span>
              <span className={`font-mono font-bold ${impact.cmv < gs.cmv ? 'text-green-600' : impact.cmv > gs.cmv ? 'text-red-600' : ''}`}>{fmtPct(impact.cmv)}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground"><span>Modificados:</span><span>{impact.count}</span></div>
            {impact.count > 0 && (
              <Button size="sm" className="w-full mt-2" onClick={onApply}><ArrowRight className="w-3.5 h-3.5 mr-1.5" /> Aplicar estos precios</Button>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="text-xs">
              <TableHead className="w-[220px]">Item</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead className="text-right">Costo</TableHead>
              <TableHead className="text-right">P. Actual</TableHead>
              <TableHead className="text-right">FC% Actual</TableHead>
              <TableHead className="text-right w-[130px]">P. Nuevo</TableHead>
              <TableHead className="text-right">FC% Nuevo</TableHead>
              <TableHead className="text-right">Variación</TableHead>
              <TableHead className="text-right">Δ Margen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {simItems.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="h-32"><EmptyState icon={Calculator} title="Sin items" description="Necesitás items con precio y composición" /></TableCell></TableRow>
            ) : (
              simItems.map((i) => {
                const diffPct = i.precio > 0 ? ((i.np - i.precio) / i.precio) * 100 : 0;
                const diffAbs = i.np - i.precio;
                return (
                  <TableRow key={i.id} className={i.changed ? 'bg-primary/5' : ''}>
                    <TableCell className="font-medium text-sm">{i.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{i.cat}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(i.costo)}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{fmt(i.precio)}</TableCell>
                    <TableCell className="text-right"><Badge variant={badgeVar[i.color]} className="text-xs">{fmtPct(i.fc)}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Input type="number" className="h-7 w-[110px] text-right font-mono text-sm ml-auto" value={sim[i.id] ?? i.precio} onChange={(e) => setSim({ ...sim, [i.id]: parseFloat(e.target.value) || 0 })} />
                    </TableCell>
                    <TableCell className="text-right"><Badge variant={badgeVar[fcColor(i.nfc, i.fcObj)]} className="text-xs">{fmtPct(i.nfc)}</Badge></TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {i.changed ? (
                        <span className={diffAbs > 0 ? 'text-green-600' : diffAbs < 0 ? 'text-red-600' : 'text-muted-foreground'}>
                          {diffAbs > 0 ? '+' : ''}{diffPct.toFixed(1)}% ({diffAbs > 0 ? '+' : ''}{fmt(diffAbs)})
                        </span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {i.changed ? (
                        <span className={i.dm > 0 ? 'text-green-600' : 'text-red-600'}>{i.dm > 0 ? '+' : ''}{fmt(i.dm)}</span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

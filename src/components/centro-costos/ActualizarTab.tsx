import { useState, useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingButton } from '@/components/ui/loading-button';
import { EmptyState } from '@/components/ui/states';
import { Trash2, Save, DollarSign, ArrowRight } from 'lucide-react';
import { fmt, fmtPct, neto, fcColor, badgeVar } from './helpers';
import type { EI, PriceChange, ItemCartaMutations } from './types';

interface ActualizarTabProps {
  items: EI[];
  pending: Record<string, number>;
  setPending: (v: Record<string, number>) => void;
  mutations: ItemCartaMutations;
  userId?: string;
}

export function ActualizarTab({ items, pending, setPending, mutations, userId }: ActualizarTabProps) {
  const [applying, setApplying] = useState(false);
  const changes = useMemo(
    () =>
      Object.entries(pending)
        .map(([id, np]) => {
          const i = items.find((x) => x.id === id);
          if (!i || Math.abs(np - i.precio) < 1) return null;
          const nn = neto(np),
            nfc = i.costo > 0 ? (i.costo / nn) * 100 : 0;
          return {
            ...i, np, nfc, nm: nn - i.costo,
            delta: np - i.precio,
            deltaPct: i.precio > 0 ? ((np - i.precio) / i.precio) * 100 : 0,
          };
        })
        .filter((x): x is PriceChange => x !== null),
    [pending, items],
  );

  const remove = (id: string) => {
    const n = { ...pending };
    delete n[id];
    setPending(n);
  };

  const applyAll = async () => {
    setApplying(true);
    try {
      for (const c of changes) {
        await mutations.cambiarPrecio.mutateAsync({
          itemId: c.id, precioAnterior: c.precio, precioNuevo: c.np,
          motivo: 'Ajuste desde Control de Costos', userId,
        });
      }
      setPending({});
    } finally {
      setApplying(false);
    }
  };

  if (changes.length === 0)
    return (
      <div className="py-16">
        <EmptyState icon={DollarSign} title="Sin cambios pendientes" description="Usá el Simulador para probar precios y aplicalos acá." />
      </div>
    );

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold">{changes.length} cambio{changes.length !== 1 ? 's' : ''} pendiente{changes.length !== 1 ? 's' : ''}</p>
              <p className="text-sm text-muted-foreground">Cada cambio queda registrado en el historial.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPending({})}>Descartar</Button>
              <LoadingButton loading={applying} onClick={applyAll}><Save className="w-4 h-4 mr-2" /> Confirmar</LoadingButton>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="text-xs">
              <TableHead className="w-[220px]">Item</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead className="text-right">P. Actual</TableHead>
              <TableHead className="text-center" />
              <TableHead className="text-right">P. Nuevo</TableHead>
              <TableHead className="text-right">Variación</TableHead>
              <TableHead className="text-right">FC% → Nuevo</TableHead>
              <TableHead className="text-right">Margen</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {changes.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium text-sm">{c.nombre}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.cat}</TableCell>
                <TableCell className="text-right font-mono text-sm">{fmt(c.precio)}</TableCell>
                <TableCell className="text-center"><ArrowRight className="w-4 h-4 mx-auto text-muted-foreground" /></TableCell>
                <TableCell className="text-right font-mono text-sm font-bold">{fmt(c.np)}</TableCell>
                <TableCell className="text-right font-mono text-sm">
                  <span className={c.delta > 0 ? 'text-green-600' : 'text-red-600'}>
                    {c.delta > 0 ? '+' : ''}{fmt(c.delta)} ({c.deltaPct > 0 ? '+' : ''}{c.deltaPct.toFixed(1)}%)
                  </span>
                </TableCell>
                <TableCell className="text-right text-sm">
                  <span className="text-muted-foreground">{fmtPct(c.fc)}</span> →{' '}
                  <Badge variant={badgeVar[fcColor(c.nfc, c.fcObj)]} className="text-xs">{fmtPct(c.nfc)}</Badge>
                </TableCell>
                <TableCell className="text-right font-mono text-sm text-green-600">{fmt(c.nm)}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(c.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

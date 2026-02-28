import React, { useState, useMemo, useEffect } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataToolbar } from '@/components/ui/data-table-pro';
import { EmptyState } from '@/components/ui/states';
import {
  CheckCircle, Package, DollarSign, ChevronDown, ChevronRight, Target,
} from 'lucide-react';
import { ItemExpandedPanel } from './ItemExpandedPanel';
import { fmt, fmtPct, badgeVar, txtColor } from './helpers';
import type { EI, CG, GlobalStats } from './types';

interface AnalisisTabProps {
  items: EI[];
  cats: CG[];
  gs: GlobalStats;
  loading: boolean;
  onQueuePrice?: (id: string, price: number) => void;
}

export function AnalisisTab({ cats, gs, loading, onQueuePrice }: AnalisisTabProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'ok' | 'warn' | 'danger'>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  useEffect(() => {
    setExpanded(new Set(cats.map((c) => c.id)));
  }, [cats.length]);

  const toggle = (id: string) =>
    setExpanded((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const filtered = useMemo(
    () =>
      cats
        .map((g) => ({
          ...g,
          items: g.items.filter((i) => {
            if (!i.nombre.toLowerCase().includes(search.toLowerCase())) return false;
            if (filter !== 'all' && i.color !== filter) return false;
            return true;
          }),
        }))
        .filter((g) => g.items.length > 0),
    [cats, search, filter],
  );

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" /> CMV Promedio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${txtColor[gs.gColor]}`}>{fmtPct(gs.cmv)}</p>
            <p className="text-xs text-muted-foreground">Obj: {fmtPct(gs.obj)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" /> Margen Prom.
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fmt(gs.mg)}</p>
            <p className="text-xs text-muted-foreground">por unidad</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-green-500" /> Semáforo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 text-sm">
              <span className="text-green-600 font-bold">{gs.ok} ✔</span>
              <span className="text-yellow-600 font-bold">{gs.warn} ⚠</span>
              <span className="text-red-600 font-bold">{gs.danger} ✕</span>
            </div>
            <p className="text-xs text-muted-foreground">{gs.total} items</p>
          </CardContent>
        </Card>
        <Card className={gs.sinP > 0 ? 'border-yellow-300' : ''}>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground">Sin Precio</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${gs.sinP > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
              {gs.sinP}
            </p>
          </CardContent>
        </Card>
        <Card className={gs.sinC > 0 ? 'border-yellow-300' : ''}>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground">Sin Composición</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${gs.sinC > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
              {gs.sinC}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <DataToolbar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Buscar item..." />
        <div className="flex gap-2">
          {(['all', 'ok', 'warn', 'danger'] as const).map((f) => (
            <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)}>
              {f === 'all' ? 'Todos' : f === 'ok' ? '✔ OK' : f === 'warn' ? '⚠ Atención' : '✕ Críticos'}
            </Button>
          ))}
        </div>
      </div>

      {/* Table by category */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (<Skeleton key={i} className="h-24 w-full" />))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Package} title="Sin items" description="Creá un item de carta" />
      ) : (
        <div className="space-y-2">
          {filtered.map((g) => (
            <div key={g.id} className={`border rounded-lg overflow-hidden ${g.hidden ? 'border-amber-300' : ''}`}>
              <button
                className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${g.hidden ? 'bg-amber-50 hover:bg-amber-100/80 dark:bg-amber-950/20 dark:hover:bg-amber-950/30' : 'bg-muted/40 hover:bg-muted/60'}`}
                onClick={() => toggle(g.id)}
              >
                <div className="flex items-center gap-3">
                  {expanded.has(g.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <span className={`font-semibold text-sm ${g.hidden ? 'text-amber-700 dark:text-amber-400' : ''}`}>{g.nombre}</span>
                  <Badge variant="outline" className="text-xs">{g.items.length}</Badge>
                  {g.hidden && (
                    <Badge className="text-xs font-normal bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400">
                      Oculta en Carta
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-xs text-muted-foreground">CMV</span>
                  <Badge variant={badgeVar[g.color]}>{fmtPct(g.cmv)}</Badge>
                  <span className="text-xs text-muted-foreground">Obj {fmtPct(g.obj)}</span>
                  <span className="text-xs text-muted-foreground">Margen {fmt(g.margen)}</span>
                </div>
              </button>
              {expanded.has(g.id) && (
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead className="w-[220px]">Item</TableHead>
                      <TableHead className="text-right">Costo</TableHead>
                      <TableHead className="text-right"><span>P. Carta</span> <span className="text-muted-foreground font-normal">(c/IVA)</span></TableHead>
                      <TableHead className="text-right"><span>P. Neto</span> <span className="text-muted-foreground font-normal">(s/IVA)</span></TableHead>
                      <TableHead className="text-right">Obj.</TableHead>
                      <TableHead className="text-right">FC%</TableHead>
                      <TableHead className="text-right">Margen</TableHead>
                      <TableHead className="text-right">Sugerido</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {g.items.map((i) => {
                      const gap = i.pSug - i.precio;
                      const isOpen = expandedItemId === i.id;
                      return (
                        <React.Fragment key={i.id}>
                          <TableRow
                            className={`cursor-pointer transition-colors ${isOpen ? 'bg-primary/5' : ''} ${!i.hasComp ? 'opacity-50' : ''}`}
                            onClick={() => setExpandedItemId(isOpen ? null : i.id)}
                          >
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {isOpen ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                                <div>
                                  <p className="font-medium text-sm">{i.nombre}</p>
                                  {!i.hasComp && <p className="text-xs text-yellow-600">⚠ Sin composición</p>}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">{i.costo > 0 ? fmt(i.costo) : '—'}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{fmt(i.precio)}</TableCell>
                            <TableCell className="text-right font-mono text-sm text-muted-foreground">{i.hasPrice ? fmt(i.pNeto) : '—'}</TableCell>
                            <TableCell className="text-right font-mono text-sm text-muted-foreground">{fmtPct(i.fcObj)}</TableCell>
                            <TableCell className="text-right">
                              {i.hasComp && i.hasPrice ? <Badge variant={badgeVar[i.color]}>{fmtPct(i.fc)}</Badge> : '—'}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {i.hasComp && i.hasPrice ? (
                                <span className={i.margen > 0 ? 'text-green-600' : 'text-red-600'}>{fmt(i.margen)}</span>
                              ) : '—'}
                            </TableCell>
                            <TableCell className="text-right">
                              {i.hasComp && i.pSug > 0
                                ? (() => {
                                    const rounded = Math.round(i.pSug / 100) * 100;
                                    const diffPct = i.precio > 0 ? ((rounded - i.precio) / i.precio) * 100 : 0;
                                    const diffAbs = rounded - i.precio;
                                    const isUp = diffAbs > 0;
                                    const isDown = diffAbs < 0;
                                    return (
                                      <div className="flex flex-col items-end gap-0.5">
                                        <span className={`font-mono text-sm ${gap > 100 ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>{fmt(i.pSug)}</span>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); onQueuePrice?.(i.id, rounded); }}
                                          className="font-mono text-xs text-primary hover:text-primary/80 hover:underline cursor-pointer transition-colors"
                                          title="Aplicar precio redondeado"
                                        >
                                          ≈ {fmt(rounded)}
                                        </button>
                                        {Math.abs(diffAbs) > 0 && (
                                          <span className={`text-[10px] font-mono ${isUp ? 'text-green-600' : isDown ? 'text-red-600' : 'text-muted-foreground'}`}>
                                            {isUp ? '+' : ''}{diffPct.toFixed(1)}% ({isUp ? '+' : ''}{fmt(diffAbs)})
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })()
                                : '—'}
                            </TableCell>
                          </TableRow>
                          {isOpen && (
                            <TableRow>
                              <TableCell colSpan={8} className="p-0">
                                <ItemExpandedPanel item={i.raw} onClose={() => setExpandedItemId(null)} onDeleted={() => setExpandedItemId(null)} />
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          ))}
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">CMV Global</p>
              <p className="text-xs text-muted-foreground">Objetivo: {fmtPct(gs.obj)}</p>
            </div>
            <Badge variant={badgeVar[gs.gColor]} className="text-lg px-4 py-1.5">{fmtPct(gs.cmv)}</Badge>
          </div>
        </div>
      )}
    </div>
  );
}

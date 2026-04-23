import { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  XCircle,
  CircleDot,
  Package,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { StockAjustePopover } from './StockAjustePopover';
import { StockUmbralesPopover } from './StockUmbralesPopover';
import { StockHistorial } from './StockHistorial';
import { EmptyState } from '@/components/ui/states/empty-state';
import type { StockItem, StockEstado } from '@/hooks/pos/useStock';

const ESTADO_CONFIG: Record<
  StockEstado,
  {
    label: string;
    icon: typeof AlertTriangle;
    variant: 'destructive' | 'secondary' | 'outline' | 'default';
  }
> = {
  critico: { label: 'Crítico', icon: AlertTriangle, variant: 'destructive' },
  bajo: { label: 'Bajo', icon: CircleDot, variant: 'secondary' },
  sin_stock: { label: 'Sin stock', icon: XCircle, variant: 'outline' },
  ok: { label: 'OK', icon: CheckCircle, variant: 'default' },
};

const ESTADO_ORDER: Record<StockEstado, number> = { critico: 0, bajo: 1, sin_stock: 2, ok: 3 };

interface StockTableProps {
  items: StockItem[];
  branchId: string;
  searchQuery: string;
  filtroEstado: string;
  filtroCategoria: string;
}

export function StockTable({
  items,
  branchId,
  searchQuery,
  filtroEstado,
  filtroCategoria,
}: StockTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = [...items];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((i) => i.nombre.toLowerCase().includes(q));
    }
    if (filtroEstado && filtroEstado !== 'todos') {
      result = result.filter((i) => i.estado === filtroEstado);
    }
    if (filtroCategoria && filtroCategoria !== 'todas') {
      result = result.filter((i) => i.categoria === filtroCategoria);
    }
    result.sort((a, b) => ESTADO_ORDER[a.estado] - ESTADO_ORDER[b.estado]);
    return result;
  }, [items, searchQuery, filtroEstado, filtroCategoria]);

  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="Sin insumos"
        description="No hay insumos cargados o el filtro no tiene resultados."
      />
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>Insumo</TableHead>
            <TableHead>Unidad</TableHead>
            <TableHead className="text-right">Stock</TableHead>
            <TableHead className="text-right">Mín</TableHead>
            <TableHead className="text-right">Crít</TableHead>
            <TableHead className="w-24">Estado</TableHead>
            <TableHead className="hidden md:table-cell">Último mov.</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((it) => {
            const config = ESTADO_CONFIG[it.estado];
            const Icon = config.icon;
            const isExpanded = expandedId === it.insumo_id;
            const minEfectivo = it.stock_minimo_local ?? it.stock_minimo;
            const critEfectivo = it.stock_critico_local ?? it.stock_critico;

            return (
              <>
                <TableRow key={it.insumo_id} className="group">
                  <TableCell className="p-2">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : it.insumo_id)}
                      className="p-1 rounded hover:bg-muted"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronRight className="w-3 h-3" />
                      )}
                    </button>
                  </TableCell>
                  <TableCell className="font-medium">{it.nombre}</TableCell>
                  <TableCell className="text-muted-foreground">{it.unidad}</TableCell>
                  <TableCell className="text-right">
                    <StockAjustePopover
                      branchId={branchId}
                      insumoId={it.insumo_id}
                      insumoNombre={it.nombre}
                      cantidadActual={it.cantidad}
                      unidad={it.unidad}
                    >
                      <button className="font-mono tabular-nums hover:underline hover:text-primary cursor-pointer">
                        {it.cantidad}
                      </button>
                    </StockAjustePopover>
                  </TableCell>
                  <TableCell className="text-right">
                    <StockUmbralesPopover
                      branchId={branchId}
                      insumoId={it.insumo_id}
                      insumoNombre={it.nombre}
                      minActual={minEfectivo}
                      critActual={critEfectivo}
                    >
                      <button className="font-mono tabular-nums hover:underline hover:text-primary cursor-pointer">
                        {minEfectivo ?? '-'}
                      </button>
                    </StockUmbralesPopover>
                  </TableCell>
                  <TableCell className="text-right">
                    <StockUmbralesPopover
                      branchId={branchId}
                      insumoId={it.insumo_id}
                      insumoNombre={it.nombre}
                      minActual={minEfectivo}
                      critActual={critEfectivo}
                    >
                      <button className="font-mono tabular-nums hover:underline hover:text-primary cursor-pointer">
                        {critEfectivo ?? '-'}
                      </button>
                    </StockUmbralesPopover>
                  </TableCell>
                  <TableCell>
                    <Badge variant={config.variant} className="gap-1 text-[10px]">
                      <Icon className="h-3 w-3" />
                      {config.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                    {it.ultimo_movimiento
                      ? format(new Date(it.ultimo_movimiento), 'dd/MM HH:mm')
                      : '-'}
                  </TableCell>
                </TableRow>
                {isExpanded && (
                  <TableRow key={`${it.insumo_id}-hist`}>
                    <TableCell colSpan={8} className="p-0 bg-muted/30">
                      <StockHistorial branchId={branchId} insumoId={it.insumo_id} />
                    </TableCell>
                  </TableRow>
                )}
              </>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

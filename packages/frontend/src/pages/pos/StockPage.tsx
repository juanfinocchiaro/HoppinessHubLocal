/**
 * StockPage - Pantalla de Stock con 3 estados:
 * 1. Carga inicial (sin stock)
 * 2. Operación diaria (tabla con ajuste inline)
 * 3. Conteo físico (comparativo)
 */
import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Package, Search, ClipboardList, Download } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { useStockCompleto, useStockResumen } from '@/hooks/pos/useStock';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { StockResumenBar } from '@/components/stock/StockResumenBar';
import { StockTable } from '@/components/stock/StockTable';
import { StockInicialInline } from '@/components/stock/StockInicialInline';
import { ConteoFisico } from '@/components/stock/ConteoFisico';
import * as XLSX from 'xlsx';

type PageState = 'inicial' | 'operacion' | 'conteo';

export default function StockPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const { data: items, isLoading, error } = useStockCompleto(branchId!);
  const resumen = useStockResumen(branchId!);

  const [searchQuery, setSearchQuery] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [forceConteo, setForceConteo] = useState(false);

  // Detect state
  const pageState: PageState = useMemo(() => {
    if (forceConteo) return 'conteo';
    if (!items) return 'operacion';
    const hasStock = items.some((i) => i.tiene_stock_actual && i.cantidad > 0);
    return hasStock ? 'operacion' : 'inicial';
  }, [items, forceConteo]);

  // Unique categories
  const categorias = useMemo(() => {
    if (!items) return [];
    const set = new Set(items.map((i) => i.categoria).filter(Boolean));
    return Array.from(set).sort() as string[];
  }, [items]);

  const handleExportExcel = () => {
    if (!items) return;
    const rows = items.map((it) => ({
      Insumo: it.nombre,
      Unidad: it.unidad,
      Stock: it.cantidad,
      Mínimo: it.stock_minimo_local ?? it.stock_minimo ?? '-',
      Crítico: it.stock_critico_local ?? it.stock_critico ?? '-',
      Estado: it.estado,
      Categoría: it.categoria ?? '-',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock');
    XLSX.writeFile(wb, `stock_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Stock"
          subtitle="Stock en tiempo real"
          icon={<Package className="w-5 h-5" />}
        />
        <Alert variant="destructive">
          <AlertDescription>No se pudo cargar el stock.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Stock"
          subtitle="Stock en tiempo real"
          icon={<Package className="w-5 h-5" />}
        />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Stock"
          subtitle="Stock en tiempo real"
          icon={<Package className="w-5 h-5" />}
        />
        <Alert>
          <AlertDescription>
            No hay insumos configurados en la marca. Agregá insumos desde la sección de Insumos para
            comenzar a trackear stock.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Estado 3: Conteo físico
  if (pageState === 'conteo') {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Conteo Físico"
          subtitle="Comparar stock teórico vs real"
          icon={<ClipboardList className="w-5 h-5" />}
        />
        <ConteoFisico branchId={branchId!} items={items} onClose={() => setForceConteo(false)} />
      </div>
    );
  }

  // Estado 1: Carga inicial
  if (pageState === 'inicial') {
    return (
      <div className="space-y-6">
        <PageHeader title="Stock" subtitle="Carga inicial" icon={<Package className="w-5 h-5" />} />
        <StockInicialInline branchId={branchId!} items={items} />
      </div>
    );
  }

  // Estado 2: Operación diaria
  return (
    <div className="space-y-4">
      <PageHeader
        title="Stock"
        subtitle="Stock en tiempo real"
        icon={<Package className="w-5 h-5" />}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportExcel}>
              <Download className="h-4 w-4 mr-1" /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => setForceConteo(true)}>
              <ClipboardList className="h-4 w-4 mr-1" /> Conteo físico
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar insumo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="critico">Crítico</SelectItem>
            <SelectItem value="bajo">Bajo</SelectItem>
            <SelectItem value="ok">OK</SelectItem>
            <SelectItem value="sin_stock">Sin stock</SelectItem>
          </SelectContent>
        </Select>
        {categorias.length > 0 && (
          <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {categorias.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Resumen bar */}
      <StockResumenBar resumen={resumen} />

      {/* Table */}
      <StockTable
        items={items}
        branchId={branchId!}
        searchQuery={searchQuery}
        filtroEstado={filtroEstado}
        filtroCategoria={filtroCategoria}
      />
    </div>
  );
}

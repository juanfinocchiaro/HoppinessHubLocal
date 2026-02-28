import { useMemo, useState } from 'react';
import { subDays, format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Download, DollarSign, ShoppingBag, TrendingUp, Receipt } from 'lucide-react';
import { useRdoMultivista } from '@/hooks/useRdoMultivista';
import { exportToExcel } from '@/lib/exportExcel';
import { ShiftSalesAnalysis } from './ShiftSalesAnalysis';
import { formatCurrency, formatPercent } from '@/lib/formatters';

const CANALES_DEFAULT = [
  { id: 'mostrador', label: 'Mostrador' },
  { id: 'webapp', label: 'WebApp' },
  { id: 'rappi', label: 'Rappi' },
  { id: 'pedidosya', label: 'PedidosYa' },
  { id: 'mp_delivery', label: 'MP Delivery' },
];

const MEDIOS_DEFAULT = [
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'debito', label: 'Débito' },
  { id: 'credito', label: 'Crédito' },
  { id: 'qr', label: 'QR' },
  { id: 'transferencia', label: 'Transferencia' },
];

const RANGE_OPTIONS = [
  { value: '7', label: 'Últimos 7 días' },
  { value: '15', label: 'Últimos 15 días' },
  { value: '30', label: 'Últimos 30 días' },
];

function fileDateTag(): string {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
}

function toggleInArray(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

interface SalesAnalysisTabProps {
  branchId: string;
  daysBack: string;
  onDaysBackChange: (v: string) => void;
}

export function SalesAnalysisTab({ branchId, daysBack, onDaysBackChange }: SalesAnalysisTabProps) {
  const [categoriaSearch, setCategoriaSearch] = useState('');
  const [productoSearch, setProductoSearch] = useState('');
  const [filtros, setFiltros] = useState({
    canales: CANALES_DEFAULT.map((c) => c.id),
    mediosPago: MEDIOS_DEFAULT.map((m) => m.id),
    categorias: [] as string[],
    productos: [] as string[],
  });

  const fechaHasta = format(new Date(), 'yyyy-MM-dd');
  const fechaDesde = format(subDays(new Date(), parseInt(daysBack)), 'yyyy-MM-dd');

  const { data, isLoading } = useRdoMultivista(branchId, {
    fechaDesde,
    fechaHasta,
    canales: filtros.canales,
    mediosPago: filtros.mediosPago,
    categorias: filtros.categorias,
    productos: filtros.productos,
  });

  const canalesDisponibles = data?.opciones_filtros.canales?.length
    ? data.opciones_filtros.canales
    : CANALES_DEFAULT;
  const mediosDisponibles = data?.opciones_filtros.medios_pago?.length
    ? data.opciones_filtros.medios_pago
    : MEDIOS_DEFAULT;

  const categoriasDisponibles = useMemo(() => {
    const base = data?.opciones_filtros.categorias || [];
    const query = categoriaSearch.trim().toLowerCase();
    return query ? base.filter((c) => c.nombre.toLowerCase().includes(query)) : base;
  }, [data?.opciones_filtros.categorias, categoriaSearch]);

  const productosDisponibles = useMemo(() => {
    const base = data?.opciones_filtros.productos || [];
    const query = productoSearch.trim().toLowerCase();
    return query
      ? base.filter(
          (p) =>
            p.nombre.toLowerCase().includes(query) ||
            (p.categoria_nombre || '').toLowerCase().includes(query),
        )
      : base;
  }, [data?.opciones_filtros.productos, productoSearch]);

  const clearFilters = () => {
    setFiltros({
      canales: canalesDisponibles.map((c) => c.id),
      mediosPago: mediosDisponibles.map((m) => m.id),
      categorias: [],
      productos: [],
    });
    setCategoriaSearch('');
    setProductoSearch('');
  };

  const totalVentas = data?.totales.total_ventas || 0;
  const totalPedidos = data?.totales.total_pedidos || 0;
  const ticketPromedio = data?.totales.ticket_promedio || 0;
  const totalFacturado = data?.totales.total_facturado || 0;
  const productoRows = (data?.por_producto || []).slice(0, 200);

  const exportCanal = () => {
    const rows = data?.por_canal || [];
    if (!rows.length) return;
    exportToExcel(
      rows.map((r) => ({
        canal: r.canal,
        pedidos: r.pedidos,
        ventas: r.ventas,
        porcentaje: Number(r.porcentaje.toFixed(2)),
        ticket_promedio: r.ticket_promedio,
      })),
      {
        canal: 'Canal',
        pedidos: 'Pedidos',
        ventas: 'Ventas',
        porcentaje: '%',
        ticket_promedio: 'Ticket Prom',
      },
      { filename: `analisis-canal-${fileDateTag()}` },
    );
  };

  const exportMedio = () => {
    const rows = data?.por_medio_pago || [];
    if (!rows.length) return;
    exportToExcel(
      rows.map((r) => ({
        medio_pago: r.medio_pago,
        pedidos: r.pedidos,
        ventas: r.ventas,
        porcentaje: Number(r.porcentaje.toFixed(2)),
        facturado: r.facturado,
      })),
      {
        medio_pago: 'Medio',
        pedidos: 'Pedidos',
        ventas: 'Ventas',
        porcentaje: '%',
        facturado: 'Facturado',
      },
      { filename: `analisis-medio-${fileDateTag()}` },
    );
  };

  const exportCategoria = () => {
    const rows = data?.por_categoria || [];
    if (!rows.length) return;
    exportToExcel(
      rows.map((r) => ({
        categoria: r.categoria_nombre,
        cantidad: r.cantidad,
        ventas: r.ventas,
        porcentaje: Number(r.porcentaje.toFixed(2)),
        costo: r.costo_total,
        food_cost: Number(r.food_cost.toFixed(2)),
      })),
      {
        categoria: 'Categoría',
        cantidad: 'Cant',
        ventas: 'Ventas',
        porcentaje: '%',
        costo: 'Costo',
        food_cost: 'Food Cost',
      },
      { filename: `analisis-categoria-${fileDateTag()}` },
    );
  };

  const exportProducto = () => {
    const rows = data?.por_producto || [];
    if (!rows.length) return;
    exportToExcel(
      rows.map((r) => ({
        producto: r.producto_nombre,
        categoria: r.categoria_nombre,
        cantidad: r.cantidad,
        ventas: r.ventas,
        porcentaje: Number(r.porcentaje.toFixed(2)),
        fc: Number(r.food_cost.toFixed(2)),
      })),
      {
        producto: 'Producto',
        categoria: 'Categoría',
        cantidad: 'Cant',
        ventas: 'Ventas',
        porcentaje: '%',
        fc: 'FC',
      },
      { filename: `analisis-producto-${fileDateTag()}` },
    );
  };

  if (isLoading) {
    return (
      <div className="grid gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Shift Analysis */}
      <ShiftSalesAnalysis branchId={branchId} daysBack={parseInt(daysBack)} />

      {/* Rango + KPIs */}
      <div className="flex flex-wrap items-center gap-4">
        <Select value={daysBack} onValueChange={onDaysBackChange}>
          <SelectTrigger className="w-44 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-primary" />
            <span className="font-medium">{formatCurrency(totalVentas)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShoppingBag className="w-4 h-4 text-muted-foreground" />
            <span>{totalPedidos} pedidos</span>
          </div>
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <span>Ticket prom: {formatCurrency(ticketPromedio)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Receipt className="w-4 h-4 text-muted-foreground" />
            <span>Facturado: {formatCurrency(totalFacturado)}</span>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase text-muted-foreground">Canales</Label>
            <div className="flex flex-wrap gap-3">
              {canalesDisponibles.map((canal) => (
                <label key={canal.id} className="flex items-center gap-2 cursor-pointer text-sm">
                  <Checkbox
                    checked={filtros.canales.includes(canal.id)}
                    onCheckedChange={() =>
                      setFiltros((prev) => ({
                        ...prev,
                        canales: toggleInArray(prev.canales, canal.id),
                      }))
                    }
                  />
                  <span>{canal.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase text-muted-foreground">
              Medios de Pago
            </Label>
            <div className="flex flex-wrap gap-3">
              {mediosDisponibles.map((medio) => (
                <label key={medio.id} className="flex items-center gap-2 cursor-pointer text-sm">
                  <Checkbox
                    checked={filtros.mediosPago.includes(medio.id)}
                    onCheckedChange={() =>
                      setFiltros((prev) => ({
                        ...prev,
                        mediosPago: toggleInArray(prev.mediosPago, medio.id),
                      }))
                    }
                  />
                  <span>{medio.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase text-muted-foreground">
                Categorías
              </Label>
              <Input
                value={categoriaSearch}
                onChange={(e) => setCategoriaSearch(e.target.value)}
                placeholder="Buscar categoría..."
                className="h-8"
              />
              <div className="max-h-36 overflow-auto border rounded-md p-2 space-y-2">
                {categoriasDisponibles.map((cat) => (
                  <label key={cat.id} className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox
                      checked={filtros.categorias.includes(cat.id)}
                      onCheckedChange={() =>
                        setFiltros((prev) => ({
                          ...prev,
                          categorias: toggleInArray(prev.categorias, cat.id),
                        }))
                      }
                    />
                    <span>{cat.nombre}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase text-muted-foreground">
                Productos
              </Label>
              <Input
                value={productoSearch}
                onChange={(e) => setProductoSearch(e.target.value)}
                placeholder="Buscar producto..."
                className="h-8"
              />
              <div className="max-h-36 overflow-auto border rounded-md p-2 space-y-2">
                {productosDisponibles.map((prod) => (
                  <label key={prod.id} className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox
                      checked={filtros.productos.includes(prod.id)}
                      onCheckedChange={() =>
                        setFiltros((prev) => ({
                          ...prev,
                          productos: toggleInArray(prev.productos, prod.id),
                        }))
                      }
                    />
                    <span>{prod.nombre}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        </CardContent>
      </Card>

      {/* Tablas por dimensión */}
      <Tabs defaultValue="canal" className="space-y-4">
        <TabsList>
          <TabsTrigger value="canal">Por Canal</TabsTrigger>
          <TabsTrigger value="medio">Por Medio de Pago</TabsTrigger>
          <TabsTrigger value="categoria">Por Categoría</TabsTrigger>
          <TabsTrigger value="producto">Por Producto</TabsTrigger>
        </TabsList>

        <TabsContent value="canal">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Ventas por Canal</CardTitle>
              <Button variant="outline" size="sm" onClick={exportCanal}>
                <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Canal</TableHead>
                    <TableHead className="text-right">Pedidos</TableHead>
                    <TableHead className="text-right">Ventas</TableHead>
                    <TableHead className="text-right">%</TableHead>
                    <TableHead className="text-right">Ticket Prom.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.por_canal || []).map((r) => (
                    <TableRow key={r.canal}>
                      <TableCell>{r.canal}</TableCell>
                      <TableCell className="text-right">{r.pedidos}</TableCell>
                      <TableCell className="text-right">{formatCurrency(r.ventas)}</TableCell>
                      <TableCell className="text-right">{formatPercent(r.porcentaje)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(r.ticket_promedio)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="medio">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Ventas por Medio de Pago</CardTitle>
              <Button variant="outline" size="sm" onClick={exportMedio}>
                <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Medio</TableHead>
                    <TableHead className="text-right">Pedidos</TableHead>
                    <TableHead className="text-right">Ventas</TableHead>
                    <TableHead className="text-right">%</TableHead>
                    <TableHead className="text-right">Facturado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.por_medio_pago || []).map((r) => (
                    <TableRow key={r.medio_pago}>
                      <TableCell>{r.medio_pago}</TableCell>
                      <TableCell className="text-right">{r.pedidos}</TableCell>
                      <TableCell className="text-right">{formatCurrency(r.ventas)}</TableCell>
                      <TableCell className="text-right">{formatPercent(r.porcentaje)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(r.facturado)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categoria">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Ventas por Categoría</CardTitle>
              <Button variant="outline" size="sm" onClick={exportCategoria}>
                <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Cant</TableHead>
                    <TableHead className="text-right">Ventas</TableHead>
                    <TableHead className="text-right">%</TableHead>
                    <TableHead className="text-right">Costo</TableHead>
                    <TableHead className="text-right">Food Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.por_categoria || []).map((r, idx) => (
                    <TableRow key={r.categoria_id || `cat-${idx}`}>
                      <TableCell>{r.categoria_nombre}</TableCell>
                      <TableCell className="text-right">{r.cantidad}</TableCell>
                      <TableCell className="text-right">{formatCurrency(r.ventas)}</TableCell>
                      <TableCell className="text-right">{formatPercent(r.porcentaje)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(r.costo_total)}</TableCell>
                      <TableCell className="text-right">{formatPercent(r.food_cost)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="producto">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Ventas por Producto</CardTitle>
              <Button variant="outline" size="sm" onClick={exportProducto}>
                <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Cant</TableHead>
                    <TableHead className="text-right">Ventas</TableHead>
                    <TableHead className="text-right">%</TableHead>
                    <TableHead className="text-right">FC</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productoRows.map((r, idx) => (
                    <TableRow key={r.producto_id || `prod-${idx}`}>
                      <TableCell>{r.producto_nombre}</TableCell>
                      <TableCell>{r.categoria_nombre}</TableCell>
                      <TableCell className="text-right">{r.cantidad}</TableCell>
                      <TableCell className="text-right">{formatCurrency(r.ventas)}</TableCell>
                      <TableCell className="text-right">{formatPercent(r.porcentaje)}</TableCell>
                      <TableCell className="text-right">{formatPercent(r.food_cost)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {(data?.por_producto.length || 0) > 200 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Mostrando 200 productos para mantener rendimiento.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

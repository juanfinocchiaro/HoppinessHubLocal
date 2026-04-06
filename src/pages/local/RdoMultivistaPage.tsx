import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Download } from 'lucide-react';
import { SpinnerLoader } from '@/components/ui/loaders';
import { useRdoMultivista, type FiltrosRdo } from '@/hooks/useRdoMultivista';
import { DateRangeFilter } from '@/components/ui/DateRangeFilter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { exportToExcel } from '@/lib/exportExcel';
import { formatCurrency } from '@/lib/formatters';

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

function formatPercent(value: number): string {
  return `${(value || 0).toFixed(1)}%`;
}

function fileDateTag(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function toggleInArray(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export default function RdoMultivistaPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const [categoriaSearch, setCategoriaSearch] = useState('');
  const [productoSearch, setProductoSearch] = useState('');
  const [filtros, setFiltros] = useState<FiltrosRdo>(() => ({
    fechaDesde: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .slice(0, 10),
    fechaHasta: new Date().toISOString().slice(0, 10),
    canales: CANALES_DEFAULT.map((c) => c.id),
    mediosPago: MEDIOS_DEFAULT.map((m) => m.id),
    categorias: [],
    productos: [],
  }));

  const { data, isLoading, isError, error } = useRdoMultivista(branchId, filtros);

  const canalesDisponibles = data?.opciones_filtros.canales?.length
    ? data.opciones_filtros.canales
    : CANALES_DEFAULT;
  const mediosDisponibles = data?.opciones_filtros.medios_pago?.length
    ? data.opciones_filtros.medios_pago
    : MEDIOS_DEFAULT;

  const categoriasDisponibles = useMemo(() => {
    const base = data?.opciones_filtros.categorias || [];
    const query = categoriaSearch.trim().toLowerCase();
    if (!query) return base;
    return base.filter((c) => c.nombre.toLowerCase().includes(query));
  }, [data?.opciones_filtros.categorias, categoriaSearch]);

  const productosDisponibles = useMemo(() => {
    const base = data?.opciones_filtros.productos || [];
    const query = productoSearch.trim().toLowerCase();
    if (!query) return base;
    return base.filter(
      (p) =>
        p.nombre.toLowerCase().includes(query) ||
        (p.categoria_nombre || '').toLowerCase().includes(query),
    );
  }, [data?.opciones_filtros.productos, productoSearch]);

  const totales = data?.totales;
  const productoRowsTabla = data?.por_producto.slice(0, 200) || [];

  const clearFilters = () => {
    setFiltros((prev) => ({
      ...prev,
      canales: canalesDisponibles.map((c) => c.id),
      mediosPago: mediosDisponibles.map((m) => m.id),
      categorias: [],
      productos: [],
    }));
    setCategoriaSearch('');
    setProductoSearch('');
  };

  const exportCanal = () => {
    if (!data?.por_canal.length) return;
    exportToExcel(
      data.por_canal.map((r) => ({
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
      { filename: `rdo-canal-${fileDateTag()}` },
    );
  };

  const exportMedio = () => {
    if (!data?.por_medio_pago.length) return;
    exportToExcel(
      data.por_medio_pago.map((r) => ({
        medio_pago: r.payment_method,
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
      { filename: `rdo-medio-${fileDateTag()}` },
    );
  };

  const exportCategoria = () => {
    if (!data?.por_categoria.length) return;
    exportToExcel(
      data.por_categoria.map((r) => ({
        categoria_nombre: r.categoria_nombre,
        cantidad: r.cantidad,
        ventas: r.ventas,
        porcentaje: Number(r.porcentaje.toFixed(2)),
        costo_total: r.costo_total,
        food_cost: Number(r.food_cost.toFixed(2)),
      })),
      {
        categoria_nombre: 'Categoría',
        cantidad: 'Cant',
        ventas: 'Ventas',
        porcentaje: '%',
        costo_total: 'Costo',
        food_cost: 'Food Cost',
      },
      { filename: `rdo-categoria-${fileDateTag()}` },
    );
  };

  const exportProducto = () => {
    if (!data?.por_producto.length) return;
    exportToExcel(
      data.por_producto.map((r) => ({
        producto_nombre: r.producto_nombre,
        categoria_nombre: r.categoria_nombre,
        cantidad: r.cantidad,
        ventas: r.ventas,
        porcentaje: Number(r.porcentaje.toFixed(2)),
        food_cost: Number(r.food_cost.toFixed(2)),
      })),
      {
        producto_nombre: 'Producto',
        categoria_nombre: 'Categoría',
        cantidad: 'Cant',
        ventas: 'Ventas',
        porcentaje: '%',
        food_cost: 'FC',
      },
      { filename: `rdo-producto-${fileDateTag()}` },
    );
  };

  if (!branchId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">No se encontró el ID de sucursal.</div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <SpinnerLoader size="md" />
      </div>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-destructive">
          Error al cargar RDO multivista: {(error as Error)?.message || 'desconocido'}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">RDO Multivista</h1>
          <p className="text-sm text-muted-foreground">Mismo total, distintas vistas analíticas</p>
        </div>
        <DateRangeFilter
          from={filtros.fechaDesde}
          to={filtros.fechaHasta}
          onFromChange={(v) => setFiltros((prev) => ({ ...prev, fechaDesde: v }))}
          onToChange={(v) => setFiltros((prev) => ({ ...prev, fechaHasta: v }))}
        />
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <p className="text-xs text-muted-foreground">TOTAL VENTAS DEL PERÍODO</p>
              <p className="text-3xl font-bold">{formatCurrency(totales?.total_ventas || 0)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pedidos</p>
              <p className="text-xl font-semibold">{totales?.total_pedidos || 0}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ticket Promedio</p>
              <p className="text-xl font-semibold">
                {formatCurrency(totales?.ticket_promedio || 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Facturado</p>
              <p className="text-xl font-semibold">
                {formatCurrency(totales?.total_facturado || 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtrar por</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Canales</Label>
            <div className="flex flex-wrap gap-3">
              {canalesDisponibles.map((canal) => {
                const checked = filtros.canales.includes(canal.id);
                return (
                  <label key={canal.id} className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() =>
                        setFiltros((prev) => ({
                          ...prev,
                          canales: toggleInArray(prev.canales, canal.id),
                        }))
                      }
                    />
                    <span>{canal.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Medios de Pago</Label>
            <div className="flex flex-wrap gap-3">
              {mediosDisponibles.map((medio) => {
                const checked = filtros.mediosPago.includes(medio.id);
                return (
                  <label key={medio.id} className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() =>
                        setFiltros((prev) => ({
                          ...prev,
                          mediosPago: toggleInArray(prev.mediosPago, medio.id),
                        }))
                      }
                    />
                    <span>{medio.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categorías</Label>
              <Input
                value={categoriaSearch}
                onChange={(e) => setCategoriaSearch(e.target.value)}
                placeholder="Buscar categoría..."
                className="h-9"
              />
              <div className="max-h-40 overflow-auto border rounded-md p-2 space-y-2">
                {categoriasDisponibles.map((cat) => {
                  const checked = filtros.categorias.includes(cat.id);
                  return (
                    <label key={cat.id} className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() =>
                          setFiltros((prev) => ({
                            ...prev,
                            categorias: toggleInArray(prev.categorias, cat.id),
                          }))
                        }
                      />
                      <span>{cat.nombre}</span>
                    </label>
                  );
                })}
                {!categoriasDisponibles.length && (
                  <p className="text-xs text-muted-foreground">Sin categorías para mostrar.</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Productos</Label>
              <Input
                value={productoSearch}
                onChange={(e) => setProductoSearch(e.target.value)}
                placeholder="Buscar producto..."
                className="h-9"
              />
              <div className="max-h-40 overflow-auto border rounded-md p-2 space-y-2">
                {productosDisponibles.map((prod) => {
                  const checked = filtros.productos.includes(prod.id);
                  return (
                    <label key={prod.id} className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() =>
                          setFiltros((prev) => ({
                            ...prev,
                            productos: toggleInArray(prev.productos, prod.id),
                          }))
                        }
                      />
                      <span>{prod.nombre}</span>
                      {prod.categoria_nombre && (
                        <Badge variant="outline">{prod.categoria_nombre}</Badge>
                      )}
                    </label>
                  );
                })}
                {!productosDisponibles.length && (
                  <p className="text-xs text-muted-foreground">Sin productos para mostrar.</p>
                )}
              </div>
            </div>
          </div>

          <div>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

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
                  {!data?.por_canal || data.por_canal.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Aún no hay ventas registradas en este período
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.por_canal.map((row) => (
                      <TableRow key={row.canal}>
                        <TableCell>{row.canal}</TableCell>
                        <TableCell className="text-right">{row.pedidos}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(row.ventas)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatPercent(row.porcentaje)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(row.ticket_promedio)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  <TableRow className="font-bold bg-muted/40">
                    <TableCell>TOTAL</TableCell>
                    <TableCell className="text-right">{totales?.total_pedidos || 0}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(totales?.total_ventas || 0)}
                    </TableCell>
                    <TableCell className="text-right">100.0%</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(totales?.ticket_promedio || 0)}
                    </TableCell>
                  </TableRow>
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
                  {!data?.por_medio_pago || data.por_medio_pago.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Aún no hay ventas registradas en este período
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.por_medio_pago.map((row) => (
                      <TableRow key={row.payment_method}>
                        <TableCell>{row.payment_method}</TableCell>
                        <TableCell className="text-right">{row.pedidos}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(row.ventas)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatPercent(row.porcentaje)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(row.facturado)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
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
                  {!data?.por_categoria || data.por_categoria.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Sin datos para este período. Probá con otro rango de fechas.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.por_categoria.map((row, idx) => (
                      <TableRow key={row.categoria_id || `cat-${idx}`}>
                        <TableCell>{row.categoria_nombre}</TableCell>
                        <TableCell className="text-right">{row.cantidad}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(row.ventas)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatPercent(row.porcentaje)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(row.costo_total)}
                        </TableCell>
                        <TableCell className="text-right">{formatPercent(row.food_cost)}</TableCell>
                      </TableRow>
                    ))
                  )}
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
                  {productoRowsTabla.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Sin datos para este período. Probá con otro rango de fechas.
                      </TableCell>
                    </TableRow>
                  ) : (
                    productoRowsTabla.map((row, idx) => (
                      <TableRow key={row.producto_id || `prod-${idx}`}>
                        <TableCell>{row.producto_nombre}</TableCell>
                        <TableCell>{row.categoria_nombre}</TableCell>
                        <TableCell className="text-right">{row.cantidad}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.ventas)}</TableCell>
                        <TableCell className="text-right">
                          {formatPercent(row.porcentaje)}
                        </TableCell>
                        <TableCell className="text-right">{formatPercent(row.food_cost)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {(data?.por_producto.length || 0) > 200 && (
                <p className="text-xs text-muted-foreground mt-3">
                  Mostrando 200 productos en pantalla para mantener rendimiento. Exportá a Excel
                  para ver el total.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

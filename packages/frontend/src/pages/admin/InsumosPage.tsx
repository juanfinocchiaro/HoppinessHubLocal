import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { DataToolbar } from '@/components/ui/data-table-pro';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Pencil,
  Trash2,
  Package,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ShoppingBag,
} from 'lucide-react';
import { useInsumos, useInsumoMutations } from '@/hooks/useInsumos';
import { InsumoFormModal } from '@/components/finanzas/InsumoFormModal';
import { ProductoFormModal } from '@/components/finanzas/ProductoFormModal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/states';
import type { Insumo } from '@/types/financial';

type SortKey =
  | 'nombre'
  | 'proveedor'
  | 'categoria'
  | 'presentacion'
  | 'costo'
  | 'precio_venta'
  | 'margen';
type SortDir = 'asc' | 'desc';

function SortableHead({
  label,
  sortKey,
  currentKey,
  dir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey | null;
  dir: SortDir;
  onSort: (k: SortKey) => void;
}) {
  const active = currentKey === sortKey;
  return (
    <TableHead
      className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
      onClick={() => onSort(sortKey)}
    >
      <span className="flex items-center gap-1">
        {label}
        {active ? (
          dir === 'asc' ? (
            <ArrowUp className="w-3.5 h-3.5" />
          ) : (
            <ArrowDown className="w-3.5 h-3.5" />
          )
        ) : (
          <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground/50" />
        )}
      </span>
    </TableHead>
  );
}

function getSortValue(row: any, key: SortKey): string | number {
  switch (key) {
    case 'nombre':
      return row.name?.toLowerCase() || '';
    case 'proveedor':
      return (
        row.proveedor_obligatorio?.business_name ||
        row.proveedor_sugerido?.business_name ||
        ''
      ).toLowerCase();
    case 'categoria':
      return (row.rdo_categories?.name || row.supply_categories?.name || '').toLowerCase();
    case 'presentacion':
      return row.purchase_unit || row.base_unit || '';
    case 'costo':
      return Number(row.base_unit_cost || row.reference_price || 0);
    case 'precio_venta':
      return Number(row.sale_price || 0);
    case 'margen':
      return Number(row.margen_porcentaje || 0);
    default:
      return '';
  }
}

function sortRows(rows: any[], key: SortKey | null, dir: SortDir) {
  if (!key || !rows) return rows;
  return [...rows].sort((a, b) => {
    const va = getSortValue(a, key);
    const vb = getSortValue(b, key);
    if (typeof va === 'number' && typeof vb === 'number') return dir === 'asc' ? va - vb : vb - va;
    return dir === 'asc'
      ? String(va).localeCompare(String(vb))
      : String(vb).localeCompare(String(va));
  });
}

export default function InsumosPage() {
  const { data: insumos, isLoading } = useInsumos();
  const { softDelete: deleteInsumo } = useInsumoMutations();

  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('ingredientes');
  const [fixedType, setFixedType] = useState<'ingrediente' | 'insumo'>('ingrediente');
  const [proveedorView, setProveedorView] = useState<'obligatorio' | 'sugerido'>('obligatorio');
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const [insumoModalOpen, setInsumoModalOpen] = useState(false);
  const [editingInsumo, setEditingInsumo] = useState<Insumo | null>(null);
  const [productoModalOpen, setProductoModalOpen] = useState(false);
  const [editingProducto, setEditingProducto] = useState<any>(null);
  const [deletingInsumo, setDeletingInsumo] = useState<Insumo | null>(null);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const filteredObligatorios = useMemo(() => {
    const filtered = insumos?.filter(
      (i: any) =>
        i.item_type === 'ingrediente' &&
        i.nivel_control !== 'semi_libre' &&
        i.name.toLowerCase().includes(search.toLowerCase()),
    );
    return sortRows(filtered || [], sortKey, sortDir);
  }, [insumos, search, sortKey, sortDir]);

  const filteredSugeridos = useMemo(() => {
    const filtered = insumos?.filter(
      (i: any) =>
        i.item_type === 'ingrediente' &&
        i.nivel_control === 'semi_libre' &&
        i.name.toLowerCase().includes(search.toLowerCase()),
    );
    return sortRows(filtered || [], sortKey, sortDir);
  }, [insumos, search, sortKey, sortDir]);

  const filteredInsumosOblig = useMemo(() => {
    const filtered = insumos?.filter(
      (i: any) =>
        (i.item_type === 'insumo' || !i.item_type) &&
        i.nivel_control !== 'semi_libre' &&
        i.name.toLowerCase().includes(search.toLowerCase()),
    );
    return sortRows(filtered || [], sortKey, sortDir);
  }, [insumos, search, sortKey, sortDir]);

  const filteredInsumosSugeridos = useMemo(() => {
    const filtered = insumos?.filter(
      (i: any) =>
        (i.item_type === 'insumo' || !i.item_type) &&
        i.nivel_control === 'semi_libre' &&
        i.name.toLowerCase().includes(search.toLowerCase()),
    );
    return sortRows(filtered || [], sortKey, sortDir);
  }, [insumos, search, sortKey, sortDir]);

  const filteredProductosOblig = useMemo(() => {
    const filtered = insumos?.filter(
      (i: any) =>
        i.item_type === 'producto' &&
        i.nivel_control !== 'semi_libre' &&
        i.name.toLowerCase().includes(search.toLowerCase()),
    );
    return sortRows(filtered || [], sortKey, sortDir);
  }, [insumos, search, sortKey, sortDir]);

  const filteredProductosSugeridos = useMemo(() => {
    const filtered = insumos?.filter(
      (i: any) =>
        i.item_type === 'producto' &&
        i.nivel_control === 'semi_libre' &&
        i.name.toLowerCase().includes(search.toLowerCase()),
    );
    return sortRows(filtered || [], sortKey, sortDir);
  }, [insumos, search, sortKey, sortDir]);

  const SkeletonRows = ({ cols }: { cols: number }) => (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <TableCell key={j}>
              <Skeleton className="h-5 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );

  const headProps = { currentKey: sortKey, dir: sortDir, onSort: handleSort };

  const renderRow = (row: any, type: 'ingrediente' | 'insumo') => {
    const provName =
      row.proveedor_obligatorio?.business_name || row.proveedor_sugerido?.business_name;
    const costoCompra = Number(row.purchase_unit_price || 0);
    const costoUnitario = Number(row.base_unit_cost || row.reference_price || 0);
    const unit = row.base_unit || 'un';
    const iva = row.default_alicuota_iva;
    const costoConIva = iva && costoCompra ? costoCompra * (1 + iva / 100) : null;
    return (
      <TableRow key={row.id}>
        <TableCell>
          <p className="font-medium">{row.name}</p>
          {row.description && (
            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
              {row.description}
            </p>
          )}
        </TableCell>
        <TableCell className="text-sm">
          {provName || <span className="text-muted-foreground italic">—</span>}
        </TableCell>
        <TableCell className="text-sm">
          {row.rdo_categories?.name || row.supply_categories?.name || '—'}
        </TableCell>
        <TableCell>
          {row.purchase_unit ? (
            <span className="text-sm">
              <Badge variant="outline">{row.purchase_unit}</Badge>
              {row.purchase_unit_content && (
                <span className="text-muted-foreground ml-1 text-xs">
                  ({row.purchase_unit_content} {row.base_unit})
                </span>
              )}
            </span>
          ) : (
            <Badge variant="outline">{row.base_unit}</Badge>
          )}
        </TableCell>
        <TableCell>
          {costoCompra ? (
            <div>
              <span className="font-mono text-sm">
                ${costoCompra.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                <span className="text-muted-foreground text-xs font-normal">
                  /{row.purchase_unit || unit}
                </span>
              </span>
              {iva != null && <span className="text-muted-foreground text-xs ml-1">+{iva}%</span>}
              {costoConIva && (
                <p className="text-xs text-muted-foreground font-mono">
                  ${costoConIva.toLocaleString('es-AR', { maximumFractionDigits: 0 })} c/IVA
                </p>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell>
          {costoUnitario ? (
            <span className="font-mono text-sm">
              ${costoUnitario.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              <span className="text-muted-foreground text-xs font-normal">/{unit}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell>
          <div className="flex gap-1 justify-end">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setFixedType(type);
                setEditingInsumo(row);
                setInsumoModalOpen(true);
              }}
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setDeletingInsumo(row)}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  const renderProductoRow = (row: any) => {
    const provName =
      row.proveedor_obligatorio?.business_name || row.proveedor_sugerido?.business_name;
    const costoCompra = Number(row.purchase_unit_price || 0);
    const costoUnitario = Number(row.base_unit_cost || 0);
    const iva = row.default_alicuota_iva;
    const costoConIva = iva && costoCompra ? costoCompra * (1 + iva / 100) : null;

    return (
      <TableRow key={row.id}>
        <TableCell>
          <p className="font-medium">{row.name}</p>
          {row.description && (
            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
              {row.description}
            </p>
          )}
        </TableCell>
        <TableCell className="text-sm">
          {provName || <span className="text-muted-foreground italic">—</span>}
        </TableCell>
        <TableCell className="text-sm">{row.rdo_categories?.name || '—'}</TableCell>
        <TableCell>
          {row.purchase_unit && (
            <span className="text-sm">
              <Badge variant="outline">{row.purchase_unit}</Badge>
              {row.purchase_unit_content && (
                <span className="text-muted-foreground ml-1 text-xs">
                  ({row.purchase_unit_content} un)
                </span>
              )}
            </span>
          )}
        </TableCell>
        <TableCell>
          {costoCompra ? (
            <div>
              <span className="font-mono text-sm">
                ${costoCompra.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                <span className="text-muted-foreground text-xs font-normal">
                  /{row.purchase_unit || 'un'}
                </span>
              </span>
              {iva != null && <span className="text-muted-foreground text-xs ml-1">+{iva}%</span>}
              {costoConIva && (
                <p className="text-xs text-muted-foreground font-mono">
                  ${costoConIva.toLocaleString('es-AR', { maximumFractionDigits: 0 })} c/IVA
                </p>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell>
          {costoUnitario ? (
            <span className="font-mono text-sm">
              ${costoUnitario.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              <span className="text-muted-foreground text-xs font-normal">/un</span>
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell>
          <div className="flex gap-1 justify-end">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setEditingProducto(row);
                setProductoModalOpen(true);
              }}
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setDeletingInsumo(row)}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Catálogo de Compras"
        subtitle="Ingredientes, insumos y productos de la marca"
      />

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="ingredientes">Ingredientes</TabsTrigger>
            <TabsTrigger value="insumos">Insumos</TabsTrigger>
            <TabsTrigger value="productos">Productos</TabsTrigger>
          </TabsList>
          {tab === 'ingredientes' && (
            <Button
              onClick={() => {
                setFixedType('ingrediente');
                setEditingInsumo(null);
                setInsumoModalOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" /> Nuevo Ingrediente
            </Button>
          )}
          {tab === 'insumos' && (
            <Button
              onClick={() => {
                setFixedType('insumo');
                setEditingInsumo(null);
                setInsumoModalOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" /> Nuevo Insumo
            </Button>
          )}
          {tab === 'productos' && (
            <Button
              onClick={() => {
                setEditingProducto(null);
                setProductoModalOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" /> Nuevo Producto
            </Button>
          )}
        </div>

        <DataToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder={
            tab === 'ingredientes'
              ? 'Buscar ingrediente...'
              : tab === 'insumos'
                ? 'Buscar insumo...'
                : 'Buscar producto...'
          }
        />

        <TabsContent value="ingredientes">
          <div className="flex items-center gap-1 mb-4">
            <Button
              variant={proveedorView === 'obligatorio' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setProveedorView('obligatorio')}
            >
              Obligatorio ({filteredObligatorios?.length || 0})
            </Button>
            <Button
              variant={proveedorView === 'sugerido' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setProveedorView('sugerido')}
            >
              Sugerido ({filteredSugeridos?.length || 0})
            </Button>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead label="Ingrediente" sortKey="nombre" {...headProps} />
                  <SortableHead label="Proveedor" sortKey="proveedor" {...headProps} />
                  <SortableHead label="Categoría" sortKey="categoria" {...headProps} />
                  <SortableHead label="Presentación" sortKey="presentacion" {...headProps} />
                  <TableHead>Costo Neto</TableHead>
                  <TableHead>Costo Unitario</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <SkeletonRows cols={7} />
                ) : (
                  (() => {
                    const rows =
                      proveedorView === 'obligatorio' ? filteredObligatorios : filteredSugeridos;
                    return !rows?.length ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-40">
                          <EmptyState
                            icon={Package}
                            title={
                              proveedorView === 'obligatorio'
                                ? 'Sin ingredientes obligatorios'
                                : 'Sin ingredientes sugeridos'
                            }
                            description={
                              proveedorView === 'obligatorio'
                                ? 'Agregá ingredientes con proveedor obligatorio'
                                : 'Agregá ingredientes con proveedor sugerido'
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((row: any) => renderRow(row, 'ingrediente'))
                    );
                  })()
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="insumos">
          <div className="flex items-center gap-1 mb-4">
            <Button
              variant={proveedorView === 'obligatorio' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setProveedorView('obligatorio')}
            >
              Obligatorio ({filteredInsumosOblig?.length || 0})
            </Button>
            <Button
              variant={proveedorView === 'sugerido' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setProveedorView('sugerido')}
            >
              Sugerido ({filteredInsumosSugeridos?.length || 0})
            </Button>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead label="Insumo" sortKey="nombre" {...headProps} />
                  <SortableHead label="Proveedor" sortKey="proveedor" {...headProps} />
                  <SortableHead label="Categoría" sortKey="categoria" {...headProps} />
                  <SortableHead label="Presentación" sortKey="presentacion" {...headProps} />
                  <TableHead>Costo Neto</TableHead>
                  <TableHead>Costo Unitario</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <SkeletonRows cols={7} />
                ) : (
                  (() => {
                    const rows =
                      proveedorView === 'obligatorio'
                        ? filteredInsumosOblig
                        : filteredInsumosSugeridos;
                    return !rows?.length ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-40">
                          <EmptyState
                            icon={Package}
                            title={
                              proveedorView === 'obligatorio'
                                ? 'Sin insumos obligatorios'
                                : 'Sin insumos sugeridos'
                            }
                            description={
                              proveedorView === 'obligatorio'
                                ? 'Agregá insumos con proveedor obligatorio'
                                : 'Agregá insumos con proveedor sugerido'
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((row: any) => renderRow(row, 'insumo'))
                    );
                  })()
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="productos">
          <div className="flex items-center gap-1 mb-4">
            <Button
              variant={proveedorView === 'obligatorio' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setProveedorView('obligatorio')}
            >
              Obligatorio ({filteredProductosOblig?.length || 0})
            </Button>
            <Button
              variant={proveedorView === 'sugerido' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setProveedorView('sugerido')}
            >
              Sugerido ({filteredProductosSugeridos?.length || 0})
            </Button>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead label="Producto" sortKey="nombre" {...headProps} />
                  <SortableHead label="Proveedor" sortKey="proveedor" {...headProps} />
                  <SortableHead label="Categoría" sortKey="categoria" {...headProps} />
                  <SortableHead label="Presentación" sortKey="presentacion" {...headProps} />
                  <TableHead>Costo Neto</TableHead>
                  <TableHead>Costo Unitario</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <SkeletonRows cols={7} />
                ) : (
                  (() => {
                    const rows =
                      proveedorView === 'obligatorio'
                        ? filteredProductosOblig
                        : filteredProductosSugeridos;
                    return !rows?.length ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-40">
                          <EmptyState
                            icon={ShoppingBag}
                            title={
                              proveedorView === 'obligatorio'
                                ? 'Sin productos obligatorios'
                                : 'Sin productos sugeridos'
                            }
                            description={
                              proveedorView === 'obligatorio'
                                ? 'Agregá productos con proveedor obligatorio'
                                : 'Agregá productos con proveedor sugerido'
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((row: any) => renderProductoRow(row))
                    );
                  })()
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <InsumoFormModal
        open={insumoModalOpen}
        onOpenChange={(open) => {
          setInsumoModalOpen(open);
          if (!open) setEditingInsumo(null);
        }}
        insumo={editingInsumo}
        context="brand"
        fixedType={fixedType}
      />

      <ProductoFormModal
        open={productoModalOpen}
        onOpenChange={(open) => {
          setProductoModalOpen(open);
          if (!open) setEditingProducto(null);
        }}
        producto={editingProducto}
      />

      <ConfirmDialog
        open={!!deletingInsumo}
        onOpenChange={() => setDeletingInsumo(null)}
        title="Eliminar item"
        description={`¿Eliminar "${deletingInsumo?.name}"?`}
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={async () => {
          if (deletingInsumo) await deleteInsumo.mutateAsync(deletingInsumo.id);
          setDeletingInsumo(null);
        }}
      />
    </div>
  );
}

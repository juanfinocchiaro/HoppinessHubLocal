import { useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Plus, Pencil, Trash2 } from 'lucide-react';
import { useConceptosServicio, useConceptoServicioMutations } from '@/hooks/useConceptosServicio';
import { ConceptoServicioFormModal } from '@/components/finanzas/ConceptoServicioFormModal';
import { EmptyState } from '@/components/ui/states';

const TIPO_LABELS: Record<string, string> = {
  servicio_publico: 'Servicio Público',
  alquiler: 'Alquiler',
  canon_marca: 'Canon Marca',
  impuesto: 'Impuesto',
  servicio_profesional: 'Servicio Profesional',
  otro: 'Otro',
};

export default function ConceptosServicioPage() {
  const { data: conceptos, isLoading } = useConceptosServicio();
  const { softDelete } = useConceptoServicioMutations();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<any>(null);
  const [showNew, setShowNew] = useState(false);

  const filtered = conceptos?.filter((c: any) =>
    c.nombre.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Servicios Recurrentes"
        subtitle="Catálogo de servicios que pagan los locales: alquiler, honorarios, servicios públicos, etc. Se usan al cargar facturas."
      />
      <div className="flex items-center justify-between gap-4 mb-4">
        <DataToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar concepto..."
        />
        <Button size="sm" onClick={() => setShowNew(true)}>
          <Plus className="w-4 h-4 mr-1" /> Nuevo Concepto
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Concepto</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Periodicidad</TableHead>
              <TableHead>Categoría RDO</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : !filtered?.length ? (
              <TableRow>
                <TableCell colSpan={5} className="h-40">
                  <EmptyState
                    icon={FileText}
                    title="Sin conceptos"
                    description="No hay conceptos de servicio registrados"
                  />
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row: any) => (
                <TableRow key={row.id} className={row.visible_local === false ? 'opacity-50' : ''}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="font-medium">{row.nombre}</p>
                        {row.descripcion && (
                          <p className="text-xs text-muted-foreground truncate max-w-[250px]">
                            {row.descripcion}
                          </p>
                        )}
                      </div>
                      {row.visible_local === false && (
                        <Badge variant="outline" className="text-xs">
                          Solo marca
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{TIPO_LABELS[row.tipo] || row.tipo}</Badge>
                  </TableCell>
                  <TableCell className="text-sm capitalize">{row.periodicidad || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {row.rdo_category_code || '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditing(row)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => softDelete.mutate(row.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ConceptoServicioFormModal open={showNew} onOpenChange={setShowNew} />
      <ConceptoServicioFormModal
        open={!!editing}
        onOpenChange={() => setEditing(null)}
        concepto={editing}
      />
    </div>
  );
}

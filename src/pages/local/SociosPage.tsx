import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page-header';
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
import { Plus, Pencil, ArrowRightLeft, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { useSocios, useMovimientosSocio, TIPO_MOVIMIENTO_OPTIONS } from '@/hooks/useSocios';
import { SocioFormModal } from '@/components/finanzas/SocioFormModal';
import { MovimientoSocioModal } from '@/components/finanzas/MovimientoSocioModal';
import { EmptyState } from '@/components/ui/states';
import type { Tables } from '@/integrations/supabase/types';

type Socio = Tables<'partners'>;

export default function SociosPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const { data: socios, isLoading } = useSocios(branchId!);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Socio | null>(null);
  const [movSocio, setMovSocio] = useState<Socio | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const totalPorcentaje =
    socios?.reduce((sum: number, s: any) => sum + Number(s.porcentaje_participacion || s.ownership_percentage || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Socios"
        subtitle={`Participaciones: ${totalPorcentaje.toFixed(1)}%`}
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" /> Nuevo Socio
          </Button>
        }
      />

      {totalPorcentaje !== 100 && socios && socios.length > 0 && (
        <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          ⚠️ Las participaciones suman {totalPorcentaje.toFixed(1)}% (deben sumar 100%)
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Nombre</TableHead>
              <TableHead>CUIT</TableHead>
              <TableHead className="text-right">Participación</TableHead>
              <TableHead>Ingreso</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[120px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : !socios?.length ? (
              <TableRow>
                <TableCell colSpan={7} className="h-40">
                  <EmptyState
                    icon={Users}
                    title="Sin socios"
                    description="Registrá a los socios del local"
                  />
                </TableCell>
              </TableRow>
            ) : (
              (socios as any[]).map((socio: any) => (
                <>
                  <TableRow
                    key={socio.id}
                    className="cursor-pointer"
                    onClick={() => setExpanded(expanded === socio.id ? null : socio.id)}
                  >
                    <TableCell>
                      {expanded === socio.id ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{socio.name || socio.nombre}</TableCell>
                    <TableCell className="text-sm">{socio.cuit || '-'}</TableCell>
                    <TableCell className="text-right font-mono">
                      {Number(socio.ownership_percentage || socio.porcentaje_participacion || 0).toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(socio.fecha_ingreso).toLocaleDateString('es-AR')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={socio.is_active ? 'default' : 'secondary'}>
                        {socio.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditing(socio);
                            setModalOpen(true);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setMovSocio(socio)}>
                          <ArrowRightLeft className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expanded === socio.id && (
                    <TableRow>
                      <TableCell colSpan={7} className="bg-muted/30 p-0">
                        <SocioMovimientosSubtable branchId={branchId!} socioId={socio.id} />
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <SocioFormModal
        open={modalOpen}
        onOpenChange={(o) => {
          setModalOpen(o);
          if (!o) setEditing(null);
        }}
        branchId={branchId!}
        socio={editing}
      />

      {movSocio && (
        <MovimientoSocioModal
          open={!!movSocio}
          onOpenChange={() => setMovSocio(null)}
          branchId={branchId!}
          socio={movSocio}
        />
      )}
    </div>
  );
}

function SocioMovimientosSubtable({ branchId, socioId }: { branchId: string; socioId: string }) {
  const { data: movimientos, isLoading } = useMovimientosSocio(branchId, socioId);

  const getTipoLabel = (tipo: string) =>
    TIPO_MOVIMIENTO_OPTIONS.find((t) => t.value === tipo)?.label || tipo;

  if (isLoading)
    return (
      <div className="p-4">
        <Skeleton className="h-20 w-full" />
      </div>
    );

  if (!movimientos?.length) {
    return (
      <div className="p-4 text-sm text-muted-foreground text-center">
        Sin movimientos registrados
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead className="text-right">Monto</TableHead>
          <TableHead>Observaciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {(movimientos as any[]).map((m: any) => (
          <TableRow key={m.id}>
            <TableCell className="text-sm">
              {new Date(m.date || m.fecha).toLocaleDateString('es-AR')}
            </TableCell>
            <TableCell>
              <Badge variant="outline">{getTipoLabel(m.tipo)}</Badge>
            </TableCell>
            <TableCell className="text-right font-mono">
              $ {Number(m.amount || m.monto).toLocaleString('es-AR')}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
              {m.notes || m.observaciones || '-'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * InspectionsPage - Historial de visitas de supervisión
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, MapPin, Calendar, User, ChevronRight, Filter, Trash2 } from 'lucide-react';
import { fetchActiveBranchNames } from '@/services/adminService';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/states';
import { HoppinessLoader } from '@/components/ui/hoppiness-loader';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useInspections, useDeleteInspection } from '@/hooks/useInspections';
import { TYPE_SHORT_LABELS, STATUS_LABELS } from '@/types/inspection';
import { cn } from '@/lib/utils';

export default function InspectionsPage() {
  const navigate = useNavigate();
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const deleteInspection = useDeleteInspection();

  // Fetch branches for filter
  const { data: branches } = useQuery({
    queryKey: ['branches-for-filter'],
    queryFn: fetchActiveBranchNames,
  });

  // Fetch inspections
  const { data: inspections, isLoading } = useInspections({
    branchId: branchFilter !== 'all' ? branchFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    limit: 100,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supervisiones"
        subtitle="Historial de visitas BOH, FOH y Ultra Smash a sucursales"
        actions={
          <Button onClick={() => navigate('/mimarca/supervisiones/nueva')}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Visita
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={branchFilter} onValueChange={setBranchFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Sucursal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las sucursales</SelectItem>
            {branches?.map((branch) => (
              <SelectItem key={branch.id} value={branch.id}>
                {branch.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="en_curso">En Curso</SelectItem>
            <SelectItem value="completada">Completada</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <HoppinessLoader />
        </div>
      ) : !inspections?.length ? (
        <EmptyState
          title="Sin visitas registradas"
          description="Inicia una nueva visita de supervisión"
          action={{
            label: 'Nueva Visita',
            onClick: () => navigate('/mimarca/supervisiones/nueva'),
          }}
        />
      ) : (
        <div className="space-y-3">
          {inspections.map((inspection) => {
            const score = inspection.score_total;
            const scoreColor =
              score !== null
                ? score >= 80
                  ? 'text-green-600'
                  : score >= 60
                    ? 'text-yellow-600'
                    : 'text-destructive'
                : 'text-muted-foreground';

            return (
              <Link key={inspection.id} to={`/mimarca/supervisiones/${inspection.id}`}>
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant={
                              inspection.status === 'completada'
                                ? 'default'
                                : inspection.status === 'en_curso'
                                  ? 'secondary'
                                  : 'outline'
                            }
                          >
                            {TYPE_SHORT_LABELS[inspection.inspection_type]}
                          </Badge>
                          <Badge variant="outline">{STATUS_LABELS[inspection.status]}</Badge>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {inspection.branch?.name || 'Sucursal'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {format(new Date(inspection.started_at), 'd MMM yyyy, HH:mm', {
                              locale: es,
                            })}
                          </span>
                          {inspection.inspector && (
                            <span className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5" />
                              {inspection.inspector.full_name}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {score !== null && (
                          <div className={cn('text-2xl font-bold', scoreColor)}>
                            {score}
                            <span className="text-sm text-muted-foreground">/100</span>
                          </div>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDeleteId(inspection.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="¿Eliminar visita?"
        description="Esta acción no se puede deshacer. Se eliminarán todos los datos de esta visita."
        confirmLabel="Eliminar"
        onConfirm={async () => {
          if (deleteId) {
            await deleteInspection.mutateAsync(deleteId);
            setDeleteId(null);
          }
        }}
        variant="destructive"
      />
    </div>
  );
}

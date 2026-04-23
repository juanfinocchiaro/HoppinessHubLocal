/**
 * InspectionsLocalPage - Supervisiones de la sucursal (solo lectura para encargados)
 */

import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, User, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/states';
import { HoppinessLoader } from '@/components/ui/hoppiness-loader';
import { useInspections } from '@/hooks/useInspections';
import { TYPE_SHORT_LABELS, STATUS_LABELS } from '@/types/inspection';
import { cn } from '@/lib/utils';

export default function InspectionsLocalPage() {
  const { branchId } = useParams<{ branchId: string }>();

  const { data: inspections, isLoading } = useInspections({
    branchId,
    limit: 50,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Supervisiones" subtitle="Historial de visitas realizadas a tu sucursal" />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <HoppinessLoader />
        </div>
      ) : !inspections?.length ? (
        <EmptyState
          title="Sin supervisiones"
          description="Aún no se registraron visitas de supervisión en esta sucursal"
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
    </div>
  );
}

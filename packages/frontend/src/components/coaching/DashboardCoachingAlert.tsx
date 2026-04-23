/**
 * DashboardCoachingAlert - Alerta de coaching pendientes para el dashboard
 * Mejora #3: Alertas en Dashboard de Mi Local
 */
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCoachingStats } from '@/hooks/useCoachingStats';
import { ClipboardList, AlertTriangle, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, getDaysInMonth, getDate } from 'date-fns';
import { es } from 'date-fns/locale';

interface DashboardCoachingAlertProps {
  branchId: string;
}

export function DashboardCoachingAlert({ branchId }: DashboardCoachingAlertProps) {
  const { data: stats, isLoading } = useCoachingStats(branchId);

  if (isLoading || !stats) return null;

  const now = new Date();
  const currentDay = getDate(now);
  const daysInMonth = getDaysInMonth(now);
  const daysRemaining = daysInMonth - currentDay;
  const monthName = format(now, 'MMMM', { locale: es });

  // No mostrar si todos los coachings están hechos
  if (stats.pendingCoachings === 0 && stats.pendingAcknowledgments === 0) return null;

  // Determinar nivel de urgencia
  const isEndOfMonth = daysRemaining <= 5;
  const isUrgent = isEndOfMonth && stats.pendingCoachings > 0;

  return (
    <Alert variant={isUrgent ? 'destructive' : 'default'} className="mb-4">
      <ClipboardList className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        Coaching de {monthName}
        {isUrgent && (
          <Badge variant="destructive" className="text-xs">
            Urgente
          </Badge>
        )}
      </AlertTitle>
      <AlertDescription className="space-y-2">
        <div className="flex flex-wrap items-center gap-3 mt-2">
          {stats.pendingCoachings > 0 && (
            <div className="flex items-center gap-1 text-sm">
              <AlertTriangle className="h-3 w-3" />
              <span className="font-medium">{stats.pendingCoachings}</span> empleados sin evaluar
            </div>
          )}
          {stats.pendingAcknowledgments > 0 && (
            <div className="flex items-center gap-1 text-sm">
              <Users className="h-3 w-3" />
              <span className="font-medium">{stats.pendingAcknowledgments}</span> sin confirmar
            </div>
          )}
        </div>

        {isUrgent && (
          <p className="text-xs mt-1">
            Quedan {daysRemaining} días para terminar el mes. ¡No te olvides de evaluar a tu equipo!
          </p>
        )}

        <div className="flex gap-2 mt-3">
          <Link to={`/milocal/${branchId}/equipo/coaching`}>
            <Button size="sm" variant={isUrgent ? 'default' : 'outline'}>
              <ClipboardList className="h-3 w-3 mr-1" />
              Ir a Coaching
            </Button>
          </Link>
        </div>
      </AlertDescription>
    </Alert>
  );
}

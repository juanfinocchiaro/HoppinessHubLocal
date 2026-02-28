/**
 * MyManagerCoachingTab - Vista del coaching del encargado (para Franquiciado)
 *
 * Muestra el coaching que la Marca (Superadmin/Coordinador) le hizo al encargado
 * de la sucursal. Solo lectura.
 */
import { useQuery } from '@tanstack/react-query';
import { fetchBranchManager, fetchManagerCoachings } from '@/services/coachingService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/states';
import { Clock, CheckCircle, User, Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ScoreEvolutionChart } from './ScoreEvolutionChart';

interface ManagerCoaching {
  id: string;
  coaching_date: string;
  coaching_month: number;
  coaching_year: number;
  overall_score: number | null;
  general_score: number | null;
  strengths: string | null;
  areas_to_improve: string | null;
  action_plan: string | null;
  manager_notes: string | null;
  acknowledged_at: string | null;
  evaluator: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
}

interface ManagerInfo {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface MyManagerCoachingTabProps {
  branchId: string;
}

export function MyManagerCoachingTab({ branchId }: MyManagerCoachingTabProps) {
  const { data: manager, isLoading: loadingManager } = useQuery({
    queryKey: ['branch-manager', branchId],
    queryFn: (): Promise<ManagerInfo | null> => fetchBranchManager(branchId),
    enabled: !!branchId,
  });

  const { data: coachings, isLoading: loadingCoachings } = useQuery({
    queryKey: ['manager-coachings', manager?.id, branchId],
    queryFn: (): Promise<ManagerCoaching[]> =>
      fetchManagerCoachings(manager!.id, branchId),
    enabled: !!manager?.id && !!branchId,
  });

  const isLoading = loadingManager || loadingCoachings;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return 'text-muted-foreground';
    if (score >= 3.5) return 'text-green-600';
    if (score >= 2.5) return 'text-amber-600';
    return 'text-red-600';
  };

  const getTrendIcon = (current: number | null, previous: number | null) => {
    if (!current || !previous) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (current > previous) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (current < previous) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!manager) {
    return (
      <EmptyState
        icon={User}
        title="Sin encargado asignado"
        description="Esta sucursal no tiene un encargado activo"
      />
    );
  }

  const latestCoaching = coachings?.[0];
  const previousCoaching = coachings?.[1];

  if (!latestCoaching) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={manager.avatar_url || undefined} />
              <AvatarFallback>{getInitials(manager.full_name)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>{manager.full_name}</CardTitle>
              <CardDescription>Encargado de la sucursal</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Clock}
            title="Pendiente de evaluación"
            description="El equipo de Marca aún no ha realizado el coaching de este mes"
          />
        </CardContent>
      </Card>
    );
  }

  // Preparar datos para el gráfico (formato compatible con ScoreEvolutionChart)
  const chartData = coachings?.slice(0, 6).reverse() || [];

  return (
    <div className="space-y-6">
      {/* Header con info del encargado */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={manager.avatar_url || undefined} />
                <AvatarFallback>{getInitials(manager.full_name)}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle>{manager.full_name}</CardTitle>
                <CardDescription>Encargado de la sucursal</CardDescription>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-3xl font-bold ${getScoreColor(latestCoaching.overall_score)}`}>
                {latestCoaching.overall_score?.toFixed(1) || '-'}
                <span className="text-sm font-normal text-muted-foreground">/4</span>
              </p>
              <div className="flex items-center gap-1 justify-end">
                {getTrendIcon(
                  latestCoaching.overall_score,
                  previousCoaching?.overall_score || null,
                )}
                <span className="text-xs text-muted-foreground">vs mes anterior</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>
                {format(new Date(latestCoaching.coaching_date), "d 'de' MMMM yyyy", { locale: es })}
              </span>
            </div>
            {latestCoaching.evaluator && (
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>Evaluado por {latestCoaching.evaluator.full_name}</span>
              </div>
            )}
            {latestCoaching.acknowledged_at ? (
              <Badge variant="secondary" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                Confirmado
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />
                Pendiente de confirmación
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de evolución */}
      {chartData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolución del Desempeño</CardTitle>
          </CardHeader>
          <CardContent>
            <ScoreEvolutionChart
              data={chartData.map((c) => ({
                coaching_month: c.coaching_month,
                coaching_year: c.coaching_year,
                overall_score: c.overall_score,
              }))}
            />
          </CardContent>
        </Card>
      )}

      {/* Detalles del último coaching */}
      <div className="grid gap-4 md:grid-cols-2">
        {latestCoaching.strengths && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-green-600">Fortalezas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{latestCoaching.strengths}</p>
            </CardContent>
          </Card>
        )}

        {latestCoaching.areas_to_improve && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-amber-600">Áreas de Mejora</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{latestCoaching.areas_to_improve}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {latestCoaching.action_plan && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-primary">Plan de Acción</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{latestCoaching.action_plan}</p>
          </CardContent>
        </Card>
      )}

      {/* Historial resumido */}
      {coachings && coachings.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historial</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {coachings.slice(1, 6).map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                >
                  <span className="text-sm capitalize">
                    {format(new Date(c.coaching_year, c.coaching_month - 1), 'MMMM yyyy', {
                      locale: es,
                    })}
                  </span>
                  <span className={`font-medium ${getScoreColor(c.overall_score)}`}>
                    {c.overall_score?.toFixed(1) || '-'}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default MyManagerCoachingTab;

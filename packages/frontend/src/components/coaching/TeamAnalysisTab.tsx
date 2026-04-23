/**
 * TeamAnalysisTab - Vista comparativa del equipo
 * Mejora #2: Ranking, matriz de competencias, campeones por estación
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Crown,
  Target,
  Users,
  Star,
} from 'lucide-react';
import { useTeamCoachingAnalysis } from '@/hooks/useTeamCoachingAnalysis';

interface TeamAnalysisTabProps {
  branchId: string;
}

export function TeamAnalysisTab({ branchId }: TeamAnalysisTabProps) {
  const { data, isLoading } = useTeamCoachingAnalysis(branchId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!data || data.ranking.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            No hay suficientes datos de coaching para mostrar el análisis.
            <br />
            Realiza algunos coachings para ver estadísticas comparativas.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'stable':
        return <Minus className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Star className="h-4 w-4 text-blue-500" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 3.5) return 'text-green-600';
    if (score >= 2.5) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-4">
      {/* Trend Alerts */}
      {data.trendAlerts.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Atención requerida</AlertTitle>
          <AlertDescription>
            {data.trendAlerts.length} empleado{data.trendAlerts.length > 1 ? 's' : ''} con tendencia
            negativa: {data.trendAlerts.map((a) => a.fullName).join(', ')}
          </AlertDescription>
        </Alert>
      )}

      {/* Team Average */}
      {data.teamAverageScore && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Promedio del equipo</p>
                  <p className="text-2xl font-bold">{data.teamAverageScore}/4</p>
                </div>
              </div>
              <Badge variant="outline" className="text-lg px-4 py-2">
                {data.ranking.length} empleados evaluados
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Ranking */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4" />
              Ranking por Desempeño
            </CardTitle>
            <CardDescription>Ordenado por promedio de score</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.ranking.slice(0, 10).map((employee, index) => (
                <div
                  key={employee.userId}
                  className={`flex items-center justify-between p-2 rounded-lg ${
                    index === 0
                      ? 'bg-amber-50 dark:bg-amber-950/20 border border-amber-200'
                      : index === 1
                        ? 'bg-slate-100 dark:bg-slate-900/20'
                        : index === 2
                          ? 'bg-orange-50 dark:bg-orange-950/20'
                          : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 text-center font-bold ${
                        index === 0
                          ? 'text-amber-500'
                          : index === 1
                            ? 'text-slate-400'
                            : index === 2
                              ? 'text-orange-400'
                              : 'text-muted-foreground'
                      }`}
                    >
                      {index === 0
                        ? '🥇'
                        : index === 1
                          ? '🥈'
                          : index === 2
                            ? '🥉'
                            : `${index + 1}`}
                    </span>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={employee.avatarUrl || undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(employee.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{employee.fullName}</p>
                      <p className="text-xs text-muted-foreground">
                        {employee.coachingsCount} evaluaciones
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getTrendIcon(employee.trend)}
                    <span className={`font-bold ${getScoreColor(employee.avgScore)}`}>
                      {employee.avgScore}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Station Champions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Crown className="h-4 w-4" />
              Campeones por Estación
            </CardTitle>
            <CardDescription>Mejor desempeño en cada área</CardDescription>
          </CardHeader>
          <CardContent>
            {data.stationChampions.length > 0 ? (
              <div className="space-y-2">
                {data.stationChampions.map((champion) => (
                  <div
                    key={champion.stationId}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="text-xs">
                        {champion.stationName}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={champion.avatarUrl || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(champion.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{champion.fullName}</span>
                      <Badge variant="outline" className="text-green-600">
                        {champion.avgScore}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay datos de estaciones
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Competency Analysis */}
      {data.competencyAnalysis.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Análisis de Competencias</CardTitle>
            <CardDescription>
              Áreas más débiles del equipo (ordenado de menor a mayor)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.competencyAnalysis.slice(0, 5).map((comp) => (
                <div key={comp.competencyId} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{comp.competencyName}</span>
                    <span className={`text-sm font-bold ${getScoreColor(comp.avgScore)}`}>
                      {comp.avgScore}/4
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        comp.avgScore >= 3
                          ? 'bg-green-500'
                          : comp.avgScore >= 2
                            ? 'bg-amber-500'
                            : 'bg-red-500'
                      }`}
                      style={{ width: `${(comp.avgScore / 4) * 100}%` }}
                    />
                  </div>
                  {comp.lowestEmployees.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Necesitan refuerzo: {comp.lowestEmployees.map((e) => e.name).join(', ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

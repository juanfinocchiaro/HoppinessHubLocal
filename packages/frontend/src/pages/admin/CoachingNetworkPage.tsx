/**
 * CoachingNetworkPage - Dashboard de Red (Vista de todos los coachings de empleados)
 *
 * Vista de solo lectura para Superadmin, Coordinador e Informes.
 * Muestra métricas consolidadas de todos los coachings de empleados hechos por encargados.
 */
import { useNetworkCoachingStats } from '@/hooks/useNetworkCoachingStats';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  CheckCircle,
  Clock,
  TrendingUp,
  Award,
  AlertTriangle,
  BarChart3,
  Building2,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';

import { RequireBrandPermission } from '@/components/guards';

function CoachingNetworkPageContent() {
  const { data: stats, isLoading } = useNetworkCoachingStats();

  const currentMonth = new Date().toLocaleString('es-AR', { month: 'long' });

  const getScoreColor = (score: number | null) => {
    if (!score) return 'text-muted-foreground';
    if (score >= 3.5) return 'text-green-600';
    if (score >= 2.5) return 'text-amber-600';
    return 'text-red-600';
  };

  const getBarColor = (score: number) => {
    if (score >= 3.5) return 'hsl(var(--chart-2))';
    if (score >= 2.5) return 'hsl(var(--chart-4))';
    return 'hsl(var(--chart-5))';
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const completionRate =
    stats.totalEmployees > 0
      ? Math.round((stats.totalCoachingsThisMonth / stats.totalEmployees) * 100)
      : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          Dashboard de Coaching - Red
        </h1>
        <p className="text-muted-foreground capitalize">Métricas consolidadas de {currentMonth}</p>
      </div>

      {/* Stats principales */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalEmployees}</p>
                <p className="text-xs text-muted-foreground">Empleados en red</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-950">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalCoachingsThisMonth}</p>
                <p className="text-xs text-muted-foreground">Evaluados ({completionRate}%)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-950">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalPending}</p>
                <p className="text-xs text-muted-foreground">Pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-950">
                <Award className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${getScoreColor(stats.networkAverageScore)}`}>
                  {stats.networkAverageScore?.toFixed(1) || '-'}
                </p>
                <p className="text-xs text-muted-foreground">Promedio red /4</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tendencia mensual */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Tendencia de la Red
            </CardTitle>
            <CardDescription>Promedio de score últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="month"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    domain={[0, 4]}
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [value.toFixed(2), 'Promedio']}
                  />
                  <Line
                    type="monotone"
                    dataKey="averageScore"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Por sucursal */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Promedio por Sucursal
            </CardTitle>
            <CardDescription>Comparativa del mes actual</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats.branchStats.filter((b) => b.averageScore !== null)}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    type="number"
                    domain={[0, 4]}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    dataKey="branchName"
                    type="category"
                    width={100}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [value.toFixed(2), 'Promedio']}
                  />
                  <Bar dataKey="averageScore" radius={[0, 4, 4, 0]}>
                    {stats.branchStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getBarColor(entry.averageScore || 0)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tablas de Top/Low performers y estado por sucursal */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Top Performers */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-green-600">
              <Award className="h-4 w-4" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topPerformers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sin datos este mes</p>
            ) : (
              <div className="space-y-2">
                {stats.topPerformers.map((p, i) => (
                  <div
                    key={p.userId}
                    className="flex items-center justify-between p-2 rounded-lg bg-green-50 dark:bg-green-950/30"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-green-600">#{i + 1}</span>
                      <div>
                        <p className="text-sm font-medium">{p.fullName}</p>
                        <p className="text-xs text-muted-foreground">{p.branchName}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      {p.score.toFixed(1)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Atención Requerida */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              Atención Requerida
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.lowPerformers.filter((p) => p.score < 2.5).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Todos sobre el umbral 👍
              </p>
            ) : (
              <div className="space-y-2">
                {stats.lowPerformers
                  .filter((p) => p.score < 2.5)
                  .map((p) => (
                    <div
                      key={p.userId}
                      className="flex items-center justify-between p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30"
                    >
                      <div>
                        <p className="text-sm font-medium">{p.fullName}</p>
                        <p className="text-xs text-muted-foreground">{p.branchName}</p>
                      </div>
                      <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                        {p.score.toFixed(1)}
                      </Badge>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Estado por Sucursal */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Avance por Sucursal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.branchStats.map((branch) => {
                const progress =
                  branch.totalEmployees > 0
                    ? Math.round((branch.coachingsThisMonth / branch.totalEmployees) * 100)
                    : 0;

                return (
                  <div key={branch.branchId} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{branch.branchName}</span>
                      <span className="text-muted-foreground">
                        {branch.coachingsThisMonth}/{branch.totalEmployees}
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      {stats.totalPendingAcknowledgments > 0 && (
        <Card className="border-amber-500 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium">Confirmaciones pendientes</p>
                <p className="text-sm text-muted-foreground">
                  {stats.totalPendingAcknowledgments} empleados aún no confirmaron lectura de su
                  coaching
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function CoachingNetworkPage() {
  return (
    <RequireBrandPermission
      permission="canViewCoaching"
      noAccessMessage="No tenés permisos para ver el dashboard de coaching de red."
    >
      <CoachingNetworkPageContent />
    </RequireBrandPermission>
  );
}

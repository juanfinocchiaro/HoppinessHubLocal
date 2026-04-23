/**
 * MyCoachingsCardEnhanced - Panel mejorado de coaching para Mi Cuenta
 * Mejora #1: Mini gráfico evolución, comparación con equipo, insignias
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useEmployeeCoachings, useAcknowledgeCoaching } from '@/hooks/useCoachings';
import { useMyPendingCoachings } from '@/hooks/useCoachingStats';
import { useEmployeeVsTeam } from '@/hooks/useTeamCoachingAnalysis';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { usePermissionsWithImpersonation } from '@/hooks/usePermissionsWithImpersonation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ClipboardCheck, Star, CheckCircle, AlertCircle, TrendingUp, Users } from 'lucide-react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  ReferenceLine,
} from 'recharts';

export function MyCoachingsCardEnhanced() {
  const { id: effectiveUserId } = useEffectiveUser();
  const { branchRoles } = usePermissionsWithImpersonation();
  const { data: pendingCoachings, isLoading: loadingPending } = useMyPendingCoachings();
  const { data: recentCoachings, isLoading: loadingRecent } = useEmployeeCoachings(
    effectiveUserId,
    null,
  );
  const acknowledgeCoaching = useAcknowledgeCoaching();

  // Get first branch for comparison
  const firstBranchId = branchRoles.find(
    (r) => r.local_role === 'empleado' || r.local_role === 'cajero',
  )?.branch_id;
  const { data: vsTeamData } = useEmployeeVsTeam(effectiveUserId, firstBranchId || null);

  const [selectedCoaching, setSelectedCoaching] = useState<{
    id: string;
    month: string;
    score: number | null;
    strengths: string | null;
    areas: string | null;
  } | null>(null);
  const [acknowledgeNotes, setAcknowledgeNotes] = useState('');

  // Los encargados y franquiciados no reciben coachings - ocultar este card
  const hasOnlyExcludedRoles =
    branchRoles.length > 0 &&
    branchRoles.every((r) => r.local_role === 'encargado' || r.local_role === 'franquiciado');

  const isLoading = loadingPending || loadingRecent;

  if (hasOnlyExcludedRoles) return null;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasPending = pendingCoachings && pendingCoachings.length > 0;
  const lastCoaching = recentCoachings?.[0];

  // Prepare chart data
  const chartData =
    vsTeamData?.comparison.map((c) => ({
      name: format(new Date(c.year, c.month - 1), 'MMM', { locale: es }),
      miScore: c.myScore,
      equipoPromedio: c.teamAvg,
    })) || [];

  const handleViewPending = (coaching: (typeof pendingCoachings)[0]) => {
    const date = new Date(coaching.coaching_date);
    setSelectedCoaching({
      id: coaching.id,
      month: format(date, 'MMMM yyyy', { locale: es }),
      score: coaching.overall_score,
      strengths: coaching.strengths,
      areas: coaching.areas_to_improve,
    });
  };

  const handleAcknowledge = async () => {
    if (!selectedCoaching) return;

    await acknowledgeCoaching.mutateAsync({
      coachingId: selectedCoaching.id,
      notes: acknowledgeNotes || undefined,
    });

    setSelectedCoaching(null);
    setAcknowledgeNotes('');
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Mis Coachings
          </CardTitle>
          <CardDescription>Evaluaciones mensuales de desempeño</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Badges de logro */}
          {vsTeamData?.badges && vsTeamData.badges.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {vsTeamData.badges.map((badge, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {badge}
                </Badge>
              ))}
            </div>
          )}

          {/* Pendientes de confirmar */}
          {hasPending && (
            <div className="space-y-2">
              {pendingCoachings.map((coaching) => {
                const date = new Date(coaching.coaching_date);
                const monthName = format(date, 'MMMM', { locale: es });

                return (
                  <div
                    key={coaching.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-warning/30 bg-warning/10"
                  >
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-warning-foreground" />
                      <div>
                        <p className="text-sm font-medium capitalize">Coaching de {monthName}</p>
                        <p className="text-xs text-muted-foreground">Pendiente de confirmar</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleViewPending(coaching)}>
                      Ver y Confirmar
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Mini gráfico de evolución */}
          {chartData.length >= 2 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Tu evolución
                </span>
                <span className="text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  vs. equipo
                </span>
              </div>
              <div className="h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 4]}
                      ticks={[1, 2, 3, 4]}
                      tick={{ fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      width={20}
                    />
                    <Tooltip
                      formatter={(value: number) => value?.toFixed(2)}
                      labelFormatter={(label) => `${label}`}
                    />
                    <ReferenceLine y={2.5} stroke="#e5e7eb" strokeDasharray="3 3" />
                    <Line
                      type="monotone"
                      dataKey="miScore"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name="Mi Score"
                    />
                    <Line
                      type="monotone"
                      dataKey="equipoPromedio"
                      stroke="#94a3b8"
                      strokeWidth={1}
                      strokeDasharray="4 4"
                      dot={false}
                      name="Promedio Equipo"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Último coaching confirmado */}
          {lastCoaching && lastCoaching.acknowledged_at && (
            <div className="p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span className="text-sm capitalize">
                    {format(new Date(lastCoaching.coaching_date), 'MMMM yyyy', { locale: es })}
                  </span>
                </div>
                {lastCoaching.overall_score && (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-primary" />
                    <span className="font-medium">{lastCoaching.overall_score.toFixed(1)}/4</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {!hasPending && !lastCoaching && chartData.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aún no tienes coachings registrados
            </p>
          )}
        </CardContent>
      </Card>

      {/* Modal de confirmación */}
      <Dialog open={!!selectedCoaching} onOpenChange={() => setSelectedCoaching(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="capitalize">Coaching de {selectedCoaching?.month}</DialogTitle>
            <DialogDescription>Revisa tu evaluación y confirma que la leíste</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedCoaching?.score && (
              <div className="flex items-center justify-center gap-2 py-4">
                <Star className="h-8 w-8 text-primary" />
                <span className="text-4xl font-bold">{selectedCoaching.score.toFixed(1)}</span>
                <span className="text-xl text-muted-foreground">/ 4</span>
              </div>
            )}

            {selectedCoaching?.strengths && (
              <div>
                <Label className="text-sm font-medium text-success">Fortalezas</Label>
                <p className="text-sm mt-1 p-2 rounded bg-success/10">
                  {selectedCoaching.strengths}
                </p>
              </div>
            )}

            {selectedCoaching?.areas && (
              <div>
                <Label className="text-sm font-medium text-warning-foreground">
                  Áreas de Mejora
                </Label>
                <p className="text-sm mt-1 p-2 rounded bg-warning/10">{selectedCoaching.areas}</p>
              </div>
            )}

            <div className="pt-2">
              <Label htmlFor="notes">Comentarios (opcional)</Label>
              <Textarea
                id="notes"
                placeholder="¿Algún comentario sobre esta evaluación?"
                value={acknowledgeNotes}
                onChange={(e) => setAcknowledgeNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedCoaching(null)}>
              Cerrar
            </Button>
            <Button onClick={handleAcknowledge} disabled={acknowledgeCoaching.isPending}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirmar Lectura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

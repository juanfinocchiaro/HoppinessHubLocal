/**
 * MyOwnCoachingTab - Vista del coaching propio (para Encargado)
 *
 * Muestra el coaching que la Marca (Superadmin/Coordinador) le hizo al encargado.
 * Permite confirmar lectura (acknowledgment) y ver evolución histórica.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchOwnCoachings } from '@/services/coachingService';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { useAcknowledgeCoaching } from '@/hooks/useCoachings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/states';
import {
  Clock,
  CheckCircle,
  User,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ScoreEvolutionChart } from './ScoreEvolutionChart';

interface MyCoaching {
  id: string;
  coaching_date: string;
  coaching_month: number;
  coaching_year: number;
  overall_score: number | null;
  general_score: number | null;
  station_score: number | null;
  strengths: string | null;
  areas_to_improve: string | null;
  action_plan: string | null;
  manager_notes: string | null;
  previous_action_review: string | null;
  acknowledged_at: string | null;
  acknowledged_notes: string | null;
  evaluator: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
}

interface MyOwnCoachingTabProps {
  branchId: string;
}

export function MyOwnCoachingTab({ branchId }: MyOwnCoachingTabProps) {
  const { id: userId } = useEffectiveUser();
  const [showAckForm, setShowAckForm] = useState(false);
  const [ackNotes, setAckNotes] = useState('');

  const acknowledgeMutation = useAcknowledgeCoaching();

  const { data: coachings, isLoading } = useQuery({
    queryKey: ['my-own-coachings', userId, branchId],
    queryFn: (): Promise<MyCoaching[]> => fetchOwnCoachings(userId!, branchId),
    enabled: !!userId && !!branchId,
  });

  const getScoreColor = (score: number | null) => {
    if (!score) return 'text-muted-foreground';
    if (score >= 4.5) return 'text-purple-600';
    if (score >= 3.5) return 'text-blue-600';
    if (score >= 2.5) return 'text-green-600';
    if (score >= 1.5) return 'text-amber-600';
    return 'text-red-600';
  };

  const getTrendIcon = (current: number | null, previous: number | null) => {
    if (!current || !previous) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (current > previous) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (current < previous) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const handleAcknowledge = async () => {
    if (!latestCoaching) return;

    await acknowledgeMutation.mutateAsync({
      coachingId: latestCoaching.id,
      notes: ackNotes.trim() || undefined,
    });

    setShowAckForm(false);
    setAckNotes('');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  const latestCoaching = coachings?.[0];
  const previousCoaching = coachings?.[1];

  if (!latestCoaching) {
    return (
      <Card>
        <CardContent className="py-8">
          <EmptyState
            icon={Clock}
            title="Sin evaluaciones aún"
            description="El equipo de Marca aún no ha realizado tu coaching de este mes"
          />
        </CardContent>
      </Card>
    );
  }

  // Preparar datos para el gráfico (formato compatible con ScoreEvolutionChart)
  const chartData = coachings?.slice(0, 6).reverse() || [];

  const needsAcknowledgment = !latestCoaching.acknowledged_at;

  return (
    <div className="space-y-6">
      {/* Alerta si necesita confirmar */}
      {needsAcknowledgment && !showAckForm && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">Tenés un nuevo coaching para revisar</p>
                <p className="text-sm text-muted-foreground">
                  Confirmá que lo leíste para que quede registrado
                </p>
              </div>
              <Button onClick={() => setShowAckForm(true)}>Confirmar Lectura</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formulario de confirmación */}
      {showAckForm && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-base">Confirmar Lectura</CardTitle>
            <CardDescription>Opcionalmente podés agregar un comentario</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Comentarios o compromisos (opcional)..."
              value={ackNotes}
              onChange={(e) => setAckNotes(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2">
              <Button onClick={handleAcknowledge} disabled={acknowledgeMutation.isPending}>
                {acknowledgeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Confirmar
              </Button>
              <Button variant="outline" onClick={() => setShowAckForm(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Score principal */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Mi Evaluación</CardTitle>
              <CardDescription className="capitalize">
                {format(
                  new Date(latestCoaching.coaching_year, latestCoaching.coaching_month - 1),
                  'MMMM yyyy',
                  { locale: es },
                )}
              </CardDescription>
            </div>
            <div className="text-right">
              <p className={`text-4xl font-bold ${getScoreColor(latestCoaching.overall_score)}`}>
                {latestCoaching.overall_score?.toFixed(1) || '-'}
                <span className="text-lg font-normal text-muted-foreground">/5</span>
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
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>
                {format(new Date(latestCoaching.coaching_date), "d 'de' MMMM yyyy", { locale: es })}
              </span>
            </div>
            {latestCoaching.evaluator && (
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>Por {latestCoaching.evaluator.full_name}</span>
              </div>
            )}
            {latestCoaching.acknowledged_at ? (
              <Badge variant="secondary" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                Confirmado {format(new Date(latestCoaching.acknowledged_at), 'd/M', { locale: es })}
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />
                Pendiente de confirmación
              </Badge>
            )}
          </div>

          {/* Scores desglosados */}
          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
            <div>
              <p className="text-sm text-muted-foreground">Competencias Generales</p>
              <p className={`text-xl font-semibold ${getScoreColor(latestCoaching.general_score)}`}>
                {latestCoaching.general_score?.toFixed(1) || '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Estaciones de Trabajo</p>
              <p className={`text-xl font-semibold ${getScoreColor(latestCoaching.station_score)}`}>
                {latestCoaching.station_score?.toFixed(1) || '-'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de evolución */}
      {chartData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mi Evolución</CardTitle>
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

      {/* Revisión del plan anterior */}
      {latestCoaching.previous_action_review && (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-blue-600 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Revisión del Plan Anterior
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{latestCoaching.previous_action_review}</p>
          </CardContent>
        </Card>
      )}

      {/* Detalles del coaching */}
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
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-primary">Plan de Acción</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{latestCoaching.action_plan}</p>
          </CardContent>
        </Card>
      )}

      {/* Notas del manager */}
      {latestCoaching.manager_notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Notas Adicionales</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{latestCoaching.manager_notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Mis comentarios (si ya confirmé) */}
      {latestCoaching.acknowledged_notes && (
        <Card className="bg-muted/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Mi Comentario</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{latestCoaching.acknowledged_notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Historial */}
      {coachings && coachings.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historial de Evaluaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {coachings.slice(1, 6).map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <span className="text-sm font-medium capitalize">
                      {format(new Date(c.coaching_year, c.coaching_month - 1), 'MMMM yyyy', {
                        locale: es,
                      })}
                    </span>
                    {c.evaluator && (
                      <p className="text-xs text-muted-foreground">Por {c.evaluator.full_name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${getScoreColor(c.overall_score)}`}>
                      {c.overall_score?.toFixed(1) || '-'}
                    </span>
                    {c.acknowledged_at && <CheckCircle className="h-4 w-4 text-green-600" />}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default MyOwnCoachingTab;

import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useCoachingDetails } from '@/hooks/useCoachings';
import { useCompetencyConfig } from '@/hooks/useStationCompetencies';
import {
  CheckCircle,
  Clock,
  User,
  Calendar,
  Target,
  TrendingUp,
  MessageSquare,
  ChevronDown,
  ClipboardCheck,
  FileText,
} from 'lucide-react';

interface CoachingDetailModalProps {
  coachingId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Componente para mostrar un score con barra visual (escala 1-5)
function ScoreBar({ score, label, sublabel }: { score: number; label: string; sublabel?: string }) {
  const percentage = (score / 5) * 100;
  const getBarColor = () => {
    if (score >= 4) return 'bg-primary';
    if (score >= 3) return 'bg-green-500';
    if (score >= 2) return 'bg-amber-500';
    return 'bg-destructive';
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{score}/5</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${getBarColor()} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
    </div>
  );
}

// Componente para mostrar una sección de estación expandible
function StationSection({
  stationName,
  stationScore,
  competencyScores,
  competencyNames,
}: {
  stationName: string;
  stationScore: number;
  competencyScores: { competency_id: string; score: number; notes: string | null }[];
  competencyNames: Map<string, string>;
}) {
  const getScoreColor = (score: number) => {
    if (score >= 3.5) return 'text-primary';
    if (score >= 2.5) return 'text-amber-600';
    return 'text-destructive';
  };

  return (
    <Collapsible defaultOpen>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{stationName}</span>
            <Badge variant="outline" className="text-xs">
              {competencyScores.length} criterios
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-lg font-bold ${getScoreColor(stationScore)}`}>
              {stationScore.toFixed(1)}
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pl-4 pr-2 py-3 space-y-3 border-l-2 border-muted ml-4 mt-2">
          {competencyScores.map((cs, idx) => (
            <ScoreBar
              key={cs.competency_id || idx}
              score={cs.score}
              label={competencyNames.get(cs.competency_id) || 'Competencia'}
              sublabel={cs.notes || undefined}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function CoachingDetailModal({ coachingId, open, onOpenChange }: CoachingDetailModalProps) {
  const { data: coaching, isLoading } = useCoachingDetails(coachingId);
  const { stations, stationCompetencies, generalCompetencies } = useCompetencyConfig();

  // Crear mapas para nombres
  const stationNameMap = useMemo(() => new Map(stations.map((s) => [s.id, s.name])), [stations]);

  const stationCompetencyNameMap = useMemo(
    () => new Map(stationCompetencies.map((c) => [c.id, c.name])),
    [stationCompetencies],
  );

  const generalCompetencyNameMap = useMemo(
    () => new Map(generalCompetencies.map((c) => [c.id, c.name])),
    [generalCompetencies],
  );

  // Agrupar competencias por estación
  const competenciesByStation = useMemo(() => {
    if (!coaching?.competency_scores) return new Map();

    const stationComps = coaching.competency_scores.filter((c) => c.competency_type === 'station');
    const grouped = new Map<string, typeof stationComps>();

    // Necesitamos encontrar a qué estación pertenece cada competencia
    stationComps.forEach((cs) => {
      const competency = stationCompetencies.find((sc) => sc.id === cs.competency_id);
      if (competency) {
        const existing = grouped.get(competency.station_id) || [];
        grouped.set(competency.station_id, [...existing, cs]);
      }
    });

    return grouped;
  }, [coaching?.competency_scores, stationCompetencies]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return 'text-muted-foreground';
    if (score >= 4.5) return 'text-purple-600';
    if (score >= 3.5) return 'text-primary';
    if (score >= 2.5) return 'text-green-600';
    if (score >= 1.5) return 'text-amber-600';
    return 'text-destructive';
  };

  const getScoreLabel = (score: number | null) => {
    if (!score) return 'Sin evaluar';
    if (score >= 4.5) return 'Referente';
    if (score >= 3.5) return 'Destacado';
    if (score >= 2.5) return 'Competente';
    if (score >= 1.5) return 'En Desarrollo';
    return 'Aprendiz';
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            Detalle Completo del Coaching
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : coaching ? (
          <ScrollArea className="max-h-[calc(90vh-100px)]">
            <div className="p-6 pt-4 space-y-6">
              {/* Header con empleado y score general */}
              <Card className="bg-gradient-to-br from-muted/50 to-muted">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-14 w-14 border-2 border-background shadow">
                        <AvatarImage src={coaching.employee?.avatar_url || undefined} />
                        <AvatarFallback className="text-lg">
                          {coaching.employee?.full_name
                            ? getInitials(coaching.employee.full_name)
                            : '??'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-lg font-semibold">{coaching.employee?.full_name}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <Calendar className="h-3 w-3" />
                          <span className="capitalize">{formatDate(coaching.coaching_date)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                          <User className="h-3 w-3" />
                          Evaluado por:{' '}
                          <span className="font-medium text-foreground">
                            {coaching.evaluator?.full_name}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className={`text-4xl font-bold ${getScoreColor(coaching.overall_score)}`}
                      >
                        {coaching.overall_score?.toFixed(1) || '-'}
                      </div>
                      <span className="text-sm text-muted-foreground">/ 5</span>
                      <Badge
                        variant={
                          coaching.overall_score && coaching.overall_score >= 3.5
                            ? 'default'
                            : 'secondary'
                        }
                        className="mt-2 block"
                      >
                        {getScoreLabel(coaching.overall_score)}
                      </Badge>
                    </div>
                  </div>

                  {/* Resumen de scores */}
                  <div className="grid grid-cols-2 gap-4 mt-5 pt-4 border-t">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Estaciones</p>
                      <p className={`text-2xl font-bold ${getScoreColor(coaching.station_score)}`}>
                        {coaching.station_score?.toFixed(1) || '-'}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Generales</p>
                      <p className={`text-2xl font-bold ${getScoreColor(coaching.general_score)}`}>
                        {coaching.general_score?.toFixed(1) || '-'}
                      </p>
                    </div>
                  </div>

                  {/* Estado de confirmación */}
                  <div className="mt-4 pt-3 border-t">
                    {coaching.acknowledged_at ? (
                      <div className="flex items-center gap-2 text-sm text-primary">
                        <CheckCircle className="h-4 w-4" />
                        <span>
                          Confirmado por el empleado el {formatDate(coaching.acknowledged_at)}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>Pendiente de confirmación por el empleado</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Desglose por Estaciones */}
              {coaching.station_scores && coaching.station_scores.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Evaluación por Estación
                      <Badge variant="outline" className="ml-auto">
                        {coaching.station_scores.length} estacion
                        {coaching.station_scores.length !== 1 ? 'es' : ''}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {coaching.station_scores.map((ss) => {
                      const stationCompScores = competenciesByStation.get(ss.station_id) || [];
                      return (
                        <StationSection
                          key={ss.id}
                          stationName={stationNameMap.get(ss.station_id) || 'Estación'}
                          stationScore={ss.score}
                          competencyScores={stationCompScores}
                          competencyNames={stationCompetencyNameMap}
                        />
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              {/* Competencias Generales con detalle */}
              {coaching.competency_scores &&
                coaching.competency_scores.filter((c) => c.competency_type === 'general').length >
                  0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Competencias Generales
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {coaching.competency_scores
                        .filter((cs) => cs.competency_type === 'general')
                        .map((cs, idx) => (
                          <ScoreBar
                            key={cs.id || idx}
                            score={cs.score}
                            label={generalCompetencyNameMap.get(cs.competency_id) || 'Competencia'}
                            sublabel={cs.notes || undefined}
                          />
                        ))}
                      <Separator />
                      <div className="flex items-center justify-between pt-1">
                        <span className="font-medium">Promedio General</span>
                        <span
                          className={`text-lg font-bold ${getScoreColor(coaching.general_score)}`}
                        >
                          {coaching.general_score?.toFixed(1) || '-'} / 5
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}

              {/* Seguimiento del plan anterior */}
              {coaching.previous_action_review && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Seguimiento del Plan Anterior
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{coaching.previous_action_review}</p>
                  </CardContent>
                </Card>
              )}

              {/* Feedback cualitativo */}
              {(coaching.strengths || coaching.areas_to_improve || coaching.action_plan) && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Feedback y Plan de Acción
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {coaching.strengths && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-primary" />
                          <p className="text-sm font-semibold">Fortalezas</p>
                        </div>
                        <p className="text-sm text-muted-foreground pl-4 border-l-2 border-primary/30">
                          {coaching.strengths}
                        </p>
                      </div>
                    )}
                    {coaching.areas_to_improve && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-amber-500" />
                          <p className="text-sm font-semibold">Áreas de Mejora</p>
                        </div>
                        <p className="text-sm text-muted-foreground pl-4 border-l-2 border-amber-500/30">
                          {coaching.areas_to_improve}
                        </p>
                      </div>
                    )}
                    {coaching.action_plan && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-blue-500" />
                          <p className="text-sm font-semibold">Plan de Acción</p>
                        </div>
                        <p className="text-sm text-muted-foreground pl-4 border-l-2 border-blue-500/30">
                          {coaching.action_plan}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Notas del empleado en la confirmación */}
              {coaching.acknowledged_notes && (
                <Card className="border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Respuesta del Empleado
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm italic">"{coaching.acknowledged_notes}"</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        ) : (
          <p className="text-center text-muted-foreground py-8">No se encontró el coaching</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

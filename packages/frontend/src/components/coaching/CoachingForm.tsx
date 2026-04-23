import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Save, Star, FileText } from 'lucide-react';
import { CoachingStationSection } from './CoachingStationSection';
import { CoachingGeneralSection } from './CoachingGeneralSection';
import { useCompetencyConfig } from '@/hooks/useStationCompetencies';
import { useCreateCoaching, useEmployeeCoachings } from '@/hooks/useCoachings';


interface Employee {
  id: string;
  full_name: string;
  avatar_url?: string | null;
}

interface CoachingFormProps {
  employee: Employee;
  branchId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface StationScore {
  stationId: string;
  score: number;
  competencyScores: { competencyId: string; score: number }[];
}

interface GeneralScore {
  competencyId: string;
  score: number;
}

export function CoachingForm({ employee, branchId, onSuccess, onCancel }: CoachingFormProps) {
  const {
    stations,
    competenciesByStation,
    generalCompetencies,
    isLoading: loadingConfig,
  } = useCompetencyConfig();
  const createCoaching = useCreateCoaching();

  // Obtener coachings anteriores para mostrar el plan de acción previo
  const { data: previousCoachings } = useEmployeeCoachings(employee.id, branchId);
  const previousCoaching = previousCoachings?.[0]; // El más reciente

  // State
  const [selectedStations, setSelectedStations] = useState<string[]>([]);
  const [stationScores, setStationScores] = useState<StationScore[]>([]);
  const [generalScores, setGeneralScores] = useState<GeneralScore[]>([]);
  const [strengths, setStrengths] = useState('');
  const [areasToImprove, setAreasToImprove] = useState('');
  const [actionPlan, setActionPlan] = useState('');
  const [managerNotes, setManagerNotes] = useState('');
  const [previousActionReview, setPreviousActionReview] = useState('');

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Handlers
  const handleToggleStation = (stationId: string) => {
    setSelectedStations((prev) => {
      if (prev.includes(stationId)) {
        setStationScores((scores) => scores.filter((s) => s.stationId !== stationId));
        return prev.filter((id) => id !== stationId);
      } else {
        return [...prev, stationId];
      }
    });
  };

  const handleStationScoreChange = (stationId: string, score: number) => {
    setStationScores((prev) => {
      const existing = prev.find((s) => s.stationId === stationId);
      if (existing) {
        return prev.map((s) => (s.stationId === stationId ? { ...s, score } : s));
      }
      return [...prev, { stationId, score, competencyScores: [] }];
    });
  };

  const handleCompetencyScoreChange = (stationId: string, competencyId: string, score: number) => {
    setStationScores((prev) => {
      const existing = prev.find((s) => s.stationId === stationId);
      if (existing) {
        const updatedCompetencies = existing.competencyScores.some(
          (c) => c.competencyId === competencyId,
        )
          ? existing.competencyScores.map((c) =>
              c.competencyId === competencyId ? { ...c, score } : c,
            )
          : [...existing.competencyScores, { competencyId, score }];

        return prev.map((s) =>
          s.stationId === stationId ? { ...s, competencyScores: updatedCompetencies } : s,
        );
      }
      return [...prev, { stationId, score: 0, competencyScores: [{ competencyId, score }] }];
    });
  };

  const handleGeneralScoreChange = (competencyId: string, score: number) => {
    setGeneralScores((prev) => {
      const existing = prev.find((s) => s.competencyId === competencyId);
      if (existing) {
        return prev.map((s) => (s.competencyId === competencyId ? { ...s, score } : s));
      }
      return [...prev, { competencyId, score }];
    });
  };

  // Calculate averages for preview
  const stationAvg =
    stationScores.length > 0
      ? stationScores.reduce((sum, s) => sum + s.score, 0) / stationScores.length
      : 0;

  const generalFiltered = generalScores.filter((s) => s.score > 0);
  const generalAvg =
    generalFiltered.length > 0
      ? generalFiltered.reduce((sum, s) => sum + s.score, 0) / generalFiltered.length
      : 0;

  const overallAvg =
    stationAvg && generalAvg ? (stationAvg + generalAvg) / 2 : stationAvg || generalAvg;

  // Submit
  const handleSubmit = async () => {
    const formData = {
      userId: employee.id,
      branchId,
      coachingDate: new Date(),
      stationScores: stationScores.filter((s) => s.score > 0),
      generalScores: generalScores.filter((s) => s.score > 0),
      strengths,
      areasToImprove,
      actionPlan,
      managerNotes,
      certificationChanges: [], // TODO: Implementar cambios de certificación
      previousActionReview,
    };

    await createCoaching.mutateAsync(formData);
    onSuccess?.();
  };

  const canSubmit = selectedStations.length > 0 && stationScores.some((s) => s.score > 0);

  if (loadingConfig) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con empleado y score */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={employee.avatar_url || undefined} />
                <AvatarFallback>{getInitials(employee.full_name)}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold">{employee.full_name}</h3>
                <p className="text-sm text-muted-foreground">
                  Coaching de{' '}
                  {new Date().toLocaleString('es-AR', { month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>

            {overallAvg > 0 && (
              <div className="text-center">
                <div className="flex items-center gap-1 text-2xl font-bold">
                  <Star className="h-5 w-5 text-primary" />
                  {overallAvg.toFixed(1)}
                </div>
                <span className="text-xs text-muted-foreground">/ 5</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <ScrollArea className="h-[calc(100vh-320px)]">
        <div className="space-y-6 pr-4">
          {/* Sección de Estaciones */}
          <CoachingStationSection
            stations={stations}
            competenciesByStation={competenciesByStation}
            selectedStations={selectedStations}
            stationScores={stationScores}
            onToggleStation={handleToggleStation}
            onScoreChange={handleStationScoreChange}
            onCompetencyScoreChange={handleCompetencyScoreChange}
          />

          <Separator />

          {/* Sección de Competencias Generales */}
          <CoachingGeneralSection
            competencies={generalCompetencies}
            scores={generalScores}
            onScoreChange={handleGeneralScoreChange}
          />

          <Separator />

          {/* Seguimiento del plan anterior */}
          {previousCoaching?.action_plan && (
            <>
              <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                <FileText className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-800 dark:text-blue-200">
                  Plan de Acción del mes anterior
                </AlertTitle>
                <AlertDescription className="text-blue-700 dark:text-blue-300">
                  {previousCoaching.action_plan}
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="previousReview">¿Cómo fue el seguimiento del plan anterior?</Label>
                <Textarea
                  id="previousReview"
                  placeholder="¿Se cumplió? ¿Qué avances hubo? ¿Qué quedó pendiente?"
                  value={previousActionReview}
                  onChange={(e) => setPreviousActionReview(e.target.value)}
                  rows={2}
                />
              </div>

              <Separator />
            </>
          )}

          {/* Notas cualitativas */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Feedback Cualitativo</Label>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="strengths">Fortalezas</Label>
                <Textarea
                  id="strengths"
                  placeholder="¿Qué hace bien este empleado?"
                  value={strengths}
                  onChange={(e) => setStrengths(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="areas">Áreas de Mejora</Label>
                <Textarea
                  id="areas"
                  placeholder="¿Qué puede mejorar?"
                  value={areasToImprove}
                  onChange={(e) => setAreasToImprove(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="actionPlan">Plan de Acción para el próximo mes</Label>
              <Textarea
                id="actionPlan"
                placeholder="Acciones concretas para el próximo mes..."
                value={actionPlan}
                onChange={(e) => setActionPlan(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas Adicionales (privadas)</Label>
              <Textarea
                id="notes"
                placeholder="Notas que solo verá el encargado..."
                value={managerNotes}
                onChange={(e) => setManagerNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button onClick={handleSubmit} disabled={!canSubmit || createCoaching.isPending}>
          {createCoaching.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Guardar Coaching
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

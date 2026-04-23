/**
 * CoachingExpressModal - Modal de coaching rápido solo con scores
 * Mejora #5: Modo Rápido de Evaluación
 */
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Loader2, Zap, Star, Save, Copy } from 'lucide-react';
import { useCompetencyConfig } from '@/hooks/useStationCompetencies';
import { useCreateCoaching, useEmployeeCoachings } from '@/hooks/useCoachings';
import { toast } from 'sonner';

interface Employee {
  id: string;
  full_name: string;
}

interface CoachingExpressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee;
  branchId: string;
  onSuccess?: () => void;
}

interface QuickScore {
  id: string;
  name: string;
  type: 'station' | 'general';
  score: number;
}

export function CoachingExpressModal({
  open,
  onOpenChange,
  employee,
  branchId,
  onSuccess,
}: CoachingExpressModalProps) {
  const { stations, generalCompetencies, isLoading: loadingConfig } = useCompetencyConfig();
  const createCoaching = useCreateCoaching();
  const { data: previousCoachings } = useEmployeeCoachings(employee.id, branchId);
  const previousCoaching = previousCoachings?.[0];

  const [scores, setScores] = useState<QuickScore[]>([]);
  const [copied, setCopied] = useState(false);

  // Initialize scores when config loads
  useEffect(() => {
    if (stations && generalCompetencies && scores.length === 0) {
      const initialScores: QuickScore[] = [
        ...stations.map((s) => ({
          id: s.id,
          name: s.name,
          type: 'station' as const,
          score: 0,
        })),
        ...generalCompetencies.map((c) => ({
          id: c.id,
          name: c.name,
          type: 'general' as const,
          score: 0,
        })),
      ];
      setScores(initialScores);
    }
  }, [stations, generalCompetencies, scores.length]);

  const handleScoreChange = (id: string, newScore: number) => {
    setScores((prev) => prev.map((s) => (s.id === id ? { ...s, score: newScore } : s)));
  };

  const handleCopyFromPrevious = () => {
    if (!previousCoaching) return;

    // Copy scores from previous coaching (simplified - just set all to previous overall)
    if (previousCoaching.overall_score) {
      setScores((prev) =>
        prev.map((s) => ({
          ...s,
          score: Math.round(previousCoaching.overall_score || 3),
        })),
      );
      setCopied(true);
      toast.success('Scores copiados del coaching anterior');
    }
  };

  const handleSubmit = async () => {
    const stationScores = scores
      .filter((s) => s.type === 'station' && s.score > 0)
      .map((s) => ({
        stationId: s.id,
        score: s.score,
        competencyScores: [],
      }));

    const generalScores = scores
      .filter((s) => s.type === 'general' && s.score > 0)
      .map((s) => ({
        competencyId: s.id,
        score: s.score,
      }));

    if (stationScores.length === 0) {
      toast.error('Debes evaluar al menos una estación');
      return;
    }

    try {
      await createCoaching.mutateAsync({
        userId: employee.id,
        branchId,
        coachingDate: new Date(),
        stationScores,
        generalScores,
        strengths: '',
        areasToImprove: '',
        actionPlan: '',
        managerNotes: '',
        certificationChanges: [],
      });

      onOpenChange(false);
      onSuccess?.();
      setScores([]);
    } catch {
      // Error handled by mutation
    }
  };

  const filledScores = scores.filter((s) => s.score > 0);
  const avgScore =
    filledScores.length > 0
      ? filledScores.reduce((sum, s) => sum + s.score, 0) / filledScores.length
      : 0;

  const getScoreColor = (score: number) => {
    if (score >= 4) return 'text-green-600';
    if (score >= 3) return 'text-amber-600';
    if (score > 0) return 'text-red-600';
    return 'text-muted-foreground';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Coaching Express
          </DialogTitle>
          <DialogDescription>
            Evaluación rápida de {employee.full_name} - Solo puntuaciones
          </DialogDescription>
        </DialogHeader>

        {loadingConfig ? (
          <div className="space-y-4 py-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <>
            {/* Copy from previous */}
            {previousCoaching && !copied && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mb-4"
                onClick={handleCopyFromPrevious}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copiar scores del mes anterior ({previousCoaching.overall_score?.toFixed(1)}/4)
              </Button>
            )}

            {/* Score preview */}
            {avgScore > 0 && (
              <div className="flex items-center justify-center gap-2 py-2 mb-4 bg-muted/50 rounded-lg">
                <Star className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{avgScore.toFixed(1)}</span>
                <span className="text-muted-foreground">/ 4</span>
              </div>
            )}

            {/* Scores list */}
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {/* Station scores */}
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  Estaciones
                  <Badge variant="secondary" className="text-xs">
                    {scores.filter((s) => s.type === 'station' && s.score > 0).length}/
                    {scores.filter((s) => s.type === 'station').length}
                  </Badge>
                </Label>
                {scores
                  .filter((s) => s.type === 'station')
                  .map((score) => (
                    <div key={score.id} className="flex items-center gap-4">
                      <span className="text-sm w-28 truncate">{score.name}</span>
                      <Slider
                        value={[score.score]}
                        onValueChange={([v]) => handleScoreChange(score.id, v)}
                        min={0}
                        max={5}
                        step={0.5}
                        className="flex-1"
                      />
                      <span className={`font-mono w-8 text-right ${getScoreColor(score.score)}`}>
                        {score.score > 0 ? score.score : '-'}
                      </span>
                    </div>
                  ))}
              </div>

              {/* General competencies */}
              <div className="space-y-3 pt-4 border-t">
                <Label className="text-sm font-medium flex items-center gap-2">
                  Competencias Generales
                  <Badge variant="secondary" className="text-xs">
                    {scores.filter((s) => s.type === 'general' && s.score > 0).length}/
                    {scores.filter((s) => s.type === 'general').length}
                  </Badge>
                </Label>
                {scores
                  .filter((s) => s.type === 'general')
                  .map((score) => (
                    <div key={score.id} className="flex items-center gap-4">
                      <span className="text-sm w-28 truncate">{score.name}</span>
                      <Slider
                        value={[score.score]}
                        onValueChange={([v]) => handleScoreChange(score.id, v)}
                        min={0}
                        max={5}
                        step={0.5}
                        className="flex-1"
                      />
                      <span className={`font-mono w-8 text-right ${getScoreColor(score.score)}`}>
                        {score.score > 0 ? score.score : '-'}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={filledScores.length === 0 || createCoaching.isPending}
          >
            {createCoaching.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar Express
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

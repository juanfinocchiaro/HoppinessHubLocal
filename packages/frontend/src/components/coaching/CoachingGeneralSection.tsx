import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScoreLegend, SCORE_LABELS } from './ScoreLegend';
import type { GeneralCompetency } from '@/types/coaching';

interface GeneralScore {
  competencyId: string;
  score: number;
}

interface CoachingGeneralSectionProps {
  competencies: GeneralCompetency[];
  scores: GeneralScore[];
  onScoreChange: (competencyId: string, score: number) => void;
}

export function CoachingGeneralSection({
  competencies,
  scores,
  onScoreChange,
}: CoachingGeneralSectionProps) {
  const getScore = (competencyId: string) => {
    return scores.find((s) => s.competencyId === competencyId)?.score ?? 0;
  };

  // Calcular promedio ponderado
  const calculateWeightedAverage = () => {
    let totalWeight = 0;
    let weightedSum = 0;

    competencies.forEach((comp) => {
      const score = getScore(comp.id);
      if (score > 0) {
        weightedSum += score * comp.weight;
        totalWeight += comp.weight;
      }
    });

    return totalWeight > 0 ? (weightedSum / totalWeight).toFixed(2) : null;
  };

  const completedCount = scores.filter((s) => s.score > 0).length;
  const averageScore = calculateWeightedAverage();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-semibold">Competencias Generales</Label>
          <p className="text-sm text-muted-foreground">
            Evalúa las competencias transversales del empleado
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">
            {completedCount}/{competencies.length} evaluadas
          </div>
          {averageScore && (
            <Badge variant="secondary" className="mt-1">
              Promedio: {averageScore}/5
            </Badge>
          )}
        </div>
      </div>

      {/* Leyenda ARRIBA del formulario */}
      <ScoreLegend />

      <Card>
        <CardContent className="p-4 space-y-4">
          {competencies.map((comp) => {
            const currentScore = getScore(comp.id);

            return (
              <div
                key={comp.id}
                className="flex items-center justify-between gap-4 py-2 border-b last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{comp.name}</span>
                    {comp.weight > 1 && (
                      <Badge variant="outline" className="text-[10px] px-1">
                        x{comp.weight}
                      </Badge>
                    )}
                  </div>
                  {comp.description && (
                    <p className="text-xs text-muted-foreground truncate">{comp.description}</p>
                  )}
                </div>

                {/* Wrapper con stopPropagation para evitar cierre de Collapsible */}
                <div onClick={(e) => e.stopPropagation()}>
                  <RadioGroup
                    value={currentScore.toString()}
                    onValueChange={(value) => onScoreChange(comp.id, parseInt(value))}
                    className="flex gap-1"
                  >
                    {SCORE_LABELS.map((score) => (
                      <div key={score.value}>
                        <RadioGroupItem
                          value={score.value.toString()}
                          id={`gen-${comp.id}-${score.value}`}
                          className="sr-only"
                        />
                        <Label
                          htmlFor={`gen-${comp.id}-${score.value}`}
                          className={`w-8 h-8 flex items-center justify-center text-xs rounded-md cursor-pointer border transition-all
                            ${
                              currentScore === score.value
                                ? `${score.bgColor} ${score.color} border-current`
                                : 'bg-muted hover:bg-muted/80 border-transparent'
                            }`}
                        >
                          {score.value}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

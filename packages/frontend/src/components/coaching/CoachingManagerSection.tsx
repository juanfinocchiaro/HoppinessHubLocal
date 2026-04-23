/**
 * CoachingManagerSection - Sección de competencias para evaluar encargados
 *
 * Muestra 6 competencias "visión marca" que un coordinador puede evaluar remotamente.
 * Incluye tooltips con rúbricas 1/3/5 para cada competencia.
 * Escala 1-5.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useManagerCompetencies } from '@/hooks/useStationCompetencies';
import { Loader2 } from 'lucide-react';
import { ScoreLegend } from './ScoreLegend';
import { ManagerCompetencyRow } from './ManagerCompetencyRow';
import { MANAGER_CATEGORY_CONFIG } from '@/types/coaching';

interface ManagerScore {
  competencyId: string;
  score: number;
}

interface CoachingManagerSectionProps {
  scores: ManagerScore[];
  onScoreChange: (competencyId: string, score: number) => void;
}

export function CoachingManagerSection({ scores, onScoreChange }: CoachingManagerSectionProps) {
  const { data: competencies, isLoading } = useManagerCompetencies();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!competencies?.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No hay competencias de encargado configuradas
        </CardContent>
      </Card>
    );
  }

  const getScore = (competencyId: string) => {
    return scores.find((s) => s.competencyId === competencyId)?.score || 0;
  };

  const config = MANAGER_CATEGORY_CONFIG.marca;

  return (
    <div className="space-y-4">
      {/* Leyenda ARRIBA del formulario */}
      <ScoreLegend />

      {/* Lista simple de 6 competencias */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <span className="text-lg">{config.icon}</span>
            {config.label}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <div className="grid gap-3">
            {competencies.map((competency) => (
              <ManagerCompetencyRow
                key={competency.id}
                competency={competency}
                score={getScore(competency.id)}
                onScoreChange={(value) => onScoreChange(competency.id, value)}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

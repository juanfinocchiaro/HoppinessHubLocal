/**
 * ScoreLegend - Componente reutilizable para mostrar la guía de puntuación
 *
 * Nueva escala 1-5:
 * 1 = Aprendiz (necesita supervisión constante)
 * 2 = En Desarrollo (mejorando, comete errores)
 * 3 = Competente (trabaja bien solo)
 * 4 = Destacado (supera expectativas)
 * 5 = Referente (experto total, puede enseñar)
 */
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface ScoreLabel {
  value: number;
  label: string;
  description: string;
  color: string;
  bgColor: string;
}

export const SCORE_LABELS: ScoreLabel[] = [
  {
    value: 1,
    label: 'Aprendiz',
    description: 'Necesita supervisión constante',
    color: 'text-red-700',
    bgColor: 'bg-red-100 border-red-200',
  },
  {
    value: 2,
    label: 'En Desarrollo',
    description: 'Mejorando, comete errores',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100 border-amber-200',
  },
  {
    value: 3,
    label: 'Competente',
    description: 'Trabaja bien solo',
    color: 'text-green-700',
    bgColor: 'bg-green-100 border-green-200',
  },
  {
    value: 4,
    label: 'Destacado',
    description: 'Supera expectativas',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100 border-blue-200',
  },
  {
    value: 5,
    label: 'Referente',
    description: 'Experto total, enseña a otros',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100 border-purple-200',
  },
];

interface ScoreLegendProps {
  compact?: boolean;
  className?: string;
}

export function ScoreLegend({ compact = false, className }: ScoreLegendProps) {
  if (compact) {
    return (
      <div className={cn('flex flex-wrap gap-2 text-xs', className)}>
        {SCORE_LABELS.map((score) => (
          <div
            key={score.value}
            className={cn('px-2 py-1 rounded border', score.bgColor, score.color)}
          >
            <span className="font-bold">{score.value}</span> = {score.label}
          </div>
        ))}
      </div>
    );
  }

  return (
    <Card className={cn('bg-muted/30 border-dashed', className)}>
      <CardContent className="p-4">
        <h4 className="text-sm font-medium mb-3 text-muted-foreground">📊 Guía de Puntuación</h4>
        <div className="grid grid-cols-5 gap-2">
          {SCORE_LABELS.map((score) => (
            <div key={score.value} className="text-center">
              <div
                className={cn(
                  'w-10 h-10 mx-auto flex items-center justify-center rounded-lg border-2 font-bold text-lg mb-1',
                  score.bgColor,
                  score.color,
                )}
              >
                {score.value}
              </div>
              <p className={cn('text-xs font-medium', score.color)}>{score.label}</p>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                {score.description}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Función helper para obtener el color del score
export function getScoreConfig(score: number): ScoreLabel | undefined {
  return SCORE_LABELS.find((s) => s.value === score);
}

// Función helper para obtener el color del score
export function getScoreColor(score: number | null): string {
  if (!score) return 'text-muted-foreground';
  if (score >= 4.5) return 'text-purple-600';
  if (score >= 3.5) return 'text-blue-600';
  if (score >= 2.5) return 'text-green-600';
  if (score >= 1.5) return 'text-amber-600';
  return 'text-red-600';
}

// Función helper para obtener la etiqueta del score
export function getScoreLabel(score: number | null): string {
  if (!score) return 'Sin evaluar';
  if (score >= 4.5) return 'Referente';
  if (score >= 3.5) return 'Destacado';
  if (score >= 2.5) return 'Competente';
  if (score >= 1.5) return 'En Desarrollo';
  return 'Aprendiz';
}

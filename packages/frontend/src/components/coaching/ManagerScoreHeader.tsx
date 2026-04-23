/**
 * ManagerScoreHeader - Header visual con total/promedio del scorecard de encargados
 */
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Employee {
  id: string;
  full_name: string;
  avatar_url?: string | null;
}

interface ManagerScoreHeaderProps {
  employee: Employee;
  totalScore: number;
  filledCount: number;
  totalCount: number;
  previousAverage?: number;
}

const SCORE_LEVELS = [
  { min: 4.5, max: 5.0, label: 'Excelente', color: 'bg-purple-500', textColor: 'text-purple-600' },
  { min: 3.5, max: 4.4, label: 'Muy Bien', color: 'bg-blue-500', textColor: 'text-blue-600' },
  { min: 2.5, max: 3.4, label: 'Bien', color: 'bg-green-500', textColor: 'text-green-600' },
  { min: 1.5, max: 2.4, label: 'Alerta', color: 'bg-yellow-500', textColor: 'text-yellow-600' },
  { min: 0, max: 1.4, label: 'Crítico', color: 'bg-red-500', textColor: 'text-red-600' },
];

function getScoreLevel(average: number) {
  return SCORE_LEVELS.find((l) => average >= l.min && average <= l.max) || SCORE_LEVELS[4];
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function ManagerScoreHeader({
  employee,
  totalScore,
  filledCount,
  totalCount,
  previousAverage,
}: ManagerScoreHeaderProps) {
  // Promedio basado en las competencias realmente puntuadas
  const maxScore = totalCount * 5;
  const average = filledCount > 0 ? totalScore / filledCount : 0;
  const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
  const level = getScoreLevel(average);

  const diff = previousAverage !== undefined ? average - previousAverage : null;

  return (
    <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-4 border">
      <div className="flex items-center justify-between gap-4">
        {/* Employee Info */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-12 w-12 ring-2 ring-primary/20">
              <AvatarImage src={employee.avatar_url || undefined} />
              <AvatarFallback>{getInitials(employee.full_name)}</AvatarFallback>
            </Avatar>
            <ShieldCheck className="absolute -bottom-1 -right-1 h-5 w-5 text-primary bg-background rounded-full" />
          </div>
          <div>
            <h3 className="font-semibold">{employee.full_name}</h3>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              Scorecard de Encargado
            </p>
          </div>
        </div>

        {/* Score Display */}
        <div className="flex items-center gap-4">
          {/* Total */}
          <div className="text-center">
            <div className="text-2xl font-bold">
              {totalScore}
              <span className="text-sm font-normal text-muted-foreground">/{maxScore}</span>
            </div>
            <span className="text-xs text-muted-foreground">Total</span>
          </div>

          {/* Divider */}
          <div className="h-10 w-px bg-border" />

          {/* Average */}
          <div className="text-center">
            <div className={cn('text-2xl font-bold', level.textColor)}>
              {average.toFixed(1)}
              <span className="text-sm font-normal text-muted-foreground">/5</span>
            </div>
            <span className="text-xs text-muted-foreground">Promedio</span>
          </div>

          {/* Trend */}
          {diff !== null && diff !== 0 && (
            <div className="flex items-center gap-1">
              {diff > 0 ? (
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                >
                  <TrendingUp className="h-3 w-3 mr-1" />+{diff.toFixed(1)}
                </Badge>
              ) : diff < 0 ? (
                <Badge
                  variant="secondary"
                  className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                >
                  <TrendingDown className="h-3 w-3 mr-1" />
                  {diff.toFixed(1)}
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <Minus className="h-3 w-3 mr-1" />0
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar with Level */}
      <div className="mt-4 space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">
            Nivel: <span className={cn('font-medium', level.textColor)}>{level.label}</span>
          </span>
          <span className="text-muted-foreground">{percentage.toFixed(0)}%</span>
        </div>
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className={cn('h-full transition-all duration-500', level.color)}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}

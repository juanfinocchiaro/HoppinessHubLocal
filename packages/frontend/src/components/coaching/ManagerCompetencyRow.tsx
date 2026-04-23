/**
 * ManagerCompetencyRow - Fila de competencia con botones de score y tooltip de rúbrica
 */
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Info } from 'lucide-react';
import { SCORE_LABELS } from './ScoreLegend';
import type { ManagerCompetency } from '@/types/coaching';

interface ManagerCompetencyRowProps {
  competency: ManagerCompetency;
  score: number;
  onScoreChange: (score: number) => void;
}

function ScoreButton({
  value,
  selected,
  onClick,
}: {
  value: number;
  selected: boolean;
  onClick: () => void;
}) {
  const config = SCORE_LABELS.find((s) => s.value === value);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            'h-8 w-8 p-0 transition-all',
            selected &&
              config &&
              `${config.bgColor} ${config.color} border-current hover:opacity-90`,
          )}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          {value}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{config?.label}</TooltipContent>
    </Tooltip>
  );
}

function RubricPopover({ competency }: { competency: ManagerCompetency }) {
  if (!competency.rubric_1 && !competency.rubric_3 && !competency.rubric_5) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
        >
          <Info className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" side="left">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">{competency.icon}</span>
            <h4 className="font-semibold text-sm">{competency.name}</h4>
          </div>

          <div className="space-y-2 text-xs">
            {/* Score 1 */}
            <div className="flex gap-2">
              <div className="flex-shrink-0 w-6 h-6 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center font-bold">
                1
              </div>
              <p className="text-muted-foreground">{competency.rubric_1}</p>
            </div>

            {/* Score 3 */}
            <div className="flex gap-2">
              <div className="flex-shrink-0 w-6 h-6 rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 flex items-center justify-center font-bold">
                3
              </div>
              <p className="text-muted-foreground">{competency.rubric_3}</p>
            </div>

            {/* Score 5 */}
            <div className="flex gap-2">
              <div className="flex-shrink-0 w-6 h-6 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                5
              </div>
              <p className="text-muted-foreground">{competency.rubric_5}</p>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function ManagerCompetencyRow({
  competency,
  score,
  onScoreChange,
}: ManagerCompetencyRowProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border bg-muted/30">
      <div className="flex-1 flex items-center gap-2">
        <span className="text-base">{competency.icon}</span>
        <div className="flex-1 min-w-0">
          <span className="font-medium text-sm truncate">{competency.name}</span>
          {competency.description && (
            <p className="text-xs text-muted-foreground truncate hidden sm:block">
              {competency.description}
            </p>
          )}
        </div>
        <RubricPopover competency={competency} />
      </div>

      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        {SCORE_LABELS.map((sl) => (
          <ScoreButton
            key={sl.value}
            value={sl.value}
            selected={score === sl.value}
            onClick={() => onScoreChange(sl.value)}
          />
        ))}
      </div>
    </div>
  );
}

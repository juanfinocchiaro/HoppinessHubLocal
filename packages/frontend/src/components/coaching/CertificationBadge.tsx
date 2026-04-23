import { cn } from '@/lib/utils';
import { CertificationLevel, CERTIFICATION_LEVELS } from '@/types/coaching';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';

interface CertificationBadgeProps {
  level: CertificationLevel;
  stationName?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4 text-[10px]',
  md: 'w-6 h-6 text-xs',
  lg: 'w-8 h-8 text-sm',
};

const levelColors: Record<CertificationLevel, string> = {
  0: 'bg-gray-700 text-gray-300',
  1: 'bg-yellow-500 text-yellow-950',
  2: 'bg-green-500 text-white',
  3: 'bg-blue-500 text-white',
};

export function CertificationBadge({
  level,
  stationName,
  showLabel = false,
  size = 'md',
  className,
}: CertificationBadgeProps) {
  const levelInfo = CERTIFICATION_LEVELS.find((l) => l.value === level) || CERTIFICATION_LEVELS[0];

  const badge = (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div
        className={cn(
          'rounded-full flex items-center justify-center font-bold',
          sizeClasses[size],
          levelColors[level],
        )}
      >
        {level}
      </div>
      {showLabel && <span className="text-sm text-muted-foreground">{levelInfo.label}</span>}
    </div>
  );

  if (!stationName) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent>
          <div className="text-center">
            <p className="font-medium">{stationName}</p>
            <p className="text-xs text-muted-foreground">
              Nivel {level}: {levelInfo.label}
            </p>
            <p className="text-xs">{levelInfo.description}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface CertificationBadgeRowProps {
  certifications: { stationKey: string; stationName: string; level: CertificationLevel }[];
  size?: 'sm' | 'md' | 'lg';
}

export function CertificationBadgeRow({ certifications, size = 'sm' }: CertificationBadgeRowProps) {
  if (certifications.length === 0) {
    return <span className="text-xs text-muted-foreground">Sin certificaciones</span>;
  }

  return (
    <div className="flex items-center gap-1">
      {certifications.map((cert) => (
        <CertificationBadge
          key={cert.stationKey}
          level={cert.level}
          stationName={cert.stationName}
          size={size}
        />
      ))}
    </div>
  );
}

/**
 * Leyenda explicativa de los niveles de certificación
 */
export function CertificationLegend({ compact = false }: { compact?: boolean }) {
  return (
    <TooltipProvider>
      <div
        className={cn(
          'flex items-center gap-3 text-xs',
          compact ? 'flex-wrap' : 'flex-wrap md:flex-nowrap',
        )}
      >
        {CERTIFICATION_LEVELS.map((level) => (
          <Tooltip key={level.value}>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 cursor-help">
                <div
                  className={cn(
                    'w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold',
                    levelColors[level.value],
                  )}
                >
                  {level.value}
                </div>
                <span className="text-muted-foreground">{level.label}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p className="font-medium">{level.label}</p>
              <p className="text-xs">{level.description}</p>
            </TooltipContent>
          </Tooltip>
        ))}
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="text-xs">
              Los <strong>Expertos (3)</strong> pueden certificar a otros empleados en esa estación.
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

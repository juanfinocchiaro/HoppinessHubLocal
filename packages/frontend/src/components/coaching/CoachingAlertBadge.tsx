/**
 * CoachingAlertBadge - Badge para mostrar pendientes en sidebar
 * Mejora #3: Recordatorios y Seguimiento Automático
 */
import { Badge } from '@/components/ui/badge';
import { useCoachingStats } from '@/hooks/useCoachingStats';

interface CoachingAlertBadgeProps {
  branchId: string;
  className?: string;
}

export function CoachingAlertBadge({ branchId, className }: CoachingAlertBadgeProps) {
  const { data: stats } = useCoachingStats(branchId);

  const pendingCount = stats?.pendingCoachings ?? 0;

  if (pendingCount === 0) return null;

  return (
    <Badge
      variant="destructive"
      className={`text-xs px-1.5 py-0.5 min-w-[1.25rem] justify-center ${className}`}
    >
      {pendingCount}
    </Badge>
  );
}

/**
 * Hook para verificar si hay coachings sin confirmar después de 5+ días
 */
export function usePendingAcknowledgments(branchId: string | null) {
  const { data: stats } = useCoachingStats(branchId);

  return {
    count: stats?.pendingAcknowledgments ?? 0,
    hasOverdue: (stats?.pendingAcknowledgments ?? 0) > 0,
  };
}

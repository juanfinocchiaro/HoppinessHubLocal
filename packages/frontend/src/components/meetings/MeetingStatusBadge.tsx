/**
 * MeetingStatusBadge - Badge de estado de reunión
 */
import { StatusBadge } from '@/components/ui/status-badge';
import { MEETING_STATUS_CONFIG, type MeetingStatus } from '@/types/meeting';

interface MeetingStatusBadgeProps {
  status: MeetingStatus;
  className?: string;
}

export function MeetingStatusBadge({ status, className }: MeetingStatusBadgeProps) {
  const config = MEETING_STATUS_CONFIG[status];

  return (
    <StatusBadge variant={config.variant} className={className}>
      {config.label}
    </StatusBadge>
  );
}

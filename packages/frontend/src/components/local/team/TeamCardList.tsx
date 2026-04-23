/**
 * TeamCardList - Vista mobile-first del equipo en cards
 *
 * Reemplaza la tabla en pantallas pequeñas con cards táctiles
 */
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, Clock, AlertTriangle, Calendar } from 'lucide-react';
import { EmployeeExpandedRow } from './EmployeeExpandedRow';
import type { TeamMember } from './types';
import { LOCAL_ROLE_LABELS, formatHours, formatClockIn } from './types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TeamCardListProps {
  team: TeamMember[];
  branchId: string;
  onMemberUpdated: () => void;
}

export function TeamCardList({ team, branchId, onMemberUpdated }: TeamCardListProps) {
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);

  const handleCardClick = (memberId: string) => {
    setExpandedMemberId((prev) => (prev === memberId ? null : memberId));
  };

  if (team.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No hay miembros del equipo</div>;
  }

  return (
    <div className="space-y-3">
      {team.map((member) => {
        const isExpanded = expandedMemberId === member.id;
        const roleLabel = LOCAL_ROLE_LABELS[member.local_role || ''] || 'Empleado';

        return (
          <Card
            key={member.id}
            className={cn('transition-all overflow-hidden', isExpanded && 'ring-2 ring-primary/20')}
          >
            {/* Main card content - touch target min 44px */}
            <CardContent
              className="p-4 cursor-pointer active:bg-muted/50 transition-colors"
              onClick={() => handleCardClick(member.id)}
            >
              <div className="flex items-start justify-between gap-3">
                {/* Left: Name and status */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold truncate">{member.full_name || 'Sin nombre'}</h3>
                    <StatusIndicator member={member} />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="outline" className="text-xs">
                      {roleLabel}
                    </Badge>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(member.hire_date), 'MMM yy', { locale: es })}
                    </span>
                  </div>
                </div>

                {/* Right: Hours and expand button */}
                <div className="flex flex-col items-end gap-1">
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {formatHours(member.hours_this_month)}h
                    </div>
                  </div>

                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Quick stats row */}
              <div className="flex items-center gap-4 mt-3 pt-3 border-t text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatClockIn(member.last_clock_in) || 'Sin fichaje'}
                </span>
                {member.active_warnings > 0 && (
                  <span className="flex items-center gap-1 text-amber-600">
                    <AlertTriangle className="w-3 h-3" />
                    {member.active_warnings} aperc.
                  </span>
                )}
              </div>
            </CardContent>

            {/* Expanded content */}
            {isExpanded && (
              <div className="border-t bg-muted/30">
                <EmployeeExpandedRow
                  member={member}
                  branchId={branchId}
                  onClose={() => setExpandedMemberId(null)}
                  onMemberUpdated={onMemberUpdated}
                />
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function StatusIndicator({ member }: { member: TeamMember }) {
  if (member.is_working) {
    return <span className="w-2.5 h-2.5 rounded-full bg-success animate-pulse flex-shrink-0" />;
  }

  if (member.active_warnings > 0) {
    return <span className="w-2.5 h-2.5 rounded-full bg-amber-500 flex-shrink-0" />;
  }

  return <span className="w-2.5 h-2.5 rounded-full bg-muted flex-shrink-0" />;
}

export default TeamCardList;

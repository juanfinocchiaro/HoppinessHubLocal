/**
 * MeetingCard - Card de reunión en la lista (v2.0)
 */
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MEETING_AREAS, type Meeting, type MeetingStatus } from '@/types/meeting';
import { MeetingStatusBadge } from './MeetingStatusBadge';

interface MeetingCardProps {
  meeting: Meeting & {
    participants?: {
      user_id: string;
      attended: boolean;
      was_present: boolean | null;
      read_at: string | null;
    }[];
    branches?: { id: string; name: string } | null;
  };
  onClick?: () => void;
  showReadStatus?: boolean;
  showBranch?: boolean;
  isUnread?: boolean;
}

export function MeetingCard({
  meeting,
  onClick,
  showReadStatus = false,
  showBranch = false,
  isUnread = false,
}: MeetingCardProps) {
  const areaLabel = MEETING_AREAS.find((a) => a.value === meeting.area)?.label || meeting.area;
  const meetingDate = meeting.scheduled_at || meeting.date;

  // Count attendance based on status
  const participants = meeting.participants || [];
  const presentCount =
    meeting.status === 'cerrada' ? participants.filter((p) => p.was_present === true).length : 0;
  const totalParticipants = participants.length;
  const readCount = participants.filter((p) => p.read_at).length;

  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-shadow ${isUnread ? 'border-primary/50 bg-primary/5' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {isUnread && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
              <h3 className="font-semibold truncate">{meeting.title}</h3>
              <MeetingStatusBadge status={meeting.status as MeetingStatus} />
            </div>

            <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{format(new Date(meetingDate), 'd MMM HH:mm', { locale: es })}</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {areaLabel}
              </Badge>
              {showBranch && meeting.branches && (
                <Badge variant="outline" className="text-xs">
                  {meeting.branches.name}
                </Badge>
              )}
              {!meeting.branch_id && (
                <Badge variant="default" className="text-xs bg-primary/20 text-primary">
                  Red
                </Badge>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Users className="w-3.5 h-3.5" />
              {meeting.status === 'cerrada' ? (
                <span>
                  {presentCount}/{totalParticipants}
                </span>
              ) : (
                <span>{totalParticipants}</span>
              )}
            </div>

            {showReadStatus && meeting.status === 'cerrada' && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {readCount === totalParticipants ? (
                  <>
                    <CheckCircle className="w-3 h-3 text-success" />
                    <span>Todos leyeron</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-3 h-3 text-warning" />
                    <span>
                      {readCount}/{totalParticipants}
                    </span>
                  </>
                )}
              </div>
            )}

            {meeting.status === 'convocada' && (
              <div className="flex items-center gap-1 text-xs text-amber-600">
                <AlertCircle className="w-3 h-3" />
                <span>Pendiente</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

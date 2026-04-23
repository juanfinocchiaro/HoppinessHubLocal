/**
 * MeetingPendingCard - Card para dashboard de Mi Local
 */
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, ChevronRight, Plus } from 'lucide-react';
import { useUnreadMeetingsCount, useBranchMeetings } from '@/hooks/useMeetings';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

interface MeetingPendingCardProps {
  branchId: string;
  onCreateMeeting?: () => void;
}

export function MeetingPendingCard({ branchId, onCreateMeeting }: MeetingPendingCardProps) {
  const { data: _stats, isLoading: loadingStats } = useUnreadMeetingsCount(branchId);
  const { data: meetings, isLoading: loadingMeetings } = useBranchMeetings(branchId);

  const activeMeetings = meetings?.filter((m) => m.status !== 'cancelada');
  const lastMeeting = activeMeetings?.[0];
  const isLoading = loadingStats || loadingMeetings;

  // Count unread participants across active meetings only
  const pendingReads =
    activeMeetings?.reduce((acc, m) => {
      const unread = m.participants?.filter((p: any) => !p.read_at).length || 0;
      return acc + unread;
    }, 0) || 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Reuniones
          </div>
          {pendingReads > 0 && (
            <Badge variant="destructive" className="text-xs">
              {pendingReads} sin leer
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <Skeleton className="h-12" />
        ) : (
          <>
            <div className="text-sm text-muted-foreground">
              {lastMeeting ? (
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    Última: {format(new Date(lastMeeting.date), 'd MMM', { locale: es })} -{' '}
                    {lastMeeting.title}
                  </span>
                </div>
              ) : (
                <span>Aún no hay reuniones registradas</span>
              )}
            </div>

            <div className="flex gap-2">
              {onCreateMeeting && (
                <Button size="sm" onClick={onCreateMeeting} className="flex-1">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Nueva reunión
                </Button>
              )}
              <Link to={`/milocal/${branchId}/equipo/reuniones`} className="flex-1">
                <Button size="sm" variant="outline" className="w-full">
                  Ver todas
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

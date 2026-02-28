/**
 * MyMeetingsCard - Card de reuniones pendientes para Mi Cuenta
 * Shows: convocadas (upcoming) + cerradas sin leer
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckCircle2, Clock, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useMyMeetings, useMarkMeetingAsRead } from '@/hooks/useMeetings';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { handleError } from '@/lib/errorHandler';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MEETING_AREAS } from '@/types/meeting';
import { generateGoogleCalendarLink } from '@/lib/calendarLinks';

export function MyMeetingsCard() {
  const { data: meetings = [], isLoading } = useMyMeetings();
  const markAsRead = useMarkMeetingAsRead();
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);

  // Filter: convocadas (scheduled) + cerradas sin leer
  const pendingMeetings = meetings.filter(
    (m) =>
      m.status === 'convocada' ||
      m.status === 'en_curso' ||
      (m.status === 'cerrada' && !m.myParticipation?.read_at),
  );

  const hasPending = pendingMeetings.length > 0;

  const handleMarkAsRead = async (meetingId: string) => {
    try {
      await markAsRead.mutateAsync(meetingId);
      toast.success('Marcado como leído');
      setSelectedMeeting(null);
    } catch (error) {
      handleError(error, { userMessage: 'Error al marcar como leído', context: 'MyMeetingsCard' });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="w-4 h-4" />
            Reuniones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16" />
        </CardContent>
      </Card>
    );
  }

  if (pendingMeetings.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="w-4 h-4" />
            Reuniones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No tenés reuniones pendientes
          </p>
        </CardContent>
      </Card>
    );
  }

  // Get badge and icon for meeting status
  const getMeetingBadge = (meeting: any) => {
    if (meeting.status === 'convocada') {
      return (
        <Badge variant="outline" className="text-xs">
          Convocado
        </Badge>
      );
    }
    if (meeting.status === 'en_curso') {
      return (
        <Badge variant="secondary" className="text-xs">
          En curso
        </Badge>
      );
    }
    // cerrada sin leer
    return (
      <Badge variant="destructive" className="text-xs">
        Sin leer
      </Badge>
    );
  };

  return (
    <>
      <Card className={hasPending ? 'border-primary/50' : ''}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Reuniones
            </div>
            {hasPending && (
              <Badge variant="secondary" className="text-xs">
                {pendingMeetings.length} pendiente{pendingMeetings.length > 1 ? 's' : ''}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {pendingMeetings.slice(0, 3).map((meeting) => (
            <div
              key={meeting.id}
              className="flex items-center justify-between p-2 rounded-lg bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors"
              onClick={() => setSelectedMeeting(meeting)}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{meeting.title}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{format(new Date(meeting.date), 'd MMM HH:mm', { locale: es })}</span>
                  {getMeetingBadge(meeting)}
                </div>
              </div>
              {meeting.status === 'convocada' ? (
                <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              ) : (
                <Eye className="w-4 h-4 text-primary flex-shrink-0" />
              )}
            </div>
          ))}

          {pendingMeetings.length > 3 && (
            <p className="text-xs text-muted-foreground text-center pt-1">
              y {pendingMeetings.length - 3} más...
            </p>
          )}
        </CardContent>
      </Card>

      {/* Meeting Detail Dialog */}
      <Dialog open={!!selectedMeeting} onOpenChange={() => setSelectedMeeting(null)}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{selectedMeeting?.title}</DialogTitle>
          </DialogHeader>

          {selectedMeeting && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {format(new Date(selectedMeeting.date), "EEEE d 'de' MMMM, HH:mm", {
                      locale: es,
                    })}
                  </span>
                  <Badge variant="secondary">
                    {MEETING_AREAS.find((a) => a.value === selectedMeeting.area)?.label ||
                      selectedMeeting.area}
                  </Badge>
                </div>

                {/* Status-specific content */}
                {selectedMeeting.status === 'convocada' && (
                  <div className="space-y-3">
                    <div className="bg-muted/50 p-4 rounded-lg text-center">
                      <Clock className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm font-medium">Estás convocado a esta reunión</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        El encargado tomará asistencia el día de la reunión
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() =>
                        window.open(
                          generateGoogleCalendarLink({
                            title: selectedMeeting.title,
                            date: selectedMeeting.date,
                            area: MEETING_AREAS.find((a) => a.value === selectedMeeting.area)
                              ?.label,
                          }),
                          '_blank',
                        )
                      }
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Agregar a Google Calendar
                    </Button>
                  </div>
                )}

                {selectedMeeting.status === 'en_curso' && (
                  <div className="bg-muted p-4 rounded-lg text-center">
                    <Clock className="w-8 h-8 mx-auto mb-2 text-primary" />
                    <p className="text-sm font-medium">Reunión en curso</p>
                    <p className="text-xs text-muted-foreground mt-1">Acercate a participar</p>
                  </div>
                )}

                {selectedMeeting.status === 'cerrada' && selectedMeeting.notes && (
                  <div className="prose prose-sm max-w-none">
                    <h4 className="text-sm font-medium mb-2">Notas de la reunión:</h4>
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
                      {selectedMeeting.notes}
                    </div>
                  </div>
                )}

                {selectedMeeting.status === 'cerrada' &&
                  !selectedMeeting.myParticipation?.read_at && (
                    <Button
                      className="w-full"
                      onClick={() => handleMarkAsRead(selectedMeeting.id)}
                      disabled={markAsRead.isPending}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Confirmar lectura
                    </Button>
                  )}

                {selectedMeeting.myParticipation?.read_at && (
                  <div className="flex items-center justify-center gap-2 text-sm text-success">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      Leído el{' '}
                      {format(new Date(selectedMeeting.myParticipation.read_at), 'd MMM HH:mm', {
                        locale: es,
                      })}
                    </span>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

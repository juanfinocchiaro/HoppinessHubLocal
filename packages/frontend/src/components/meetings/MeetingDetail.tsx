/**
 * MeetingDetail - Vista detalle de reunión refactorizada para v2.0
 * Renderiza diferentes UIs según el estado: convocada, en_curso, cerrada
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Calendar,
  Users,
  FileText,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  User,
  Target,
  Play,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MEETING_AREAS, type MeetingWithDetails } from '@/types/meeting';
import { MeetingStatusBadge } from './MeetingStatusBadge';
import { MeetingExecutionForm } from './MeetingExecutionForm';
import { useMarkMeetingAsRead, useStartMeeting, useCancelMeeting } from '@/hooks/useMeetings';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { handleError } from '@/lib/errorHandler';
import { generateGoogleCalendarLink } from '@/lib/calendarLinks';

interface MeetingDetailProps {
  meeting: MeetingWithDetails;
  onBack: () => void;
  canTrackReads?: boolean;
  canManage?: boolean;
}

export function MeetingDetail({
  meeting,
  onBack,
  canTrackReads = false,
  canManage = false,
}: MeetingDetailProps) {
  const { user } = useAuth();
  const effectiveUser = useEffectiveUser();
  const markAsRead = useMarkMeetingAsRead();
  const startMeeting = useStartMeeting();
  const cancelMeeting = useCancelMeeting();

  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const areaLabel = MEETING_AREAS.find((a) => a.value === meeting.area)?.label || meeting.area;
  const meetingDate = meeting.scheduled_at || meeting.date;

  // Find current user's participation
  const myParticipation = meeting.participants.find((p) => p.user_id === effectiveUser.id);
  const isUnread = myParticipation && !myParticipation.read_at && meeting.status === 'cerrada';
  const isMeetingConvener = user?.id === meeting.created_by;

  const handleMarkAsRead = async () => {
    try {
      await markAsRead.mutateAsync(meeting.id);
      toast.success('Marcado como leído');
    } catch (error) {
      handleError(error, { userMessage: 'Error al marcar como leído', context: 'MeetingDetail' });
    }
  };

  const handleStartMeeting = async () => {
    if (!isMeetingConvener) {
      toast.error('Solo quien convocó la reunión puede iniciarla');
      return;
    }

    try {
      await startMeeting.mutateAsync(meeting.id);
      toast.success('Reunión iniciada');
    } catch (error) {
      handleError(error, { userMessage: 'Error al iniciar la reunión', context: 'MeetingDetail' });
    }
  };

  const handleCancelMeeting = async () => {
    try {
      await cancelMeeting.mutateAsync(meeting.id);
      toast.success('Reunión cancelada');
      onBack();
    } catch (error) {
      handleError(error, { userMessage: 'Error al cancelar la reunión', context: 'MeetingDetail' });
    }
  };

  // Participants stats
  const presentParticipants = meeting.participants.filter((p) => p.was_present === true);
  const absentParticipants = meeting.participants.filter((p) => p.was_present === false);
  const pendingParticipants = meeting.participants.filter((p) => p.was_present === null);
  const readCount = meeting.participants.filter((p) => p.read_at).length;

  return (
    <div className="space-y-4">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="w-4 h-4 mr-1" />
        Volver
      </Button>

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold">{meeting.title}</h1>
              <MeetingStatusBadge status={meeting.status} />
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>
                  {format(new Date(meetingDate), "EEEE d 'de' MMMM, HH:mm", { locale: es })}
                </span>
              </div>
              <Badge variant="secondary">{areaLabel}</Badge>
              {meeting.branches && <Badge variant="outline">{meeting.branches.name}</Badge>}
            </div>
          </div>

          {/* Actions based on status */}
          <div className="flex items-center gap-2">
            {meeting.status === 'convocada' && canManage && (
              <>
                <Button variant="outline" size="sm" onClick={() => setShowCancelDialog(true)}>
                  <Trash2 className="w-4 h-4 mr-1" />
                  Cancelar
                </Button>
                {isMeetingConvener ? (
                  <Button size="sm" onClick={handleStartMeeting} disabled={startMeeting.isPending}>
                    <Play className="w-4 h-4 mr-1" />
                    {startMeeting.isPending ? 'Iniciando...' : 'Iniciar Reunión'}
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Solo la persona convocante puede iniciar
                  </span>
                )}
              </>
            )}

            {meeting.status === 'cerrada' && isUnread && (
              <Button size="sm" onClick={handleMarkAsRead} disabled={markAsRead.isPending}>
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Marcar leído
              </Button>
            )}
          </div>
        </div>

        {meeting.creator && (
          <p className="text-sm text-muted-foreground">Creada por {meeting.creator.full_name}</p>
        )}
      </div>

      {/* Content based on status */}
      {meeting.status === 'convocada' && (
        <ConvocadaContent meeting={meeting} pendingParticipants={pendingParticipants} />
      )}

      {meeting.status === 'en_curso' && canManage && (
        <MeetingExecutionForm meeting={meeting} onClose={onBack} />
      )}

      {meeting.status === 'en_curso' && !canManage && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Play className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Esta reunión está en curso.</p>
            <p className="text-sm">Los detalles estarán disponibles cuando finalice.</p>
          </CardContent>
        </Card>
      )}

      {meeting.status === 'cerrada' && (
        <CerradaContent
          meeting={meeting}
          presentParticipants={presentParticipants}
          absentParticipants={absentParticipants}
          readCount={readCount}
          canTrackReads={canTrackReads}
        />
      )}

      {/* Cancel Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar reunión?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la reunión y notificará a los participantes. Esta acción no se
              puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Mantener</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelMeeting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sí, cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Sub-component for CONVOCADA status
function ConvocadaContent({
  meeting,
  pendingParticipants,
}: {
  meeting: MeetingWithDetails;
  pendingParticipants: MeetingWithDetails['participants'];
}) {
  const areaLabel = MEETING_AREAS.find((a) => a.value === meeting.area)?.label;
  const calendarUrl = generateGoogleCalendarLink({
    title: meeting.title,
    date: meeting.scheduled_at || meeting.date,
    area: areaLabel,
    branchName: meeting.branches?.name,
    participantCount: pendingParticipants.length,
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Convocados
            </div>
            <span className="text-sm font-normal text-muted-foreground">
              {pendingParticipants.length} participantes
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {pendingParticipants.map((p) => (
              <div key={p.id} className="flex items-center gap-2 bg-muted/50 px-2 py-1 rounded-md">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={p.profile?.avatar_url} />
                  <AvatarFallback className="text-xs">
                    {p.profile?.full_name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">{p.profile?.full_name || 'Usuario'}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button
        variant="outline"
        className="w-full sm:w-auto"
        onClick={() => window.open(calendarUrl, '_blank')}
      >
        <Calendar className="w-4 h-4 mr-2" />
        Agregar a mi Google Calendar
      </Button>
    </div>
  );
}

// Sub-component for CERRADA status
function CerradaContent({
  meeting,
  presentParticipants,
  absentParticipants,
  readCount,
  canTrackReads,
}: {
  meeting: MeetingWithDetails;
  presentParticipants: MeetingWithDetails['participants'];
  absentParticipants: MeetingWithDetails['participants'];
  readCount: number;
  canTrackReads: boolean;
}) {
  return (
    <>
      {/* Notes */}
      {meeting.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="w-4 h-4" />
              Notas de la Reunión
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
              {meeting.notes}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attendance */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Asistencia
            </div>
            <span className="text-sm font-normal text-muted-foreground">
              {presentParticipants.length}/{meeting.participants.length} presentes
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Present */}
          {presentParticipants.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Presentes</p>
              <div className="flex flex-wrap gap-2">
                {presentParticipants.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 bg-success/10 px-2 py-1 rounded-md"
                  >
                    <CheckCircle2 className="w-3 h-3 text-success" />
                    <span className="text-sm">{p.profile?.full_name || 'Usuario'}</span>
                    {canTrackReads &&
                      (p.read_at ? (
                        <Badge variant="outline" className="text-[10px] px-1">
                          Leyó
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] px-1">
                          Pendiente
                        </Badge>
                      ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Absent */}
          {absentParticipants.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Ausentes</p>
              <div className="flex flex-wrap gap-2">
                {absentParticipants.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 bg-muted px-2 py-1 rounded-md">
                    <XCircle className="w-3 h-3 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {p.profile?.full_name || 'Usuario'}
                    </span>
                    {canTrackReads &&
                      (p.read_at ? (
                        <Badge variant="outline" className="text-[10px] px-1">
                          Leyó
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] px-1">
                          Pendiente
                        </Badge>
                      ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Read tracker summary */}
          {canTrackReads && (
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Confirmaciones de lectura</span>
                <Badge
                  variant={readCount === meeting.participants.length ? 'default' : 'secondary'}
                >
                  {readCount}/{meeting.participants.length}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Agreements */}
      {meeting.agreements.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="w-4 h-4" />
              Acuerdos ({meeting.agreements.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {meeting.agreements.map((agreement, index) => (
              <div key={agreement.id} className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">{agreement.description}</p>
                    {agreement.assignees.length > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        <User className="w-3 h-3 text-muted-foreground" />
                        <div className="flex flex-wrap gap-1">
                          {agreement.assignees.map((a) => (
                            <Badge key={a.id} variant="outline" className="text-xs">
                              {a.profile?.full_name || 'Usuario'}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </>
  );
}

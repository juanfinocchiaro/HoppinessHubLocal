/**
 * MeetingExecutionForm - Formulario de ejecución de reunión (Fase 2)
 * Permite tomar asistencia, escribir notas y agregar acuerdos
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, FileText, Target, Plus, X, CheckCircle2, XCircle, Send, Save } from 'lucide-react';
import { useCloseMeeting, useSaveMeetingNotes, useUpdateAttendance } from '@/hooks/useMeetings';
import type { MeetingWithDetails } from '@/types/meeting';
import { toast } from 'sonner';

interface MeetingExecutionFormProps {
  meeting: MeetingWithDetails;
  onClose?: () => void;
}

interface AgreementDraft {
  id: string;
  description: string;
  assigneeIds: string[];
}

export function MeetingExecutionForm({ meeting, onClose }: MeetingExecutionFormProps) {
  // Attendance state
  const [attendance, setAttendance] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    meeting.participants.forEach((p) => {
      initial[p.user_id] = p.was_present ?? false;
    });
    return initial;
  });

  // Notes state
  const [notes, setNotes] = useState(meeting.notes || '');

  // Agreements state
  const [agreements, setAgreements] = useState<AgreementDraft[]>([]);
  const [newAgreementText, setNewAgreementText] = useState('');
  const [newAgreementAssignees, setNewAgreementAssignees] = useState<string[]>([]);

  const closeMeeting = useCloseMeeting();
  const saveNotes = useSaveMeetingNotes();
  const updateAttendance = useUpdateAttendance();

  const presentCount = Object.values(attendance).filter(Boolean).length;
  const absentCount = meeting.participants.length - presentCount;

  const toggleAttendance = (userId: string) => {
    setAttendance((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const addAgreement = () => {
    if (!newAgreementText.trim()) return;

    setAgreements((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        description: newAgreementText.trim(),
        assigneeIds: newAgreementAssignees,
      },
    ]);
    setNewAgreementText('');
    setNewAgreementAssignees([]);
  };

  const removeAgreement = (id: string) => {
    setAgreements((prev) => prev.filter((a) => a.id !== id));
  };

  const toggleAssignee = (userId: string) => {
    setNewAgreementAssignees((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const handleSave = async () => {
    try {
      await Promise.all([
        saveNotes.mutateAsync({ meetingId: meeting.id, notes }),
        updateAttendance.mutateAsync({ meetingId: meeting.id, attendance }),
      ]);
      toast.success('Cambios guardados');
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar');
    }
  };

  const handleCloseAndNotify = async () => {
    if (!notes.trim()) {
      toast.error('Las notas son obligatorias para cerrar la reunión');
      return;
    }

    try {
      await closeMeeting.mutateAsync({
        meetingId: meeting.id,
        notes: notes.trim(),
        attendance,
        agreements: agreements.map((a) => ({
          description: a.description,
          assigneeIds: a.assigneeIds,
        })),
      });
      toast.success('Reunión cerrada y notificada a los participantes');
      onClose?.();
    } catch (error: any) {
      toast.error(error.message || 'Error al cerrar la reunión');
    }
  };

  return (
    <div className="space-y-4">
      {/* Asistencia */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Asistencia
            </div>
            <div className="flex gap-2 text-sm font-normal">
              <Badge variant="outline" className="bg-success/10">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                {presentCount}
              </Badge>
              <Badge variant="outline" className="bg-muted">
                <XCircle className="w-3 h-3 mr-1" />
                {absentCount}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {meeting.participants.map((participant) => (
              <div
                key={participant.id}
                className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                  attendance[participant.user_id]
                    ? 'bg-success/10 hover:bg-success/20'
                    : 'bg-muted/50 hover:bg-muted'
                }`}
                onClick={() => toggleAttendance(participant.user_id)}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    attendance[participant.user_id]
                      ? 'bg-success text-success-foreground'
                      : 'bg-muted-foreground/20'
                  }`}
                >
                  {attendance[participant.user_id] ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <XCircle className="w-3 h-3 text-muted-foreground" />
                  )}
                </div>
                <Avatar className="h-7 w-7">
                  <AvatarImage src={participant.profile?.avatar_url} />
                  <AvatarFallback className="text-xs">
                    {participant.profile?.full_name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm flex-1">
                  {participant.profile?.full_name || 'Usuario'}
                </span>
                <Badge
                  variant={attendance[participant.user_id] ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {attendance[participant.user_id] ? 'Presente' : 'Ausente'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notas */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="w-4 h-4" />
            Notas de la Reunión
            <span className="text-destructive">*</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Documenta los puntos principales tratados en la reunión..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={5}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Las notas son obligatorias para cerrar la reunión
          </p>
        </CardContent>
      </Card>

      {/* Acuerdos */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="w-4 h-4" />
            Acuerdos ({agreements.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Lista de acuerdos */}
          {agreements.length > 0 && (
            <div className="space-y-2">
              {agreements.map((agreement, index) => (
                <div
                  key={agreement.id}
                  className="flex items-start gap-2 p-2 bg-muted/50 rounded-md"
                >
                  <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{agreement.description}</p>
                    {agreement.assigneeIds.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {agreement.assigneeIds.map((userId) => {
                          const participant = meeting.participants.find(
                            (p) => p.user_id === userId,
                          );
                          return (
                            <Badge key={userId} variant="outline" className="text-xs">
                              {participant?.profile?.full_name || 'Usuario'}
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => removeAgreement(agreement.id)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Nuevo acuerdo */}
          <div className="border rounded-md p-3 space-y-3">
            <Input
              placeholder="Describe el acuerdo..."
              value={newAgreementText}
              onChange={(e) => setNewAgreementText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  addAgreement();
                }
              }}
            />

            {/* Selector de responsables */}
            <div>
              <Label className="text-xs text-muted-foreground">Responsables (opcional)</Label>
              <ScrollArea className="h-24 mt-1">
                <div className="flex flex-wrap gap-1">
                  {meeting.participants.map((p) => (
                    <Badge
                      key={p.user_id}
                      variant={newAgreementAssignees.includes(p.user_id) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleAssignee(p.user_id)}
                    >
                      {p.profile?.full_name || 'Usuario'}
                    </Badge>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={addAgreement}
              disabled={!newAgreementText.trim()}
              className="w-full"
            >
              <Plus className="w-3 h-3 mr-1" />
              Agregar Acuerdo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Acciones */}
      <div className="flex gap-2 justify-end pt-2 border-t">
        <Button
          variant="outline"
          onClick={handleSave}
          disabled={saveNotes.isPending || updateAttendance.isPending}
        >
          <Save className="w-4 h-4 mr-1" />
          Guardar
        </Button>
        <Button onClick={handleCloseAndNotify} disabled={!notes.trim() || closeMeeting.isPending}>
          <Send className="w-4 h-4 mr-1" />
          {closeMeeting.isPending ? 'Cerrando...' : 'Cerrar y Notificar'}
        </Button>
      </div>
    </div>
  );
}

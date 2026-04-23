/**
 * MeetingConveneModal - Modal simple para convocar reunión (Fase 1)
 */
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Clock, Users, Send } from 'lucide-react';
import { useConveneMeeting, useBranchTeamMembers } from '@/hooks/useMeetings';
import { MEETING_AREAS, type MeetingArea, type MeetingConveneData } from '@/types/meeting';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface MeetingConveneModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
}

export function MeetingConveneModal({ open, onOpenChange, branchId }: MeetingConveneModalProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState('10:00');
  const [area, setArea] = useState<MeetingArea>('general');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const conveneMeeting = useConveneMeeting();
  const { data: teamMembers = [], isLoading: loadingTeam } = useBranchTeamMembers(branchId);

  const handleClose = () => {
    setTitle('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setTime('10:00');
    setArea('general');
    setSelectedIds([]);
    onOpenChange(false);
  };

  const toggleMember = (userId: string) => {
    setSelectedIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const selectAll = () => {
    if (selectedIds.length === teamMembers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(teamMembers.map((m) => m.id));
    }
  };

  const canSubmit = title.trim() && selectedIds.length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    try {
      const data: MeetingConveneData = {
        title: title.trim(),
        date: new Date(date),
        time,
        area,
        participantIds: selectedIds,
        branchId,
      };

      await conveneMeeting.mutateAsync(data);
      toast.success('Reunión convocada exitosamente');
      handleClose();
    } catch (error: any) {
      toast.error(error.message || 'Error al convocar la reunión');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Convocar Reunión
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="title">Título de la reunión</Label>
            <Input
              id="title"
              placeholder="Ej: Coordinación semanal"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Fecha y hora */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="date">Fecha</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Hora</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {/* Área */}
          <div className="space-y-2">
            <Label>Área</Label>
            <Select value={area} onValueChange={(v) => setArea(v as MeetingArea)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEETING_AREAS.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Participantes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Participantes ({selectedIds.length})
              </Label>
              <Button type="button" variant="ghost" size="sm" onClick={selectAll}>
                {selectedIds.length === teamMembers.length ? 'Ninguno' : 'Todos'}
              </Button>
            </div>

            <ScrollArea className="h-48 border rounded-md p-2">
              {loadingTeam ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Cargando equipo...
                </div>
              ) : teamMembers.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No hay miembros del equipo
                </div>
              ) : (
                <div className="space-y-1">
                  {teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                      onClick={() => toggleMember(member.id)}
                    >
                      <Checkbox
                        checked={selectedIds.includes(member.id)}
                        onCheckedChange={() => toggleMember(member.id)}
                      />
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={member.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {member.full_name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{member.full_name}</p>
                        {member.local_role && (
                          <p className="text-xs text-muted-foreground capitalize">
                            {member.local_role}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || conveneMeeting.isPending}>
            <Send className="w-4 h-4 mr-1" />
            {conveneMeeting.isPending ? 'Convocando...' : 'Convocar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

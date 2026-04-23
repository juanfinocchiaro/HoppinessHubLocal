/**
 * MeetingWizardStep1 - Información básica + participantes
 */
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon, Users } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MEETING_AREAS, type MeetingWizardData, type MeetingArea } from '@/types/meeting';
import { cn } from '@/lib/utils';
import { LOCAL_ROLE_LABELS } from '@/hooks/usePermissions';

interface Step1Props {
  data: MeetingWizardData;
  teamMembers: { id: string; full_name: string; local_role?: string }[];
  onChange: (updates: Partial<MeetingWizardData>) => void;
}

export function MeetingWizardStep1({ data, teamMembers, onChange }: Step1Props) {
  const toggleParticipant = (userId: string) => {
    const current = data.participantIds;
    const updated = current.includes(userId)
      ? current.filter((id) => id !== userId)
      : [...current, userId];
    onChange({ participantIds: updated });
  };

  const selectAll = () => {
    onChange({ participantIds: teamMembers.map((m) => m.id) });
  };

  const selectNone = () => {
    onChange({ participantIds: [] });
  };

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Título de la reunión *</Label>
        <Input
          id="title"
          value={data.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Ej: Reunión semanal de equipo"
        />
      </div>

      {/* Date & Time */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Fecha *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !data.date && 'text-muted-foreground',
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {data.date ? format(data.date, 'd MMM yyyy', { locale: es }) : 'Seleccionar'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={data.date}
                onSelect={(date) => date && onChange({ date })}
                locale={es}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label htmlFor="time">Hora</Label>
          <Input
            id="time"
            type="time"
            value={data.time}
            onChange={(e) => onChange({ time: e.target.value })}
          />
        </div>
      </div>

      {/* Area */}
      <div className="space-y-2">
        <Label>Área</Label>
        <Select value={data.area} onValueChange={(value: MeetingArea) => onChange({ area: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MEETING_AREAS.map((area) => (
              <SelectItem key={area.value} value={area.value}>
                {area.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Participants */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Participantes *
          </Label>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs h-7">
              Todos
            </Button>
            <Button variant="ghost" size="sm" onClick={selectNone} className="text-xs h-7">
              Ninguno
            </Button>
          </div>
        </div>

        <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
          {teamMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-2">
              No hay miembros del equipo
            </p>
          ) : (
            teamMembers.map((member) => (
              <label
                key={member.id}
                className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer"
              >
                <Checkbox
                  checked={data.participantIds.includes(member.id)}
                  onCheckedChange={() => toggleParticipant(member.id)}
                />
                <div className="flex-1">
                  <span className="text-sm font-medium">{member.full_name}</span>
                  {member.local_role && (
                    <span className="text-xs text-muted-foreground ml-2">
                      ({LOCAL_ROLE_LABELS[member.local_role] || member.local_role})
                    </span>
                  )}
                </div>
              </label>
            ))
          )}
        </div>

        <p className="text-xs text-muted-foreground">{data.participantIds.length} seleccionados</p>
      </div>
    </div>
  );
}

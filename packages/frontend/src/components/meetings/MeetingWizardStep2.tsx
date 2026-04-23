/**
 * MeetingWizardStep2 - Asistencia + notas
 */
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CheckCircle2, XCircle } from 'lucide-react';
import { type MeetingWizardData } from '@/types/meeting';

interface Step2Props {
  data: MeetingWizardData;
  teamMembers: { id: string; full_name: string }[];
  onChange: (updates: Partial<MeetingWizardData>) => void;
}

export function MeetingWizardStep2({ data, teamMembers, onChange }: Step2Props) {
  const selectedMembers = teamMembers.filter((m) => data.participantIds.includes(m.id));

  const setAttendance = (userId: string, attended: boolean) => {
    onChange({
      attendance: {
        ...data.attendance,
        [userId]: attended,
      },
    });
  };

  const presentCount = Object.values(data.attendance).filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Attendance */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Asistencia</Label>
          <span className="text-xs text-muted-foreground">
            {presentCount}/{selectedMembers.length} presentes
          </span>
        </div>

        <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
          {selectedMembers.map((member) => (
            <div key={member.id} className="flex items-center justify-between p-3">
              <span className="text-sm font-medium">{member.full_name}</span>

              <RadioGroup
                value={
                  data.attendance[member.id] === true
                    ? 'present'
                    : data.attendance[member.id] === false
                      ? 'absent'
                      : ''
                }
                onValueChange={(value) => setAttendance(member.id, value === 'present')}
                className="flex gap-2"
              >
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <RadioGroupItem value="present" className="sr-only" />
                  <div
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                      data.attendance[member.id] === true
                        ? 'bg-success/20 text-success'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Presente
                  </div>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer">
                  <RadioGroupItem value="absent" className="sr-only" />
                  <div
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                      data.attendance[member.id] === false
                        ? 'bg-destructive/20 text-destructive'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Ausente
                  </div>
                </label>
              </RadioGroup>
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notas de la reunión *</Label>
        <Textarea
          id="notes"
          value={data.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="Escribe los puntos tratados, decisiones tomadas, temas discutidos..."
          className="min-h-[200px]"
        />
        <p className="text-xs text-muted-foreground">
          Estas notas serán visibles para todos los participantes
        </p>
      </div>
    </div>
  );
}

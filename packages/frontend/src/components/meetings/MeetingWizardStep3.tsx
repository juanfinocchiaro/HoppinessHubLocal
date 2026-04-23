/**
 * MeetingWizardStep3 - Acuerdos
 */
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, X, ChevronDown, Target, User } from 'lucide-react';
import { type MeetingWizardData } from '@/types/meeting';

interface Step3Props {
  data: MeetingWizardData;
  teamMembers: { id: string; full_name: string }[];
  onChange: (updates: Partial<MeetingWizardData>) => void;
}

export function MeetingWizardStep3({ data, teamMembers, onChange }: Step3Props) {
  const [newAgreement, setNewAgreement] = useState('');
  const selectedMembers = teamMembers.filter((m) => data.participantIds.includes(m.id));

  const addAgreement = () => {
    if (!newAgreement.trim()) return;

    onChange({
      agreements: [...data.agreements, { description: newAgreement.trim(), assigneeIds: [] }],
    });
    setNewAgreement('');
  };

  const removeAgreement = (index: number) => {
    onChange({
      agreements: data.agreements.filter((_, i) => i !== index),
    });
  };

  const toggleAssignee = (agreementIndex: number, userId: string) => {
    const updated = [...data.agreements];
    const current = updated[agreementIndex].assigneeIds;
    updated[agreementIndex] = {
      ...updated[agreementIndex],
      assigneeIds: current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    };
    onChange({ agreements: updated });
  };

  const getAssigneeNames = (assigneeIds: string[]) => {
    return assigneeIds
      .map((id) => teamMembers.find((m) => m.id === id)?.full_name || 'Usuario')
      .join(', ');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Target className="w-4 h-4" />
        <span>Registra los acuerdos de la reunión (opcional)</span>
      </div>

      {/* Add new agreement */}
      <div className="flex gap-2">
        <Input
          value={newAgreement}
          onChange={(e) => setNewAgreement(e.target.value)}
          placeholder="Escribe un acuerdo..."
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAgreement())}
        />
        <Button onClick={addAgreement} disabled={!newAgreement.trim()}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Agreements list */}
      {data.agreements.length > 0 && (
        <div className="space-y-3">
          {data.agreements.map((agreement, index) => (
            <Collapsible key={index} className="border rounded-lg">
              <div className="flex items-start gap-3 p-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  {index + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm">{agreement.description}</p>

                  {agreement.assigneeIds.length > 0 && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <User className="w-3 h-3" />
                      <span className="truncate">{getAssigneeNames(agreement.assigneeIds)}</span>
                    </div>
                  )}
                </div>

                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 px-2">
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </CollapsibleTrigger>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-destructive hover:text-destructive"
                  onClick={() => removeAgreement(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <CollapsibleContent>
                <div className="px-3 pb-3 pt-0">
                  <Label className="text-xs text-muted-foreground">Asignar responsables:</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedMembers.map((member) => (
                      <label key={member.id} className="flex items-center gap-1.5 cursor-pointer">
                        <Checkbox
                          checked={agreement.assigneeIds.includes(member.id)}
                          onCheckedChange={() => toggleAssignee(index, member.id)}
                        />
                        <span className="text-sm">{member.full_name.split(' ')[0]}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      )}

      {data.agreements.length === 0 && (
        <div className="text-center py-6 text-muted-foreground">
          <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No hay acuerdos agregados</p>
          <p className="text-xs">Podés continuar sin agregar acuerdos</p>
        </div>
      )}
    </div>
  );
}

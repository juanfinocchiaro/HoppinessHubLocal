/**
 * MeetingWizard - Modal wizard de 3 pasos para crear reunión
 */
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { MeetingWizardStep1 } from './MeetingWizardStep1';
import { MeetingWizardStep2 } from './MeetingWizardStep2';
import { MeetingWizardStep3 } from './MeetingWizardStep3';
import { useCreateMeeting, useBranchTeamMembers } from '@/hooks/useMeetings';
import { type MeetingWizardData } from '@/types/meeting';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';

interface MeetingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
}

const STEPS = ['Información', 'Asistencia', 'Acuerdos'];

const initialData: MeetingWizardData = {
  title: '',
  date: new Date(),
  time: '10:00',
  area: 'general',
  participantIds: [],
  attendance: {},
  notes: '',
  agreements: [],
};

export function MeetingWizard({ open, onOpenChange, branchId }: MeetingWizardProps) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<MeetingWizardData>(initialData);

  const createMeeting = useCreateMeeting();
  const { data: teamMembers = [] } = useBranchTeamMembers(branchId);

  const handleClose = () => {
    setStep(0);
    setData(initialData);
    onOpenChange(false);
  };

  const updateData = (updates: Partial<MeetingWizardData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const canProceedStep0 = data.title.trim() && data.participantIds.length > 0;
  const canProceedStep1 = data.notes.trim();

  const handleNext = () => {
    if (step < 2) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      await createMeeting.mutateAsync({ branchId, data });
      toast.success('Reunión creada y notificada');
      handleClose();
    } catch (error: any) {
      toast.error(error.message || 'Error al crear la reunión');
    }
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Reunión</DialogTitle>
        </DialogHeader>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            {STEPS.map((s, i) => (
              <span
                key={s}
                className={i <= step ? 'text-primary font-medium' : 'text-muted-foreground'}
              >
                {s}
              </span>
            ))}
          </div>
          <Progress value={progress} className="h-1" />
        </div>

        {/* Steps */}
        <div className="py-4">
          {step === 0 && (
            <MeetingWizardStep1 data={data} teamMembers={teamMembers} onChange={updateData} />
          )}
          {step === 1 && (
            <MeetingWizardStep2 data={data} teamMembers={teamMembers} onChange={updateData} />
          )}
          {step === 2 && (
            <MeetingWizardStep3 data={data} teamMembers={teamMembers} onChange={updateData} />
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t">
          {step > 0 ? (
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Anterior
            </Button>
          ) : (
            <Button variant="ghost" onClick={handleClose}>
              Cancelar
            </Button>
          )}

          {step < 2 ? (
            <Button
              onClick={handleNext}
              disabled={step === 0 ? !canProceedStep0 : !canProceedStep1}
            >
              Siguiente
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={createMeeting.isPending}>
              <CheckCircle className="w-4 h-4 mr-1" />
              {createMeeting.isPending ? 'Guardando...' : 'Cerrar y notificar'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

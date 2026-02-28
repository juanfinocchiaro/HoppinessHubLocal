import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createScheduleRequest } from '@/services/schedulesService';
import { uploadStaffEvidence } from '@/services/profileService';
import { useAuth } from '@/hooks/useAuth';
import { usePermissionsWithImpersonation } from '@/hooks/usePermissionsWithImpersonation';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Calendar as CalendarIcon,
  Loader2,
  Send,
  CalendarOff,
  RefreshCw,
  HelpCircle,
  FileWarning,
  Upload,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

type RequestType = 'day_off' | 'shift_change' | 'absence_justification' | 'other';
type AbsenceType = 'medical' | 'personal' | 'emergency' | 'other';

interface RequestDayOffModalProps {
  branchId?: string;
  trigger?: React.ReactNode;
}

export default function RequestDayOffModal({ branchId, trigger }: RequestDayOffModalProps) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { branchRoles } = usePermissionsWithImpersonation();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [requestType, setRequestType] = useState<RequestType>('day_off');
  const [absenceType, setAbsenceType] = useState<AbsenceType>('medical');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [reason, setReason] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Use first branch if not specified
  const targetBranchId = branchId || branchRoles?.[0]?.branch_id;

  const uploadEvidence = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `absence-evidence/${fileName}`;

    try {
      return await uploadStaffEvidence(filePath, file);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error uploading evidence:', error);
      return null;
    }
  };

  const createRequest = useMutation({
    mutationFn: async () => {
      if (!userId || !targetBranchId || !selectedDate) {
        throw new Error('Faltan datos requeridos');
      }

      let evidenceUrl: string | null = null;

      if (evidenceFile && requestType === 'absence_justification') {
        setUploading(true);
        evidenceUrl = await uploadEvidence(evidenceFile);
        setUploading(false);
      }

      await createScheduleRequest({
        user_id: userId,
        branch_id: targetBranchId,
        request_type: requestType,
        request_date: format(selectedDate, 'yyyy-MM-dd'),
        reason: reason || null,
        status: 'pending',
        evidence_url: evidenceUrl,
        absence_type: requestType === 'absence_justification' ? absenceType : null,
      });
    },
    onSuccess: () => {
      toast.success('Solicitud enviada correctamente');
      queryClient.invalidateQueries({ queryKey: ['my-schedule-requests'] });
      setOpen(false);
      resetForm();
    },
    onError: (error) => {
      if (import.meta.env.DEV) console.error('Error creating request:', error);
      toast.error('Error al enviar la solicitud');
    },
  });

  const resetForm = () => {
    setRequestType('day_off');
    setAbsenceType('medical');
    setSelectedDate(undefined);
    setReason('');
    setEvidenceFile(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Limit to 5MB
      if (file.size > 5 * 1024 * 1024) {
        toast.error('El archivo no puede superar los 5MB');
        return;
      }
      setEvidenceFile(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDate) {
      toast.error('Seleccioná una fecha');
      return;
    }

    // For absence justification, date must be in the past or today
    if (requestType === 'absence_justification') {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (selectedDate > today) {
        toast.error('La fecha de la falta debe ser pasada o actual');
        return;
      }
    } else {
      // For future requests, date must be in the future
      if (selectedDate < new Date()) {
        toast.error('La fecha debe ser futura');
        return;
      }
    }

    createRequest.mutate();
  };

  const getRequestTypeIcon = (type: RequestType) => {
    switch (type) {
      case 'day_off':
        return CalendarOff;
      case 'shift_change':
        return RefreshCw;
      case 'absence_justification':
        return FileWarning;
      default:
        return HelpCircle;
    }
  };

  const getRequestTypeLabel = (type: RequestType) => {
    switch (type) {
      case 'day_off':
        return 'Día libre';
      case 'shift_change':
        return 'Cambio turno';
      case 'absence_justification':
        return 'Justificar';
      case 'other':
        return 'Otro';
      default:
        return type;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <CalendarOff className="w-4 h-4 mr-2" />
            Solicitar día libre
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Solicitar día libre / cambio</DialogTitle>
          <DialogDescription>
            Tu solicitud será revisada por el encargado del local
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          {/* Request Type */}
          <div className="space-y-3">
            <Label>Tipo de solicitud</Label>
            <RadioGroup
              value={requestType}
              onValueChange={(v) => setRequestType(v as RequestType)}
              className="grid grid-cols-2 sm:grid-cols-4 gap-2"
            >
              {(['day_off', 'shift_change', 'absence_justification', 'other'] as const).map(
                (type) => {
                  const Icon = getRequestTypeIcon(type);
                  return (
                    <div key={type}>
                      <RadioGroupItem value={type} id={type} className="peer sr-only" />
                      <Label
                        htmlFor={type}
                        className={cn(
                          'flex flex-col items-center justify-center rounded-lg border-2 p-3 cursor-pointer transition-all',
                          'hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5',
                        )}
                      >
                        <Icon className="w-5 h-5 mb-1" />
                        <span className="text-xs text-center font-medium">
                          {getRequestTypeLabel(type)}
                        </span>
                      </Label>
                    </div>
                  );
                },
              )}
            </RadioGroup>
          </div>

          {/* Absence Type - only for absence justification */}
          {requestType === 'absence_justification' && (
            <div className="space-y-2">
              <Label>Tipo de ausencia</Label>
              <Select value={absenceType} onValueChange={(v) => setAbsenceType(v as AbsenceType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="medical">🏥 Médico (enfermedad)</SelectItem>
                  <SelectItem value="personal">👤 Motivo personal</SelectItem>
                  <SelectItem value="emergency">🚨 Emergencia familiar</SelectItem>
                  <SelectItem value="other">📋 Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Date Picker */}
          <div className="space-y-2">
            <Label>{requestType === 'absence_justification' ? 'Fecha de la falta' : 'Fecha'}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !selectedDate && 'text-muted-foreground',
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate
                    ? format(selectedDate, "EEEE d 'de' MMMM, yyyy", { locale: es })
                    : 'Seleccionar fecha...'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={
                    (date) =>
                      requestType === 'absence_justification'
                        ? date > new Date() // Past dates only for justification
                        : date < addDays(new Date(), 1) // Future dates for requests
                  }
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            {requestType === 'absence_justification' && (
              <p className="text-xs text-muted-foreground">Seleccioná el día que faltaste</p>
            )}
          </div>

          {/* Evidence upload - only for absence justification */}
          {requestType === 'absence_justification' && (
            <div className="space-y-2">
              <Label>Justificativo (opcional)</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              {evidenceFile ? (
                <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2 min-w-0">
                    <Upload className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm truncate">{evidenceFile.name}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEvidenceFile(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Subir certificado médico o foto
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                Podés subir una foto del certificado médico u otro comprobante (máx. 5MB)
              </p>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              {requestType === 'absence_justification' ? 'Explicación' : 'Motivo'} (opcional)
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                requestType === 'absence_justification'
                  ? 'Ej: Estuve enfermo con fiebre, adjunto certificado...'
                  : 'Ej: Turno médico, compromiso familiar, etc.'
              }
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={createRequest.isPending || uploading || !selectedDate}
            >
              {createRequest.isPending || uploading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              {requestType === 'absence_justification'
                ? 'Enviar justificativo'
                : 'Enviar solicitud'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

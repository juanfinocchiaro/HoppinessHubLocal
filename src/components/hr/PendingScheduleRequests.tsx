import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchPendingScheduleRequestsWithProfiles,
  respondToScheduleRequest as respondToScheduleRequestService,
} from '@/services/schedulesService';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertTriangle,
  CalendarOff,
  RefreshCw,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  FileWarning,
  ExternalLink,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

type RequestType = 'day_off' | 'shift_change' | 'absence_justification' | 'other';
type AbsenceType = 'medical' | 'personal' | 'emergency' | 'other';

interface PendingRequest {
  id: string;
  user_id: string;
  request_type: RequestType;
  request_date: string;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  evidence_url: string | null;
  absence_type: AbsenceType | null;
  profile?: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface PendingScheduleRequestsProps {
  branchId: string;
}

export default function PendingScheduleRequests({ branchId }: PendingScheduleRequestsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<PendingRequest | null>(null);
  const [responseNote, setResponseNote] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);

  const { data: requests, isLoading } = useQuery({
    queryKey: ['pending-schedule-requests', branchId],
    queryFn: () => fetchPendingScheduleRequestsWithProfiles(branchId) as Promise<PendingRequest[]>,
    enabled: !!branchId,
  });

  const respondToRequest = useMutation({
    mutationFn: async ({
      requestId,
      status,
      note,
    }: {
      requestId: string;
      status: 'approved' | 'rejected';
      note?: string;
    }) => {
      await respondToScheduleRequestService(requestId, status, user?.id ?? '', note);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pending-schedule-requests', branchId] });
      toast.success(variables.status === 'approved' ? 'Solicitud aprobada' : 'Solicitud rechazada');
      setSelectedRequest(null);
      setResponseNote('');
      setActionType(null);
    },
    onError: (error) => {
      if (import.meta.env.DEV) console.error('Error responding to request:', error);
      toast.error('Error al procesar la solicitud');
    },
  });

  const getTypeIcon = (type: RequestType) => {
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

  const getTypeLabel = (type: RequestType) => {
    switch (type) {
      case 'day_off':
        return 'Día libre';
      case 'shift_change':
        return 'Cambio turno';
      case 'absence_justification':
        return 'Justificativo';
      case 'other':
        return 'Otro';
      default:
        return type;
    }
  };

  const getAbsenceTypeLabel = (type: AbsenceType | null) => {
    switch (type) {
      case 'medical':
        return '🏥 Médico';
      case 'personal':
        return '👤 Personal';
      case 'emergency':
        return '🚨 Emergencia';
      case 'other':
        return '📋 Otro';
      default:
        return null;
    }
  };

  const handleAction = (request: PendingRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setActionType(action);
    setResponseNote('');
  };

  const confirmAction = () => {
    if (!selectedRequest || !actionType) return;

    respondToRequest.mutate({
      requestId: selectedRequest.id,
      status: actionType === 'approve' ? 'approved' : 'rejected',
      note: responseNote,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!requests || requests.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <CalendarOff className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">Sin solicitudes pendientes</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Las solicitudes de días libres y justificativos aparecerán aquí
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-warning/50 bg-warning/5">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <CardTitle className="text-lg">Solicitudes Pendientes ({requests.length})</CardTitle>
          </div>
          <CardDescription>
            Solicitudes de días libres y cambios de turno por revisar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {requests.map((request) => {
            const TypeIcon = getTypeIcon(request.request_type);
            const isJustification = request.request_type === 'absence_justification';
            const absenceLabel = getAbsenceTypeLabel(request.absence_type);

            return (
              <div
                key={request.id}
                className={cn(
                  'flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border bg-background gap-4',
                  isJustification && 'border-amber-200 dark:border-amber-800',
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'p-2 rounded-full',
                      isJustification ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-muted',
                    )}
                  >
                    <TypeIcon
                      className={cn(
                        'w-4 h-4',
                        isJustification
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-muted-foreground',
                      )}
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{request.profile?.full_name || 'Usuario'}</span>
                      <Badge
                        variant={isJustification ? 'outline' : 'secondary'}
                        className={cn(
                          'text-xs',
                          isJustification &&
                            'border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400',
                        )}
                      >
                        {getTypeLabel(request.request_type)}
                      </Badge>
                      {absenceLabel && (
                        <Badge variant="outline" className="text-xs">
                          {absenceLabel}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(request.request_date), "EEEE d 'de' MMMM", { locale: es })}
                    </p>
                    {request.reason && (
                      <p className="text-sm text-muted-foreground italic">"{request.reason}"</p>
                    )}
                    {request.evidence_url && (
                      <a
                        href={request.evidence_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        <FileText className="w-3 h-3" />
                        Ver justificativo
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Solicitado {format(new Date(request.created_at), 'd MMM', { locale: es })}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 sm:flex-shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => handleAction(request, 'reject')}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    {isJustification ? 'Rechazar' : 'Rechazar'}
                  </Button>
                  <Button
                    size="sm"
                    className="bg-success hover:bg-success/90"
                    onClick={() => handleAction(request, 'approve')}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    {isJustification ? 'Justificar' : 'Aprobar'}
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="sm:max-w-md">
          {selectedRequest &&
            (() => {
              const isJustification = selectedRequest.request_type === 'absence_justification';
              const absenceLabel = getAbsenceTypeLabel(selectedRequest.absence_type);

              return (
                <>
                  <DialogHeader>
                    <DialogTitle>
                      {isJustification
                        ? actionType === 'approve'
                          ? 'Justificar falta'
                          : 'Rechazar justificativo'
                        : actionType === 'approve'
                          ? 'Aprobar solicitud'
                          : 'Rechazar solicitud'}
                    </DialogTitle>
                    <DialogDescription>
                      {selectedRequest.profile?.full_name} -{' '}
                      {getTypeLabel(selectedRequest.request_type)}
                      {absenceLabel && ` (${absenceLabel})`} para el{' '}
                      {format(new Date(selectedRequest.request_date), "EEEE d 'de' MMMM", {
                        locale: es,
                      })}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 pt-4">
                    {selectedRequest.reason && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          {isJustification ? 'Explicación del empleado:' : 'Motivo del empleado:'}
                        </p>
                        <p className="text-sm font-medium">"{selectedRequest.reason}"</p>
                      </div>
                    )}

                    {selectedRequest.evidence_url && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground mb-2">Justificativo adjunto:</p>
                        <a
                          href={selectedRequest.evidence_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium"
                        >
                          <FileText className="w-4 h-4" />
                          Ver documento
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="responseNote">
                        {actionType === 'reject'
                          ? isJustification
                            ? 'Motivo del rechazo (recomendado)'
                            : 'Motivo del rechazo (recomendado)'
                          : 'Nota (opcional)'}
                      </Label>
                      <Textarea
                        id="responseNote"
                        value={responseNote}
                        onChange={(e) => setResponseNote(e.target.value)}
                        placeholder={
                          actionType === 'reject'
                            ? isJustification
                              ? 'Ej: El certificado no es válido'
                              : 'Ej: No hay cobertura para ese día'
                            : 'Nota adicional...'
                        }
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setSelectedRequest(null)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        className={`flex-1 ${actionType === 'approve' ? 'bg-success hover:bg-success/90' : ''}`}
                        variant={actionType === 'reject' ? 'destructive' : 'default'}
                        onClick={confirmAction}
                        disabled={respondToRequest.isPending}
                      >
                        {respondToRequest.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : actionType === 'approve' ? (
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                        ) : (
                          <XCircle className="w-4 h-4 mr-2" />
                        )}
                        {isJustification
                          ? actionType === 'approve'
                            ? 'Justificar falta'
                            : 'Rechazar justificativo'
                          : actionType === 'approve'
                            ? 'Confirmar aprobación'
                            : 'Confirmar rechazo'}
                      </Button>
                    </div>
                  </div>
                </>
              );
            })()}
        </DialogContent>
      </Dialog>
    </>
  );
}

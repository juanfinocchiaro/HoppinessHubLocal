/**
 * RequestsPage - Solicitudes de días libres y justificativos
 *
 * Separado de SchedulesPage para mejor organización.
 * Incluye:
 * - Tabs por estado: Pendientes, Aprobadas, Rechazadas, Todas
 * - Filtro por tipo
 * - Historial con fechas de respuesta
 */
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchScheduleRequestsWithProfiles,
  respondToScheduleRequest as respondToScheduleRequestService,
} from '@/services/schedulesService';
import { useAuth } from '@/hooks/useAuth';
import { useDynamicPermissions } from '@/hooks/useDynamicPermissions';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CalendarOff,
  RefreshCw,
  FileWarning,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  FileText,
  ExternalLink,
  Eye,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PageHelp } from '@/components/ui/PageHelp';
import { PageHeader } from '@/components/ui/page-header';

type RequestType = 'day_off' | 'shift_change' | 'absence_justification' | 'other';
type AbsenceType = 'medical' | 'personal' | 'emergency' | 'other';
type StatusType = 'pending' | 'approved' | 'rejected';

interface ScheduleRequest {
  id: string;
  user_id: string;
  request_type: RequestType;
  request_date: string;
  reason: string | null;
  status: StatusType;
  created_at: string;
  responded_at: string | null;
  response_note: string | null;
  evidence_url: string | null;
  absence_type: AbsenceType | null;
  profile?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export default function RequestsPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const { user } = useAuth();
  const { isFranquiciado, local } = useDynamicPermissions(branchId);
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>(
    'pending',
  );
  const [selectedRequest, setSelectedRequest] = useState<ScheduleRequest | null>(null);
  const [responseNote, setResponseNote] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);

  const canManage = local.canEditSchedules && !isFranquiciado;

  // Fetch all requests
  const { data: requests, isLoading } = useQuery({
    queryKey: ['schedule-requests', branchId],
    queryFn: () => fetchScheduleRequestsWithProfiles(branchId!) as Promise<ScheduleRequest[]>,
    enabled: !!branchId,
  });

  // Filter requests by tab
  const filteredRequests =
    requests?.filter((r) => {
      if (activeTab === 'all') return true;
      return r.status === activeTab;
    }) || [];

  // Counts by status
  const counts = {
    pending: requests?.filter((r) => r.status === 'pending').length || 0,
    approved: requests?.filter((r) => r.status === 'approved').length || 0,
    rejected: requests?.filter((r) => r.status === 'rejected').length || 0,
    all: requests?.length || 0,
  };

  // Respond mutation
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
      await respondToScheduleRequestService(requestId, status, user?.id!, note);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['schedule-requests', branchId] });
      toast.success(variables.status === 'approved' ? 'Solicitud aprobada' : 'Solicitud rechazada');
      setSelectedRequest(null);
      setResponseNote('');
      setActionType(null);
    },
    onError: () => {
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

  const getStatusBadge = (status: StatusType) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="w-3 h-3" />
            Pendiente
          </Badge>
        );
      case 'approved':
        return (
          <Badge className="gap-1 bg-success text-success-foreground">
            <CheckCircle2 className="w-3 h-3" />
            Aprobada
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="w-3 h-3" />
            Rechazada
          </Badge>
        );
    }
  };

  const handleAction = (request: ScheduleRequest, action: 'approve' | 'reject') => {
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

  if (!branchId) return null;

  return (
    <div className="space-y-6">
      <PageHelp pageId="local-requests" />

      <PageHeader
        title="Solicitudes"
        subtitle="Solicitudes de días libres, cambios de turno y justificativos"
      />

      {/* Read-only banner for Franquiciado */}
      {isFranquiciado && (
        <Alert>
          <Eye className="h-4 w-4" />
          <AlertTitle>Modo lectura</AlertTitle>
          <AlertDescription>
            Estás viendo las solicitudes en modo lectura. Solo el encargado puede aprobar o
            rechazar.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="w-4 h-4" />
            Pendientes
            {counts.pending > 0 && (
              <Badge variant="secondary" className="ml-1">
                {counts.pending}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">Aprobadas ({counts.approved})</TabsTrigger>
          <TabsTrigger value="rejected">Rechazadas ({counts.rejected})</TabsTrigger>
          <TabsTrigger value="all">Todas ({counts.all})</TabsTrigger>
        </TabsList>

        {isLoading ? (
          <div className="space-y-3 mt-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <Card className="mt-4">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <CalendarOff className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">
                Sin solicitudes {activeTab !== 'all' ? 'en este estado' : ''}
              </h3>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Las solicitudes de los empleados aparecerán aquí
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3 mt-4">
            {filteredRequests.map((request) => {
              const TypeIcon = getTypeIcon(request.request_type);
              const isJustification = request.request_type === 'absence_justification';
              const absenceLabel = getAbsenceTypeLabel(request.absence_type);
              const isPending = request.status === 'pending';

              return (
                <Card
                  key={request.id}
                  className={cn(
                    isJustification && isPending && 'border-amber-200 dark:border-amber-800',
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                            <span className="font-medium">
                              {request.profile?.full_name || 'Usuario'}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {getTypeLabel(request.request_type)}
                            </Badge>
                            {absenceLabel && (
                              <Badge variant="outline" className="text-xs">
                                {absenceLabel}
                              </Badge>
                            )}
                            {getStatusBadge(request.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(request.request_date), "EEEE d 'de' MMMM", {
                              locale: es,
                            })}
                          </p>
                          {request.reason && (
                            <p className="text-sm text-muted-foreground italic">
                              "{request.reason}"
                            </p>
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
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>
                              Solicitado:{' '}
                              {format(new Date(request.created_at), 'd MMM HH:mm', { locale: es })}
                            </span>
                            {request.responded_at && (
                              <span>
                                Respondido:{' '}
                                {format(new Date(request.responded_at), 'd MMM HH:mm', {
                                  locale: es,
                                })}
                              </span>
                            )}
                          </div>
                          {request.response_note && (
                            <p className="text-xs text-muted-foreground bg-muted p-2 rounded mt-1">
                              Nota: {request.response_note}
                            </p>
                          )}
                        </div>
                      </div>

                      {isPending && canManage && (
                        <div className="flex gap-2 sm:flex-shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive border-destructive/30 hover:bg-destructive/10"
                            onClick={() => handleAction(request, 'reject')}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Rechazar
                          </Button>
                          <Button
                            size="sm"
                            className="bg-success hover:bg-success/90"
                            onClick={() => handleAction(request, 'approve')}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Aprobar
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </Tabs>

      {/* Action Dialog */}
      <Dialog
        open={!!selectedRequest && !!actionType}
        onOpenChange={() => setSelectedRequest(null)}
      >
        <DialogContent className="sm:max-w-md">
          {selectedRequest && actionType && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {actionType === 'approve' ? 'Aprobar solicitud' : 'Rechazar solicitud'}
                </DialogTitle>
                <DialogDescription>
                  {selectedRequest.profile?.full_name} -{' '}
                  {getTypeLabel(selectedRequest.request_type)} para el{' '}
                  {format(new Date(selectedRequest.request_date), "EEEE d 'de' MMMM", {
                    locale: es,
                  })}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-4">
                {selectedRequest.reason && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Motivo:</p>
                    <p className="text-sm font-medium">"{selectedRequest.reason}"</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="responseNote">
                    {actionType === 'reject'
                      ? 'Motivo del rechazo (recomendado)'
                      : 'Nota (opcional)'}
                  </Label>
                  <Textarea
                    id="responseNote"
                    value={responseNote}
                    onChange={(e) => setResponseNote(e.target.value)}
                    placeholder={
                      actionType === 'reject'
                        ? 'Ej: No hay cobertura para ese día'
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
                    {actionType === 'approve' ? 'Confirmar aprobación' : 'Confirmar rechazo'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

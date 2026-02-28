import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchMyScheduleRequests } from '@/services/schedulesService';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { usePermissionsWithImpersonation } from '@/hooks/usePermissionsWithImpersonation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  CalendarClock,
  CheckCircle2,
  XCircle,
  Clock,
  CalendarOff,
  RefreshCw,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import RequestDayOffModal from './RequestDayOffModal';

interface ScheduleRequest {
  id: string;
  request_type: 'day_off' | 'shift_change' | 'other';
  request_date: string;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  response_note: string | null;
  created_at: string;
}

export default function MyRequestsCard() {
  const { id: userId } = useEffectiveUser();
  const { branchRoles } = usePermissionsWithImpersonation();

  // Franquiciados no solicitan días libres - ocultar si solo tiene ese rol
  const hasOnlyFranquiciado =
    branchRoles.length > 0 && branchRoles.every((r) => r.local_role === 'franquiciado');
  const { data: requests, isLoading } = useQuery({
    queryKey: ['my-schedule-requests', userId],
    queryFn: async () => {
      if (!userId) return [];
      return (await fetchMyScheduleRequests(userId)) as ScheduleRequest[];
    },
    enabled: !!userId,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="gap-1">
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
      default:
        return null;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'day_off':
        return CalendarOff;
      case 'shift_change':
        return RefreshCw;
      default:
        return HelpCircle;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'day_off':
        return 'Día libre';
      case 'shift_change':
        return 'Cambio turno';
      case 'other':
        return 'Otro';
      default:
        return type;
    }
  };

  // Franquiciados don't request days off
  if (hasOnlyFranquiciado) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const pendingCount = requests?.filter((r) => r.status === 'pending').length || 0;
  const [showAll, setShowAll] = useState(false);
  const displayedRequests = showAll ? requests : requests?.slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Mis Solicitudes</CardTitle>
            {pendingCount > 0 && (
              <Badge variant="secondary">
                {pendingCount} pendiente{pendingCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <RequestDayOffModal />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayedRequests && displayedRequests.length > 0 ? (
          <>
            {displayedRequests.map((request) => {
              const TypeIcon = getTypeIcon(request.request_type);

              return (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-background">
                      <TypeIcon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {getTypeLabel(request.request_type)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(request.request_date), 'EEE d MMM', { locale: es })}
                        </span>
                      </div>
                      {request.reason && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px] cursor-help">
                              {request.reason}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-xs">
                            <p>{request.reason}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {request.response_note && request.status === 'rejected' && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="text-xs text-destructive mt-1 truncate max-w-[200px] cursor-help">
                              Motivo: {request.response_note}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-xs">
                            <p>{request.response_note}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>

                  {getStatusBadge(request.status)}
                </div>
              );
            })}
            {requests && requests.length > 5 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2"
                onClick={() => setShowAll(!showAll)}
              >
                {showAll ? (
                  <>
                    <ChevronUp className="w-4 h-4 mr-1" /> Ver menos
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 mr-1" /> Ver todas ({requests.length})
                  </>
                )}
              </Button>
            )}
          </>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <CalendarClock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No tenés solicitudes recientes</p>
            <p className="text-xs mt-1">Usá el botón para pedir día libre o cambio de turno</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

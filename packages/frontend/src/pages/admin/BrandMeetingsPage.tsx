/**
 * BrandMeetingsPage - Vista consolidada de reuniones de toda la red v2.0
 *
 * Permite a Superadmins y Coordinadores:
 * - Ver todas las reuniones de todas las sucursales
 * - Filtrar por sucursal, área, estado y fecha
 * - Ver métricas: total mes, % lectura, alertas pendientes
 * - Crear reuniones de red
 */
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Calendar,
  Users,
  CheckCircle,
  AlertTriangle,
  MapPin,
  ChevronRight,
  Filter,
  Plus,
  Building2,
} from 'lucide-react';
import { fetchActiveBranches } from '@/services/adminService';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBrandMeetings, useBrandMeetingsStats, useMeetingDetail } from '@/hooks/useMeetings';
import { MeetingDetail, MeetingStatusBadge } from '@/components/meetings';
import { BrandMeetingConveneModal } from '@/components/meetings/BrandMeetingConveneModal';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { MEETING_AREAS, type MeetingStatus } from '@/types/meeting';

import { RequireBrandPermission } from '@/components/guards';

function BrandMeetingsPageContent() {
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [showConveneModal, setShowConveneModal] = useState(false);

  // Fetch branches for filter
  const { data: branches } = useQuery({
    queryKey: ['branches-for-filter'],
    queryFn: fetchActiveBranches,
  });

  const { data: meetings, isLoading: loadingMeetings } = useBrandMeetings();
  const { data: stats, isLoading: loadingStats } = useBrandMeetingsStats();
  const { data: meetingDetail } = useMeetingDetail(selectedMeetingId || undefined);

  // Filter meetings
  const filteredMeetings = useMemo(() => {
    if (!meetings) return [];

    return meetings.filter((meeting) => {
      if (selectedBranch !== 'all') {
        if (selectedBranch === 'network') {
          if (meeting.branch_id !== null) return false;
        } else if (meeting.branch_id !== selectedBranch) {
          return false;
        }
      }
      if (selectedArea !== 'all' && meeting.area !== selectedArea) {
        return false;
      }
      if (selectedStatus !== 'all' && meeting.status !== selectedStatus) {
        return false;
      }
      return true;
    });
  }, [meetings, selectedBranch, selectedArea, selectedStatus]);

  // Group meetings by date for display
  const groupedMeetings = useMemo(() => {
    const groups: Record<string, typeof filteredMeetings> = {};

    filteredMeetings.forEach((meeting) => {
      const dateKey = format(parseISO(meeting.scheduled_at || meeting.date), 'yyyy-MM-dd');
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(meeting);
    });

    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, items]) => ({
        date,
        dateLabel: format(parseISO(date), "EEEE d 'de' MMMM", { locale: es }),
        meetings: items,
      }));
  }, [filteredMeetings]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Reuniones de la Red"
          subtitle="Vista consolidada de todas las reuniones"
        />
        <Button onClick={() => setShowConveneModal(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Nueva Reunión de Red
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {loadingStats ? <Skeleton className="h-8 w-12" /> : stats?.totalMeetings || 0}
                </p>
                <p className="text-sm text-muted-foreground">reuniones este mes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Users className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex gap-3">
                <div>
                  <p className="text-lg font-bold text-amber-600">
                    {loadingStats ? <Skeleton className="h-6 w-8" /> : stats?.convocadas || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Convocadas</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-blue-600">
                    {loadingStats ? <Skeleton className="h-6 w-8" /> : stats?.enCurso || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">En curso</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {loadingStats ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    `${stats?.readPercentage || 0}%`
                  )}
                </p>
                <p className="text-sm text-muted-foreground">lectura confirmada</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stats?.alertCount ? 'bg-warning/10' : 'bg-muted'}`}>
                <AlertTriangle
                  className={`w-5 h-5 ${stats?.alertCount ? 'text-warning' : 'text-muted-foreground'}`}
                />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {loadingStats ? <Skeleton className="h-8 w-12" /> : stats?.alertCount || 0}
                </p>
                <p className="text-sm text-muted-foreground">
                  {stats?.alertCount === 1 ? 'sucursal pendiente' : 'sucursales pendientes'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtros:</span>
            </div>

            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sucursal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las sucursales</SelectItem>
                <SelectItem value="network">
                  <div className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    Reuniones de Red
                  </div>
                </SelectItem>
                {branches?.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="convocada">Convocada</SelectItem>
                <SelectItem value="en_curso">En Curso</SelectItem>
                <SelectItem value="cerrada">Cerrada</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedArea} onValueChange={setSelectedArea}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Área" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las áreas</SelectItem>
                {MEETING_AREAS.map((area) => (
                  <SelectItem key={area.value} value={area.value}>
                    {area.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(selectedBranch !== 'all' || selectedArea !== 'all' || selectedStatus !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedBranch('all');
                  setSelectedArea('all');
                  setSelectedStatus('all');
                }}
              >
                Limpiar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Meetings List */}
      <div className="space-y-6">
        {loadingMeetings ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : groupedMeetings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay reuniones registradas</p>
            </CardContent>
          </Card>
        ) : (
          groupedMeetings.map((group) => (
            <div key={group.date} className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground capitalize">
                {group.dateLabel}
              </h3>

              {group.meetings.map((meeting) => {
                const participants = meeting.participants || [];
                const presentCount = participants.filter((p: any) => p.was_present === true).length;
                const readCount = participants.filter((p: any) => p.read_at).length;
                const pendingCount = participants.length - readCount;
                const branch = meeting.branches as {
                  id: string;
                  name: string;
                  slug: string;
                } | null;
                const isNetworkMeeting = !meeting.branch_id;
                const status = (meeting.status || 'cerrada') as MeetingStatus;

                return (
                  <Card
                    key={meeting.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedMeetingId(meeting.id)}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1 flex-wrap">
                            {isNetworkMeeting ? (
                              <Badge variant="default" className="text-xs">
                                <Building2 className="w-3 h-3 mr-1" />
                                Red
                              </Badge>
                            ) : (
                              <>
                                <MapPin className="w-3.5 h-3.5" />
                                <span>{branch?.name || 'Sin sucursal'}</span>
                              </>
                            )}
                            <span>â€¢</span>
                            <span className="capitalize">{meeting.area}</span>
                            <span>â€¢</span>
                            <span>
                              {format(parseISO(meeting.scheduled_at || meeting.date), 'HH:mm')}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium truncate">{meeting.title}</h4>
                            <MeetingStatusBadge status={status} />
                          </div>

                          <div className="flex items-center gap-4 text-sm">
                            {status === 'cerrada' && (
                              <>
                                <span className="text-muted-foreground">
                                  {presentCount}/{participants.length} presentes
                                </span>
                                <span className="text-muted-foreground">â€¢</span>
                                <span className="text-muted-foreground">
                                  {readCount}/{participants.length} confirmaron lectura
                                </span>
                              </>
                            )}
                            {status === 'convocada' && (
                              <span className="text-muted-foreground">
                                {participants.length} convocados
                              </span>
                            )}
                            {status === 'en_curso' && (
                              <span className="text-blue-600">Reunión en progreso</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {status === 'cerrada' &&
                            (pendingCount > 0 ? (
                              <Badge
                                variant="outline"
                                className="text-warning border-warning/30 bg-warning/10"
                              >
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                {pendingCount} pendientes
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-success border-success/30 bg-success/10"
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Todos leyeron
                              </Badge>
                            ))}
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Meeting Detail Sheet */}
      <Sheet
        open={!!selectedMeetingId}
        onOpenChange={(open) => !open && setSelectedMeetingId(null)}
      >
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Detalle de Reunión</SheetTitle>
          </SheetHeader>
          {meetingDetail && (
            <div className="mt-6">
              <MeetingDetail
                meeting={meetingDetail}
                onBack={() => setSelectedMeetingId(null)}
                canTrackReads={true}
                canManage={true}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Convene Modal */}
      <BrandMeetingConveneModal open={showConveneModal} onOpenChange={setShowConveneModal} />
    </div>
  );
}

export default function BrandMeetingsPage() {
  return (
    <RequireBrandPermission
      permission="canManageMessages"
      noAccessMessage="No tenés permisos para gestionar reuniones de la red."
    >
      <BrandMeetingsPageContent />
    </RequireBrandPermission>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Bell,
  Info,
  AlertTriangle,
  AlertCircle,
  PartyPopper,
  ChevronRight,
  Megaphone,
  MessageSquare,
  CheckCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  useUserCommunications,
  useMarkAsRead,
  useConfirmCommunication,
  getTypeLabel,
  getTypeColor,
} from '@/hooks/useCommunications';
import type { CommunicationWithSource } from '@/types/communications';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useState } from 'react';
import { toast } from 'sonner';

const TYPE_ICONS = {
  info: Info,
  warning: AlertTriangle,
  urgent: AlertCircle,
  celebration: PartyPopper,
};

interface MyCommunicationsCardProps {
  showOnlyBrand?: boolean;
}

export default function MyCommunicationsCard({ showOnlyBrand = false }: MyCommunicationsCardProps) {
  const { data, isLoading } = useUserCommunications();
  const markAsRead = useMarkAsRead();
  const confirmMutation = useConfirmCommunication();
  const [selectedComm, setSelectedComm] = useState<CommunicationWithSource | null>(null);

  const brandComms = data?.brand || [];
  const localComms = showOnlyBrand ? [] : data?.local || [];
  const brandUnread = brandComms.filter((c) => !c.is_read).length;
  const localUnread = localComms.filter((c) => !c.is_read).length;

  const handleOpen = async (comm: CommunicationWithSource) => {
    setSelectedComm(comm);
    if (!comm.is_read) {
      await markAsRead.mutateAsync(comm.id);
    }
  };

  const handleConfirm = async (commId: string) => {
    try {
      // First mark as read if not already
      if (!selectedComm?.is_read) {
        await markAsRead.mutateAsync(commId);
      }
      // Update local state to show "Cerrar" button
      if (selectedComm?.id === commId) {
        setSelectedComm((prev) => (prev ? { ...prev, is_read: true } : null));
      }
      toast.success('Lectura confirmada');
    } catch {
      toast.error('Error al confirmar');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Comunicados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderCommList = (
    comms: CommunicationWithSource[],
    icon: React.ReactNode,
    title: string,
    unread: number,
  ) => {
    if (comms.length === 0) return null;

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {icon}
          <span>{title}</span>
          {unread > 0 && (
            <Badge variant="destructive" className="text-xs px-1.5 py-0">
              {unread}
            </Badge>
          )}
        </div>
        {comms.slice(0, 3).map((comm) => {
          const TypeIcon = TYPE_ICONS[comm.type as keyof typeof TYPE_ICONS] || Info;
          const needsConfirmation = comm.requires_confirmation && !comm.is_confirmed;

          return (
            <button
              key={comm.id}
              onClick={() => handleOpen(comm)}
              className={`w-full p-3 rounded-lg border text-left transition-colors hover:bg-muted/50 ${
                !comm.is_read ? 'bg-primary/5 border-primary/20' : 'border-border'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-1.5 rounded ${getTypeColor(comm.type)}`}>
                  <TypeIcon className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-medium truncate ${!comm.is_read ? 'text-foreground' : 'text-muted-foreground'}`}
                    >
                      {comm.title}
                    </span>
                    {!comm.is_read && (
                      <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                    )}
                    {needsConfirmation && (
                      <Badge
                        variant="outline"
                        className="text-xs px-1.5 py-0 border-orange-300 text-orange-600"
                      >
                        Confirmar
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(comm.published_at), 'd MMM', { locale: es })}
                    {comm.branch_name && ` • ${comm.branch_name}`}
                  </p>
                </div>

                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  const hasAny = brandComms.length > 0 || localComms.length > 0;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Comunicados
            {brandUnread + localUnread > 0 && (
              <Badge variant="destructive" className="ml-auto">
                {brandUnread + localUnread} sin leer
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasAny ? (
            <div className="space-y-4">
              {renderCommList(
                brandComms,
                <Megaphone className="w-4 h-4" />,
                'De la Marca',
                brandUnread,
              )}
              {!showOnlyBrand &&
                renderCommList(
                  localComms,
                  <MessageSquare className="w-4 h-4" />,
                  'De tu Encargado',
                  localUnread,
                )}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">No hay comunicados</p>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedComm} onOpenChange={(open) => !open && setSelectedComm(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
          {selectedComm && (
            <>
              <DialogHeader className="flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getTypeColor(selectedComm.type)}`}>
                    {(() => {
                      const Icon = TYPE_ICONS[selectedComm.type as keyof typeof TYPE_ICONS] || Info;
                      return <Icon className="w-5 h-5" />;
                    })()}
                  </div>
                  <div>
                    <DialogTitle>{selectedComm.title}</DialogTitle>
                    <p className="text-sm text-muted-foreground">
                      {format(
                        new Date(selectedComm.published_at),
                        "EEEE d 'de' MMMM 'a las' HH:mm",
                        { locale: es },
                      )}
                    </p>
                  </div>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto py-4 min-h-0">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{selectedComm.body}</p>
              </div>

              <div className="flex-shrink-0 flex items-center justify-between pt-4 border-t">
                <div className="flex gap-2">
                  <Badge variant="secondary">{getTypeLabel(selectedComm.type)}</Badge>
                  {selectedComm.source_type === 'local' && selectedComm.branch_name && (
                    <Badge variant="outline">{selectedComm.branch_name}</Badge>
                  )}
                </div>

                {selectedComm.is_read ? (
                  <Button size="sm" variant="outline" onClick={() => setSelectedComm(null)}>
                    Cerrar
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleConfirm(selectedComm.id)}
                    disabled={confirmMutation.isPending || markAsRead.isPending}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Confirmar Lectura
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

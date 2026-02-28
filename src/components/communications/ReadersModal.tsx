import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, Eye, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { fetchCommunicationReaders } from '@/services/communicationsService';

interface ReadersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communicationId: string | null;
  communicationTitle: string;
  requiresConfirmation?: boolean;
}

export default function ReadersModal({
  open,
  onOpenChange,
  communicationId,
  communicationTitle,
  requiresConfirmation = false,
}: ReadersModalProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['communication-readers', communicationId],
    queryFn: async () => {
      if (!communicationId) return { readers: [], totalTargeted: 0 };
      return fetchCommunicationReaders(communicationId);
    },
    enabled: open && !!communicationId,
  });

  const readCount = data?.readers.length || 0;
  const confirmedCount = data?.readers.filter((r) => r.confirmed_at).length || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="pr-8">
            Lecturas: "{communicationTitle.substring(0, 40)}
            {communicationTitle.length > 40 ? '...' : ''}"
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : data?.readers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Eye className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nadie ha leído este comunicado aún</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-auto">
              {data?.readers.map((reader) => (
                <div
                  key={reader.user_id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={reader.profile?.avatar_url || ''} />
                    <AvatarFallback>
                      {reader.profile?.full_name?.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {reader.profile?.full_name || 'Usuario'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {reader.read_at
                        ? `Leído ${formatDistanceToNow(new Date(reader.read_at), { addSuffix: true, locale: es })}`
                        : 'Sin leer'}
                    </p>
                  </div>

                  {requiresConfirmation ? (
                    reader.confirmed_at ? (
                      <Badge variant="default" className="bg-green-600">
                        <Check className="h-3 w-3 mr-1" />
                        Confirmó
                      </Badge>
                    ) : reader.read_at ? (
                      <Badge variant="secondary">
                        <Eye className="h-3 w-3 mr-1" />
                        Leyó
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        <Clock className="h-3 w-3 mr-1" />
                        Pendiente
                      </Badge>
                    )
                  ) : (
                    <Badge variant="secondary">
                      <Check className="h-3 w-3 mr-1" />
                      Leído
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary footer */}
        <div className="flex items-center justify-between pt-4 border-t text-sm text-muted-foreground">
          <span>{readCount} lecturas</span>
          {requiresConfirmation && <span>{confirmedCount} confirmaciones</span>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

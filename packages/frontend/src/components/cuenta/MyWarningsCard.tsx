/**
 * MyWarningsCard - Vista de apercibimientos para empleados en Mi Cuenta
 * Fase 6: Con descarga de documento firmado
 */
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { usePermissionsWithImpersonation } from '@/hooks/usePermissionsWithImpersonation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchMyWarnings, acknowledgeWarning } from '@/services/warningsService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Calendar, Eye, EyeOff, FileText, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface Warning {
  id: string;
  warning_type: string;
  description: string;
  warning_date: string;
  acknowledged_at: string | null;
  signed_document_url: string | null;
  issuer?: { full_name: string };
}

const WARNING_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  verbal: { label: 'Verbal', color: 'bg-warning/15 text-warning-foreground border-warning/30' },
  written: { label: 'Escrito', color: 'bg-accent/15 text-accent border-accent/30' },
  lateness: { label: 'Llegada tarde', color: 'bg-info/15 text-info border-info/30' },
  absence: {
    label: 'Inasistencia',
    color: 'bg-destructive/15 text-destructive border-destructive/30',
  },
  suspension: {
    label: 'Suspensión',
    color: 'bg-destructive/20 text-destructive border-destructive/40',
  },
  other: { label: 'Otro', color: 'bg-muted text-muted-foreground border-border' },
};

export default function MyWarningsCard() {
  const { id: userId } = useEffectiveUser();
  const { branchRoles } = usePermissionsWithImpersonation();
  const queryClient = useQueryClient();

  // Franquiciados don't receive warnings - hide if only has that role
  const hasOnlyFranquiciado =
    branchRoles.length > 0 && branchRoles.every((r) => r.local_role === 'franquiciado');

  const { data: warnings, isLoading } = useQuery({
    queryKey: ['my-warnings', userId],
    queryFn: async () => {
      if (!userId) return [];
      return fetchMyWarnings(userId) as Promise<Warning[]>;
    },
    enabled: !!userId,
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (warningId: string) => acknowledgeWarning(warningId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-warnings'] });
      toast.success('Apercibimiento marcado como visto');
    },
    onError: () => {
      toast.error('Error al marcar como visto');
    },
  });

  const getTypeBadge = (type: string) => {
    const config = WARNING_TYPE_LABELS[type] || WARNING_TYPE_LABELS.other;
    return (
      <Badge variant="outline" className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const unreadCount = warnings?.filter((w) => !w.acknowledged_at).length || 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Don't show for franchisees or if no warnings
  if (hasOnlyFranquiciado || !warnings || warnings.length === 0) {
    return null;
  }

  return (
    <Card className={unreadCount > 0 ? 'border-warning/40 bg-warning/5' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle
              className={`w-5 h-5 ${unreadCount > 0 ? 'text-warning-foreground' : 'text-muted-foreground'}`}
            />
            <CardTitle className="text-lg">Mis Apercibimientos</CardTitle>
          </div>
          {unreadCount > 0 && <Badge variant="destructive">{unreadCount} sin ver</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {warnings.map((warning) => (
          <div
            key={warning.id}
            className={`p-3 rounded-lg border ${
              !warning.acknowledged_at
                ? 'bg-warning/5 border-warning/20'
                : 'bg-muted/50 border-muted'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {getTypeBadge(warning.warning_type)}
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(warning.warning_date), "d 'de' MMMM yyyy", { locale: es })}
                  </span>
                </div>
                <p className="text-sm">{warning.description}</p>
                {warning.issuer && (
                  <p className="text-xs text-muted-foreground">Por: {warning.issuer.full_name}</p>
                )}

                {/* Signed document link */}
                {warning.signed_document_url && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-primary gap-1"
                    onClick={() => window.open(warning.signed_document_url!, '_blank')}
                  >
                    <FileText className="w-3 h-3" />
                    Ver documento firmado
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                )}
              </div>

              <div className="flex-shrink-0">
                {warning.acknowledged_at ? (
                  <Badge variant="secondary" className="gap-1">
                    <Eye className="w-3 h-3" />
                    Visto
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => acknowledgeMutation.mutate(warning.id)}
                    disabled={acknowledgeMutation.isPending}
                    className="gap-1"
                  >
                    <EyeOff className="w-3 h-3" />
                    Marcar visto
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

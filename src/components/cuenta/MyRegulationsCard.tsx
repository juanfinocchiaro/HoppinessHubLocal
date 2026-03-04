import { useState } from 'react';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { useQuery } from '@tanstack/react-query';
import {
  fetchUserLocalRoles,
  fetchLatestRegulation,
  fetchRegulationSignature,
  fetchRegulationSignatureHistory,
  getStorageSignedUrl,
} from '@/services/hrService';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Download, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type LocalRole = string;

export default function MyRegulationsCard() {
  const { id: userId } = useEffectiveUser();
  const [expanded, setExpanded] = useState(false);

  // Check if user only has franchisee role (franchisees don't need to sign regulations)
  const { data: userLocalRoles = [] } = useQuery({
    queryKey: ['my-local-roles', userId],
    queryFn: async () => {
      if (!userId) return [];
      return fetchUserLocalRoles(userId) as Promise<LocalRole[]>;
    },
    enabled: !!userId,
  });

  const isOnlyFranquiciado =
    userLocalRoles.length > 0 && userLocalRoles.every((role) => role === 'franquiciado');

  // Fetch latest regulation
  const { data: latestRegulation } = useQuery({
    queryKey: ['latest-regulation'],
    queryFn: () => fetchLatestRegulation(),
  });

  // Fetch user's signature for latest regulation
  const { data: mySignature } = useQuery({
    queryKey: ['my-regulation-signature', userId, latestRegulation?.id],
    queryFn: async () => {
      if (!userId || !latestRegulation) return null;
      return fetchRegulationSignature(userId, latestRegulation.id);
    },
    enabled: !!userId && !!latestRegulation,
  });

  // Fetch all my signatures history
  const { data: signatureHistory = [] } = useQuery({
    queryKey: ['my-regulation-history', userId],
    queryFn: async () => {
      if (!userId) return [];
      return fetchRegulationSignatureHistory(userId);
    },
    enabled: !!userId && expanded,
  });

  const handleDownloadRegulation = async () => {
    if (!latestRegulation?.pdf_url) return;
    const signedUrl = await getStorageSignedUrl('regulations', latestRegulation.pdf_url);
    if (signedUrl) window.open(signedUrl, '_blank');
  };

  const handleViewSignature = async (url: string) => {
    const signedUrl = await getStorageSignedUrl('regulation-signatures', url);
    if (signedUrl) window.open(signedUrl, '_blank');
  };

  if (isOnlyFranquiciado) return null;

  if (!latestRegulation) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Reglamento Interno</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay reglamento publicado actualmente
          </p>
        </CardContent>
      </Card>
    );
  }

  const isSigned = !!mySignature;
  const daysSincePublished = latestRegulation.published_at
    ? Math.floor(
        (Date.now() - new Date(latestRegulation.published_at).getTime()) / (1000 * 60 * 60 * 24),
      )
    : 0;
  const daysRemaining = Math.max(0, 5 - daysSincePublished);
  const isOverdue = daysSincePublished > 5 && !isSigned;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Reglamento Interno</CardTitle>
          </div>
          {isSigned ? (
            <Badge variant="success">
              <CheckCircle className="w-3 h-3 mr-1" />
              Firmado
            </Badge>
          ) : isOverdue ? (
            <Badge variant="destructive">
              <AlertCircle className="w-3 h-3 mr-1" />
              Vencido
            </Badge>
          ) : (
            <Badge variant="warning">
              <AlertCircle className="w-3 h-3 mr-1" />
              Pendiente ({daysRemaining}d)
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Regulation */}
        <div className="p-3 bg-muted rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Versión {latestRegulation.version}</p>
              <p className="text-sm text-muted-foreground">{latestRegulation.title}</p>
              {latestRegulation.published_at && (
                <p className="text-xs text-muted-foreground mt-1">
                  Publicado{' '}
                  {format(new Date(latestRegulation.published_at), "d 'de' MMMM yyyy", {
                    locale: es,
                  })}
                </p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={handleDownloadRegulation}>
              <Download className="w-4 h-4 mr-1" />
              Ver PDF
            </Button>
          </div>
        </div>

        {/* Signature Status */}
        {isSigned && mySignature && (
          <div className="p-3 border rounded-lg bg-success/5 border-success/20">
            <p className="text-sm font-medium text-success">
              ✓ Firmado el{' '}
              {format(new Date(mySignature.signed_at), "d/MM/yyyy 'a las' HH:mm", { locale: es })}
            </p>
            {mySignature.signed_document_url && (
              <Button
                variant="link"
                size="sm"
                className="p-0 h-auto text-success"
                onClick={() => handleViewSignature(mySignature.signed_document_url!)}
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Ver documento firmado
              </Button>
            )}
          </div>
        )}

        {!isSigned && (
          <div
            className={`p-3 border rounded-lg ${isOverdue ? 'bg-destructive/5 border-destructive/20' : 'bg-warning/10 border-warning/20'}`}
          >
            <p className={`text-sm ${isOverdue ? 'text-destructive' : 'text-warning-foreground'}`}>
              {isOverdue
                ? '⚠️ Tu firma está vencida. Contactá a tu encargado para regularizar tu situación.'
                : `📝 Tenés ${daysRemaining} día${daysRemaining !== 1 ? 's' : ''} para firmar el reglamento. Tu encargado debe cargar la foto del documento firmado.`}
            </p>
          </div>
        )}

        {/* History Toggle */}
        <Button variant="ghost" size="sm" className="w-full" onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Ocultar historial' : 'Ver historial de firmas'}
        </Button>

        {/* Signature History */}
        {expanded && signatureHistory.length > 0 && (
          <ScrollArea className="h-40">
            <div className="space-y-2">
              {signatureHistory.map((sig) => (
                <div
                  key={sig.id}
                  className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm"
                >
                  <div>
                    <span className="font-medium">v{sig.regulation_version || '?'}</span>
                    <span className="text-muted-foreground ml-2">
                      {format(new Date(sig.signed_at), 'd/MM/yyyy')}
                    </span>
                  </div>
                  {sig.signed_document_url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewSignature(sig.signed_document_url!)}
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

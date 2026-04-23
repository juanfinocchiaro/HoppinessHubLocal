import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAllRegulations, fetchRegulationSignatureStats, uploadRegulationPdf, deactivateAllRegulations, createRegulation, getRegulationSignedUrl } from '@/services/adminService';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { FileText, Upload, Plus, CheckCircle, Clock, Eye, History } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function RegulationsManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Fetch all regulations
  const { data: regulations = [] } = useQuery({
    queryKey: ['all-regulations'],
    queryFn: fetchAllRegulations,
  });

  // Fetch signature stats for latest regulation
  const latestRegulation = regulations[0];
  const { data: signatureStats } = useQuery({
    queryKey: ['regulation-signature-stats', latestRegulation?.id],
    queryFn: () => fetchRegulationSignatureStats(latestRegulation!.id),
    enabled: !!latestRegulation,
  });

  const handleUploadNewRegulation = async () => {
    if (!selectedFile || !newTitle || !user) return;

    setUploading(true);
    try {
      // Calculate next version
      const nextVersion = (regulations[0]?.version || 0) + 1;

      const filePath = `v${nextVersion}_${Date.now()}.pdf`;
      await uploadRegulationPdf(filePath, selectedFile);
      await deactivateAllRegulations();
      await createRegulation({
        version: nextVersion,
        title: newTitle,
        description: newDescription || null,
        pdf_url: filePath,
        document_url: filePath,
        published_at: new Date().toISOString(),
        is_active: true,
        created_by: user.id,
      });

      toast.success(`Reglamento v${nextVersion} publicado correctamente`);
      queryClient.invalidateQueries({ queryKey: ['all-regulations'] });
      setShowNewDialog(false);
      setNewTitle('');
      setNewDescription('');
      setSelectedFile(null);
    } catch (error: any) {
      toast.error('Error al publicar: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleViewPdf = async (pdfUrl: string | null) => {
    if (!pdfUrl) return;
    const signedUrl = await getRegulationSignedUrl(pdfUrl);
    if (signedUrl) {
      window.open(signedUrl, '_blank');
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Reglamento Interno
              </CardTitle>
              <CardDescription>Gestión de versiones del reglamento de la marca</CardDescription>
            </div>
            <Button onClick={() => setShowNewDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva versión
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Version Summary */}
          {latestRegulation && (
            <div className="p-4 border rounded-lg bg-primary/5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge>Versión actual: {latestRegulation.version}</Badge>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Activo
                    </Badge>
                  </div>
                  <h3 className="font-medium">{latestRegulation.title}</h3>
                  {latestRegulation.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {latestRegulation.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Publicado{' '}
                    {format(
                      new Date(latestRegulation.published_at || latestRegulation.created_at),
                      "d 'de' MMMM yyyy",
                      { locale: es },
                    )}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleViewPdf(latestRegulation.pdf_url || latestRegulation.document_url)
                  }
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Ver PDF
                </Button>
              </div>

              {/* Signature Progress */}
              {signatureStats && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span>Firmas recolectadas</span>
                    <span className="font-medium">
                      {signatureStats.signed} / {signatureStats.total}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{
                        width: `${signatureStats.total > 0 ? (signatureStats.signed / signatureStats.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  {signatureStats.signed < signatureStats.total && (
                    <p className="text-xs text-muted-foreground mt-2">
                      ⚠️ {signatureStats.total - signatureStats.signed} empleados pendientes de
                      firmar
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Version History */}
          <div>
            <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
              <History className="w-4 h-4" />
              Historial de versiones
            </h3>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {regulations.map((reg) => (
                  <div
                    key={reg.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      reg.is_active ? 'bg-emerald-50/50 border-emerald-200' : 'bg-muted/30'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">v{reg.version}</span>
                        {reg.is_active && (
                          <Badge variant="outline" className="text-xs">
                            Actual
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{reg.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(reg.published_at || reg.created_at), 'd/MM/yyyy')}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewPdf(reg.pdf_url || reg.document_url)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>

      {/* New Version Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publicar nueva versión del reglamento</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                placeholder="Ej: Actualización horarios de verano"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Textarea
                id="description"
                placeholder="Breve descripción de los cambios..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pdf-file">Archivo PDF *</Label>
              <Input
                id="pdf-file"
                type="file"
                accept=".pdf"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
            </div>

            {selectedFile && (
              <div className="p-2 bg-muted rounded text-sm">
                📄 {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            )}

            <div className="p-3 bg-amber-50 rounded-lg text-sm text-amber-700">
              ⚠️ Al publicar una nueva versión, todos los empleados deberán firmarla en un plazo de
              5 días.
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleUploadNewRegulation}
              disabled={!selectedFile || !newTitle || uploading}
            >
              {uploading ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Publicando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Publicar reglamento
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

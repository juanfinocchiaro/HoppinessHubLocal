import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchLatestRegulation,
  fetchBranchNameById,
  fetchBranchTeamRolesForRegulation,
  fetchProfilesByIds,
  fetchEmployeeDataByBranchAndUsers,
  fetchRegulationSignatures,
  uploadRegulationSignatureFile,
  insertRegulationSignature,
  getRegulationDocumentUrl,
} from '@/services/profileService';
import { useAuth } from '@/hooks/useAuth';
import { useDynamicPermissions } from '@/hooks/useDynamicPermissions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  FileText,
  Upload,
  CheckCircle,
  AlertCircle,
  Clock,
  Camera,
  User,
  Printer,
  Eye,
  ExternalLink,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

import { RegulationSignatureSheet } from './RegulationSignatureSheet';

interface RegulationSignaturesPanelProps {
  branchId: string;
}

interface TeamMemberSignature {
  user_id: string;
  full_name: string;
  local_role: string;
  dni?: string;
  signature: {
    id: string;
    signed_at: string;
    signed_document_url: string | null;
  } | null;
}

export default function RegulationSignaturesPanel({ branchId }: RegulationSignaturesPanelProps) {
  const { user } = useAuth();
  const { local } = useDynamicPermissions(branchId);
  const queryClient = useQueryClient();
  const [uploadingFor, setUploadingFor] = useState<TeamMemberSignature | null>(null);
  const [previewFor, setPreviewFor] = useState<TeamMemberSignature | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch latest regulation
  const { data: latestRegulation } = useQuery({
    queryKey: ['latest-regulation'],
    queryFn: fetchLatestRegulation,
  });

  // Fetch branch name
  const { data: branch } = useQuery({
    queryKey: ['branch-name', branchId],
    queryFn: () => fetchBranchNameById(branchId),
  });

  // Fetch team members with their signature status
  const { data: teamSignatures = [] } = useQuery({
    queryKey: ['team-regulation-signatures', branchId, latestRegulation?.version],
    queryFn: async () => {
      if (!latestRegulation) return [];

      const roles = await fetchBranchTeamRolesForRegulation(branchId);
      if (!roles.length) return [];

      const userIds = roles.map((r) => r.user_id);

      const [profiles, employeeData, signatures] = await Promise.all([
        fetchProfilesByIds(userIds),
        fetchEmployeeDataByBranchAndUsers(branchId, userIds),
        fetchRegulationSignatures(latestRegulation.id, userIds),
      ]);

      const signaturesMap = new Map(signatures.map((s) => [s.user_id, s]));
      const profilesMap = new Map(profiles.map((p) => [p.id, p]));
      const employeeDataMap = new Map(employeeData.map((e) => [e.user_id, e]));

      return roles.map((role) => ({
        user_id: role.user_id,
        full_name: profilesMap.get(role.user_id)?.full_name || 'Sin nombre',
        local_role: role.local_role,
        dni: employeeDataMap.get(role.user_id)?.dni || undefined,
        signature: signaturesMap.get(role.user_id) || null,
      })) as TeamMemberSignature[];
    },
    enabled: !!latestRegulation,
  });

  const handleUploadSignature = async () => {
    if (!uploadingFor || !selectedFile || !user || !latestRegulation) return;

    setUploading(true);
    try {
      const filePath = `${uploadingFor.user_id}/${latestRegulation.version}_${Date.now()}.jpg`;
      await uploadRegulationSignatureFile(filePath, selectedFile);

      await insertRegulationSignature({
        user_id: uploadingFor.user_id,
        regulation_id: latestRegulation.id,
        regulation_version: latestRegulation.version,
        signed_document_url: filePath,
        signed_at: new Date().toISOString(),
        uploaded_by: user.id,
        branch_id: branchId,
      });

      toast.success(`Firma de ${uploadingFor.full_name} registrada correctamente`);
      queryClient.invalidateQueries({ queryKey: ['team-regulation-signatures'] });
      setUploadingFor(null);
      setSelectedFile(null);
    } catch (error: any) {
      toast.error('Error al subir la firma: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('No se pudo abrir la ventana de impresión');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Constancia de Firma - ${previewFor?.full_name}</title>
          <style>
            @page {
              size: A4;
              margin: 15mm;
            }
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: Arial, sans-serif;
              font-size: 12pt;
              line-height: 1.6;
              color: #000;
              background: #fff;
            }
            
            img {
              max-height: 64px;
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  if (!latestRegulation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Firmas de Reglamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No hay reglamento activo. El superadmin debe subir uno desde Mi Marca.
          </p>
        </CardContent>
      </Card>
    );
  }

  const daysSincePublished = latestRegulation.published_at
    ? differenceInDays(new Date(), new Date(latestRegulation.published_at))
    : 0;

  const pendingSignatures = teamSignatures.filter((m) => !m.signature);
  const signedCount = teamSignatures.length - pendingSignatures.length;

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      encargado: 'Encargado',
      contador_local: 'Contador',
      cajero: 'Cajero',
      empleado: 'Empleado',
    };
    return labels[role] || role;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Firmas de Reglamento
              </CardTitle>
              <CardDescription>
                Versión {latestRegulation.version}: {latestRegulation.title}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {latestRegulation.document_url && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const url = getRegulationDocumentUrl(latestRegulation.document_url);
                    window.open(url, '_blank');
                  }}
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Ver PDF
                </Button>
              )}
              <Badge variant={pendingSignatures.length > 0 ? 'secondary' : 'outline'}>
                {signedCount}/{teamSignatures.length} firmados
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Alert for pending signatures */}
          {pendingSignatures.length > 0 && (
            <div
              className={`p-3 rounded-lg flex items-start gap-2 ${daysSincePublished > 5 ? 'bg-destructive/5 text-destructive dark:bg-destructive/10' : 'bg-warning/10 text-warning-foreground dark:bg-warning/15'}`}
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">
                  {pendingSignatures.length} empleado{pendingSignatures.length !== 1 ? 's' : ''} sin
                  firmar
                </p>
                <p className="text-sm">
                  {daysSincePublished > 5
                    ? 'El plazo de 5 días ha vencido. Los empleados sin firma no podrán fichar.'
                    : `Quedan ${5 - daysSincePublished} día${5 - daysSincePublished !== 1 ? 's' : ''} de plazo.`}
                </p>
              </div>
            </div>
          )}

          {/* Team list - no scroll if few items */}
          <div className="space-y-2">
            {teamSignatures.map((member) => (
              <div
                key={member.user_id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  member.signature
                    ? 'bg-success/5 border-success/20 dark:bg-success/10 dark:border-success/20'
                    : 'bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      member.signature
                        ? 'bg-success/15 text-success dark:bg-success/20'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {member.signature ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{member.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {getRoleLabel(member.local_role)}
                    </p>
                  </div>
                </div>

                {member.signature ? (
                  <div className="text-right">
                    <Badge variant="success">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Firmado
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(member.signature.signed_at), 'd/MM/yyyy')}
                    </p>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    {local.canUploadSignature && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPreviewFor(member)}
                          title="Generar hoja de firma para imprimir"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Hoja firma
                        </Button>
                        <Button size="sm" variant="default" onClick={() => setUploadingFor(member)}>
                          <Camera className="w-4 h-4 mr-1" />
                          Subir firma
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={!!uploadingFor} onOpenChange={(open) => !open && setUploadingFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subir firma de {uploadingFor?.full_name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Subí una foto de la hoja de constancia firmada físicamente por el empleado.
            </p>

            <div className="space-y-2">
              <Label htmlFor="signature-file">Foto del documento firmado</Label>
              <Input
                id="signature-file"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
            </div>

            {selectedFile && (
              <div className="p-2 bg-muted rounded text-sm">📎 {selectedFile.name}</div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadingFor(null)}>
              Cancelar
            </Button>
            <Button onClick={handleUploadSignature} disabled={!selectedFile || uploading}>
              {uploading ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Confirmar firma
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview/Print Dialog */}
      <Dialog open={!!previewFor} onOpenChange={(open) => !open && setPreviewFor(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Hoja de Constancia de Firma - {previewFor?.full_name}</DialogTitle>
          </DialogHeader>

          <div className="border rounded-lg overflow-hidden shadow-sm">
            {previewFor && latestRegulation && (
              <RegulationSignatureSheet
                ref={printRef}
                data={{
                  employeeName: previewFor.full_name,
                  employeeDni: previewFor.dni,
                  employeeRole: getRoleLabel(previewFor.local_role),
                  branchName: branch?.name || 'Sucursal',
                  regulationVersion: latestRegulation.version,
                  regulationTitle: latestRegulation.title,
                  publishedAt: latestRegulation.published_at || latestRegulation.created_at,
                  referenceId: `REG-V${latestRegulation.version}-${previewFor.user_id.slice(0, 8).toUpperCase()}`,
                }}
              />
            )}
          </div>

          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => setPreviewFor(null)}>
              Cerrar
            </Button>
            <Button
              variant="secondary"
              onClick={handlePrint}
              title="Podés elegir 'Guardar como PDF' en el diálogo de impresión"
            >
              <Printer className="w-4 h-4 mr-2" />
              Descargar / Imprimir
            </Button>
            <Button
              onClick={() => {
                setUploadingFor(previewFor);
                setPreviewFor(null);
              }}
            >
              <Camera className="w-4 h-4 mr-2" />
              Subir firma
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

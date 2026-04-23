import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/ui/status-badge';
import { LoadingButton } from '@/components/ui/loading-button';
import { DangerConfirmDialog } from '@/components/ui/danger-confirm-dialog';
import {
  Shield,
  Download,
  Upload,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Info,
} from 'lucide-react';
import { generateArcaCertificate, downloadCSR } from '@/lib/arca-cert-generator';
import type { AfipConfig } from '@/hooks/useAfipConfig';
import { toast } from 'sonner';

interface ArcaCertificateWizardProps {
  config: AfipConfig | null;
  branchId: string;
  cuit: string;
  razonSocial: string;
  onSaveKeyAndCSR: (data: {
    branch_id: string;
    privateKeyPem: string;
    csrPem: string;
  }) => Promise<void>;
  onSaveCertificate: (data: { branch_id: string; certificado_crt: string }) => Promise<void>;
  onTestConnection: () => void;
  isSavingKey: boolean;
  isSavingCert: boolean;
  isTestingConnection: boolean;
}

export function ArcaCertificateWizard({
  config,
  branchId,
  cuit,
  razonSocial,
  onSaveKeyAndCSR,
  onSaveCertificate,
  onTestConnection,
  isSavingKey,
  isSavingCert,
  isTestingConnection,
}: ArcaCertificateWizardProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCrtUpload, setShowCrtUpload] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);

  const estado = config?.estado_certificado || 'sin_configurar';

  const handleGenerate = async () => {
    if (!cuit || !razonSocial) {
      toast.error('Completá CUIT y Razón Social en los datos fiscales antes de generar');
      return;
    }

    setIsGenerating(true);
    try {
      await new Promise((r) => setTimeout(r, 50));
      const { privateKeyPem, csrPem } = generateArcaCertificate({ cuit, razonSocial });
      await onSaveKeyAndCSR({ branch_id: branchId, privateKeyPem, csrPem });
      downloadCSR(csrPem, cuit);
    } catch (err: any) {
      toast.error(`Error al generar: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRedownloadCSR = () => {
    if (config?.csr_pem && cuit) {
      downloadCSR(config.csr_pem, cuit);
      toast.success('Archivo .csr descargado');
    }
  };

  const handleCrtUpload = async (file: File) => {
    const text = await file.text();
    await onSaveCertificate({ branch_id: branchId, certificado_crt: text });
    toast.success('Certificado subido, probando conexión...');
    setTimeout(() => onTestConnection(), 500);
  };

  const handleRegenerate = () => {
    setShowRegenerateConfirm(true);
  };

  const confirmRegenerate = () => {
    setShowRegenerateConfirm(false);
    handleGenerate();
  };

  // Estado: sin_configurar → Paso 1
  if (estado === 'sin_configurar') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Certificado ARCA
            <StatusBadge variant="inactive">Sin configurar</StatusBadge>
          </CardTitle>
          <CardDescription>
            Generá automáticamente la solicitud de certificado para conectar con ARCA
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">CUIT</Label>
              <p className="text-sm font-medium">
                {cuit || <span className="text-destructive">No configurado</span>}
              </p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Razón Social</Label>
              <p className="text-sm font-medium">
                {razonSocial || <span className="text-destructive">No configurada</span>}
              </p>
            </div>
          </div>

          {(!cuit || !razonSocial) && (
            <div className="flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-900/50 dark:bg-orange-900/10">
              <Info className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
              <p className="text-sm text-orange-700 dark:text-orange-400">
                Completá el CUIT y Razón Social en la sección de Datos Fiscales antes de continuar.
              </p>
            </div>
          )}

          <LoadingButton
            onClick={handleGenerate}
            loading={isGenerating || isSavingKey}
            loadingText="Generando solicitud..."
            disabled={!cuit || !razonSocial}
            className="w-full"
          >
            <Shield className="mr-2 h-4 w-4" />
            Generar solicitud de certificado
          </LoadingButton>

          <p className="text-xs text-muted-foreground text-center">
            Se generará una clave privada segura y un archivo .csr para subir a ARCA
          </p>
        </CardContent>
      </Card>
    );
  }

  // Estado: csr_generado → Paso 2 + 3
  if (estado === 'csr_generado' || estado === 'certificado_subido') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Certificado ARCA
            <StatusBadge variant="pending">Pendiente de certificado</StatusBadge>
          </CardTitle>
          <CardDescription>
            Subí la solicitud a ARCA y después cargá el certificado que te devuelvan
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Paso 2: Instrucciones */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                1
              </span>
              Subí el archivo .csr al portal de ARCA
            </h4>
            <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1.5 ml-8">
              <li>
                Ingresá a{' '}
                <a
                  href="https://auth.afip.gob.ar"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline inline-flex items-center gap-1"
                >
                  ARCA con Clave Fiscal <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                Buscá el servicio <strong>"Administración de Certificados Digitales"</strong>
              </li>
              <li>
                Seleccioná tu alias y elegí <strong>"Agregar Certificado"</strong>
              </li>
              <li>
                Subí el archivo <code className="bg-muted px-1 rounded">.csr</code> que se descargó
              </li>
              <li>
                ARCA te devolverá un archivo <code className="bg-muted px-1 rounded">.crt</code>
              </li>
            </ol>

            <div className="flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 dark:border-sky-900/50 dark:bg-sky-900/10">
              <Info className="h-4 w-4 text-sky-600 mt-0.5 shrink-0" />
              <p className="text-sm text-sky-700 dark:text-sky-400">
                Si tu contador maneja la clave fiscal, mandále el archivo .csr y pedile que te
                devuelva el .crt.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRedownloadCSR}
              disabled={!config?.csr_pem}
            >
              <Download className="mr-2 h-4 w-4" />
              Re-descargar .csr
            </Button>
          </div>

          {/* Paso 3: Upload .crt */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                2
              </span>
              Cargá el certificado (.crt) que te dio ARCA
            </h4>

            {!showCrtUpload ? (
              <Button variant="outline" onClick={() => setShowCrtUpload(true)} className="w-full">
                <Upload className="mr-2 h-4 w-4" />
                Ya tengo el .crt
              </Button>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="crt-upload">Certificado (.crt)</Label>
                <Input
                  id="crt-upload"
                  type="file"
                  accept=".crt,.pem,.cer"
                  disabled={isSavingCert || isTestingConnection}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleCrtUpload(file);
                  }}
                />
                {(isSavingCert || isTestingConnection) && (
                  <p className="text-xs text-muted-foreground">
                    {isSavingCert ? 'Guardando certificado...' : 'Probando conexión con ARCA...'}
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Estado: conectado o error → Completado
  const hasError = config?.estado_conexion === 'error' || !!config?.ultimo_error;
  const isConnected = config?.estado_conexion === 'conectado' && !hasError;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Certificado ARCA
            {hasError && <StatusBadge variant="blocked">Error</StatusBadge>}
            {isConnected && <StatusBadge variant="active">Conectado</StatusBadge>}
            {!hasError && !isConnected && <StatusBadge variant="pending">Pendiente</StatusBadge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isConnected && (
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle className="h-5 w-5" />
              <p className="text-sm font-medium">Certificado configurado y conexión verificada</p>
            </div>
          )}

          {hasError && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <p className="text-sm font-medium">Error de conexión</p>
              </div>
              {config?.ultimo_error && (
                <p className="text-sm text-muted-foreground">{config.ultimo_error}</p>
              )}
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onTestConnection}
              disabled={isTestingConnection}
            >
              {isTestingConnection ? (
                'Probando...'
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Probar conexión
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRegenerate}
              disabled={isGenerating || isSavingKey}
            >
              Regenerar certificado
            </Button>
          </div>
        </CardContent>
      </Card>

      <DangerConfirmDialog
        open={showRegenerateConfirm}
        onOpenChange={setShowRegenerateConfirm}
        title="¿Regenerar certificado?"
        description="Solo hacé esto si ARCA rechaza el certificado actual o si te lo pide tu contador."
        consequences={[
          'Invalida el certificado actual',
          'Requiere volver a subir el .csr a ARCA',
          'Requiere autorizar el servicio de nuevo en ARCA',
          'Las facturas NO se van a poder emitir hasta completar el proceso',
        ]}
        confirmWord="REGENERAR"
        confirmLabel="Regenerar certificado"
        onConfirm={confirmRegenerate}
      />
    </>
  );
}

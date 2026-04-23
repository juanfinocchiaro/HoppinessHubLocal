import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DollarSign,
  CheckCircle,
  XCircle,
  Loader2,
  Unplug,
  Eye,
  EyeOff,
  ExternalLink,
  Smartphone,
  Link2,
  Unlink,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import {
  useMercadoPagoConfig,
  useMercadoPagoConfigMutations,
  usePointDevices,
} from '@/hooks/useMercadoPagoConfig';
import { Skeleton } from '@/components/ui/skeleton';

export default function MercadoPagoConfigPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const { data: config, isLoading } = useMercadoPagoConfig(branchId);
  const { upsert, testConnection, disconnect, saveDevice, removeDevice, changeDeviceMode } =
    useMercadoPagoConfigMutations(branchId);

  const [accessToken, setAccessToken] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    if (config) {
      setAccessToken(config.access_token);
      setPublicKey(config.public_key);
    }
  }, [config]);

  const isConnected = config?.connection_status === 'conectado';
  const hasCredentials = accessToken.trim().length > 0 && publicKey.trim().length > 0;
  const isDirty = config
    ? accessToken !== config.access_token || publicKey !== config.public_key
    : hasCredentials;

  const handleSave = () => {
    upsert.mutate({ access_token: accessToken.trim(), public_key: publicKey.trim() });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="MercadoPago"
        subtitle="Configurá la integración con MercadoPago para cobrar online desde la WebApp y con QR en el POS."
      />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <>
          {/* Connection Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Estado de conexión
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                {isConnected ? (
                  <>
                    <Badge className="gap-1 bg-emerald-100 text-emerald-800 border-emerald-300">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Conectado
                    </Badge>
                    {config?.collector_id && (
                      <span className="text-sm text-muted-foreground">
                        Collector ID: {config.collector_id}
                      </span>
                    )}
                  </>
                ) : (
                  <Badge variant="outline" className="gap-1 text-muted-foreground">
                    <XCircle className="w-3.5 h-3.5" />
                    Desconectado
                  </Badge>
                )}
                {config?.last_test && (
                  <span className="text-xs text-muted-foreground">
                    Último test: {new Date(config.last_test).toLocaleString('es-AR')}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Credentials */}
          <Card>
            <CardHeader>
              <CardTitle>Credenciales</CardTitle>
              <CardDescription>
                Obtené tus credenciales desde el{' '}
                <a
                  href="https://www.mercadopago.com.ar/developers/panel/app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline inline-flex items-center gap-1"
                >
                  Panel de Desarrolladores <ExternalLink className="w-3 h-3" />
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Access Token (Producción)</Label>
                <div className="relative">
                  <Input
                    type={showToken ? 'text' : 'password'}
                    placeholder="APP_USR-..."
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setShowToken(!showToken)}
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Se usa en el servidor para crear preferencias de pago. Nunca se expone al cliente.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Public Key (Producción)</Label>
                <Input
                  placeholder="APP_USR-..."
                  value={publicKey}
                  onChange={(e) => setPublicKey(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Se usa en el frontend para inicializar el SDK de MercadoPago.
                </p>
              </div>

              <Separator />

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  onClick={handleSave}
                  disabled={!isDirty || !hasCredentials || upsert.isPending}
                >
                  {upsert.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Guardar credenciales
                </Button>

                {hasCredentials && !isDirty && (
                  <Button
                    variant="outline"
                    onClick={() => testConnection.mutate()}
                    disabled={testConnection.isPending}
                  >
                    {testConnection.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Probar conexión
                  </Button>
                )}

                {isConnected && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" className="text-destructive hover:text-destructive">
                        <Unplug className="w-4 h-4 mr-2" />
                        Desconectar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Desconectar MercadoPago?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Se eliminarán las credenciales y se deshabilitará el cobro online. Podés
                          volver a conectarte en cualquier momento.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => disconnect.mutate()}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Sí, desconectar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Point Smart Device */}
          {isConnected && (
            <PointSmartSection
              branchId={branchId!}
              config={config!}
              saveDevice={saveDevice}
              removeDevice={removeDevice}
              changeDeviceMode={changeDeviceMode}
            />
          )}

          {/* Usage Info */}
          <Card>
            <CardHeader>
              <CardTitle>¿Cómo funciona?</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-3">
              <div>
                <p className="font-medium text-foreground">Tienda Online (WebApp)</p>
                <p>
                  Los clientes podrán pagar sus pedidos online con MercadoPago Checkout Pro. El
                  pedido no llega a cocina hasta que el pago se confirme.
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground">Point Smart (POS)</p>
                <p>
                  Enviá el cobro desde el POS al Point Smart. El cliente paga con tarjeta, QR o
                  contactless. El pago se concilia automáticamente.
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground">Conciliación automática</p>
                <p>
                  Los pagos se confirman vía webhook. El pedido solo llega a cocina cuando
                  MercadoPago confirma el cobro.
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

/* ── Point Smart Device Section ────────────────────────── */

function PointSmartSection({
  branchId,
  config,
  saveDevice,
  removeDevice,
  changeDeviceMode,
}: {
  branchId: string;
  config: {
    device_id: string | null;
    device_name: string | null;
    device_operating_mode?: string | null;
  };
  saveDevice: {
    mutate: (v: { device_id: string; device_name: string }) => void;
    isPending: boolean;
  };
  removeDevice: { mutate: () => void; isPending: boolean };
  changeDeviceMode: { mutate: (mode: 'PDV' | 'STANDALONE') => void; isPending: boolean };
}) {
  const { data: devices, isLoading, refetch } = usePointDevices(branchId);

  const hasDevice = !!config.device_id;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="w-5 h-5" />
          Point Smart
        </CardTitle>
        <CardDescription>
          Vinculá tu dispositivo Point Smart para cobrar desde el POS con conciliación automática.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasDevice ? (
          <div className="space-y-3">
            {/* Device info */}
            <div className="flex items-center justify-between p-3 rounded-lg border bg-emerald-50 border-emerald-200">
              <div className="flex items-center gap-3">
                <Smartphone className="h-8 w-8 text-emerald-600" />
                <div>
                  <p className="font-medium text-sm">{config.device_name || 'Point Smart'}</p>
                  <p className="text-xs text-muted-foreground font-mono">{config.device_id}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => removeDevice.mutate()}
                disabled={removeDevice.isPending}
              >
                <Unlink className="h-4 w-4 mr-1" />
                Desvincular
              </Button>
            </div>

            {/* Operating mode */}
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2">
                {config.device_operating_mode === 'PDV' ? (
                  <Wifi className="h-4 w-4 text-emerald-600" />
                ) : (
                  <WifiOff className="h-4 w-4 text-amber-500" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    Modo de operación:{' '}
                    <span
                      className={
                        config.device_operating_mode === 'PDV'
                          ? 'text-emerald-700'
                          : 'text-amber-600'
                      }
                    >
                      {config.device_operating_mode === 'PDV'
                        ? 'PDV (integrado)'
                        : 'Standalone (independiente)'}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {config.device_operating_mode === 'PDV'
                      ? 'El dispositivo recibe cobros desde el POS.'
                      : 'El dispositivo opera de forma independiente, no está integrado.'}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  changeDeviceMode.mutate(
                    config.device_operating_mode === 'PDV' ? 'STANDALONE' : 'PDV',
                  )
                }
                disabled={changeDeviceMode.isPending}
                className="shrink-0"
              >
                {changeDeviceMode.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : config.device_operating_mode === 'PDV' ? (
                  <WifiOff className="h-3.5 w-3.5 mr-1" />
                ) : (
                  <Wifi className="h-3.5 w-3.5 mr-1" />
                )}
                {config.device_operating_mode === 'PDV' ? 'Pasar a Standalone' : 'Activar modo PDV'}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              No hay dispositivo vinculado. Buscá los dispositivos disponibles en tu cuenta de
              MercadoPago.
            </p>

            <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Buscar dispositivos
            </Button>

            {devices && devices.length === 0 && (
              <p className="text-sm text-amber-600">
                No se encontraron dispositivos. Asegurate de que el Point Smart esté encendido y
                vinculado a tu cuenta de MercadoPago.
              </p>
            )}

            {devices && devices.length > 0 && (
              <div className="space-y-2">
                {devices.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:border-primary transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-6 w-6 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium font-mono">{d.id}</p>
                        <p className="text-xs text-muted-foreground">
                          Modo: {d.operating_mode}
                          {d.pos_id ? ` · POS ID: ${d.pos_id}` : ''}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() =>
                        saveDevice.mutate({
                          device_id: d.id,
                          device_name: `Point Smart (${d.id.slice(-6)})`,
                        })
                      }
                      disabled={saveDevice.isPending}
                    >
                      <Link2 className="h-4 w-4 mr-1" />
                      Vincular
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

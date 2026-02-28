/**
 * PrintersConfigPage - Configuración de impresoras con detección automática de Print Bridge
 * y health check de conectividad por impresora.
 *
 * Estado 1: Sistema no detectado â†’ muestra instalador
 * Estado 2: Sistema listo â†’ CRUD de impresoras con health check en tiempo real
 */
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Printer,
  Plus,
  Trash2,
  TestTube,
  Pencil,
  Download,
  Loader2,
  HelpCircle,
  ChevronDown,
  RefreshCw,
  Wifi,
  WifiOff,
  AlertTriangle,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { EmptyState } from '@/components/ui/states/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useBranchPrinters, type BranchPrinter } from '@/hooks/useBranchPrinters';
import { usePrinting } from '@/hooks/usePrinting';
import { detectPrintBridge, testPrinterConnection, getNetworkFingerprint } from '@/lib/qz-print';
import { useQuery } from '@tanstack/react-query';
import { fetchBranchNameOnly } from '@/services/configService';

type SystemState = 'checking' | 'not_available' | 'ready';

type PrinterHealthStatus = 'idle' | 'checking' | 'reachable' | 'unreachable';

interface PrinterHealth {
  status: PrinterHealthStatus;
  latencyMs?: number;
  error?: string;
}

const DEFAULT_PRINTER = {
  name: '',
  connection_type: 'network',
  ip_address: '',
  port: 9100,
  paper_width: 80,
  is_active: true,
};

const BRIDGE_VERSION = '2026.02.21.0030';

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Setup Screen (State 1) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function SetupScreen({
  state,
  onSkip,
}: {
  state: 'checking' | 'not_available';
  onSkip: () => void;
}) {
  const handleDownload = async () => {
    try {
      const response = await fetch('/instalar-impresoras.bat');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `instalar-impresoras-v${BRIDGE_VERSION}.bat`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      window.open('/instalar-impresoras.bat', '_blank');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader
        title="Impresoras"
        subtitle="Configurá las impresoras térmicas de tu local"
        icon={<Printer className="w-5 h-5" />}
      />

      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="text-center space-y-3">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Printer className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold">Configuración de impresoras</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Para imprimir tickets desde esta computadora necesitás instalar un pequeño programa.
              Solo se hace una vez.
            </p>
          </div>

          <div className="space-y-3 max-w-md mx-auto">
            {[
              'Descargá el instalador',
              'Abrí el archivo descargado (doble clic)',
              'Esperá a que termine â€” esta pantalla se actualiza sola',
            ].map((text, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  {i + 1}
                </span>
                <p className="text-sm pt-1">{text}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center gap-4">
            <Button size="lg" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" /> Descargar instalador
            </Button>

            {state === 'checking' && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Verificando...
              </div>
            )}

            {state === 'not_available' && (
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Esperando instalación...
                </div>
                <Button variant="ghost" size="sm" onClick={onSkip}>
                  Ya lo tengo instalado
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Troubleshooting */}
      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between text-muted-foreground">
            <span className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4" /> Solución de problemas
            </span>
            <ChevronDown className="w-4 h-4" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-4">
          <div className="space-y-3 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground">
                Windows muestra advertencia de seguridad
              </p>
              <p>Hacé clic en "Más información" y luego "Ejecutar de todos modos". Es seguro.</p>
            </div>
            <div>
              <p className="font-medium text-foreground">El antivirus lo bloquea</p>
              <p>Agregá una excepción para "Hoppiness Print Bridge" en tu antivirus.</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Ya lo instalé pero sigue sin detectar</p>
              <p>
                Buscá "Hoppiness Print Bridge" en el menú inicio o ejecutá el instalador de nuevo.
              </p>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Network Warning Banner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function NetworkWarningBanner({
  currentNetwork,
  printerNetwork,
}: {
  currentNetwork: string;
  printerNetwork: string;
}) {
  return (
    <Card className="border-orange-500/50 bg-orange-50 dark:bg-orange-950/20">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium text-sm">Estás en una red diferente a la configurada</p>
            <p className="text-xs text-muted-foreground">
              Red actual: {currentNetwork} · Red configurada: {printerNetwork}. Las impresoras
              pueden no responder porque sus IPs son de otra red local.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Printer Health Indicator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function HealthIndicator({ health }: { health: PrinterHealth }) {
  if (health.status === 'checking') {
    return (
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span className="text-xs">Verificando...</span>
      </div>
    );
  }
  if (health.status === 'reachable') {
    return (
      <div className="flex items-center gap-1.5 text-primary">
        <Wifi className="w-3.5 h-3.5" />
        <span className="text-xs font-medium">
          Conectada{health.latencyMs != null ? ` · ${health.latencyMs}ms` : ''}
        </span>
      </div>
    );
  }
  if (health.status === 'unreachable') {
    return (
      <div className="flex items-center gap-1.5 text-destructive">
        <WifiOff className="w-3.5 h-3.5" />
        <span className="text-xs font-medium">
          No responde{health.error ? ` · ${health.error}` : ''}
        </span>
      </div>
    );
  }
  return null;
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Printer Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function PrinterCard({
  printer,
  health,
  onTest,
  onEdit,
  onDelete,
  onRetry,
}: {
  printer: BranchPrinter;
  health: PrinterHealth;
  onTest: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRetry: () => void;
}) {
  const borderClass =
    health.status === 'reachable'
      ? 'border-primary/30'
      : health.status === 'unreachable'
        ? 'border-destructive/30'
        : '';

  return (
    <Card className={borderClass}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-muted-foreground" />
            <span className="font-semibold">{printer.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <HealthIndicator health={health} />
            <Badge variant={printer.is_active ? 'default' : 'secondary'}>
              {printer.is_active ? 'Activa' : 'Inactiva'}
            </Badge>
          </div>
        </div>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>
            IP: {printer.ip_address}:{printer.port}
          </p>
          <p>Papel: {printer.paper_width}mm</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {health.status === 'unreachable' && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Reintentar
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onTest}>
            <TestTube className="w-3.5 h-3.5 mr-1" /> Test
          </Button>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
          </Button>
          <Button variant="outline" size="sm" className="text-destructive" onClick={onDelete}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Ready Screen (State 2) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function ReadyScreen({
  branchId,
  printers,
  isLoading,
  bridgeAvailable,
  printTest,
  create,
  update,
  remove,
}: {
  branchId: string;
  printers: BranchPrinter[] | undefined;
  isLoading: boolean;
  bridgeAvailable: boolean;
  printTest: (p: BranchPrinter) => void;
  create: any;
  update: any;
  remove: any;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BranchPrinter | null>(null);
  const [form, setForm] = useState(DEFAULT_PRINTER);
  const [healthMap, setHealthMap] = useState<Record<string, PrinterHealth>>({});
  const [currentNetwork, setCurrentNetwork] = useState<string | null>(null);

  // Get network fingerprint on mount
  useEffect(() => {
    getNetworkFingerprint().then(setCurrentNetwork);
  }, []);

  // Run health checks when printers change
  const runHealthChecks = useCallback(async (printerList: BranchPrinter[]) => {
    const toCheck = printerList.filter((p) => p.ip_address && p.is_active);
    if (!toCheck.length) return;

    // Set all to checking
    setHealthMap((prev) => {
      const next = { ...prev };
      toCheck.forEach((p) => {
        next[p.id] = { status: 'checking' };
      });
      return next;
    });

    // Test all in parallel
    const results = await Promise.allSettled(
      toCheck.map(async (p) => {
        const result = await testPrinterConnection(p.ip_address!, p.port);
        return { id: p.id, result };
      }),
    );

    setHealthMap((prev) => {
      const next = { ...prev };
      results.forEach((r) => {
        if (r.status === 'fulfilled') {
          const { id, result } = r.value;
          next[id] = result.reachable
            ? { status: 'reachable', latencyMs: result.latencyMs }
            : { status: 'unreachable', error: result.error };
        }
      });
      return next;
    });
  }, []);

  useEffect(() => {
    if (printers?.length) {
      runHealthChecks(printers);
    }
  }, [printers, runHealthChecks]);

  const retryPrinter = async (printer: BranchPrinter) => {
    if (!printer.ip_address) return;
    setHealthMap((prev) => ({ ...prev, [printer.id]: { status: 'checking' } }));
    const result = await testPrinterConnection(printer.ip_address, printer.port);
    setHealthMap((prev) => ({
      ...prev,
      [printer.id]: result.reachable
        ? { status: 'reachable', latencyMs: result.latencyMs }
        : { status: 'unreachable', error: result.error },
    }));
  };

  const openCreate = () => {
    setEditing(null);
    setForm(DEFAULT_PRINTER);
    setModalOpen(true);
  };

  const openEdit = (p: BranchPrinter) => {
    setEditing(p);
    setForm({
      name: p.name,
      connection_type: p.connection_type,
      ip_address: p.ip_address || '',
      port: p.port,
      paper_width: p.paper_width,
      is_active: p.is_active,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.ip_address) return;
    const networkFp = await getNetworkFingerprint();
    if (editing) {
      update.mutate(
        { id: editing.id, ...form, configured_from_network: networkFp },
        { onSuccess: () => setModalOpen(false) },
      );
    } else {
      create.mutate({ branch_id: branchId, ...form, configured_from_network: networkFp } as any, {
        onSuccess: () => setModalOpen(false),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  // Determine if we should show network warning
  const hasUnreachable = Object.values(healthMap).some((h) => h.status === 'unreachable');
  const configuredNetworks =
    printers?.map((p) => p.configured_from_network).filter((n): n is string => !!n) || [];
  const mismatchedNetwork =
    currentNetwork && configuredNetworks.length > 0 && !configuredNetworks.includes(currentNetwork);
  const showNetworkWarning = hasUnreachable && mismatchedNetwork;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader
        title="Impresoras"
        subtitle="Configurá las impresoras térmicas de tu local"
        icon={<Printer className="w-5 h-5" />}
        actions={
          <div className="flex gap-2">
            {(printers?.length ?? 0) > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => printers && runHealthChecks(printers)}
              >
                <RefreshCw className="w-4 h-4 mr-1" /> Verificar todas
              </Button>
            )}
            <Button onClick={openCreate} size="sm">
              <Plus className="w-4 h-4 mr-1" /> Nueva impresora
            </Button>
          </div>
        }
      />

      {/* Status badge */}
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-primary" />
        <span className="text-sm font-medium text-primary">Sistema de impresión listo</span>
      </div>

      {/* Network warning */}
      {showNetworkWarning && (
        <NetworkWarningBanner
          currentNetwork={currentNetwork!}
          printerNetwork={configuredNetworks[0]}
        />
      )}

      {!bridgeAvailable && (
        <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-sm">Sistema de impresión no detectado en esta PC</p>
                <p className="text-xs text-muted-foreground">
                  Podés configurar impresoras pero no vas a poder imprimir hasta que Print Bridge
                  esté corriendo en esta computadora.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!printers?.length ? (
        <EmptyState
          icon={Printer}
          title="Sin impresoras"
          description="Agregá una impresora para empezar a imprimir comandas y tickets."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {printers.map((p) => (
            <PrinterCard
              key={p.id}
              printer={p}
              health={healthMap[p.id] || { status: 'idle' }}
              onTest={() => printTest(p)}
              onEdit={() => openEdit(p)}
              onDelete={() => remove.mutate(p.id)}
              onRetry={() => retryPrinter(p)}
            />
          ))}
        </div>
      )}

      {/* Help Section */}
      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between text-muted-foreground">
            <span className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4" /> Ayuda
            </span>
            <ChevronDown className="w-4 h-4" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-4">
          <div className="space-y-3 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground">¿Cómo encuentro la IP de mi impresora?</p>
              <p>
                Imprimí la página de configuración de red de tu impresora (generalmente manteniendo
                un botón al encenderla). Ahí aparece la IP actual.
              </p>
            </div>
            <div>
              <p className="font-medium text-foreground">¿Qué puerto uso?</p>
              <p>El puerto estándar es 9100. Si no funciona, probá 9101 o 9102.</p>
            </div>
            <div>
              <p className="font-medium text-foreground">La impresora no imprime</p>
              <p>
                La impresora debe estar conectada por cable de red al mismo router que esta
                computadora. Verificá que esté encendida y en la misma subred.
              </p>
            </div>
            <div>
              <p className="font-medium text-foreground">
                Dice "No responde" pero la impresora está encendida
              </p>
              <p>
                Verificá que estás en la misma red WiFi/LAN que la impresora. Si la configuraste
                desde otra ubicación, actualizá la IP.
              </p>
            </div>

            {/* Installer update section */}
            <div className="border-t border-border pt-3 mt-3 space-y-2">
              <p className="font-medium text-foreground">Actualizar sistema de impresión</p>
              <p>
                Si las impresoras piden permiso cada vez que abrís la página, descargá y ejecutá el
                instalador actualizado. Se puede ejecutar aunque ya esté instalado.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    const response = await fetch('/instalar-impresoras.bat');
                    const blob = await response.blob();
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `instalar-impresoras-v${BRIDGE_VERSION}.bat`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                  } catch {
                    window.open('/instalar-impresoras.bat', '_blank');
                  }
                }}
              >
                <Download className="w-4 h-4 mr-1" /> Descargar instalador
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Printer Form Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar impresora' : 'Nueva impresora'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ej: Impresora Cocina"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>IP</Label>
                <Input
                  value={form.ip_address}
                  onChange={(e) => setForm((f) => ({ ...f, ip_address: e.target.value }))}
                  placeholder="192.168.1.100"
                />
              </div>
              <div>
                <Label>Puerto</Label>
                <Input
                  type="number"
                  value={form.port}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, port: parseInt(e.target.value) || 9100 }))
                  }
                />
              </div>
            </div>
            <div>
              <Label>Ancho de papel</Label>
              <Select
                value={String(form.paper_width)}
                onValueChange={(v) => setForm((f) => ({ ...f, paper_width: parseInt(v) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="80">80mm</SelectItem>
                  <SelectItem value="58">58mm</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              />
              <Label>Activa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!form.name || !form.ip_address}>
              {editing ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export default function PrintersConfigPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const { data: printers, isLoading, create, update, remove } = useBranchPrinters(branchId!);
  const { printTest: printTestFn } = usePrinting(branchId!);
  const { data: branchData } = useQuery({
    queryKey: ['branch-name-printers', branchId],
    queryFn: () => fetchBranchNameOnly(branchId!),
    enabled: !!branchId,
  });
  const printTest = useCallback(
    (p: BranchPrinter) => {
      printTestFn(p, branchData?.name || '');
    },
    [printTestFn, branchData],
  );
  const [systemState, setSystemState] = useState<SystemState>('checking');
  const [bridgeAvailable, setBridgeAvailable] = useState(false);

  const checkSystem = useCallback(async () => {
    const result = await detectPrintBridge();
    setBridgeAvailable(result.available);
    if (result.available && systemState !== 'ready') {
      setSystemState('ready');
    } else if (!result.available && systemState === 'checking') {
      setSystemState('not_available');
    }
  }, [systemState]);

  useEffect(() => {
    checkSystem();
    const interval = setInterval(checkSystem, 3000);
    return () => clearInterval(interval);
  }, [checkSystem]);

  if (systemState === 'checking' || systemState === 'not_available') {
    return <SetupScreen state={systemState} onSkip={() => setSystemState('ready')} />;
  }

  return (
    <ReadyScreen
      branchId={branchId!}
      printers={printers}
      isLoading={isLoading}
      bridgeAvailable={bridgeAvailable}
      printTest={printTest}
      create={create}
      update={update}
      remove={remove}
    />
  );
}

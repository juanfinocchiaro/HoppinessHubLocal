/**
 * PrintConfigPage - Configuración de ruteo de impresión por categoría
 */
import { useParams } from 'react-router-dom';
import { Settings, Printer } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePrintConfig } from '@/hooks/usePrintConfig';
import { useBranchPrinters } from '@/hooks/useBranchPrinters';
import { useState, useEffect } from 'react';

export default function PrintConfigPage() {
  const { branchId } = useParams<{ branchId: string }>();

  const [form, setForm] = useState({
    ticket_printer_id: null as string | null,
    ticket_enabled: false,
    ticket_trigger: 'on_payment',
    comanda_printer_id: null as string | null,
    vale_printer_id: null as string | null,
    salon_vales_enabled: true,
    reprint_requires_pin: true,
    // Keep legacy fields
    delivery_printer_id: null as string | null,
    delivery_enabled: false,
    backup_printer_id: null as string | null,
    backup_enabled: false,
  });

  const { data: config, isLoading: configLoading, upsert } = usePrintConfig(branchId!);
  const { data: printers, isLoading: printersLoading } = useBranchPrinters(branchId!);

  useEffect(() => {
    if (config) {
      setForm({
        ticket_printer_id: config.ticket_printer_id,
        ticket_enabled: config.ticket_enabled,
        ticket_trigger: config.ticket_trigger,
        comanda_printer_id: (config as any).comanda_printer_id || null,
        vale_printer_id: (config as any).vale_printer_id || null,
        salon_vales_enabled: (config as any).salon_vales_enabled ?? true,
        delivery_printer_id: config.delivery_printer_id,
        delivery_enabled: config.delivery_enabled,
        backup_printer_id: config.backup_printer_id,
        backup_enabled: config.backup_enabled,
        reprint_requires_pin: config.reprint_requires_pin,
      });
    }
  }, [config]);

  if (!branchId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">No se encontró el ID de sucursal.</div>
    );
  }

  const handleSave = () => {
    upsert.mutate({
      ...(form as any),
      no_salon_todo_en_comanda: true,
    });
  };

  if (configLoading || printersLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  const printerOptions = printers?.filter((p) => p.is_active) || [];
  const noPrinters = printerOptions.length === 0;

  const PrinterSelect = ({
    value,
    onChange,
    disabled,
  }: {
    value: string | null;
    onChange: (v: string | null) => void;
    disabled?: boolean;
  }) => (
    <Select
      value={value || 'none'}
      onValueChange={(v) => onChange(v === 'none' ? null : v)}
      disabled={disabled || noPrinters}
    >
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Sin impresora</SelectItem>
        {printerOptions.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración de Impresión"
        subtitle="Configurá qué se imprime, dónde y cuándo"
        icon={<Settings className="w-5 h-5" />}
      />

      {noPrinters && (
        <Card className="border-border bg-muted">
          <CardContent className="p-4 flex items-center gap-3">
            <Printer className="w-5 h-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No hay impresoras configuradas. Agregá una en la sección de Impresoras primero.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Sección 1: ¿Dónde sale cada cosa? */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">¿Dónde sale cada cosa?</CardTitle>
          <CardDescription>Asigná una impresora física a cada tipo de documento</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            {/* Ticket Cliente */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 min-w-[180px]">
                <span className="text-lg">🧾</span>
                <div>
                  <p className="text-sm font-medium">Ticket del cliente</p>
                  <p className="text-xs text-muted-foreground">Detalle con precios</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-1 max-w-sm">
                <Switch
                  checked={form.ticket_enabled}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, ticket_enabled: v }))}
                  disabled={noPrinters}
                />
                {form.ticket_enabled && (
                  <PrinterSelect
                    value={form.ticket_printer_id}
                    onChange={(v) => setForm((f) => ({ ...f, ticket_printer_id: v }))}
                  />
                )}
              </div>
            </div>

            {/* Comanda Cocina */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 min-w-[180px]">
                <span className="text-lg">🍳</span>
                <div>
                  <p className="text-sm font-medium">Comandas de cocina</p>
                  <p className="text-xs text-muted-foreground">Ítems tipo "comanda"</p>
                </div>
              </div>
              <div className="flex-1 max-w-sm">
                <PrinterSelect
                  value={form.comanda_printer_id}
                  onChange={(v) => setForm((f) => ({ ...f, comanda_printer_id: v }))}
                />
              </div>
            </div>

            {/* Vales */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 min-w-[180px]">
                <span className="text-lg">🎫</span>
                <div>
                  <p className="text-sm font-medium">Vales (bebidas, helados...)</p>
                  <p className="text-xs text-muted-foreground">1 vale por unidad</p>
                </div>
              </div>
              <div className="flex-1 max-w-sm">
                <PrinterSelect
                  value={form.vale_printer_id}
                  onChange={(v) => setForm((f) => ({ ...f, vale_printer_id: v }))}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sección 2: Comportamiento por canal */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comportamiento por canal</CardTitle>
          <CardDescription>
            Controlá cómo se imprimen los documentos según el tipo de venta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <p className="text-sm font-medium">Canal Salón</p>
            <div className="flex items-center gap-2 pl-2">
              <Switch
                checked={form.salon_vales_enabled}
                onCheckedChange={(v) => setForm((f) => ({ ...f, salon_vales_enabled: v }))}
              />
              <Label className="text-sm">
                Imprimir vales individuales (1 por unidad de cada ítem tipo "vale")
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Delivery / Takeaway / Apps</p>
            <p className="text-sm text-muted-foreground pl-2">
              Siempre se incluye todo en la comanda de cocina (incluidas bebidas).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Sección 3: Seguridad */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">🔒 Seguridad</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Switch
              checked={form.reprint_requires_pin}
              onCheckedChange={(v) => setForm((f) => ({ ...f, reprint_requires_pin: v }))}
            />
            <Label>Reimpresión requiere PIN de encargado</Label>
          </div>
        </CardContent>
      </Card>

      {/* Sección 4: Imprimir cuando... */}
      {form.ticket_enabled && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Imprimir cuando...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Label className="text-sm min-w-[140px]">Ticket del cliente:</Label>
              <Select
                value={form.ticket_trigger}
                onValueChange={(v) => setForm((f) => ({ ...f, ticket_trigger: v }))}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="on_payment">Al cobrar</SelectItem>
                  <SelectItem value="on_confirm">Al confirmar pedido</SelectItem>
                  <SelectItem value="on_ready">Al marcar listo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={upsert.isPending}>
          Guardar configuración
        </Button>
      </div>
    </div>
  );
}

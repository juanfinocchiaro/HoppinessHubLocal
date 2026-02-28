import { useState, useEffect } from 'react';
import {
  type AfipConfig,
  useAfipConfigMutations,
  type ReglasFacturacion,
  DEFAULT_REGLAS_FACTURACION,
} from '@/hooks/useAfipConfig';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ClipboardList, Info } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  config: AfipConfig | null | undefined;
  branchId: string;
  save: ReturnType<typeof useAfipConfigMutations>['save'];
}

const INTERNOS_ROWS: {
  key: keyof ReglasFacturacion['canales_internos'];
  icon: string;
  label: string;
}[] = [
  { key: 'efectivo', icon: '💵', label: 'Efectivo' },
  { key: 'debito', icon: '💳', label: 'Débito' },
  { key: 'credito', icon: '💳', label: 'Crédito' },
  { key: 'qr', icon: '📱', label: 'QR / MercadoPago' },
  { key: 'transferencia', icon: '🏦', label: 'Transferencia' },
];

const EXTERNOS_ROWS: {
  key: keyof ReglasFacturacion['canales_externos'];
  icon: string;
  label: string;
}[] = [
  { key: 'rappi', icon: '🟡', label: 'Rappi' },
  { key: 'pedidosya', icon: '🔴', label: 'PedidosYa' },
  { key: 'mas_delivery_efectivo', icon: '🟢', label: 'MásDelivery efectivo' },
  { key: 'mas_delivery_digital', icon: '🟢', label: 'MásDelivery digital' },
  { key: 'mp_delivery', icon: '🔵', label: 'MP Delivery' },
];

export function ReglasFacturacionSection({ config, branchId, save }: Props) {
  const [reglas, setReglas] = useState<ReglasFacturacion>(DEFAULT_REGLAS_FACTURACION);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (config?.reglas_facturacion) {
      setReglas({
        ...DEFAULT_REGLAS_FACTURACION,
        ...config.reglas_facturacion,
        canales_internos: {
          ...DEFAULT_REGLAS_FACTURACION.canales_internos,
          ...config.reglas_facturacion.canales_internos,
        },
        canales_externos: {
          ...DEFAULT_REGLAS_FACTURACION.canales_externos,
          ...config.reglas_facturacion.canales_externos,
        },
      });
    }
  }, [config?.reglas_facturacion]);

  const toggleInterno = (key: keyof ReglasFacturacion['canales_internos'], value: boolean) => {
    setReglas((prev) => ({
      ...prev,
      canales_internos: { ...prev.canales_internos, [key]: value },
    }));
    setDirty(true);
  };

  const toggleExterno = (key: keyof ReglasFacturacion['canales_externos'], value: boolean) => {
    setReglas((prev) => ({
      ...prev,
      canales_externos: { ...prev.canales_externos, [key]: value },
    }));
    setDirty(true);
  };

  const handleSave = () => {
    save.mutate({ branch_id: branchId, reglas_facturacion: reglas } as any, {
      onSuccess: () => {
        setDirty(false);
        toast.success('Reglas de facturación guardadas');
      },
      onError: (err: any) => {
        toast.error('Error al guardar reglas', { description: err?.message });
      },
    });
  };

  if (!config) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          Reglas de facturación
        </p>
        <p className="text-xs text-muted-foreground">
          Primero configurá los datos fiscales arriba para habilitar las reglas de facturación.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          Reglas de facturación
        </p>
        <p className="text-xs text-muted-foreground">
          Configurá qué ventas se incluyen en la facturación esperada del cierre de turno.
        </p>
      </div>

      {/* Canales internos */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Canales internos (salón, takeaway, delivery propio)
        </p>
        <div className="space-y-2">
          {INTERNOS_ROWS.map(({ key, icon, label }) => (
            <div
              key={key}
              className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50"
            >
              <span className="text-sm flex items-center gap-2">
                <span>{icon}</span> {label}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {reglas.canales_internos[key] ? 'Sí' : 'No'}
                </span>
                <Switch
                  checked={reglas.canales_internos[key]}
                  onCheckedChange={(v) => toggleInterno(key, v)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Canales externos */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Canales externos (apps de terceros)
        </p>
        <div className="space-y-2">
          {EXTERNOS_ROWS.map(({ key, icon, label }) => (
            <div
              key={key}
              className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50"
            >
              <span className="text-sm flex items-center gap-2">
                <span>{icon}</span> {label}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {reglas.canales_externos[key] ? 'Sí' : 'No'}
                </span>
                <Switch
                  checked={reglas.canales_externos[key]}
                  onCheckedChange={(v) => toggleExterno(key, v)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <p>
          Estas reglas determinan qué medios de pago generan factura electrónica automática desde el
          POS y cómo se calcula la facturación esperada en el cierre de turno.
        </p>
      </div>

      {/* Guardar */}
      <Button size="sm" onClick={handleSave} disabled={!dirty || save.isPending}>
        {save.isPending ? 'Guardando...' : 'Guardar reglas'}
      </Button>
    </div>
  );
}

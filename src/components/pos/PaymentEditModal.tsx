/**
 * PaymentEditModal - Corrección post-venta de medios de pago
 * Permite editar la distribución de pagos de un pedido sin cambiar el total.
 */
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Banknote,
  CreditCard,
  QrCode,
  ArrowRightLeft,
  Plus,
  Trash2,
  Smartphone,
} from 'lucide-react';
import { DotsLoader } from '@/components/ui/loaders';
import {
  getAuthUser,
  deletePedidoPagos,
  insertPedidoPagos,
  insertPaymentEditAudit,
  findOpenCashShiftForBranch,
  insertCashMovement,
} from '@/services/posService';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { MetodoPago } from '@/types/pos';
import { useMercadoPagoConfig } from '@/hooks/useMercadoPagoConfig';
import { PointPaymentModal } from './PointPaymentModal';

const METODOS: {
  value: MetodoPago;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { value: 'efectivo', label: 'Efectivo', icon: Banknote },
  { value: 'tarjeta_debito', label: 'Débito', icon: CreditCard },
  { value: 'tarjeta_credito', label: 'Crédito', icon: CreditCard },
  { value: 'mercadopago_qr', label: 'QR MP', icon: QrCode },
  { value: 'transferencia', label: 'Transf.', icon: ArrowRightLeft },
];

interface PaymentRow {
  id: string;
  metodo: MetodoPago;
  monto: number;
  isNew?: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedidoId: string;
  pedidoTotal: number;
  branchId: string;
  currentPayments: { id: string; metodo: string; monto: number }[];
}

export function PaymentEditModal({
  open,
  onOpenChange,
  pedidoId,
  pedidoTotal,
  branchId,
  currentPayments,
}: Props) {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [motivo, setMotivo] = useState('');
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  // Point Smart
  const { data: mpConfig } = useMercadoPagoConfig(branchId);
  const hasPointSmart = !!mpConfig?.device_id && mpConfig.estado_conexion === 'conectado';
  const [pointPaymentOpen, setPointPaymentOpen] = useState(false);
  const [pointAmount, setPointAmount] = useState(0);

  // Initialize rows from current payments when opening
  useEffect(() => {
    if (open) {
      setRows(
        currentPayments.map((p) => ({
          id: p.id,
          metodo: p.metodo as MetodoPago,
          monto: p.monto,
        })),
      );
      setMotivo('');
    }
  }, [open, currentPayments]);

  const totalPaid = rows.reduce((s, r) => s + r.monto, 0);
  const diff = Math.abs(totalPaid - pedidoTotal);
  const isBalanced = diff < 0.01;
  const canSave = isBalanced && motivo.trim().length > 0 && rows.length > 0;

  const updateRow = (idx: number, field: 'metodo' | 'monto', value: any) => {
    setRows((prev) => {
      const copy = [...prev];
      if (field === 'monto') {
        copy[idx] = { ...copy[idx], monto: parseFloat(value) || 0 };
      } else {
        copy[idx] = { ...copy[idx], metodo: value };
      }
      return copy;
    });
  };

  const addRow = () => {
    const remaining = pedidoTotal - totalPaid;
    setRows((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        metodo: 'efectivo',
        monto: Math.max(0, remaining),
        isNew: true,
      },
    ]);
  };

  const removeRow = (idx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const user = await getAuthUser();
      if (!user) throw new Error('No autenticado');

      const pagosBefore = currentPayments.map((p) => ({ metodo: p.metodo, monto: p.monto }));
      const pagosAfter = rows.map((r) => ({ metodo: r.metodo, monto: r.monto }));

      const cashBefore = currentPayments
        .filter((p) => p.metodo === 'efectivo')
        .reduce((s, p) => s + p.monto, 0);
      const cashAfter = rows
        .filter((r) => r.metodo === 'efectivo')
        .reduce((s, r) => s + r.monto, 0);
      const cashDelta = cashAfter - cashBefore;

      await deletePedidoPagos(pedidoId);

      const insertRows = rows.map((row) => ({
        pedido_id: pedidoId,
        metodo: row.metodo,
        monto: row.monto,
        monto_recibido: row.monto,
        vuelto: 0,
        created_by: user.id,
      }));
      await insertPedidoPagos(insertRows);

      await insertPaymentEditAudit({
        pedido_id: pedidoId,
        pagos_antes: pagosBefore,
        pagos_despues: pagosAfter,
        motivo: motivo.trim(),
        editado_por: user.id,
      });

      if (cashDelta !== 0) {
        const openShift = await findOpenCashShiftForBranch(branchId);

        if (openShift) {
          await insertCashMovement({
            shift_id: openShift.id,
            branch_id: branchId,
            type: cashDelta > 0 ? 'income' : 'expense',
            payment_method: 'efectivo',
            amount: Math.abs(cashDelta),
            concept: `Ajuste pago pedido (${motivo.trim()})`,
            order_id: pedidoId,
            recorded_by: user.id,
          });
        }
      }

      toast.success('Forma de pago actualizada');
      qc.invalidateQueries({ queryKey: ['pos-order-history'] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al actualizar pagos');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar forma de pago</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="text-sm text-muted-foreground">
            Total del pedido:{' '}
            <span className="font-bold text-foreground">
              $ {pedidoTotal.toLocaleString('es-AR')}
            </span>
          </div>

          {/* Payment rows */}
          <div className="space-y-3">
            {rows.map((row, idx) => (
              <div key={row.id} className="flex items-center gap-2">
                {/* Method selector as icon buttons */}
                <div className="flex gap-1">
                  {METODOS.map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => updateRow(idx, 'metodo', m.value)}
                        className={cn(
                          'p-2 rounded border transition-colors',
                          row.metodo === m.value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground',
                        )}
                        title={m.label}
                      >
                        <Icon className="h-4 w-4" />
                      </button>
                    );
                  })}
                </div>
                <div className="relative flex-1">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    $
                  </span>
                  <Input
                    type="number"
                    value={row.monto || ''}
                    onChange={(e) => updateRow(idx, 'monto', e.target.value)}
                    className="pl-6 h-9"
                  />
                </div>
                {rows.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-destructive"
                    onClick={() => removeRow(idx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={addRow} className="w-full">
            <Plus className="h-4 w-4 mr-1" />
            Agregar línea
          </Button>

          {/* Balance indicator */}
          {!isBalanced && (
            <p className="text-sm text-destructive font-medium">
              {totalPaid > pedidoTotal
                ? `Excede en $ ${(totalPaid - pedidoTotal).toLocaleString('es-AR')}`
                : `Faltan $ ${(pedidoTotal - totalPaid).toLocaleString('es-AR')}`}
            </p>
          )}

          {/* Reason */}
          <div>
            <Label>Motivo del cambio *</Label>
            <Textarea
              placeholder="Ej: Cliente pagó con débito, no efectivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={2}
            />
          </div>
        </div>
        {/* Point Smart cobro option */}
        {hasPointSmart && !isBalanced && totalPaid < pedidoTotal && (
          <button
            type="button"
            onClick={() => {
              setPointAmount(pedidoTotal - totalPaid);
              setPointPaymentOpen(true);
            }}
            className="w-full flex items-center gap-3 p-3 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 hover:border-blue-400 transition-colors text-left"
          >
            <Smartphone className="h-6 w-6 text-blue-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-800">
                Cobrar $ {(pedidoTotal - totalPaid).toLocaleString('es-AR')} con Point Smart
              </p>
              <p className="text-xs text-blue-600">
                Tarjeta, QR o contactless con conciliación automática
              </p>
            </div>
          </button>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!canSave || saving}>
            {saving && <DotsLoader />}
            Guardar cambios
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Point Smart modal for collecting remaining amount */}
      <PointPaymentModal
        open={pointPaymentOpen}
        onOpenChange={setPointPaymentOpen}
        pedidoId={pedidoId}
        branchId={branchId}
        amount={pointAmount}
        onConfirmed={(_payment) => {
          // Payment was inserted by webhook, just close and refresh
          toast.success('Pago conciliado automáticamente');
          qc.invalidateQueries({ queryKey: ['pos-order-history'] });
          setPointPaymentOpen(false);
          onOpenChange(false);
        }}
        onCancelled={() => setPointPaymentOpen(false)}
      />
    </Dialog>
  );
}

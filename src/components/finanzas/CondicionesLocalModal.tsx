import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { FormLayout, FormRow } from '@/components/ui/forms-pro';
import { StickyActions } from '@/components/ui/forms-pro';
import { LoadingButton } from '@/components/ui/loading-button';
import {
  useCondicionesProveedor,
  useCondicionesMutations,
  type CondicionesFormData,
} from '@/hooks/useProveedorCondiciones';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proveedorId: string;
  proveedorName: string;
  branchId: string;
}

export function CondicionesLocalModal({
  open,
  onOpenChange,
  proveedorId,
  proveedorName,
  branchId,
}: Props) {
  const { data: existing, isLoading } = useCondicionesProveedor(branchId, proveedorId);
  const { upsert } = useCondicionesMutations();

  const [form, setForm] = useState<CondicionesFormData>({
    permite_cuenta_corriente: false,
    dias_pago_habitual: null,
    descuento_pago_contado: null,
    notes: null,
  });

  useEffect(() => {
    if (existing) {
      setForm({
        permite_cuenta_corriente: existing.permite_cuenta_corriente,
        dias_pago_habitual: existing.dias_pago_habitual,
        descuento_pago_contado: existing.descuento_pago_contado,
        notes: existing.notes ?? (existing as any).observaciones ?? null,
      });
    } else {
      setForm({
        permite_cuenta_corriente: false,
        dias_pago_habitual: null,
        descuento_pago_contado: null,
        notes: null,
      });
    }
  }, [existing, open]);

  const handleSubmit = async () => {
    await upsert.mutateAsync({ proveedorId, branchId, data: form });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Condiciones de Pago</DialogTitle>
          <DialogDescription>
            Configuración comercial con <strong>{proveedorName}</strong> para este local
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                <div className="h-9 rounded bg-muted animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                <div className="h-9 rounded bg-muted animate-pulse" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-4 w-32 rounded bg-muted animate-pulse" />
              <div className="h-20 rounded bg-muted animate-pulse" />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <FormLayout columns={2}>
              <FormRow label="Cuenta Corriente">
                <div className="flex items-center gap-2 pt-1">
                  <Switch
                    checked={form.permite_cuenta_corriente}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, permite_cuenta_corriente: v }))}
                  />
                  <span className="text-sm text-muted-foreground">
                    {form.permite_cuenta_corriente ? 'Habilitada' : 'No'}
                  </span>
                </div>
              </FormRow>
              <FormRow label="Plazo de pago (días)">
                <Input
                  type="number"
                  value={form.dias_pago_habitual ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      dias_pago_habitual: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                  placeholder="Ej: 30"
                />
              </FormRow>
            </FormLayout>

            <FormRow label="Dto. pago contado (%)">
              <Input
                type="number"
                step="0.1"
                value={form.descuento_pago_contado ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    descuento_pago_contado: e.target.value ? Number(e.target.value) : null,
                  }))
                }
              />
            </FormRow>

            <FormRow label="Observaciones">
              <Textarea
                value={form.observaciones ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value || null }))}
                rows={2}
                placeholder="Ej: Pago los viernes"
              />
            </FormRow>

            <StickyActions>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <LoadingButton loading={upsert.isPending} onClick={handleSubmit}>
                Guardar Condiciones
              </LoadingButton>
            </StickyActions>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

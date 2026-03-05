import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormLayout, FormRow, FormSection } from '@/components/ui/forms-pro';
import { StickyActions } from '@/components/ui/forms-pro';
import { Building2, Phone, Landmark } from 'lucide-react';
import { LoadingButton } from '@/components/ui/loading-button';
import { useProveedorMutations } from '@/hooks/useProveedores';
import { useQuery } from '@tanstack/react-query';
import { fetchActiveBranches } from '@/services/publicBranchService';
import type { Proveedor, ProveedorFormData } from '@/types/financial';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proveedor?: Proveedor | null;
  /** Pre-set branch for local-scope creation from Mi Local */
  defaultBranchId?: string;
  /** When 'brand', hides ámbito selector and forces ambito='marca' */
  context?: 'brand' | 'local';
}

const EMPTY: ProveedorFormData = {
  razon_social: '',
  ambito: 'marca',
  permite_cuenta_corriente: false,
};

export function ProveedorFormModal({
  open,
  onOpenChange,
  proveedor,
  defaultBranchId,
  context,
}: Props) {
  const isBrandContext = context === 'brand';
  const { create, update } = useProveedorMutations();
  const isEdit = !!proveedor;

  const [form, setForm] = useState<ProveedorFormData>(EMPTY);

  const { data: branches } = useQuery({
    queryKey: ['branches-select'],
    queryFn: fetchActiveBranches,
    enabled: open && form.ambito === 'local',
  });

  useEffect(() => {
    if (proveedor) {
      setForm({
        razon_social: proveedor.razon_social,
        cuit: proveedor.cuit || '',
        contacto: proveedor.contacto || '',
        telefono: proveedor.telefono || '',
        contacto_secundario: proveedor.contacto_secundario || '',
        telefono_secundario: proveedor.telefono_secundario || '',
        email: proveedor.email || '',
        direccion: proveedor.direccion || '',
        ambito: proveedor.ambito as 'marca' | 'local',
        branch_id: proveedor.branch_id,
        permite_cuenta_corriente: proveedor.permite_cuenta_corriente || false,
        dias_pago_habitual: proveedor.dias_pago_habitual || undefined,
        descuento_pago_contado: proveedor.descuento_pago_contado || undefined,
        banco: proveedor.banco || '',
        numero_cuenta: proveedor.numero_cuenta || '',
        cbu: proveedor.cbu || '',
        alias_cbu: proveedor.alias_cbu || '',
        titular_cuenta: proveedor.titular_cuenta || '',
        observaciones: (proveedor as any).notes || (proveedor as any).observaciones || '',
      });
    } else if (defaultBranchId) {
      // Creating from local panel: pre-set as local provider
      setForm({ ...EMPTY, ambito: 'local', branch_id: defaultBranchId });
    } else {
      setForm(EMPTY);
    }
  }, [proveedor, defaultBranchId, open]);

  const set = (key: keyof ProveedorFormData, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // If creating from local context, lock ambito to 'local'
  const isLocalContext = !!defaultBranchId && !isEdit;

  const handleSubmit = async () => {
    if (!form.razon_social.trim()) return;
    const payload = {
      ...form,
      branch_id: form.ambito === 'local' ? form.branch_id || defaultBranchId || null : null,
    };

    if (isEdit) {
      await update.mutateAsync({ id: proveedor!.id, data: payload });
    } else {
      await create.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const isPending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? 'Editar Proveedor'
              : isBrandContext
                ? 'Nuevo Proveedor de Marca'
                : 'Nuevo Proveedor'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <FormSection title="Datos Principales" icon={Building2}>
            <FormLayout columns={1}>
              <FormRow label="Razón Social" required>
                <Input
                  value={form.razon_social}
                  onChange={(e) => set('razon_social', e.target.value)}
                  placeholder="Nombre del proveedor"
                />
              </FormRow>
              <FormLayout columns={2}>
                <FormRow label="CUIT">
                  <Input
                    value={form.cuit || ''}
                    onChange={(e) => set('cuit', e.target.value)}
                    placeholder="XX-XXXXXXXX-X"
                  />
                </FormRow>
                {!isBrandContext && (
                  <FormRow label="Ámbito">
                    {isLocalContext ? (
                      <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted">
                        <span className="text-sm text-muted-foreground">Local (esta sucursal)</span>
                      </div>
                    ) : (
                      <Select value={form.ambito} onValueChange={(v) => set('ambito', v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="marca">Marca (todas)</SelectItem>
                          <SelectItem value="local">Local (una sucursal)</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </FormRow>
                )}
              </FormLayout>
              {form.ambito === 'local' && !isLocalContext && !isBrandContext && (
                <FormRow label="Sucursal" required>
                  <Select value={form.branch_id || ''} onValueChange={(v) => set('branch_id', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {branches?.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormRow>
              )}
            </FormLayout>
          </FormSection>

          <FormSection title="Contacto" icon={Phone}>
            <FormLayout columns={2}>
              <FormRow label="Contacto principal">
                <Input
                  value={form.contacto || ''}
                  onChange={(e) => set('contacto', e.target.value)}
                />
              </FormRow>
              <FormRow label="Teléfono principal">
                <Input
                  value={form.telefono || ''}
                  onChange={(e) => set('telefono', e.target.value)}
                />
              </FormRow>
              <FormRow label="Contacto secundario">
                <Input
                  value={form.contacto_secundario || ''}
                  onChange={(e) => set('contacto_secundario', e.target.value)}
                  placeholder="Ej: Administración"
                />
              </FormRow>
              <FormRow label="Teléfono secundario">
                <Input
                  value={form.telefono_secundario || ''}
                  onChange={(e) => set('telefono_secundario', e.target.value)}
                />
              </FormRow>
              <FormRow label="Email">
                <Input
                  type="email"
                  value={form.email || ''}
                  onChange={(e) => set('email', e.target.value)}
                />
              </FormRow>
              <FormRow label="Dirección">
                <Input
                  value={form.direccion || ''}
                  onChange={(e) => set('direccion', e.target.value)}
                />
              </FormRow>
            </FormLayout>
          </FormSection>

          <FormSection title="Datos Bancarios" icon={Landmark}>
            <FormLayout columns={2}>
              <FormRow label="Banco">
                <Input value={form.banco || ''} onChange={(e) => set('banco', e.target.value)} />
              </FormRow>
              <FormRow label="Nº de Cuenta">
                <Input
                  value={form.numero_cuenta || ''}
                  onChange={(e) => set('numero_cuenta', e.target.value)}
                  placeholder="Ej: 374-002997/9"
                />
              </FormRow>
              <FormRow label="CBU">
                <Input
                  value={form.cbu || ''}
                  onChange={(e) => set('cbu', e.target.value)}
                  placeholder="22 dígitos"
                />
              </FormRow>
              <FormRow label="Alias CBU">
                <Input
                  value={form.alias_cbu || ''}
                  onChange={(e) => set('alias_cbu', e.target.value)}
                />
              </FormRow>
            </FormLayout>
            <FormRow label="Titular de la cuenta" className="mt-4">
              <Input
                value={form.titular_cuenta || ''}
                onChange={(e) => set('titular_cuenta', e.target.value)}
                placeholder="Completar si difiere de la razón social"
              />
            </FormRow>
          </FormSection>

          {!isBrandContext && (
            <FormSection title="Condiciones Comerciales">
              <FormLayout columns={2}>
                <FormRow label="Cuenta Corriente">
                  <div className="flex items-center gap-2 pt-1">
                    <Switch
                      checked={form.permite_cuenta_corriente || false}
                      onCheckedChange={(v) => set('permite_cuenta_corriente', v)}
                    />
                    <span className="text-sm text-muted-foreground">
                      {form.permite_cuenta_corriente ? 'Habilitada' : 'No'}
                    </span>
                  </div>
                </FormRow>
                <FormRow label="Plazo de pago (días)">
                  <div className="space-y-1">
                    <Input
                      type="number"
                      value={form.dias_pago_habitual ?? ''}
                      onChange={(e) =>
                        set(
                          'dias_pago_habitual',
                          e.target.value ? Number(e.target.value) : undefined,
                        )
                      }
                      placeholder="Ej: 30"
                    />
                    <p className="text-xs text-muted-foreground">
                      El vencimiento de facturas se calculará automáticamente: fecha factura + estos
                      días.
                    </p>
                  </div>
                </FormRow>
                <FormRow label="Dto. pago contado (%)">
                  <Input
                    type="number"
                    step="0.1"
                    value={form.descuento_pago_contado ?? ''}
                    onChange={(e) =>
                      set(
                        'descuento_pago_contado',
                        e.target.value ? Number(e.target.value) : undefined,
                      )
                    }
                  />
                </FormRow>
              </FormLayout>
              <FormRow label="Observaciones" className="mt-4">
                <Textarea
                  value={form.observaciones || ''}
                  onChange={(e) => set('observaciones', e.target.value)}
                  rows={2}
                />
              </FormRow>
            </FormSection>
          )}

          <StickyActions>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <LoadingButton loading={isPending} onClick={handleSubmit}>
              {isEdit ? 'Guardar' : 'Crear Proveedor'}
            </LoadingButton>
          </StickyActions>
        </div>
      </DialogContent>
    </Dialog>
  );
}

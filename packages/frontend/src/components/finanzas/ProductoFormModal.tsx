import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormRow, FormSection } from '@/components/ui/forms-pro';
import { StickyActions } from '@/components/ui/forms-pro';
import { Package } from 'lucide-react';
import { LoadingButton } from '@/components/ui/loading-button';
import { useInsumoMutations } from '@/hooks/useInsumos';
import { useProveedores } from '@/hooks/useProveedores';
import { PRESENTACION_OPTIONS, UNIDAD_BASE_OPTIONS } from '@/types/financial';
import { RdoCategorySelector } from '@/components/rdo/RdoCategorySelector';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  producto?: any;
}

export function ProductoFormModal({ open, onOpenChange, producto }: Props) {
  const { create, update } = useInsumoMutations();
  const { data: proveedores } = useProveedores();
  const isEdit = !!producto;

  const [form, setForm] = useState({
    name: '',
    base_unit: 'un' as string,
    unidad_compra: 'pack' as string,
    unidad_compra_contenido: 1,
    unidad_compra_precio: 0,
    default_alicuota_iva: null as number | null,
    nivel_control: 'obligatorio' as string,
    proveedor_obligatorio_id: '',
    proveedor_sugerido_id: '',
    rdo_category_code: '',
    description: '',
  });

  useEffect(() => {
    if (producto) {
      setForm({
        name: producto.name || '',
        base_unit: producto.base_unit || 'un',
        unidad_compra: producto.unidad_compra || 'pack',
        unidad_compra_contenido: producto.unidad_compra_contenido || 1,
        unidad_compra_precio: producto.unidad_compra_precio || 0,
        default_alicuota_iva: producto.default_alicuota_iva ?? null,
        nivel_control: producto.nivel_control || 'obligatorio',
        proveedor_obligatorio_id: producto.proveedor_obligatorio_id || '',
        proveedor_sugerido_id: producto.proveedor_sugerido_id || '',
        rdo_category_code: producto.rdo_category_code || '',
        description: producto.description || '',
      });
    } else {
      setForm({
        name: '',
        base_unit: 'un',
        unidad_compra: 'pack',
        unidad_compra_contenido: 1,
        unidad_compra_precio: 0,
        default_alicuota_iva: null,
        nivel_control: 'obligatorio',
        proveedor_obligatorio_id: '',
        proveedor_sugerido_id: '',
        rdo_category_code: '',
        description: '',
      });
    }
  }, [producto, open]);

  const set = (key: string, value: any) => setForm((prev) => ({ ...prev, [key]: value }));

  const handlePresentacionChange = (v: string) => {
    const opt = PRESENTACION_OPTIONS.find((o) => o.value === v);
    set('unidad_compra', v);
    if (opt) {
      set('base_unit', opt.unidadBase);
      if (opt.contenidoDefault) {
        set('unidad_compra_contenido', opt.contenidoDefault);
      }
    }
  };

  const costoUnidadBase = useMemo(() => {
    if (form.unidad_compra_contenido > 0 && form.unidad_compra_precio > 0) {
      return form.unidad_compra_precio / form.unidad_compra_contenido;
    }
    return null;
  }, [form.unidad_compra_contenido, form.unidad_compra_precio]);

  const costoConIva = useMemo(() => {
    if (
      costoUnidadBase !== null &&
      form.default_alicuota_iva != null &&
      form.default_alicuota_iva > 0 &&
      form.unidad_compra_precio > 0
    ) {
      return form.unidad_compra_precio * (1 + form.default_alicuota_iva / 100);
    }
    return null;
  }, [costoUnidadBase, form.default_alicuota_iva, form.unidad_compra_precio]);

  const unidadBaseLabel =
    UNIDAD_BASE_OPTIONS.find((u) => u.value === form.base_unit)?.label || form.base_unit;

  const handleSubmit = async () => {
    if (!form.name.trim()) return;

    const payload: any = {
      name: form.name,
      tipo_item: 'producto',
      base_unit: form.base_unit,
      unidad_compra: form.unidad_compra,
      unidad_compra_contenido: form.unidad_compra_contenido,
      unidad_compra_precio: form.unidad_compra_precio,
      default_alicuota_iva: form.default_alicuota_iva ?? null,
      nivel_control: form.nivel_control,
      proveedor_obligatorio_id:
        form.nivel_control === 'obligatorio' ? form.proveedor_obligatorio_id || null : null,
      proveedor_sugerido_id:
        form.nivel_control === 'semi_libre' ? form.proveedor_sugerido_id || null : null,
      rdo_category_code: form.rdo_category_code || null,
      description: form.description || null,
    };

    if (isEdit) {
      await update.mutateAsync({ id: producto.id, data: payload });
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
          <DialogTitle>{isEdit ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <FormRow label="Nombre del producto" required>
            <Input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Ej: Coca-Cola Lata 354ml"
            />
          </FormRow>

          {/* Presentación y precio */}
          <FormSection title="Presentación y precio" icon={Package}>
            <div className="grid grid-cols-3 gap-3">
              <FormRow label="Presentación" required>
                <Select value={form.unidad_compra} onValueChange={handlePresentacionChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESENTACION_OPTIONS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormRow>
              <FormRow label="Contenido" required hint={form.base_unit}>
                <Input
                  type="number"
                  value={form.unidad_compra_contenido || ''}
                  onChange={(e) => set('unidad_compra_contenido', Number(e.target.value))}
                  placeholder="Ej: 24"
                />
              </FormRow>
              <FormRow label="Precio NETO ($)" required hint="sin IVA">
                <Input
                  type="number"
                  step="0.01"
                  value={form.unidad_compra_precio || ''}
                  onChange={(e) => set('unidad_compra_precio', Number(e.target.value))}
                  placeholder="Ej: 12000"
                />
              </FormRow>
            </div>

            {/* IVA selector */}
            <div className="flex items-center gap-3 mt-3">
              <span className="text-sm text-muted-foreground whitespace-nowrap">IVA:</span>
              <div className="flex gap-1.5">
                {[
                  { value: null, label: 'Exento' },
                  { value: 10.5, label: '10.5%' },
                  { value: 21, label: '21%' },
                ].map((opt) => (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => set('default_alicuota_iva', opt.value)}
                    className={`px-3 py-1.5 rounded-md border text-xs font-medium transition-colors ${
                      form.default_alicuota_iva === opt.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground">Unidad base:</span>
              <Select value={form.base_unit} onValueChange={(v) => set('base_unit', v)}>
                <SelectTrigger className="h-7 w-auto text-xs px-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIDAD_BASE_OPTIONS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {costoUnidadBase !== null && (
              <div className="mt-3 rounded-md border border-border bg-muted/40 p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Costo neto por {unidadBaseLabel}:</span>
                  <span className="font-semibold text-primary">
                    $
                    {costoUnidadBase.toLocaleString('es-AR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 4,
                    })}
                  </span>
                </div>
                {costoConIva !== null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Precio con IVA ({form.default_alicuota_iva}%):
                    </span>
                    <span className="font-mono">
                      $
                      {costoConIva.toLocaleString('es-AR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  💡 Las recetas y el FC% se calculan siempre con precio neto
                </p>
              </div>
            )}
          </FormSection>

          {/* Clasificación */}
          <div className="grid grid-cols-2 gap-3">
            <FormRow label="Categoría RDO">
              <RdoCategorySelector
                value={form.rdo_category_code}
                onChange={(code) => set('rdo_category_code', code)}
                itemType="producto"
              />
            </FormRow>

            <FormRow label="Nivel de control">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => set('nivel_control', 'obligatorio')}
                  className={`flex-1 px-2 py-2 rounded-md border text-xs font-medium transition-colors ${
                    form.nivel_control === 'obligatorio'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  🔒 Obligatorio
                </button>
                <button
                  type="button"
                  onClick={() => set('nivel_control', 'semi_libre')}
                  className={`flex-1 px-2 py-2 rounded-md border text-xs font-medium transition-colors ${
                    form.nivel_control === 'semi_libre'
                      ? 'border-yellow-500 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  🟡 Semi-libre
                </button>
              </div>
            </FormRow>
          </div>

          <FormRow
            label={
              form.nivel_control === 'obligatorio' ? 'Proveedor Obligatorio' : 'Proveedor Sugerido'
            }
            required={form.nivel_control === 'obligatorio'}
          >
            <Select
              value={
                form.nivel_control === 'obligatorio'
                  ? form.proveedor_obligatorio_id || ''
                  : form.proveedor_sugerido_id || 'none'
              }
              onValueChange={(v) => {
                if (form.nivel_control === 'obligatorio') {
                  set('proveedor_obligatorio_id', v);
                } else {
                  set('proveedor_sugerido_id', v === 'none' ? '' : v);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                {form.nivel_control === 'semi_libre' && (
                  <SelectItem value="none">Ninguno</SelectItem>
                )}
                {proveedores?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.business_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormRow>

          <FormRow label="Descripción / Notas">
            <Textarea
              value={form.description || ''}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Observaciones sobre el producto"
              rows={2}
            />
          </FormRow>

          <StickyActions>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <LoadingButton loading={isPending} onClick={handleSubmit} disabled={!form.name}>
              {isEdit ? 'Guardar' : 'Crear Producto'}
            </LoadingButton>
          </StickyActions>
        </div>
      </DialogContent>
    </Dialog>
  );
}

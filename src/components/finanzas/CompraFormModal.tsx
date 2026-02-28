import { useEffect, useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Plus,
  Trash2,
  Lock,
  AlertTriangle,
  Info,
  Receipt,
  FileText,
  BanknoteIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useFacturaMutations } from '@/hooks/useCompras';
import { useProveedores } from '@/hooks/useProveedores';
import { useInsumos } from '@/hooks/useInsumos';
import { useConceptosServicio } from '@/hooks/useConceptosServicio';
import {
  CONDICION_PAGO_OPTIONS,
  FACTURA_TIPO_OPTIONS,
  getCurrentPeriodo,
  calcularCostoReal,
  calcularCreditoFiscal,
} from '@/types/compra';
import { UNIDAD_OPTIONS } from '@/types/financial';
import { FormSection } from '@/components/ui/forms-pro';
import { formatCurrencyWithDecimals } from '@/lib/formatters';
import type { ItemFormState } from '@/components/finanzas/compraTypes';
import { emptyItem, recalcIva } from '@/utils/invoiceCalculations';

type ModalidadCompra = 'sin_comprobante' | 'factura_simple' | 'factura_detallada';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
}

const MODALIDAD_OPTIONS: {
  value: ModalidadCompra;
  label: string;
  desc: string;
  icon: React.ElementType;
}[] = [
  {
    value: 'sin_comprobante',
    label: 'Sin comprobante',
    desc: 'Compra informal, sin factura',
    icon: BanknoteIcon,
  },
  {
    value: 'factura_simple',
    label: 'Factura simple',
    desc: 'Supermercado, distribuidor chico',
    icon: Receipt,
  },
  {
    value: 'factura_detallada',
    label: 'Factura detallada',
    desc: 'Quilmes, proveedor con imp. internos',
    icon: FileText,
  },
];

export function CompraFormModal({ open, onOpenChange, branchId }: Props) {
  const { create } = useFacturaMutations();
  const { data: proveedores } = useProveedores(branchId);
  const { data: insumos } = useInsumos();
  const { data: conceptos } = useConceptosServicio();

  const [modalidad, setModalidad] = useState<ModalidadCompra>('factura_simple');

  const [form, setForm] = useState({
    proveedor_id: '',
    factura_tipo: '',
    factura_numero: '',
    factura_fecha: new Date().toISOString().slice(0, 10),
    condicion_pago: 'contado',
    tipo: 'normal',
    motivo_extraordinaria: '',
    observaciones: '',
  });

  // --- Simple mode: user enters total factura directly ---
  const [totalFacturaManual, setTotalFacturaManual] = useState<number>(0);

  // Fiscal detail state (for factura_detallada only)
  const [impuestos, setImpuestos] = useState({
    imp_internos: 0,
    iva_21: 0,
    iva_105: 0,
    perc_iva: 0,
    perc_provincial: 0,
    perc_municipal: 0,
  });

  const setImp = (key: string, value: number) =>
    setImpuestos((prev) => ({ ...prev, [key]: value }));

  // --- Sin comprobante mode: user enters total pagado ---
  const [totalPagado, setTotalPagado] = useState<number>(0);

  const selectedProveedor = proveedores?.find((p) => p.id === form.proveedor_id);
  const computedVencimiento = (() => {
    if (form.condicion_pago !== 'cuenta_corriente' || !selectedProveedor?.dias_pago_habitual)
      return undefined;
    const base = new Date(form.factura_fecha);
    base.setDate(base.getDate() + selectedProveedor.dias_pago_habitual);
    return base.toISOString().slice(0, 10);
  })();

  const [items, setItems] = useState<ItemFormState[]>([emptyItem()]);

  useEffect(() => {
    if (open) {
      setModalidad('factura_simple');
      setForm((f) => ({
        ...f,
        proveedor_id: '',
        factura_tipo: '',
        factura_numero: '',
        observaciones: '',
        condicion_pago: 'contado',
      }));
      setItems([emptyItem()]);
      setImpuestos({
        imp_internos: 0,
        iva_21: 0,
        iva_105: 0,
        perc_iva: 0,
        perc_provincial: 0,
        perc_municipal: 0,
      });
      setTotalFacturaManual(0);
      setTotalPagado(0);
    }
  }, [open]);

  useEffect(() => {
    if (selectedProveedor?.permite_cuenta_corriente) {
      setForm((f) => ({ ...f, condicion_pago: 'cuenta_corriente' }));
    } else {
      setForm((f) => ({ ...f, condicion_pago: 'contado' }));
    }
  }, [form.proveedor_id, selectedProveedor]);

  const updateItem = (idx: number, field: string, value: string | number | boolean | null) => {
    setItems((prev) => {
      const updated = [...prev];
      let item = { ...updated[idx], [field]: value };

      if (field === 'tipo_item') {
        if (value === 'insumo') {
          item.concepto_servicio_id = undefined;
          item.cantidad = 0;
          item.unidad = 'kg';
        } else {
          item.insumo_id = '';
          item.cantidad = 1;
          item.unidad = '';
        }
        item.precio_unitario = 0;
        item.alicuota_iva = 21;
      }

      if (field === 'insumo_id' && insumos) {
        const ins = insumos.find((i: any) => i.id === value) as any;
        if (ins) {
          item.unidad = ins.unidad_base;
        }
      }

      if (field === 'tipo_item' && value === 'servicio') {
        item.cantidad = 1;
      }

      item = recalcIva(item);
      updated[idx] = item;
      return updated;
    });
  };

  // Totals calculated from items + mode
  const totals = useMemo(() => {
    let subtotalNeto = 0;
    items.forEach((item) => {
      const neto = Number(item.precio_unitario) || 0;
      const qty = item.tipo_item === 'servicio' ? 1 : Number(item.cantidad) || 0;
      subtotalNeto += neto * qty;
    });
    subtotalNeto = Math.round(subtotalNeto * 100) / 100;

    if (modalidad === 'sin_comprobante') {
      // No fiscal breakdown. Total = total pagado. Costo real = total pagado.
      return {
        subtotalNeto: totalPagado,
        totalImpuestos: 0,
        totalFactura: totalPagado,
        costoReal: totalPagado,
        creditoFiscal: 0,
        totalIva: 0,
        // Derived: auto-distribute cost per item proportionally
      };
    }

    if (modalidad === 'factura_simple') {
      // User enters total factura. IVA = total - neto.
      const tf = totalFacturaManual || 0;
      const ivaEstimado = Math.max(0, Math.round((tf - subtotalNeto) * 100) / 100);
      return {
        subtotalNeto,
        totalImpuestos: ivaEstimado,
        totalFactura: tf || subtotalNeto,
        costoReal: subtotalNeto,
        creditoFiscal: ivaEstimado,
        totalIva: ivaEstimado,
      };
    }

    // factura_detallada: full fiscal breakdown
    const totalImpuestos =
      impuestos.imp_internos +
      impuestos.iva_21 +
      impuestos.iva_105 +
      impuestos.perc_iva +
      impuestos.perc_provincial +
      impuestos.perc_municipal;
    const totalFactura = Math.round((subtotalNeto + totalImpuestos) * 100) / 100;
    const costoReal =
      Math.round(
        calcularCostoReal({
          subtotal_neto: subtotalNeto,
          imp_internos: impuestos.imp_internos,
          perc_provincial: impuestos.perc_provincial,
          perc_municipal: impuestos.perc_municipal,
        }) * 100,
      ) / 100;
    const creditoFiscal =
      Math.round(
        calcularCreditoFiscal({
          iva_21: impuestos.iva_21,
          iva_105: impuestos.iva_105,
          perc_iva: impuestos.perc_iva,
        }) * 100,
      ) / 100;

    return {
      subtotalNeto,
      totalImpuestos: Math.round(totalImpuestos * 100) / 100,
      totalFactura,
      costoReal,
      creditoFiscal,
      totalIva: impuestos.iva_21 + impuestos.iva_105,
    };
  }, [items, impuestos, modalidad, totalPagado, totalFacturaManual]);

  // --- Determine if can submit ---
  const validItems = items.filter((i) =>
    i.tipo_item === 'insumo'
      ? i.insumo_id && i.cantidad > 0
      : i.concepto_servicio_id && i.precio_unitario > 0,
  );

  const canSubmit = (() => {
    if (!form.proveedor_id || validItems.length === 0) return false;
    if (modalidad === 'sin_comprobante') return totalPagado > 0;
    if (modalidad === 'factura_simple') return !!form.factura_numero;
    return !!form.factura_numero; // detallada
  })();

  const handleSubmit = async () => {
    if (!canSubmit) return;

    const facturaNumero =
      modalidad === 'sin_comprobante' ? `SC-${Date.now()}` : form.factura_numero;

    const facturaTipo =
      modalidad === 'sin_comprobante' ? undefined : form.factura_tipo || undefined;

    // Build fiscal fields based on mode
    let fiscalFields: any = {};
    if (modalidad === 'sin_comprobante') {
      fiscalFields = {
        subtotal_bruto: totalPagado,
        total_descuentos: 0,
        subtotal_neto: totalPagado,
        imp_internos: 0,
        iva_21: 0,
        iva_105: 0,
        perc_iva: 0,
        perc_provincial: 0,
        perc_municipal: 0,
        total_factura: totalPagado,
      };
    } else if (modalidad === 'factura_simple') {
      const ivaEstimado = Math.max(0, (totalFacturaManual || 0) - totals.subtotalNeto);
      fiscalFields = {
        subtotal_bruto: totals.subtotalNeto,
        total_descuentos: 0,
        subtotal_neto: totals.subtotalNeto,
        imp_internos: 0,
        iva_21: ivaEstimado,
        iva_105: 0,
        perc_iva: 0,
        perc_provincial: 0,
        perc_municipal: 0,
        total_factura: totalFacturaManual || totals.subtotalNeto,
      };
    } else {
      fiscalFields = {
        subtotal_bruto: totals.subtotalNeto,
        total_descuentos: 0,
        subtotal_neto: totals.subtotalNeto,
        imp_internos: impuestos.imp_internos,
        iva_21: impuestos.iva_21,
        iva_105: impuestos.iva_105,
        perc_iva: impuestos.perc_iva,
        perc_provincial: impuestos.perc_provincial,
        perc_municipal: impuestos.perc_municipal,
        total_factura: totals.totalFactura,
      };
    }

    await create.mutateAsync({
      branch_id: branchId,
      proveedor_id: form.proveedor_id,
      factura_tipo: facturaTipo,
      factura_numero: facturaNumero,
      factura_fecha: form.factura_fecha,
      condicion_pago: modalidad === 'sin_comprobante' ? 'contado' : form.condicion_pago,
      fecha_vencimiento: modalidad === 'sin_comprobante' ? undefined : computedVencimiento,
      iva: fiscalFields.iva_21 + fiscalFields.iva_105,
      otros_impuestos:
        fiscalFields.imp_internos +
        fiscalFields.perc_iva +
        fiscalFields.perc_provincial +
        fiscalFields.perc_municipal,
      tipo: form.tipo,
      motivo_extraordinaria:
        form.tipo === 'extraordinaria' ? form.motivo_extraordinaria : undefined,
      periodo: getCurrentPeriodo(),
      observaciones: form.observaciones || undefined,
      items: validItems.map((item) => ({ ...item })),
      ...fiscalFields,
    });
    onOpenChange(false);
  };

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const fmt = formatCurrencyWithDecimals;

  // ─── Item Row Renderer (shared across modes) ───
  const renderItemRow = (item: ItemFormState, idx: number) => {
    const isNetoMode = modalidad !== 'sin_comprobante';
    const precioLabel = isNetoMode ? 'P. Neto unit. *' : 'P. unit. *';

    return (
      <div key={idx} className="border rounded-lg p-3 space-y-3 bg-muted/30">
        <div className="flex items-center justify-between">
          <RadioGroup
            value={item.tipo_item}
            onValueChange={(v) => updateItem(idx, 'tipo_item', v)}
            className="flex gap-4"
          >
            <div className="flex items-center gap-1.5">
              <RadioGroupItem value="insumo" id={`tipo-insumo-${idx}`} />
              <Label htmlFor={`tipo-insumo-${idx}`} className="text-sm font-normal cursor-pointer">
                Insumo
              </Label>
            </div>
            <div className="flex items-center gap-1.5">
              <RadioGroupItem value="servicio" id={`tipo-servicio-${idx}`} />
              <Label
                htmlFor={`tipo-servicio-${idx}`}
                className="text-sm font-normal cursor-pointer"
              >
                Servicio
              </Label>
            </div>
          </RadioGroup>
          {items.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
            >
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </Button>
          )}
        </div>

        {item.tipo_item === 'insumo' ? (
          (() => {
            const selectedInsumo = insumos?.find((i: any) => i.id === item.insumo_id) as any;
            const nivel = selectedInsumo?.nivel_control;
            const precioRef = selectedInsumo?.precio_referencia
              ? Number(selectedInsumo.precio_referencia)
              : null;
            const precioMax = selectedInsumo?.precio_maximo_sugerido
              ? Number(selectedInsumo.precio_maximo_sugerido)
              : null;
            const isOverpriced = precioMax && item.precio_unitario > precioMax;
            const provObligatorio = selectedInsumo?.proveedor_obligatorio;
            const wrongProvider =
              nivel === 'obligatorio' &&
              provObligatorio &&
              form.proveedor_id &&
              form.proveedor_id !== provObligatorio.id;

            return (
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-6">
                    <Label className="text-xs">Insumo *</Label>
                    <Select
                      value={item.insumo_id}
                      onValueChange={(v) => updateItem(idx, 'insumo_id', v)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        {insumos
                          ?.filter((i: any) => i.activo !== false)
                          .map((i: any) => (
                            <SelectItem key={i.id} value={i.id}>
                              {i.nivel_control === 'obligatorio'
                                ? '🔒 '
                                : i.nivel_control === 'semi_libre'
                                  ? '🟡 '
                                  : '🟢 '}
                              {i.nombre}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs">Cant. *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      className="h-9"
                      value={item.cantidad || ''}
                      onChange={(e) => updateItem(idx, 'cantidad', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs">Unidad</Label>
                    <Select value={item.unidad} onValueChange={(v) => updateItem(idx, 'unidad', v)}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNIDAD_OPTIONS.map((u) => (
                          <SelectItem key={u.value} value={u.value}>
                            {u.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-6">
                    <Label className="text-xs">{precioLabel}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      className="h-9"
                      value={item.precio_unitario || ''}
                      onChange={(e) =>
                        updateItem(idx, 'precio_unitario', parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div className="col-span-6">
                    <Label className="text-xs">Subtotal</Label>
                    <Input className="h-9 font-mono" value={`$ ${fmt(item.subtotal)}`} disabled />
                  </div>
                </div>
                {selectedInsumo && (
                  <div className="space-y-1">
                    {nivel === 'obligatorio' && (
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant="destructive" className="gap-1 text-xs">
                          <Lock className="w-3 h-3" />
                          Obligatorio
                        </Badge>
                        {provObligatorio && (
                          <span className="text-muted-foreground">
                            Proveedor fijo: {provObligatorio.razon_social}
                          </span>
                        )}
                      </div>
                    )}
                    {nivel === 'semi_libre' && (
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <AlertTriangle className="w-3 h-3" />
                          Semi-libre
                        </Badge>
                        {selectedInsumo.proveedor_sugerido && (
                          <span className="text-muted-foreground">
                            Sugerido: {selectedInsumo.proveedor_sugerido.razon_social}
                          </span>
                        )}
                      </div>
                    )}
                    {wrongProvider && (
                      <p className="text-xs text-destructive font-medium">
                        ⚠️ Este insumo solo puede comprarse a {provObligatorio.razon_social}
                      </p>
                    )}
                    {precioRef && item.precio_unitario > 0 && (
                      <p
                        className={`text-xs ${isOverpriced ? 'text-destructive' : 'text-muted-foreground'}`}
                      >
                        Ref: ${precioRef.toLocaleString('es-AR')}
                        {precioMax ? ` / Máx: $${precioMax.toLocaleString('es-AR')}` : ''}
                        {isOverpriced && ' ⚠️ Precio por encima del máximo'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })()
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-6">
                <Label className="text-xs">Concepto *</Label>
                <Select
                  value={item.concepto_servicio_id || ''}
                  onValueChange={(v) => updateItem(idx, 'concepto_servicio_id', v)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Seleccionar concepto..." />
                  </SelectTrigger>
                  <SelectContent>
                    {conceptos
                      ?.filter((c: any) => c.visible_local !== false)
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nombre}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-3">
                <Label className="text-xs">{isNetoMode ? 'Monto Neto *' : 'Monto *'}</Label>
                <Input
                  type="number"
                  step="0.01"
                  className="h-9"
                  value={item.precio_unitario || ''}
                  onChange={(e) =>
                    updateItem(idx, 'precio_unitario', parseFloat(e.target.value) || 0)
                  }
                />
              </div>
              <div className="col-span-3">
                <Label className="text-xs">Subtotal</Label>
                <Input className="h-9 font-mono" value={`$ ${fmt(item.subtotal)}`} disabled />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Compra</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* ═══ MODE SELECTOR ═══ */}
          <div className="grid grid-cols-3 gap-2">
            {MODALIDAD_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isActive = modalidad === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setModalidad(opt.value)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    isActive
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon
                      className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
                    />
                    <span className={`text-sm font-medium ${isActive ? 'text-primary' : ''}`}>
                      {opt.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </button>
              );
            })}
          </div>

          {/* ═══ HEADER: Proveedor + Factura datos ═══ */}
          <FormSection
            title={modalidad === 'sin_comprobante' ? 'Datos de la compra' : 'Datos de Factura'}
          >
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className={modalidad === 'sin_comprobante' ? 'col-span-2' : ''}>
                  <Label>Proveedor *</Label>
                  <Select value={form.proveedor_id} onValueChange={(v) => set('proveedor_id', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {proveedores?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.razon_social}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {modalidad !== 'sin_comprobante' && (
                  <div>
                    <Label>Fecha *</Label>
                    <Input
                      type="date"
                      value={form.factura_fecha}
                      onChange={(e) => set('factura_fecha', e.target.value)}
                    />
                  </div>
                )}
              </div>

              {modalidad === 'sin_comprobante' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Fecha</Label>
                    <Input
                      type="date"
                      value={form.factura_fecha}
                      onChange={(e) => set('factura_fecha', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Total pagado *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={totalPagado || ''}
                      onChange={(e) => setTotalPagado(parseFloat(e.target.value) || 0)}
                      placeholder="Ej: 50000"
                      className="font-mono"
                    />
                  </div>
                </div>
              )}

              {modalidad !== 'sin_comprobante' && (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Tipo</Label>
                    <Select value={form.factura_tipo} onValueChange={(v) => set('factura_tipo', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {FACTURA_TIPO_OPTIONS.map((f) => (
                          <SelectItem key={f.value} value={f.value}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Número *</Label>
                    <Input
                      value={form.factura_numero}
                      onChange={(e) => set('factura_numero', e.target.value)}
                      placeholder="0003-00012345"
                    />
                  </div>
                  <div />
                </div>
              )}
            </div>
          </FormSection>

          {/* ═══ ITEMS ═══ */}
          <FormSection title="Items">
            <div className="space-y-4">
              {items.map((item, idx) => renderItemRow(item, idx))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setItems((prev) => [...prev, emptyItem()])}
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Agregar item
              </Button>
            </div>
          </FormSection>

          {/* ═══ FISCAL SECTION — only for factura modes ═══ */}
          {modalidad === 'factura_simple' && (
            <FormSection title="Total de factura">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal Neto (items)</span>
                  <span className="font-mono font-medium">$ {fmt(totals.subtotalNeto)}</span>
                </div>
                <div>
                  <Label>Total factura (como figura en el ticket) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={totalFacturaManual || ''}
                    onChange={(e) => setTotalFacturaManual(parseFloat(e.target.value) || 0)}
                    placeholder="Copiá el total del ticket"
                    className="font-mono text-lg h-11"
                  />
                </div>
                {totalFacturaManual > 0 && totals.subtotalNeto > 0 && (
                  <div className="p-3 bg-muted/50 rounded-lg space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">IVA + impuestos (calculado)</span>
                      <span className="font-mono">
                        $ {fmt(totalFacturaManual - totals.subtotalNeto)}
                      </span>
                    </div>
                    <div className="flex justify-between font-medium border-t pt-1.5">
                      <span>Costo real (para FC%)</span>
                      <span className="font-mono text-primary">$ {fmt(totals.subtotalNeto)}</span>
                    </div>
                  </div>
                )}
              </div>
            </FormSection>
          )}

          {modalidad === 'factura_detallada' && (
            <FormSection title="Desglose fiscal (según factura)">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal Neto (items)</span>
                  <span className="font-mono font-medium">$ {fmt(totals.subtotalNeto)}</span>
                </div>

                <div className="border-t pt-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Info className="w-3 h-3" /> Completá solo lo que figura en la factura
                  </p>

                  <div>
                    <Label className="text-xs">Impuestos Internos</Label>
                    <Input
                      type="number"
                      step="0.01"
                      className="h-9"
                      value={impuestos.imp_internos || ''}
                      onChange={(e) => setImp('imp_internos', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">
                        IVA 21% <span className="text-primary">(CF)</span>
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        className="h-9"
                        value={impuestos.iva_21 || ''}
                        onChange={(e) => setImp('iva_21', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">
                        IVA 10.5% <span className="text-primary">(CF)</span>
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        className="h-9"
                        value={impuestos.iva_105 || ''}
                        onChange={(e) => setImp('iva_105', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">
                        Perc. IVA <span className="text-primary">(CF)</span>
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        className="h-9"
                        value={impuestos.perc_iva || ''}
                        onChange={(e) => setImp('perc_iva', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Perc. IIBB Prov.</Label>
                      <Input
                        type="number"
                        step="0.01"
                        className="h-9"
                        value={impuestos.perc_provincial || ''}
                        onChange={(e) => setImp('perc_provincial', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Perc. Municipal</Label>
                      <Input
                        type="number"
                        step="0.01"
                        className="h-9"
                        value={impuestos.perc_municipal || ''}
                        onChange={(e) => setImp('perc_municipal', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </FormSection>
          )}

          {/* ═══ TOTALS ═══ */}
          <FormSection title="Resumen">
            <div className="space-y-2">
              {modalidad === 'sin_comprobante' ? (
                <>
                  <div className="flex justify-between font-medium">
                    <span>Total pagado</span>
                    <span className="text-lg font-bold font-mono">$ {fmt(totalPagado)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Sin comprobante: todo el monto se toma como costo real, sin crédito fiscal.
                  </p>
                </>
              ) : (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal Neto</span>
                    <span className="font-mono">$ {fmt(totals.subtotalNeto)}</span>
                  </div>
                  {totals.totalImpuestos > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Impuestos</span>
                      <span className="font-mono">$ {fmt(totals.totalImpuestos)}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between font-medium">
                    <span>Total factura</span>
                    <span className="text-lg font-bold font-mono">
                      $ {fmt(totals.totalFactura)}
                    </span>
                  </div>
                  {totals.creditoFiscal > 0 && (
                    <>
                      <div className="border-t pt-2 flex justify-between text-sm">
                        <span className="text-muted-foreground">Crédito fiscal recuperable</span>
                        <span className="font-mono text-primary">
                          - $ {fmt(totals.creditoFiscal)}
                        </span>
                      </div>
                      <div className="flex justify-between font-medium text-sm">
                        <span>Costo real (centro de costos)</span>
                        <span className="font-mono font-semibold">$ {fmt(totals.costoReal)}</span>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </FormSection>

          {/* ═══ CONDICIÓN DE PAGO — only for factura modes ═══ */}
          {modalidad !== 'sin_comprobante' && (
            <FormSection title="Condición de Pago">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Condición</Label>
                  <Select
                    value={form.condicion_pago}
                    onValueChange={(v) => set('condicion_pago', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONDICION_PAGO_OPTIONS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {form.condicion_pago === 'cuenta_corriente' && (
                  <div>
                    <Label>Vencimiento (automático)</Label>
                    {computedVencimiento ? (
                      <Input
                        value={new Date(computedVencimiento + 'T12:00:00').toLocaleDateString(
                          'es-AR',
                        )}
                        disabled
                        className="font-mono"
                      />
                    ) : (
                      <p className="text-xs text-muted-foreground pt-2">
                        {selectedProveedor
                          ? 'Configure "Días de pago" en el proveedor.'
                          : 'Seleccione un proveedor.'}
                      </p>
                    )}
                  </div>
                )}
              </div>
              {form.condicion_pago === 'cuenta_corriente' &&
                selectedProveedor?.dias_pago_habitual && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Regla: {selectedProveedor.dias_pago_habitual} días desde fecha de factura
                  </p>
                )}
            </FormSection>
          )}

          <div>
            <Label>Observaciones</Label>
            <Textarea
              value={form.observaciones}
              onChange={(e) => set('observaciones', e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={create.isPending || !canSubmit}>
              {create.isPending
                ? 'Guardando...'
                : modalidad === 'sin_comprobante'
                  ? 'Registrar Compra'
                  : 'Guardar Factura'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

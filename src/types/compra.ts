export type FacturaProveedor = any;
export type ItemFactura = any;
export type PagoProveedor = any;
export type Gasto = any;

// Form types
export interface FacturaFormData {
  branch_id: string;
  proveedor_id: string;
  factura_tipo?: string;
  factura_numero: string;
  factura_fecha: string;
  condicion_pago: string;
  fecha_vencimiento?: string;
  medio_pago?: string;
  iva: number;
  otros_impuestos: number;
  tipo: string;
  motivo_extraordinaria?: string;
  periodo: string;
  observaciones?: string;
  items: ItemFacturaFormData[];
}

export interface ItemFacturaFormData {
  insumo_id: string;
  cantidad: number;
  unidad: string;
  precio_unitario: number;
  subtotal: number;
  afecta_costo_base?: boolean;
  categoria_pl?: string;
  observaciones?: string;
  alicuota_iva?: number | null;
  iva_monto?: number;
  precio_unitario_bruto?: number;
  precio_bruto?: number;
  descuento_porcentaje?: number;
  descuento_monto?: number;
  precio_neto?: number;
}

// === Fiscal detail types for CompraFormModal ===
export interface ImpuestosFactura {
  subtotal_bruto: number;
  total_descuentos: number;
  subtotal_neto: number;
  imp_internos: number;
  iva_21: number;
  iva_105: number;
  perc_iva: number;
  perc_provincial: number;
  perc_municipal: number;
  total_factura: number;
  costo_real: number;
}

/** Calculate costo_real: subtotal_neto + imp_internos + perc_provincial + perc_municipal */
export function calcularCostoReal(
  imp: Pick<
    ImpuestosFactura,
    'subtotal_neto' | 'imp_internos' | 'perc_provincial' | 'perc_municipal'
  >,
): number {
  return (
    (imp.subtotal_neto || 0) +
    (imp.imp_internos || 0) +
    (imp.perc_provincial || 0) +
    (imp.perc_municipal || 0)
  );
}

/** Calculate crédito fiscal: IVA 21% + IVA 10.5% + Perc. IVA */
export function calcularCreditoFiscal(
  imp: Pick<ImpuestosFactura, 'iva_21' | 'iva_105' | 'perc_iva'>,
): number {
  return (imp.iva_21 || 0) + (imp.iva_105 || 0) + (imp.perc_iva || 0);
}

export const IVA_OPTIONS = [
  { value: 21, label: '21%' },
  { value: 10.5, label: '10.5%' },
  { value: 27, label: '27%' },
  { value: 0, label: 'Exento (0%)' },
  { value: null, label: 'Sin factura' },
] as const;

export interface PagoProveedorFormData {
  proveedor_id: string;
  branch_id: string;
  monto: number;
  fecha_pago: string;
  medio_pago: string;
  referencia?: string;
  fecha_vencimiento_pago?: string;
  observaciones?: string;
  /** IDs de facturas a las que se aplica este pago, con montos parciales */
  aplicaciones?: { factura_id: string; monto_aplicado: number }[];
}

export interface GastoFormData {
  branch_id: string;
  fecha: string;
  periodo: string;
  categoria_principal: string;
  subcategoria?: string;
  concepto: string;
  monto: number;
  estado?: string;
  fecha_vencimiento?: string | null;
  fecha_pago?: string | null;
  medio_pago?: string;
  referencia_pago?: string;
  gasto_relacionado_id?: string | null;
  observaciones?: string;
}

// Constants
export const CONDICION_PAGO_OPTIONS = [
  { value: 'contado', label: 'Contado' },
  { value: 'cuenta_corriente', label: 'Cuenta Corriente' },
] as const;

export const MEDIO_PAGO_OPTIONS = [
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'cheque_plazo', label: 'Cheque con plazo' },
  { value: 'echeq_plazo', label: 'Echeq con plazo' },
] as const;

export const MEDIO_PAGO_OPTIONS_WITH_IMPUTACION = [
  ...MEDIO_PAGO_OPTIONS,
  { value: 'imputacion_saldo', label: 'Imputación saldo a favor' },
] as const;

export const FACTURA_TIPO_OPTIONS = [
  { value: 'A', label: 'Factura A' },
  { value: 'B', label: 'Factura B' },
  { value: 'C', label: 'Factura C' },
] as const;

export const CATEGORIA_GASTO_OPTIONS = [
  { value: 'caja_chica', label: 'Caja chica' },
  { value: 'propinas', label: 'Propinas / Gratificaciones' },
  { value: 'movilidad', label: 'Movilidad / Transporte' },
  { value: 'mantenimiento_express', label: 'Mantenimiento express' },
  { value: 'insumos_menores', label: 'Insumos menores (sin factura)' },
  { value: 'varios', label: 'Varios' },
] as const;

export const ESTADO_GASTO_OPTIONS = [
  { value: 'pagado', label: 'Pagado' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'parcial', label: 'Parcial' },
] as const;

export function getCurrentPeriodo(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

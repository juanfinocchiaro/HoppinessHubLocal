export type VentaMensual = any;
export type CanonLiquidacion = any;
export type PagoCannon = any;

export interface VentaMensualFormData {
  branch_id: string;
  periodo: string;
  fc_total: number;
  ft_total: number;
  observaciones?: string;
}

export interface CanonLiquidacionFormData {
  branch_id: string;
  periodo: string;
  ventas_id?: string;
  fc_total: number;
  ft_total: number;
  canon_porcentaje?: number;
  canon_monto: number;
  marketing_porcentaje?: number;
  marketing_monto: number;
  total_canon: number;
  fecha_vencimiento?: string;
  observaciones?: string;
}

export interface PagoCanonFormData {
  canon_liquidacion_id: string;
  branch_id: string;
  monto: number;
  fecha_pago: string;
  medio_pago: string;
  referencia?: string;
  observaciones?: string;
}

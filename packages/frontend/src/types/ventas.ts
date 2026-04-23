export type VentaMensual = any;
export type CanonLiquidacion = any;
export type PagoCannon = any;

export interface VentaMensualFormData {
  branch_id: string;
  period: string;
  fc_total: number;
  ft_total: number;
  notes?: string;
}

export interface CanonLiquidacionFormData {
  branch_id: string;
  period: string;
  monthly_sales_id?: string;
  online_total: number;
  cash_total: number;
  canon_porcentaje?: number;
  canon_monto: number;
  marketing_porcentaje?: number;
  marketing_monto: number;
  total_canon: number;
  due_date?: string;
  notes?: string;
}

export interface PagoCanonFormData {
  canon_settlement_id: string;
  branch_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference?: string;
  notes?: string;
}

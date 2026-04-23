import type { FiscalReportBranchData } from '@/lib/escpos';

export type FiscalBranchData = FiscalReportBranchData & {
  razon_social: string;
  iibb: string;
  condicion_iva: string;
  inicio_actividades: string;
  direccion_fiscal: string;
};

export type FacturaEmitidaWithPedido = any;

import type { Tables } from '@/integrations/supabase/types';
import type { FiscalReportBranchData } from '@/lib/escpos';

export type FiscalBranchData = FiscalReportBranchData & {
  razon_social: string;
  iibb: string;
  condicion_iva: string;
  inicio_actividades: string;
  direccion_fiscal: string;
};

export type FacturaEmitidaWithPedido = Tables<'facturas_emitidas'> & {
  pedidos: Pick<Tables<'pedidos'>, 'numero_pedido' | 'total' | 'cliente_nombre'>;
};

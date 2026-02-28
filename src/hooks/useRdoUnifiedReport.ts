import { useQuery } from '@tanstack/react-query';
import { fetchRdoUnifiedReport } from '@/services/rdoService';
import type { FiltrosRdo, RdoMultivistaData } from './useRdoMultivista';
import type { RdoReportLine } from '@/types/rdo';

export interface RdoUnifiedCmv {
  cmv_auto: number;
  cmv_manual_ajuste: number;
  cmv_total: number;
  por_rubro: Array<{
    category_code: string;
    category_name: string;
    total: number;
    gastos: Array<{
      producto_id: string | null;
      producto_nombre: string;
      cantidad: number;
      total: number;
    }>;
  }>;
}

export interface RdoUnifiedFiscal {
  ventas_brutas_totales: number;
  ventas_facturadas_brutas_original: number;
  ventas_facturadas_brutas: number;
  notas_credito_brutas: number;
  ventas_facturadas_netas: number;
  ventas_no_facturadas_netas: number;
  ventas_netas_rdo: number;
  iva_ventas_bruto: number;
  iva_notas_credito: number;
  iva_ventas: number;
  compras_blanco_brutas: number;
  compras_blanco_netas: number;
  iva_compras: number;
  saldo_iva: number;
}

export interface RdoUnifiedDiagnosticoCostos {
  items_sin_costo_count: number;
  ventas_afectadas: number;
  productos_top_sin_costo: Array<{
    producto_id: string | null;
    producto_nombre: string;
    cantidad: number;
    ventas: number;
  }>;
}

export interface RdoUnifiedReportData {
  periodo: string;
  fecha_desde: string;
  fecha_hasta: string;
  multivista: RdoMultivistaData;
  rdo_lines: RdoReportLine[];
  cmv: RdoUnifiedCmv;
  fiscal: RdoUnifiedFiscal;
  diagnostico_costos: RdoUnifiedDiagnosticoCostos;
}

export function useRdoUnifiedReport(
  branchId: string | undefined,
  periodo: string,
  filtros: Omit<FiltrosRdo, 'fechaDesde' | 'fechaHasta'>,
) {
  return useQuery({
    queryKey: [
      'rdo-unified-report',
      branchId,
      periodo,
      filtros.canales,
      filtros.mediosPago,
      filtros.categorias,
      filtros.productos,
    ],
    queryFn: async (): Promise<RdoUnifiedReportData> => {
      if (!branchId) throw new Error('Branch ID requerido');

      return fetchRdoUnifiedReport(branchId, periodo, filtros);
    },
    enabled: !!branchId && !!periodo,
  });
}

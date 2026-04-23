import { useQuery } from '@tanstack/react-query';
import { fetchRdoMultivista } from '@/services/rdoService';

export interface FiltrosRdo {
  fechaDesde: string;
  fechaHasta: string;
  canales: string[];
  mediosPago: string[];
  categorias: string[];
  productos: string[];
}

export interface OpcionSimple {
  id: string;
  label: string;
}

export interface OpcionCategoria {
  id: string;
  nombre: string;
}

export interface OpcionProducto {
  id: string;
  nombre: string;
  categoria_id: string | null;
  categoria_nombre: string | null;
}

export interface RdoTotales {
  total_ventas: number;
  total_pedidos: number;
  ticket_promedio: number;
  total_facturado: number;
  total_no_facturado: number;
}

export interface RdoPorCanalRow {
  canal: string;
  pedidos: number;
  ventas: number;
  porcentaje: number;
  ticket_promedio: number;
}

export interface RdoPorMedioRow {
  payment_method: string;
  pedidos: number;
  ventas: number;
  porcentaje: number;
  facturado: number;
}

export interface RdoPorCategoriaRow {
  categoria_id: string | null;
  categoria_nombre: string;
  cantidad: number;
  ventas: number;
  porcentaje: number;
  costo_total: number;
  food_cost: number;
}

export interface RdoPorProductoRow {
  producto_id: string | null;
  producto_nombre: string;
  categoria_id: string | null;
  categoria_nombre: string;
  cantidad: number;
  ventas: number;
  porcentaje: number;
  food_cost: number;
}

export interface RdoMultivistaData {
  totales: RdoTotales;
  por_canal: RdoPorCanalRow[];
  por_medio_pago: RdoPorMedioRow[];
  por_categoria: RdoPorCategoriaRow[];
  por_producto: RdoPorProductoRow[];
  opciones_filtros: {
    canales: OpcionSimple[];
    medios_pago: OpcionSimple[];
    categorias: OpcionCategoria[];
    productos: OpcionProducto[];
  };
}

export function useRdoMultivista(branchId: string | undefined, filtros: FiltrosRdo) {
  return useQuery({
    queryKey: [
      'rdo-multivista',
      branchId,
      filtros.fechaDesde,
      filtros.fechaHasta,
      filtros.canales,
      filtros.mediosPago,
      filtros.categorias,
      filtros.productos,
    ],
    queryFn: async (): Promise<RdoMultivistaData> => {
      if (!branchId) {
        throw new Error('Branch ID requerido');
      }

      return fetchRdoMultivista(branchId, filtros);
    },
    enabled: !!branchId,
  });
}

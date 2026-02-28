/**
 * usePosOrderHistory - Fetch POS orders with items & payments, with client-side filtering
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchOrderHistory } from '@/services/posService';
import { subDays, startOfDay, format } from 'date-fns';

export type OrderFilterCanalVenta = 'todos' | 'mostrador' | 'apps';
export type OrderFilterTipoServicio = 'todos' | 'takeaway' | 'comer_aca' | 'delivery';
export type OrderFilterMetodoPago =
  | 'todos'
  | 'efectivo'
  | 'tarjeta_debito'
  | 'tarjeta_credito'
  | 'mercadopago_qr'
  | 'transferencia';
export type OrderFilterEstado = 'todos' | 'entregado' | 'listo' | 'cancelado';

export interface OrderFilters {
  canalVenta: OrderFilterCanalVenta;
  tipoServicio: OrderFilterTipoServicio;
  metodoPago: OrderFilterMetodoPago;
  estado: OrderFilterEstado;
  searchQuery: string;
}

export const DEFAULT_FILTERS: OrderFilters = {
  canalVenta: 'todos',
  tipoServicio: 'todos',
  metodoPago: 'todos',
  estado: 'todos',
  searchQuery: '',
};

interface PedidoItem {
  id: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  notas: string | null;
  categoria_carta_id: string | null;
}

interface PedidoPago {
  id: string;
  metodo: string;
  monto: number;
}

export interface PosOrderFactura {
  id: string;
  tipo_comprobante: string;
  punto_venta: number;
  numero_comprobante: number;
  cae: string | null;
  cae_vencimiento: string | null;
  neto: number;
  iva: number;
  total: number;
  fecha_emision: string;
  receptor_cuit: string | null;
  receptor_razon_social: string | null;
  receptor_condicion_iva: string | null;
  anulada: boolean;
  factura_asociada_id: string | null;
}

export interface PosOrder {
  id: string;
  numero_pedido: number;
  numero_llamador: number | null;
  created_at: string;
  canal_venta: string | null;
  tipo_servicio: string | null;
  canal_app: string | null;
  cliente_nombre: string | null;
  cliente_telefono: string | null;
  cliente_direccion: string | null;
  estado: string;
  subtotal: number;
  descuento: number | null;
  total: number;
  pedido_items: PedidoItem[];
  pedido_pagos: PedidoPago[];
  facturas_emitidas: PosOrderFactura[];
}

export function usePosOrderHistory(
  branchId: string | undefined,
  daysBack: number,
  filters: OrderFilters,
) {
  const fromDate = format(subDays(startOfDay(new Date()), daysBack), 'yyyy-MM-dd');

  const { data: rawOrders, isLoading } = useQuery({
    queryKey: ['pos-order-history', branchId, daysBack],
    queryFn: async () => {
      if (!branchId) return [];
      const data = await fetchOrderHistory(branchId, fromDate);
      return data as PosOrder[];
    },
    enabled: !!branchId,
  });

  const orders = useMemo(() => {
    if (!rawOrders) return [];
    return rawOrders.filter((order) => {
      // Canal
      if (filters.canalVenta !== 'todos' && order.canal_venta !== filters.canalVenta) return false;
      // Tipo servicio
      if (filters.tipoServicio !== 'todos' && order.tipo_servicio !== filters.tipoServicio)
        return false;
      // Estado
      if (filters.estado !== 'todos' && order.estado !== filters.estado) return false;
      // Metodo de pago (client-side: order has at least one payment with that method)
      if (filters.metodoPago !== 'todos') {
        const hasMethod = order.pedido_pagos?.some((p) => p.metodo === filters.metodoPago);
        if (!hasMethod) return false;
      }
      // Search
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        const matchNum = String(order.numero_pedido).includes(q);
        const matchName = order.cliente_nombre?.toLowerCase().includes(q);
        if (!matchNum && !matchName) return false;
      }
      return true;
    });
  }, [
    rawOrders,
    filters.canalVenta,
    filters.tipoServicio,
    filters.metodoPago,
    filters.estado,
    filters.searchQuery,
  ]);

  const totals = useMemo(() => {
    const totalVendido = orders.reduce((s, o) => s + (o.total || 0), 0);
    const cantidad = orders.length;
    return {
      totalVendido,
      cantidad,
      ticketPromedio: cantidad > 0 ? totalVendido / cantidad : 0,
    };
  }, [orders]);

  return { orders, totals, isLoading };
}

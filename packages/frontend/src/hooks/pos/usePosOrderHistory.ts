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
  | 'cash'
  | 'debit_card'
  | 'credit_card'
  | 'mercadopago_qr'
  | 'transfer';
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
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  notes: string | null;
  categoria_carta_id: string | null;
}

interface PedidoPago {
  id: string;
  method: string;
  amount: number;
}

export interface PosOrderFactura {
  id: string;
  receipt_type: string;
  point_of_sale: number;
  receipt_number: number;
  cae: string | null;
  cae_vencimiento: string | null;
  neto: number;
  iva: number;
  total: number;
  issue_date: string;
  receptor_cuit: string | null;
  receptor_razon_social: string | null;
  receptor_condicion_iva: string | null;
  anulada: boolean;
  linked_invoice_id: string | null;
}

export interface PosOrder {
  id: string;
  order_number: number;
  caller_number: number | null;
  created_at: string;
  canal_venta: string | null;
  service_type: string | null;
  canal_app: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  status: string;
  subtotal: number;
  descuento: number | null;
  total: number;
  order_items: PedidoItem[];
  order_payments: PedidoPago[];
  issued_invoices: PosOrderFactura[];
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
      if (filters.tipoServicio !== 'todos' && order.service_type !== filters.tipoServicio)
        return false;
      // Estado
      if (filters.estado !== 'todos' && order.status !== filters.estado) return false;
      // Metodo de pago (client-side: order has at least one payment with that method)
      if (filters.metodoPago !== 'todos') {
        const hasMethod = order.order_payments?.some((p) => p.method === filters.metodoPago);
        if (!hasMethod) return false;
      }
      // Search
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        const matchNum = String(order.order_number).includes(q);
        const matchName = order.customer_name?.toLowerCase().includes(q);
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

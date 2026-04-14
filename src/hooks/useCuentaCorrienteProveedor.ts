import { useQuery } from '@tanstack/react-query';
import {
  fetchProveedorFacturas,
  fetchProveedorPagos,
  fetchSaldoProveedor,
  fetchMovimientosProveedorData,
} from '@/services/proveedoresService';
import { useAuth } from './useAuth';

export interface MovimientoCuenta {
  id: string;
  date: string;
  tipo: 'factura' | 'pago';
  invoice_number?: string;
  payment_method?: string;
  referencia?: string;
  amount: number;
  estado?: string;
  due_date?: string;
  items_count?: number;
  cumulative_balance: number;
  is_verified?: boolean;
}

export interface ResumenCuenta {
  /** Running total of all invoices */
  total_facturado: number;
  /** Sum of ALL payments (verified + unverified) */
  total_pagado: number;
  /** Sum of only verified payments */
  total_pagado_verificado: number;
  /** Sum of unverified payments */
  total_pagado_pendiente_verif: number;
  /** Count of unverified payments */
  pagos_pendientes_verif: number;
  /** Net balance: facturado - pagado (negative = saldo a favor) */
  saldo_actual: number;
  /** Sum of overpayments from invoices with negative saldo_pendiente */
  saldo_a_favor_facturas: number;
  /** Total overdue amount (from invoices past due) */
  monto_vencido: number;
  /** Count of overdue invoices */
  facturas_vencidas: number;
  /** Total not-yet-due amount */
  monto_por_vencer: number;
  /** Next due date, or null */
  proximo_vencimiento: string | null;
  /** Whether all pending invoices are overdue */
  todas_vencidas: boolean;
}

/** Parse YYYY-MM-DD as local date to avoid UTCâ†’local shift */
function parseLocalDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function useResumenProveedor(branchId?: string, proveedorId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['resumen-proveedor', branchId, proveedorId],
    queryFn: async () => {
      const facturas = await fetchProveedorFacturas(branchId!, proveedorId!) as any[];
      const pagos = await fetchProveedorPagos(branchId!, proveedorId!) as any[];

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let total_facturado = 0;
      let monto_vencido = 0;
      let monto_por_vencer = 0;
      let facturas_vencidas = 0;
      let proximo_vencimiento: string | null = null;
      let facturas_pendientes = 0;
      let saldo_a_favor_facturas = 0;

      for (const f of facturas || []) {
        total_facturado += Number(f.total);
        const sp = Number(f.pending_balance);
        if (sp < 0) {
          saldo_a_favor_facturas += Math.abs(sp);
        }
        if (f.payment_status === 'pendiente') {
          facturas_pendientes++;
          const venc = f.due_date ? parseLocalDate(f.due_date) : null;
          if (venc && venc < today) {
            monto_vencido += Number(f.pending_balance);
            facturas_vencidas++;
          } else {
            monto_por_vencer += Number(f.pending_balance);
            if (f.due_date) {
              if (!proximo_vencimiento || f.due_date < proximo_vencimiento) {
                proximo_vencimiento = f.due_date;
              }
            }
          }
        }
      }

      let total_pagado = 0;
      let total_pagado_verificado = 0;
      let total_pagado_pendiente_verif = 0;
      let pagos_pendientes_verif = 0;

      for (const p of pagos || []) {
        const m = Number(p.amount);
        total_pagado += m;
        if (p.is_verified) {
          total_pagado_verificado += m;
        } else {
          total_pagado_pendiente_verif += m;
          pagos_pendientes_verif++;
        }
      }

      const saldo_actual = total_facturado - total_pagado;

      const resumen: ResumenCuenta = {
        total_facturado,
        total_pagado,
        total_pagado_verificado,
        total_pagado_pendiente_verif,
        pagos_pendientes_verif,
        saldo_actual,
        saldo_a_favor_facturas,
        monto_vencido,
        facturas_vencidas,
        monto_por_vencer,
        proximo_vencimiento,
        todas_vencidas: facturas_pendientes > 0 && facturas_vencidas === facturas_pendientes,
      };

      return resumen;
    },
    enabled: !!user && !!branchId && !!proveedorId,
  });
}

/** @deprecated Use useResumenProveedor instead for summary data */
export function useSaldoProveedor(branchId?: string, proveedorId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['saldo-proveedor', branchId, proveedorId],
    queryFn: () => fetchSaldoProveedor(branchId!, proveedorId!),
    enabled: !!user && !!branchId && !!proveedorId,
  });
}

export function useMovimientosProveedor(branchId?: string, proveedorId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['movimientos-proveedor', branchId, proveedorId],
    queryFn: async () => {
      const { facturas, pagos } = await fetchMovimientosProveedorData(branchId!, proveedorId!) as { facturas: any[]; pagos: any[] };

      // Merge and sort chronologically, compute running balance
      const movimientos: MovimientoCuenta[] = [];

      for (const f of facturas || []) {
        movimientos.push({
          id: f.id,
          date: f.invoice_date,
          tipo: 'factura',
          invoice_number: `${f.invoice_type ? f.invoice_type + '-' : ''}${f.invoice_number}`,
          amount: Number(f.total),
          estado: f.payment_status ?? undefined,
          due_date: f.due_date ?? undefined,
          items_count: f.invoice_items?.length || 0,
          cumulative_balance: 0,
        });
      }

      for (const p of pagos || []) {
        movimientos.push({
          id: p.id,
          date: p.payment_date,
          tipo: 'pago',
          payment_method: p.payment_method ?? undefined,
          referencia: !p.invoice_id ? 'Pago a cuenta' : (p.reference ?? undefined),
          amount: Number(p.amount),
          cumulative_balance: 0,
          is_verified: p.is_verified ?? true,
        });
      }

      // Sort by date asc, facturas first on same date
      movimientos.sort((a, b) => {
        const d = a.date.localeCompare(b.date);
        if (d !== 0) return d;
        return a.tipo === 'factura' ? -1 : 1;
      });

      // Compute running balance
      let saldo = 0;
      for (const m of movimientos) {
        saldo += m.tipo === 'factura' ? m.amount : -m.amount;
        m.cumulative_balance = saldo;
      }

      // Return in reverse chronological order for display
      return movimientos.reverse();
    },
    enabled: !!user && !!branchId && !!proveedorId,
  });
}

import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';
import type { RdoFinancieroData } from '@/hooks/useRdoFinanciero';
import type { FiltrosRdo, RdoMultivistaData } from '@/hooks/useRdoMultivista';
import type { RdoUnifiedReportData } from '@/hooks/useRdoUnifiedReport';
import type { RdoMovimientoFormData } from '@/hooks/useRdoMovimientos';
import type { RdoCategoryFilters } from '@/hooks/useRdoCategories';
import type { VentaMensualPayload } from '@/hooks/useVentasMensuales';
import type {
  CashRegister,
  CashRegisterShift,
  CashRegisterMovement,
} from '@/hooks/useCashRegister';
import type {
  CashierStats,
  DiscrepancyEntry,
  CashierReportEntry,
} from '@/hooks/useCashierDiscrepancies';
import type { RdoCategory } from '@/types/rdo';
import type {
  FiscalXData,
  FiscalZData,
  FiscalAuditData,
  FiscalReportBranchData,
} from '@/lib/escpos';

// ── RDO Financiero ──────────────────────────────────────────────────

export async function fetchRdoFinanciero(
  branchId: string,
  periodo: string,
): Promise<RdoFinancieroData> {
  return apiGet<RdoFinancieroData>(`/financial/rdo/${branchId}/financiero`, { periodo });
}

// ── RDO Multivista ──────────────────────────────────────────────────

export async function fetchRdoMultivista(
  branchId: string,
  filtros: FiltrosRdo,
): Promise<RdoMultivistaData> {
  return apiPost<RdoMultivistaData>(`/financial/rdo/${branchId}/multivista`, {
    fechaDesde: filtros.fechaDesde,
    fechaHasta: filtros.fechaHasta,
    canales: filtros.canales,
    mediosPago: filtros.mediosPago,
    categorias: filtros.categorias,
    productos: filtros.productos,
  });
}

// ── RDO Unified Report ──────────────────────────────────────────────

export async function fetchRdoUnifiedReport(
  branchId: string,
  periodo: string,
  filtros: Omit<FiltrosRdo, 'fechaDesde' | 'fechaHasta'>,
): Promise<RdoUnifiedReportData> {
  return apiPost<RdoUnifiedReportData>(`/financial/rdo/${branchId}/unified-report`, {
    periodo,
    canales: filtros.canales,
    mediosPago: filtros.mediosPago,
    categorias: filtros.categorias,
    productos: filtros.productos,
  });
}

// ── RDO Movimientos ─────────────────────────────────────────────────

export async function fetchRdoMovimientos(branchId: string, periodo: string) {
  return apiGet(`/financial/rdo/${branchId}/movements`, { periodo });
}

export async function fetchRdoMovimientosByCategory(
  branchId: string,
  periodo: string,
  categoryCode: string,
) {
  return apiGet(`/financial/rdo/${branchId}/movements`, { periodo, categoryCode });
}

export async function upsertRdoMovimiento(data: RdoMovimientoFormData, userId?: string) {
  return apiPost(`/financial/rdo/${data.branch_id}/movements`, {
    ...data,
    userId,
  });
}

// ── RDO Categories ──────────────────────────────────────────────────

export async function fetchRdoCategories(filters?: RdoCategoryFilters): Promise<RdoCategory[]> {
  const params: Record<string, string> = {};
  if (filters?.level) params.level = filters.level;
  if (filters?.section) params.section = filters.section;
  if (filters?.itemType) params.itemType = filters.itemType;
  return apiGet<RdoCategory[]>('/financial/rdo-categories', params);
}

// ── Ventas Mensuales ────────────────────────────────────────────────

export async function fetchVentasMensuales(branchId: string) {
  return apiGet(`/financial/branches/${branchId}/monthly-sales`);
}

export async function createVentaMensual(payload: VentaMensualPayload, userId?: string) {
  return apiPost(`/financial/branches/${payload.branch_id}/monthly-sales`, {
    ...payload,
    userId,
  });
}

export async function updateVentaMensual(id: string, payload: VentaMensualPayload) {
  return apiPut(`/financial/monthly-sales/${id}`, payload);
}

export async function softDeleteVentaMensual(id: string) {
  return apiDelete(`/financial/monthly-sales/${id}`);
}

// ── Cash Registers ──────────────────────────────────────────────────

export async function fetchCashRegisters(branchId: string): Promise<CashRegister[]> {
  return apiGet<CashRegister[]>(`/financial/branches/${branchId}/cash-registers`);
}

export async function fetchOpenShiftsForRegisters(
  registerIds: string[],
): Promise<Record<string, CashRegisterShift | null>> {
  return apiPost<Record<string, CashRegisterShift | null>>(
    '/financial/cash-registers/open-shifts',
    { registerIds },
  );
}

export async function fetchCashMovements(shiftId: string): Promise<CashRegisterMovement[]> {
  return apiGet<CashRegisterMovement[]>(`/financial/cash-shifts/${shiftId}/movements`);
}

export async function fetchCashMovementsByShiftIds(
  shiftIds: string[],
): Promise<CashRegisterMovement[]> {
  return apiPost<CashRegisterMovement[]>('/financial/cash-shifts/movements-batch', { shiftIds });
}

export async function insertCashShift(params: {
  registerId: string;
  branchId: string;
  userId: string;
  openingAmount: number;
}) {
  return apiPost(`/financial/cash-shifts`, params);
}

export async function closeCashShift(params: {
  shiftId: string;
  userId: string;
  closingAmount: number;
  expectedAmount: number;
  notes?: string;
}) {
  return apiPost(`/financial/cash-shifts/${params.shiftId}/close`, params);
}

export async function insertCashMovement(params: {
  shiftId: string;
  branchId: string;
  type: 'income' | 'expense' | 'withdrawal' | 'deposit';
  paymentMethod: string;
  amount: number;
  concept: string;
  userId: string;
  orderId?: string;
}): Promise<CashRegisterMovement> {
  return apiPost<CashRegisterMovement>(`/financial/cash-shifts/${params.shiftId}/movements`, params);
}

export async function insertExpenseMovement(params: {
  shiftId: string;
  branchId: string;
  amount: number;
  concept: string;
  paymentMethod: string;
  userId: string;
  categoriaGasto?: string;
  rdoCategoryCode?: string;
  observaciones?: string;
  estadoAprobacion?: string;
}): Promise<CashRegisterMovement> {
  return apiPost<CashRegisterMovement>(
    `/financial/cash-shifts/${params.shiftId}/expense`,
    params,
  );
}

export async function transferBetweenRegisters(params: {
  sourceShiftId: string;
  destShiftId: string | null;
  amount: number;
  concept: string;
  userId: string;
  branchId: string;
}): Promise<{ transfer_id: string; withdrawal: unknown; deposit: unknown }> {
  return apiPost('/financial/cash-registers/transfer', params);
}

// ── Cashier Discrepancies ───────────────────────────────────────────

export async function fetchCashierDiscrepancyStats(
  userId: string,
  branchId?: string,
): Promise<CashierStats> {
  const params: Record<string, string> = { userId };
  if (branchId) params.branchId = branchId;
  return apiGet<CashierStats>('/financial/cashier-discrepancies/stats', params);
}

export async function fetchCashierHistory(
  userId: string,
  branchId?: string,
  limit = 20,
): Promise<DiscrepancyEntry[]> {
  const params: Record<string, string> = { userId, limit: String(limit) };
  if (branchId) params.branchId = branchId;
  return apiGet<DiscrepancyEntry[]>('/financial/cashier-discrepancies/history', params);
}

export async function fetchBranchDiscrepancyReport(
  branchId: string,
  startDate?: string,
  endDate?: string,
): Promise<CashierReportEntry[]> {
  const params: Record<string, string> = {};
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  return apiGet<CashierReportEntry[]>(
    `/financial/branches/${branchId}/cashier-discrepancy-report`,
    params,
  );
}

// ── POS Ventas Agregadas ─────────────────────────────────────────────

export async function fetchPosVentasAgregadas(branchId: string, periodo: string) {
  return apiGet<{ fc: number; ft: number; total: number }>(
    `/financial/branches/${branchId}/pos-ventas-agregadas`,
    { periodo },
  );
}

// ── Fiscal Reports ──────────────────────────────────────────────────

export async function fetchFiscalBranchData(
  branchId: string,
): Promise<
  | (FiscalReportBranchData & {
      razon_social: string;
      iibb: string;
      condicion_iva: string;
      inicio_actividades: string;
      direccion_fiscal: string;
    })
  | null
> {
  return apiGet(`/financial/branches/${branchId}/fiscal-data`);
}

export async function generateFiscalXReport(
  branchId: string,
  date?: string,
): Promise<FiscalXData> {
  return apiPost<FiscalXData>(`/financial/branches/${branchId}/fiscal-x`, {
    date: date || new Date().toISOString().slice(0, 10),
  });
}

export async function generateZClosing(
  branchId: string,
  date?: string,
): Promise<FiscalZData> {
  return apiPost<FiscalZData>(`/financial/branches/${branchId}/fiscal-z`, {
    date: date || new Date().toISOString().slice(0, 10),
  });
}

export async function fetchLastZClosing(branchId: string): Promise<FiscalZData | null> {
  return apiGet<FiscalZData | null>(`/financial/branches/${branchId}/fiscal-z/last`);
}

export async function fetchZClosings(branchId: string): Promise<FiscalZData[]> {
  return apiGet<FiscalZData[]>(`/financial/branches/${branchId}/fiscal-z`);
}

// ── Gastos ───────────────────────────────────────────────────────────

export async function fetchGastos(branchId: string, startDate: string, endDate: string) {
  return apiGet(`/financial/branches/${branchId}/gastos`, { startDate, endDate });
}

export async function softDeleteGasto(id: string) {
  return apiDelete(`/financial/gastos/${id}`);
}

export async function saveGasto(payload: Record<string, unknown>, editingId?: string) {
  if (editingId) {
    return apiPut(`/financial/gastos/${editingId}`, payload);
  }
  return apiPost('/financial/gastos', payload);
}

// ── Shift Closure Report ─────────────────────────────────────────────

export async function fetchShiftClosureReport(
  branchId: string,
  startIso: string,
  endIso: string,
) {
  return apiGet(`/financial/branches/${branchId}/shift-closure-report`, {
    startIso,
    endIso,
  });
}

// ── Branch Info ──────────────────────────────────────────────────────

export async function fetchBranchInfo(branchId: string) {
  return apiGet<{ id: string; name: string }>(`/branches/${branchId}/info`);
}

// ── Fiscal Audit Report ──────────────────────────────────────────────

export async function generateFiscalAuditReport(
  branchId: string,
  params: {
    mode: 'date' | 'z';
    fromDate?: string;
    toDate?: string;
    fromZ?: number;
    toZ?: number;
  },
): Promise<FiscalAuditData> {
  return apiPost<FiscalAuditData>(`/financial/branches/${branchId}/fiscal-audit`, params);
}

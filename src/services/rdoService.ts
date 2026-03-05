import { supabase } from './supabaseClient';
import { fromUntyped } from '@/lib/supabase-helpers';
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
import type { RdoCategory, RdoReportLine } from '@/types/rdo';
import type {
  FiscalXData,
  FiscalZData,
  FiscalAuditData,
  FiscalReportBranchData,
} from '@/lib/escpos';

// ── Helpers ─────────────────────────────────────────────────────────

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

// ── RDO Financiero ──────────────────────────────────────────────────

export async function fetchRdoFinanciero(
  branchId: string,
  periodo: string,
): Promise<RdoFinancieroData> {
  const { data, error } = await (supabase.rpc as any)('get_rdo_financiero', {
    _branch_id: branchId,
    _periodo: periodo,
  });
  if (error) throw error;
  return data as unknown as RdoFinancieroData;
}

// ── RDO Multivista ──────────────────────────────────────────────────

function normalizeMultivistaPayload(payload: any): RdoMultivistaData {
  const totales = payload?.totales ?? {};
  const opciones = payload?.opciones_filtros ?? {};

  return {
    totales: {
      total_ventas: toNumber(totales.total_ventas),
      total_pedidos: toNumber(totales.total_pedidos),
      ticket_promedio: toNumber(totales.ticket_promedio),
      total_facturado: toNumber(totales.total_facturado),
      total_no_facturado: toNumber(totales.total_no_facturado),
    },
    por_canal: toArray<any>(payload?.por_canal).map((row) => ({
      canal: String(row.canal ?? 'desconocido'),
      pedidos: toNumber(row.pedidos),
      ventas: toNumber(row.ventas),
      porcentaje: toNumber(row.porcentaje),
      ticket_promedio: toNumber(row.ticket_promedio),
    })),
    por_medio_pago: toArray<any>(payload?.por_medio_pago).map((row) => ({
      medio_pago: String(row.medio_pago ?? 'otro'),
      pedidos: toNumber(row.pedidos),
      ventas: toNumber(row.ventas),
      porcentaje: toNumber(row.porcentaje),
      facturado: toNumber(row.facturado),
    })),
    por_categoria: toArray<any>(payload?.por_categoria).map((row) => ({
      categoria_id: row.categoria_id ? String(row.categoria_id) : null,
      categoria_nombre: String(row.categoria_nombre ?? 'Sin categoría'),
      cantidad: toNumber(row.cantidad),
      ventas: toNumber(row.ventas),
      porcentaje: toNumber(row.porcentaje),
      costo_total: toNumber(row.costo_total),
      food_cost: toNumber(row.food_cost),
    })),
    por_producto: toArray<any>(payload?.por_producto).map((row) => ({
      producto_id: row.producto_id ? String(row.producto_id) : null,
      producto_nombre: String(row.producto_nombre ?? 'Sin nombre'),
      categoria_id: row.categoria_id ? String(row.categoria_id) : null,
      categoria_nombre: String(row.categoria_nombre ?? 'Sin categoría'),
      cantidad: toNumber(row.cantidad),
      ventas: toNumber(row.ventas),
      porcentaje: toNumber(row.porcentaje),
      food_cost: toNumber(row.food_cost),
    })),
    opciones_filtros: {
      canales: toArray<any>(opciones.canales).map((o) => ({
        id: String(o.id),
        label: String(o.label ?? o.id),
      })),
      medios_pago: toArray<any>(opciones.medios_pago).map((o) => ({
        id: String(o.id),
        label: String(o.label ?? o.id),
      })),
      categorias: toArray<any>(opciones.categorias).map((o) => ({
        id: String(o.id),
        nombre: String(o.nombre ?? 'Sin categoría'),
      })),
      productos: toArray<any>(opciones.productos).map((o) => ({
        id: String(o.id),
        nombre: String(o.nombre ?? 'Sin nombre'),
        categoria_id: o.categoria_id ? String(o.categoria_id) : null,
        categoria_nombre: o.categoria_nombre ? String(o.categoria_nombre) : null,
      })),
    },
  };
}

export async function fetchRdoMultivista(
  branchId: string,
  filtros: FiltrosRdo,
): Promise<RdoMultivistaData> {
  const { data, error } = await supabase.rpc('get_rdo_multivista', {
    _branch_id: branchId,
    _fecha_desde: filtros.fechaDesde,
    _fecha_hasta: filtros.fechaHasta,
    _canales: filtros.canales,
    _medios: filtros.mediosPago,
    _categorias: filtros.categorias,
    _productos: filtros.productos,
  } as any);
  if (error) throw error;
  return normalizeMultivistaPayload(data);
}

// ── RDO Unified Report ──────────────────────────────────────────────

export async function fetchRdoUnifiedReport(
  branchId: string,
  periodo: string,
  filtros: Omit<FiltrosRdo, 'fechaDesde' | 'fechaHasta'>,
): Promise<RdoUnifiedReportData> {
  const { data, error } = await supabase.rpc('get_rdo_unified_report', {
    _branch_id: branchId,
    _periodo: periodo,
    _canales: filtros.canales,
    _medios: filtros.mediosPago,
    _categorias: filtros.categorias,
    _productos: filtros.productos,
  } as any);
  if (error) throw error;

  const payload = (data || {}) as any;
  const mv = payload.multivista || {};

  const normalized: RdoUnifiedReportData = {
    periodo: String(payload.periodo || periodo),
    fecha_desde: String(payload.fecha_desde || ''),
    fecha_hasta: String(payload.fecha_hasta || ''),
    multivista: {
      totales: {
        total_ventas: toNumber(mv?.totales?.total_ventas),
        total_pedidos: toNumber(mv?.totales?.total_pedidos),
        ticket_promedio: toNumber(mv?.totales?.ticket_promedio),
        total_facturado: toNumber(mv?.totales?.total_facturado),
        total_no_facturado: toNumber(mv?.totales?.total_no_facturado),
      },
      por_canal: toArray<any>(mv?.por_canal).map((r) => ({
        canal: String(r.canal ?? 'desconocido'),
        pedidos: toNumber(r.pedidos),
        ventas: toNumber(r.ventas),
        porcentaje: toNumber(r.porcentaje),
        ticket_promedio: toNumber(r.ticket_promedio),
      })),
      por_medio_pago: toArray<any>(mv?.por_medio_pago).map((r) => ({
        medio_pago: String(r.medio_pago ?? 'otro'),
        pedidos: toNumber(r.pedidos),
        ventas: toNumber(r.ventas),
        porcentaje: toNumber(r.porcentaje),
        facturado: toNumber(r.facturado),
      })),
      por_categoria: toArray<any>(mv?.por_categoria).map((r) => ({
        categoria_id: r.categoria_id ? String(r.categoria_id) : null,
        categoria_nombre: String(r.categoria_nombre ?? 'Sin categoría'),
        cantidad: toNumber(r.cantidad),
        ventas: toNumber(r.ventas),
        porcentaje: toNumber(r.porcentaje),
        costo_total: toNumber(r.costo_total),
        food_cost: toNumber(r.food_cost),
      })),
      por_producto: toArray<any>(mv?.por_producto).map((r) => ({
        producto_id: r.producto_id ? String(r.producto_id) : null,
        producto_nombre: String(r.producto_nombre ?? 'Sin nombre'),
        categoria_id: r.categoria_id ? String(r.categoria_id) : null,
        categoria_nombre: String(r.categoria_nombre ?? 'Sin categoría'),
        cantidad: toNumber(r.cantidad),
        ventas: toNumber(r.ventas),
        porcentaje: toNumber(r.porcentaje),
        food_cost: toNumber(r.food_cost),
      })),
      opciones_filtros: {
        canales: toArray<any>(mv?.opciones_filtros?.canales).map((o) => ({
          id: String(o.id),
          label: String(o.label ?? o.id),
        })),
        medios_pago: toArray<any>(mv?.opciones_filtros?.medios_pago).map((o) => ({
          id: String(o.id),
          label: String(o.label ?? o.id),
        })),
        categorias: toArray<any>(mv?.opciones_filtros?.categorias).map((o) => ({
          id: String(o.id),
          nombre: String(o.nombre ?? 'Sin categoría'),
        })),
        productos: toArray<any>(mv?.opciones_filtros?.productos).map((o) => ({
          id: String(o.id),
          nombre: String(o.nombre ?? 'Sin nombre'),
          categoria_id: o.categoria_id ? String(o.categoria_id) : null,
          categoria_nombre: o.categoria_nombre ? String(o.categoria_nombre) : null,
        })),
      },
    },
    rdo_lines: toArray<RdoReportLine>(payload.rdo_lines),
    cmv: {
      cmv_auto: toNumber(payload?.cmv?.cmv_auto),
      cmv_manual_ajuste: toNumber(payload?.cmv?.cmv_manual_ajuste),
      cmv_total: toNumber(payload?.cmv?.cmv_total),
      por_rubro: toArray<any>(payload?.cmv?.por_rubro).map((r) => ({
        category_code: String(r?.category_code ?? ''),
        category_name: String(r?.category_name ?? 'Sin rubro'),
        total: toNumber(r?.total),
        gastos: toArray<any>(r?.gastos).map((g) => ({
          producto_id: g?.producto_id ? String(g.producto_id) : null,
          producto_nombre: String(g?.producto_nombre ?? 'Sin nombre'),
          cantidad: toNumber(g?.cantidad),
          total: toNumber(g?.total),
        })),
      })),
    },
    fiscal: {
      ventas_brutas_totales: toNumber(payload?.fiscal?.ventas_brutas_totales),
      ventas_facturadas_brutas_original: toNumber(
        payload?.fiscal?.ventas_facturadas_brutas_original,
      ),
      ventas_facturadas_brutas: toNumber(payload?.fiscal?.ventas_facturadas_brutas),
      notas_credito_brutas: toNumber(payload?.fiscal?.notas_credito_brutas),
      ventas_facturadas_netas: toNumber(payload?.fiscal?.ventas_facturadas_netas),
      ventas_no_facturadas_netas: toNumber(payload?.fiscal?.ventas_no_facturadas_netas),
      ventas_netas_rdo: toNumber(payload?.fiscal?.ventas_netas_rdo),
      iva_ventas_bruto: toNumber(payload?.fiscal?.iva_ventas_bruto),
      iva_notas_credito: toNumber(payload?.fiscal?.iva_notas_credito),
      iva_ventas: toNumber(payload?.fiscal?.iva_ventas),
      compras_blanco_brutas: toNumber(payload?.fiscal?.compras_blanco_brutas),
      compras_blanco_netas: toNumber(payload?.fiscal?.compras_blanco_netas),
      iva_compras: toNumber(payload?.fiscal?.iva_compras),
      saldo_iva: toNumber(payload?.fiscal?.saldo_iva),
    },
    diagnostico_costos: {
      items_sin_costo_count: toNumber(payload?.diagnostico_costos?.items_sin_costo_count),
      ventas_afectadas: toNumber(payload?.diagnostico_costos?.ventas_afectadas),
      productos_top_sin_costo: toArray<any>(
        payload?.diagnostico_costos?.productos_top_sin_costo,
      ).map((p) => ({
        producto_id: p.producto_id ? String(p.producto_id) : null,
        producto_nombre: String(p.producto_nombre ?? 'Sin nombre'),
        cantidad: toNumber(p.cantidad),
        ventas: toNumber(p.ventas),
      })),
    },
  };

  return normalized;
}

// ── RDO Movimientos ─────────────────────────────────────────────────

export async function fetchRdoMovimientos(branchId: string, periodo: string) {
  const { data, error } = await supabase
    .from('rdo_movimientos')
    .select('*')
    .eq('branch_id', branchId)
    .eq('periodo', periodo)
    .is('deleted_at', null)
    .order('rdo_category_code');
  if (error) throw error;
  return data;
}

export async function fetchRdoMovimientosByCategory(
  branchId: string,
  periodo: string,
  categoryCode: string,
) {
  const { data, error } = await supabase
    .from('rdo_movimientos')
    .select('*')
    .eq('branch_id', branchId)
    .eq('periodo', periodo)
    .eq('rdo_category_code', categoryCode)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function upsertRdoMovimiento(data: RdoMovimientoFormData, userId?: string) {
  await supabase
    .from('rdo_movimientos')
    .update({ deleted_at: new Date().toISOString() })
    .eq('branch_id', data.branch_id)
    .eq('periodo', data.periodo)
    .eq('rdo_category_code', data.rdo_category_code)
    .eq('origen', data.origen)
    .is('source_id', null)
    .is('deleted_at', null);

  if (data.monto === 0) return null;

  const { data: result, error } = await supabase
    .from('rdo_movimientos')
    .insert([
      {
        branch_id: data.branch_id,
        periodo: data.periodo,
        rdo_category_code: data.rdo_category_code,
        origen: data.origen,
        amount: data.monto,
        description: data.descripcion,
        datos_extra: data.datos_extra as any,
        created_by: userId,
      },
    ])
    .select()
    .single();
  if (error) throw error;
  return result;
}

// ── RDO Categories ──────────────────────────────────────────────────

export async function fetchRdoCategories(filters?: RdoCategoryFilters): Promise<RdoCategory[]> {
  let q = supabase.from('rdo_categories').select('*').eq('is_active', true).order('sort_order');

  if (filters?.level) {
    q = q.eq('level', filters.level);
  }
  if (filters?.section) {
    q = q.eq('rdo_section', filters.section);
  }
  if (filters?.itemType) {
    q = q.contains('allowed_item_types', [filters.itemType]);
  }

  const { data, error } = await q;
  if (error) throw error;
  return data as RdoCategory[];
}

// ── Ventas Mensuales ────────────────────────────────────────────────

export async function fetchVentasMensuales(branchId: string) {
  const { data, error } = await fromUntyped('branch_monthly_sales')
    .select('*')
    .eq('branch_id', branchId)
    .is('deleted_at', null)
    .order('periodo', { ascending: false });
  if (error) throw error;
  return (data as any[]) ?? [];
}

export async function createVentaMensual(payload: VentaMensualPayload, userId?: string) {
  const vt = payload.venta_total ?? 0;
  const ef = payload.efectivo ?? 0;
  const fc = vt - ef;

  const { data: existing } = await fromUntyped('branch_monthly_sales')
    .select('id')
    .eq('branch_id', payload.branch_id!)
    .eq('periodo', payload.periodo!)
    .not('deleted_at', 'is', null)
    .maybeSingle();

  if (existing) {
    const { data: result, error } = await fromUntyped('branch_monthly_sales')
      .update({
        venta_total: vt,
        efectivo: ef,
        fc_total: fc,
        ft_total: ef,
        observaciones: payload.observaciones,
        cargado_por: userId,
        deleted_at: null,
      } as any)
      .eq('id', (existing as any).id)
      .select()
      .single();
    if (error) throw error;
    return result;
  }

  const { data: result, error } = await fromUntyped('branch_monthly_sales')
    .insert({
      branch_id: payload.branch_id!,
      periodo: payload.periodo!,
      venta_total: vt,
      efectivo: ef,
      fc_total: fc,
      ft_total: ef,
      observaciones: payload.observaciones,
      cargado_por: userId,
    } as any)
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function updateVentaMensual(id: string, payload: VentaMensualPayload) {
  const vt = payload.venta_total ?? 0;
  const ef = payload.efectivo ?? 0;
  const fc = vt - ef;
  const { error } = await fromUntyped('branch_monthly_sales')
    .update({
      venta_total: vt,
      efectivo: ef,
      fc_total: fc,
      ft_total: ef,
      observaciones: payload.observaciones,
    } as any)
    .eq('id', id);
  if (error) throw error;
}

export async function softDeleteVentaMensual(id: string) {
  const { error } = await fromUntyped('branch_monthly_sales')
    .update({ deleted_at: new Date().toISOString() } as any)
    .eq('id', id);
  if (error) throw error;
}

// ── Cash Registers ──────────────────────────────────────────────────

export async function fetchCashRegisters(branchId: string): Promise<CashRegister[]> {
  const { data, error } = await supabase
    .from('cash_registers')
    .select('*')
    .eq('branch_id', branchId)
    .order('display_order');
  if (error) throw error;
  return (data || []) as CashRegister[];
}

export async function fetchOpenShiftsForRegisters(
  registerIds: string[],
): Promise<Record<string, CashRegisterShift | null>> {
  const shiftsMap: Record<string, CashRegisterShift | null> = {};
  for (const registerId of registerIds) {
    const { data } = await supabase
      .from('cash_register_shifts')
      .select('*')
      .eq('cash_register_id', registerId)
      .eq('status', 'open')
      .limit(1)
      .maybeSingle();
    shiftsMap[registerId] = data as CashRegisterShift | null;
  }
  return shiftsMap;
}

export async function fetchCashMovements(shiftId: string): Promise<CashRegisterMovement[]> {
  const { data, error } = await supabase
    .from('cash_register_movements')
    .select('*')
    .eq('shift_id', shiftId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as CashRegisterMovement[];
}

export async function fetchCashMovementsByShiftIds(
  shiftIds: string[],
): Promise<CashRegisterMovement[]> {
  const { data, error } = await supabase
    .from('cash_register_movements')
    .select('*')
    .in('shift_id', shiftIds)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as CashRegisterMovement[];
}

export async function insertCashShift(params: {
  registerId: string;
  branchId: string;
  userId: string;
  openingAmount: number;
}) {
  const { data, error } = await supabase
    .from('cash_register_shifts')
    .insert({
      cash_register_id: params.registerId,
      branch_id: params.branchId,
      opened_by: params.userId,
      opening_amount: params.openingAmount,
      status: 'open',
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function closeCashShift(params: {
  shiftId: string;
  userId: string;
  closingAmount: number;
  expectedAmount: number;
  notes?: string;
}) {
  const { error } = await supabase
    .from('cash_register_shifts')
    .update({
      closed_by: params.userId,
      closed_at: new Date().toISOString(),
      closing_amount: params.closingAmount,
      expected_amount: params.expectedAmount,
      difference: params.closingAmount - params.expectedAmount,
      notes: params.notes || null,
      status: 'closed',
    })
    .eq('id', params.shiftId);
  if (error) throw error;
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
  const { data, error } = await supabase
    .from('cash_register_movements')
    .insert({
      shift_id: params.shiftId,
      branch_id: params.branchId,
      type: params.type,
      payment_method: params.paymentMethod,
      amount: params.amount,
      concept: params.concept,
      recorded_by: params.userId,
      order_id: params.orderId || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as CashRegisterMovement;
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
  const { data, error } = await supabase
    .from('cash_register_movements')
    .insert({
      shift_id: params.shiftId,
      branch_id: params.branchId,
      type: 'expense',
      payment_method: params.paymentMethod,
      amount: params.amount,
      concept: params.concept,
      recorded_by: params.userId,
      categoria_gasto: params.categoriaGasto || null,
      rdo_category_code: params.rdoCategoryCode || null,
      observaciones: params.observaciones || null,
      estado_aprobacion: params.estadoAprobacion || 'aprobado',
    } as any)
    .select()
    .single();
  if (error) throw error;
  return data as CashRegisterMovement;
}

export async function transferBetweenRegisters(params: {
  sourceShiftId: string;
  destShiftId: string | null;
  amount: number;
  concept: string;
  userId: string;
  branchId: string;
}): Promise<{ transfer_id: string; withdrawal: any; deposit: any }> {
  const { data, error } = await (supabase.rpc as any)('transfer_between_registers', {
    p_source_shift_id: params.sourceShiftId,
    p_dest_shift_id: params.destShiftId,
    p_amount: params.amount,
    p_concept: params.concept,
    p_user_id: params.userId,
    p_branch_id: params.branchId,
  });
  if (error) throw error;
  return data as unknown as { transfer_id: string; withdrawal: any; deposit: any };
}

// ── Cashier Discrepancies ───────────────────────────────────────────

export async function fetchCashierDiscrepancyStats(
  userId: string,
  branchId?: string,
): Promise<CashierStats> {
  const { data, error } = await supabase.rpc('get_cashier_discrepancy_stats', {
    _user_id: userId,
    _branch_id: branchId || null,
  });
  if (error) throw error;

  const stats = data?.[0];
  if (!stats) {
    return {
      total_shifts: 0,
      perfect_shifts: 0,
      precision_pct: 100,
      discrepancy_this_month: 0,
      discrepancy_total: 0,
      last_discrepancy_date: null,
      last_discrepancy_amount: 0,
    };
  }

  return stats as CashierStats;
}

export async function fetchCashierHistory(
  userId: string,
  branchId?: string,
  limit = 20,
): Promise<DiscrepancyEntry[]> {
  let query = supabase
    .from('cashier_discrepancy_history')
    .select('*')
    .eq('user_id', userId)
    .order('shift_date', { ascending: false })
    .limit(limit);

  if (branchId) {
    query = query.eq('branch_id', branchId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as DiscrepancyEntry[];
}

export async function fetchBranchDiscrepancyReport(
  branchId: string,
  startDate?: string,
  endDate?: string,
): Promise<CashierReportEntry[]> {
  let query = supabase
    .from('cashier_discrepancy_history')
    .select('user_id, discrepancy, shift_date')
    .eq('branch_id', branchId);

  if (startDate) {
    query = query.gte('shift_date', startDate);
  }
  if (endDate) {
    query = query.lte('shift_date', endDate);
  }

  const { data: discrepancies, error } = await query;
  if (error) throw error;

  const userMap = new Map<
    string,
    {
      total: number;
      perfect: number;
      sum: number;
    }
  >();

  for (const d of discrepancies || []) {
    const current = userMap.get(d.user_id) || { total: 0, perfect: 0, sum: 0 };
    current.total += 1;
    if (d.discrepancy === 0) current.perfect += 1;
    current.sum += d.discrepancy;
    userMap.set(d.user_id, current);
  }

  const userIds = Array.from(userMap.keys());
  if (userIds.length === 0) return [];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', userIds);

  const nameMap = new Map(profiles?.map((p: any) => [p.id, p.full_name]) || []);

  const result: CashierReportEntry[] = [];
  for (const [userId, stats] of userMap.entries()) {
    result.push({
      user_id: userId,
      full_name: nameMap.get(userId) || 'Usuario',
      total_shifts: stats.total,
      perfect_shifts: stats.perfect,
      total_discrepancy: stats.sum,
      precision_pct: Math.round((stats.perfect / stats.total) * 100),
    });
  }

  result.sort((a, b) => a.total_discrepancy - b.total_discrepancy);

  return result;
}

// ── POS Ventas Agregadas ─────────────────────────────────────────────

export async function fetchPosVentasAgregadas(branchId: string, periodo: string) {
  const [year, month] = periodo.split('-').map(Number);
  const startDate = new Date(year, month - 1, 1).toISOString();
  const endDate = new Date(year, month, 1).toISOString();

  const { data: pedidos, error: pedidosError } = await fromUntyped('orders')
    .select('id, total')
    .eq('branch_id', branchId)
    .in('estado', ['entregado', 'listo'])
    .gte('created_at', startDate)
    .lt('created_at', endDate);

  if (pedidosError) throw pedidosError;
  if (!pedidos || pedidos.length === 0) {
    return { fc: 0, ft: 0, total: 0 };
  }

  const ventaTotal = pedidos.reduce((sum, p) => sum + Number(p.total || 0), 0);
  const pedidoIds = pedidos.map((p) => p.id);

  let totalEfectivo = 0;
  for (let i = 0; i < pedidoIds.length; i += 100) {
    const batch = pedidoIds.slice(i, i + 100);
    const { data: pagos, error: pagosError } = await fromUntyped('order_payments')
      .select('monto, metodo')
      .in('pedido_id', batch)
      .eq('metodo', 'efectivo');

    if (pagosError) throw pagosError;
    totalEfectivo += (pagos || []).reduce((sum, p) => sum + Number(p.monto || 0), 0);
  }

  return {
    fc: ventaTotal - totalEfectivo,
    ft: totalEfectivo,
    total: ventaTotal,
  };
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
  const [branchRes, afipRes] = await Promise.all([
    supabase.from('branches').select('name, address').eq('id', branchId).single(),
    supabase
      .from('afip_config')
      .select('cuit, punto_venta, direccion_fiscal, razon_social, inicio_actividades')
      .eq('branch_id', branchId)
      .single(),
  ]);
  if (!branchRes.data || !afipRes.data) return null;
  return {
    name: branchRes.data.name,
    cuit: afipRes.data.cuit || '',
    address: afipRes.data.direccion_fiscal || branchRes.data.address || '',
    punto_venta: afipRes.data.punto_venta || 0,
    razon_social: afipRes.data.razon_social || branchRes.data.name || '',
    iibb: afipRes.data.cuit || '',
    condicion_iva: 'IVA Responsable Inscripto',
    inicio_actividades: afipRes.data.inicio_actividades || '',
    direccion_fiscal: afipRes.data.direccion_fiscal || branchRes.data.address || '',
  };
}

export async function generateFiscalXReport(
  branchId: string,
  date?: string,
): Promise<FiscalXData> {
  const { data, error } = await (supabase.rpc as any)('get_fiscal_x_report', {
    p_branch_id: branchId,
    p_date: date || new Date().toISOString().slice(0, 10),
  });
  if (error) throw new Error(error.message);
  return data as unknown as FiscalXData;
}

export async function generateZClosing(
  branchId: string,
  date?: string,
): Promise<FiscalZData> {
  const { data, error } = await (supabase.rpc as any)('generate_z_closing', {
    p_branch_id: branchId,
    p_date: date || new Date().toISOString().slice(0, 10),
  });
  if (error) throw new Error(error.message);
  return data as unknown as FiscalZData;
}

export async function fetchLastZClosing(branchId: string): Promise<FiscalZData | null> {
  const { data, error } = await fromUntyped('fiscal_z_closings')
    .select('*')
    .eq('branch_id', branchId)
    .order('z_number', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as FiscalZData | null;
}

export async function fetchZClosings(branchId: string): Promise<FiscalZData[]> {
  const { data, error } = await fromUntyped('fiscal_z_closings')
    .select('*')
    .eq('branch_id', branchId)
    .order('z_number', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data || []) as unknown as FiscalZData[];
}

// ── Gastos ───────────────────────────────────────────────────────────

export async function fetchGastos(branchId: string, startDate: string, endDate: string) {
  const { data, error } = await fromUntyped('expenses')
    .select('*')
    .eq('branch_id', branchId)
    .gte('fecha', startDate)
    .lte('fecha', endDate)
    .is('deleted_at', null)
    .order('fecha', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function softDeleteGasto(id: string) {
  const { error } = await fromUntyped('expenses')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function saveGasto(payload: Record<string, unknown>, editingId?: string) {
  if (editingId) {
    const { error } = await fromUntyped('expenses').update(payload).eq('id', editingId);
    if (error) throw error;
  } else {
    const { error } = await fromUntyped('expenses').insert(payload as any);
    if (error) throw error;
  }
}

// ── Shift Closure Report ─────────────────────────────────────────────

export async function fetchShiftClosureReport(
  branchId: string,
  startIso: string,
  endIso: string,
) {
  const [ordersRes, cancelledRes, cashShiftsRes] = await Promise.all([
    fromUntyped('orders')
      .select(
        `id, created_at, total, estado, canal_venta, tipo_servicio, canal_app,
        order_payments (metodo, monto),
        order_items (nombre, cantidad, precio_unitario, subtotal)`,
      )
      .eq('branch_id', branchId)
      .gte('created_at', startIso)
      .lt('created_at', endIso)
      .neq('estado', 'cancelado'),
    fromUntyped('orders')
      .select('id, numero_llamador, total, cliente_notas, created_at')
      .eq('branch_id', branchId)
      .eq('estado', 'cancelado')
      .gte('created_at', startIso)
      .lt('created_at', endIso),
    supabase
      .from('cash_register_shifts')
      .select(
        `id, opened_at, closed_at, opening_amount, closing_amount,
        expected_amount, difference, status, notes,
        cash_registers (name)`,
      )
      .eq('branch_id', branchId)
      .gte('opened_at', startIso)
      .lt('opened_at', endIso),
  ]);
  return {
    orders: ordersRes.data || [],
    cancelledOrders: cancelledRes.data || [],
    cashShifts: cashShiftsRes.data || [],
  };
}

// ── Branch Info ──────────────────────────────────────────────────────

export async function fetchBranchInfo(branchId: string) {
  const { data, error } = await supabase
    .from('branches')
    .select('id, name')
    .eq('id', branchId)
    .single();
  if (error) throw error;
  return data;
}

// ── Fiscal Reports ──────────────────────────────────────────────────

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
  const { data, error } = await (supabase.rpc as any)('get_fiscal_audit_report', {
    p_branch_id: branchId,
    p_from_date: params.mode === 'date' ? params.fromDate : null,
    p_to_date: params.mode === 'date' ? params.toDate : null,
    p_from_z: params.mode === 'z' ? params.fromZ : null,
    p_to_z: params.mode === 'z' ? params.toZ : null,
  });
  if (error) throw new Error(error.message);
  return data as unknown as FiscalAuditData;
}

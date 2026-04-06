import { supabase } from './supabaseClient';
import { fromUntyped } from '@/lib/supabase-helpers';
import type { FacturaFormData, PagoProveedorFormData } from '@/types/compra';
import type { InversionFormData } from '@/hooks/useInversiones';
import type { ConsumoManualFormData } from '@/hooks/useConsumosManuales';
import type { SocioFormData, MovimientoSocioFormData } from '@/hooks/useSocios';
import type { ConceptoServicioFormData } from '@/hooks/useConceptosServicio';
import type { CanonLiquidacionFormData, PagoCanonFormData } from '@/types/ventas';

// ── Canon Liquidaciones ─────────────────────────────────────────────

export async function fetchCanonLiquidaciones(branchId?: string) {
  let q = fromUntyped('canon_settlements')
    .select('*, branches!canon_liquidaciones_branch_id_fkey(name)')
    .is('deleted_at', null)
    .order('period', { ascending: false });

  if (branchId) q = q.eq('branch_id', branchId);

  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function createCanonLiquidacion(data: CanonLiquidacionFormData, userId?: string) {
  const { data: result, error } = await fromUntyped('canon_settlements')
    .insert({
      branch_id: data.branch_id,
      periodo: data.period,
      ventas_id: data.ventas_id,
      fc_total: data.fc_total,
      ft_total: data.ft_total,
      canon_porcentaje: data.canon_porcentaje ?? 4.5,
      canon_monto: data.canon_monto,
      marketing_porcentaje: data.marketing_porcentaje ?? 0.5,
      marketing_monto: data.marketing_monto,
      total_canon: data.total_canon,
      fecha_vencimiento: data.due_date,
      notes: data.notes,
      created_by: userId,
    })
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function fetchPagosCanon(canonId: string) {
  const { data, error } = await fromUntyped('canon_payments')
    .select('*')
    .eq('canon_liquidacion_id', canonId)
    .is('deleted_at', null)
    .order('payment_date', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchPagosCanonFromProveedores(branchId: string, periodo: string) {
  const { data: factura } = await fromUntyped('supplier_invoices')
    .select('id')
    .eq('branch_id', branchId)
    .eq('period', periodo)
    .eq('proveedor_id', '00000000-0000-0000-0000-000000000001')
    .is('deleted_at', null)
    .maybeSingle();

  if (!factura) return [];

  const { data: pagos, error } = await fromUntyped('supplier_payments')
    .select(
      'id, payment_date, amount, payment_method, referencia, notes, is_verified, verificado_por, verificado_at, verificado_notas, created_at',
    )
    .eq('factura_id', factura.id)
    .is('deleted_at', null)
    .order('payment_date', { ascending: false });
  if (error) throw error;
  return pagos ?? [];
}

export async function createPagoCanon(data: PagoCanonFormData, userId?: string) {
  const { data: result, error } = await fromUntyped('canon_payments')
    .insert({
      canon_liquidacion_id: data.canon_liquidacion_id,
      branch_id: data.branch_id,
      amount: data.monto,
      payment_date: data.fecha_pago,
      payment_method: data.medio_pago,
      referencia: data.referencia,
      notes: data.observaciones,
      created_by: userId,
    })
    .select()
    .single();
  if (error) throw error;
  return result;
}

// ── Periodos ────────────────────────────────────────────────────────

export async function fetchPeriodos(branchId: string) {
  const { data, error } = await supabase
    .from('periods')
    .select('*')
    .eq('branch_id', branchId)
    .order('period', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createPeriodo(branchId: string, periodo: string) {
  const { data, error } = await supabase
    .from('periods')
    .insert({ branch_id: branchId, period: periodo, status: 'abierto' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function cerrarPeriodo(id: string, userId?: string, motivo?: string) {
  const { error } = await supabase
    .from('periods')
    .update({
      status: 'cerrado',
      closed_at: new Date().toISOString(),
      closed_by: userId,
      close_reason: motivo || null,
    })
    .eq('id', id);
  if (error) throw error;
}

export async function reabrirPeriodo(id: string, userId?: string, motivo?: string) {
  const { error } = await supabase
    .from('periods')
    .update({
      status: 'abierto',
      reopened_at: new Date().toISOString(),
      reopened_by: userId,
      reopen_reason: motivo,
    })
    .eq('id', id);
  if (error) throw error;
}

// ── Facturas ────────────────────────────────────────────────────────

export async function fetchFacturas(branchId: string, periodo?: string) {
  let q = fromUntyped('supplier_invoices')
    .select(
      '*, suppliers(business_name), invoice_items(*, supplies(name), service_concepts(name))',
    )
    .eq('branch_id', branchId)
    .is('deleted_at', null)
    .order('invoice_date', { ascending: false });

  if (periodo) q = q.eq('period', periodo);

  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function fetchFacturaById(facturaId: string) {
  const { data, error } = await fromUntyped('supplier_invoices')
    .select('*')
    .eq('id', facturaId)
    .single();
  if (error) throw error;
  return data;
}

export async function insertFacturaCompleta(
  data: FacturaFormData & {
    subtotal_bruto?: number;
    total_descuentos?: number;
    subtotal_neto?: number;
    imp_internos?: number;
    iva_21?: number;
    iva_105?: number;
    perc_iva?: number;
    perc_provincial?: number;
    perc_municipal?: number;
    total_factura?: number;
  },
  userId?: string,
) {
  const subtotalItems = data.items.reduce((s, i) => s + i.subtotal, 0);
  const total =
    data.total_factura != null
      ? data.total_factura
      : subtotalItems + (data.iva || 0) + (data.otros_impuestos || 0);
  const estadoPago = data.condicion_pago === 'contado' ? 'pagado' : 'pendiente';

  const facturaPayload = {
    branch_id: data.branch_id,
    proveedor_id: data.proveedor_id,
    invoice_type: data.factura_tipo || null,
    invoice_number: data.factura_numero,
    invoice_date: data.factura_fecha,
    subtotal: subtotalItems,
    iva: data.iva || 0,
    otros_impuestos: data.otros_impuestos || 0,
    total,
    payment_terms: data.condicion_pago,
    due_date: data.fecha_vencimiento || null,
    payment_status: estadoPago,
    pending_balance: estadoPago === 'pagado' ? 0 : total,
    type: data.tipo || 'normal',
    extraordinary_reason: data.motivo_extraordinaria || null,
    period: data.periodo,
    notes: data.observaciones || null,
    created_by: userId || null,
    subtotal_bruto: data.subtotal_bruto ?? null,
    total_descuentos: data.total_descuentos ?? 0,
    subtotal_neto: data.subtotal_neto ?? null,
    imp_internos: data.imp_internos ?? 0,
    iva_21: data.iva_21 ?? 0,
    iva_105: data.iva_105 ?? 0,
    perc_iva: data.perc_iva ?? 0,
    perc_provincial: data.perc_provincial ?? 0,
    perc_municipal: data.perc_municipal ?? 0,
    total_factura: data.total_factura ?? null,
  };

  const itemsPayload = data.items.map((item: any) => ({
    tipo_item: item.tipo_item || 'insumo',
    insumo_id: item.tipo_item === 'servicio' ? null : item.insumo_id || null,
    concepto_servicio_id: item.tipo_item === 'servicio' ? item.concepto_servicio_id : null,
    cantidad: item.tipo_item === 'servicio' ? 1 : item.cantidad,
    unidad: item.tipo_item === 'servicio' ? null : item.unidad || null,
    precio_unitario: item.precio_unitario,
    subtotal: item.subtotal,
    afecta_costo_base: item.afecta_costo_base ?? true,
    categoria_pl: item.categoria_pl || null,
    alicuota_iva: item.alicuota_iva ?? null,
    iva_monto: item.iva_monto ?? null,
    precio_unitario_bruto: item.precio_unitario_bruto ?? null,
  }));

  const { data: facturaId, error } = await supabase.rpc('insert_complete_invoice', {
    p_factura: facturaPayload,
    p_items: itemsPayload,
  });

  if (error) throw error;
  return { id: facturaId };
}

export async function softDeleteFactura(id: string) {
  const { error } = await fromUntyped('supplier_invoices')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// ── Pagos proveedor ─────────────────────────────────────────────────

export async function fetchPagosProveedor(facturaId: string) {
  const { data, error } = await fromUntyped('invoice_payment_links')
    .select('monto_aplicado, supplier_payments(*)')
    .eq('factura_id', facturaId);

  if (error) {
    const { data: legacyData, error: legacyErr } = await fromUntyped('supplier_payments')
      .select('*')
      .eq('factura_id', facturaId)
      .is('deleted_at', null)
      .order('payment_date', { ascending: false });
    if (legacyErr) throw legacyErr;
    return legacyData;
  }

  return (data || []).map((row: any) => ({
    ...row.supplier_payments,
    monto_aplicado: row.monto_aplicado,
  }));
}

export async function createPagoProveedor(data: PagoProveedorFormData, userId?: string) {
  const { data: pago, error: pagoErr } = await fromUntyped('supplier_payments')
    .insert({
      proveedor_id: data.proveedor_id,
      branch_id: data.branch_id,
      amount: data.monto,
      payment_date: data.fecha_pago,
      payment_method: data.medio_pago,
      referencia: data.referencia || null,
      payment_due_date: data.fecha_vencimiento_pago || null,
      notes: data.observaciones || null,
      created_by: userId,
    } as any)
    .select()
    .single();
  if (pagoErr) throw pagoErr;

  if (data.aplicaciones && data.aplicaciones.length > 0) {
    const junctionRows = data.aplicaciones.map((app) => ({
      pago_id: pago.id,
      factura_id: app.factura_id,
      monto_aplicado: app.monto_aplicado,
    }));

    const { error: junctionErr } = await fromUntyped('invoice_payment_links').insert(junctionRows);
    if (junctionErr) throw junctionErr;

    for (const app of data.aplicaciones) {
      const { data: factura, error: facturaErr } = await fromUntyped('supplier_invoices')
        .select('pending_balance')
        .eq('id', app.factura_id)
        .single();

      if (facturaErr) throw facturaErr;

      const nuevoSaldo = Math.max(0, (factura.pending_balance || 0) - app.monto_aplicado);
      const { error: updateErr } = await fromUntyped('supplier_invoices')
        .update({
          pending_balance: nuevoSaldo,
          payment_status: nuevoSaldo === 0 ? 'pagado' : 'parcial',
        })
        .eq('id', app.factura_id);

      if (updateErr) throw updateErr;
    }
  }

  return pago;
}

export async function softDeletePago(id: string) {
  const { error } = await fromUntyped('supplier_payments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// ── Inversiones ─────────────────────────────────────────────────────

export async function fetchInversiones(branchId: string, periodo?: string) {
  let q = fromUntyped('investments')
    .select('*')
    .eq('branch_id', branchId)
    .is('deleted_at', null)
    .order('date', { ascending: false });

  if (periodo) q = q.eq('period', periodo);

  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function createInversion(data: InversionFormData, userId?: string) {
  const { data: result, error } = await fromUntyped('investments')
    .insert({ ...data, created_by: userId })
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function updateInversion(id: string, data: Partial<InversionFormData>) {
  const { error } = await fromUntyped('investments').update(data).eq('id', id);
  if (error) throw error;
}

export async function softDeleteInversion(id: string) {
  const { error } = await fromUntyped('investments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// ── Consumos manuales ───────────────────────────────────────────────

export async function fetchConsumosManuales(branchId: string, periodo?: string) {
  let q = fromUntyped('manual_consumptions')
    .select('*')
    .eq('branch_id', branchId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (periodo) q = q.eq('period', periodo);

  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function createConsumoManual(data: ConsumoManualFormData, userId?: string) {
  const { data: result, error } = await fromUntyped('manual_consumptions')
    .insert({ ...data, created_by: userId })
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function updateConsumoManual(id: string, data: Partial<ConsumoManualFormData>) {
  const { error } = await fromUntyped('manual_consumptions').update(data).eq('id', id);
  if (error) throw error;
}

export async function softDeleteConsumoManual(id: string) {
  const { error } = await fromUntyped('manual_consumptions')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// ── Socios ──────────────────────────────────────────────────────────

export async function fetchSocios(branchId: string) {
  const { data, error } = await fromUntyped('partners')
    .select('*')
    .eq('branch_id', branchId)
    .is('deleted_at', null)
    .order('ownership_percentage', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchMovimientosSocio(branchId: string, socioId?: string) {
  let q = fromUntyped('partner_movements')
    .select('*')
    .eq('branch_id', branchId)
    .is('deleted_at', null)
    .order('date', { ascending: false });

  if (socioId) q = q.eq('socio_id', socioId);

  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function createSocio(data: SocioFormData, userId?: string) {
  const dbPayload = { ...data } as any;
  if (dbPayload.nombre !== undefined) { dbPayload.name = dbPayload.nombre; delete dbPayload.nombre; }
  if (dbPayload.porcentaje_participacion !== undefined) { dbPayload.ownership_percentage = dbPayload.porcentaje_participacion; delete dbPayload.porcentaje_participacion; }
  if (dbPayload.activo !== undefined) { dbPayload.is_active = dbPayload.activo; delete dbPayload.activo; }
  const { data: result, error } = await fromUntyped('partners')
    .insert({ ...dbPayload, created_by: userId })
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function updateSocio(id: string, data: Partial<SocioFormData>) {
  const dbPayload = { ...data } as any;
  if (dbPayload.nombre !== undefined) { dbPayload.name = dbPayload.nombre; delete dbPayload.nombre; }
  if (dbPayload.porcentaje_participacion !== undefined) { dbPayload.ownership_percentage = dbPayload.porcentaje_participacion; delete dbPayload.porcentaje_participacion; }
  if (dbPayload.activo !== undefined) { dbPayload.is_active = dbPayload.activo; delete dbPayload.activo; }
  const { error } = await fromUntyped('partners').update(dbPayload).eq('id', id);
  if (error) throw error;
}

export async function createMovimientoSocio(data: MovimientoSocioFormData, userId?: string) {
  const dbPayload = { ...data } as any;
  if (dbPayload.monto !== undefined) { dbPayload.amount = dbPayload.monto; delete dbPayload.monto; }
  if (dbPayload.detalle !== undefined) { dbPayload.details = dbPayload.detalle; delete dbPayload.detalle; }
  if (dbPayload.saldo_acumulado !== undefined) { dbPayload.cumulative_balance = dbPayload.saldo_acumulado; delete dbPayload.saldo_acumulado; }
  const { data: result, error } = await fromUntyped('partner_movements')
    .insert({ ...dbPayload, created_by: userId })
    .select()
    .single();
  if (error) throw error;
  return result;
}

// ── Conceptos de servicio ───────────────────────────────────────────

export async function fetchConceptosServicio() {
  const { data, error } = await fromUntyped('service_concepts')
    .select('*')
    .is('deleted_at', null)
    .order('tipo')
    .order('name');
  if (error) throw error;
  return data;
}

export async function createConceptoServicio(data: ConceptoServicioFormData) {
  const dbPayload = { ...data } as any;
  if (dbPayload.nombre !== undefined) { dbPayload.name = dbPayload.nombre; delete dbPayload.nombre; }
  if (dbPayload.descripcion !== undefined) { dbPayload.description = dbPayload.descripcion; delete dbPayload.descripcion; }
  const { data: result, error } = await fromUntyped('service_concepts')
    .insert(dbPayload)
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function updateConceptoServicio(
  id: string,
  data: Partial<ConceptoServicioFormData>,
) {
  const dbPayload = { ...data } as any;
  if (dbPayload.nombre !== undefined) { dbPayload.name = dbPayload.nombre; delete dbPayload.nombre; }
  if (dbPayload.descripcion !== undefined) { dbPayload.description = dbPayload.descripcion; delete dbPayload.descripcion; }
  const { error } = await fromUntyped('service_concepts')
    .update(dbPayload)
    .eq('id', id);
  if (error) throw error;
}

export async function softDeleteConceptoServicio(id: string) {
  const { error } = await fromUntyped('service_concepts')
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq('id', id);
  if (error) throw error;
}

export async function approvePagoProveedor(
  pagoId: string,
  userId: string,
  notas: string | null,
) {
  const { error } = await fromUntyped('supplier_payments')
    .update({
      is_verified: true,
      verificado_por: userId,
      verificado_at: new Date().toISOString(),
      verificado_notas: notas,
    })
    .eq('id', pagoId);
  if (error) throw error;
}

export async function rejectPagoProveedor(pagoId: string, notas: string) {
  const { error } = await fromUntyped('supplier_payments')
    .update({
      deleted_at: new Date().toISOString(),
      verificado_notas: `RECHAZADO: ${notas}`,
    })
    .eq('id', pagoId);
  if (error) throw error;
}

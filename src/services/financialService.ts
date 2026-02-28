import { supabase } from './supabaseClient';
import type { FacturaFormData, PagoProveedorFormData } from '@/types/compra';
import type { InversionFormData } from '@/hooks/useInversiones';
import type { ConsumoManualFormData } from '@/hooks/useConsumosManuales';
import type { SocioFormData, MovimientoSocioFormData } from '@/hooks/useSocios';
import type { ConceptoServicioFormData } from '@/hooks/useConceptosServicio';
import type { CanonLiquidacionFormData, PagoCanonFormData } from '@/types/ventas';

// ── Canon Liquidaciones ─────────────────────────────────────────────

export async function fetchCanonLiquidaciones(branchId?: string) {
  let q = supabase
    .from('canon_liquidaciones')
    .select('*, branches!canon_liquidaciones_branch_id_fkey(name)')
    .is('deleted_at', null)
    .order('periodo', { ascending: false });

  if (branchId) q = q.eq('branch_id', branchId);

  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function createCanonLiquidacion(data: CanonLiquidacionFormData, userId?: string) {
  const { data: result, error } = await supabase
    .from('canon_liquidaciones')
    .insert({
      branch_id: data.branch_id,
      periodo: data.periodo,
      ventas_id: data.ventas_id,
      fc_total: data.fc_total,
      ft_total: data.ft_total,
      canon_porcentaje: data.canon_porcentaje ?? 4.5,
      canon_monto: data.canon_monto,
      marketing_porcentaje: data.marketing_porcentaje ?? 0.5,
      marketing_monto: data.marketing_monto,
      total_canon: data.total_canon,
      fecha_vencimiento: data.fecha_vencimiento,
      observaciones: data.observaciones,
      created_by: userId,
    })
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function fetchPagosCanon(canonId: string) {
  const { data, error } = await supabase
    .from('pagos_canon')
    .select('*')
    .eq('canon_liquidacion_id', canonId)
    .is('deleted_at', null)
    .order('fecha_pago', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchPagosCanonFromProveedores(branchId: string, periodo: string) {
  const { data: factura } = await supabase
    .from('facturas_proveedores')
    .select('id')
    .eq('branch_id', branchId)
    .eq('periodo', periodo)
    .eq('proveedor_id', '00000000-0000-0000-0000-000000000001')
    .is('deleted_at', null)
    .maybeSingle();

  if (!factura) return [];

  const { data: pagos, error } = await supabase
    .from('pagos_proveedores')
    .select(
      'id, fecha_pago, monto, medio_pago, referencia, observaciones, verificado, verificado_por, verificado_at, verificado_notas, created_at',
    )
    .eq('factura_id', factura.id)
    .is('deleted_at', null)
    .order('fecha_pago', { ascending: false });
  if (error) throw error;
  return pagos ?? [];
}

export async function createPagoCanon(data: PagoCanonFormData, userId?: string) {
  const { data: result, error } = await supabase
    .from('pagos_canon')
    .insert({
      canon_liquidacion_id: data.canon_liquidacion_id,
      branch_id: data.branch_id,
      monto: data.monto,
      fecha_pago: data.fecha_pago,
      medio_pago: data.medio_pago,
      referencia: data.referencia,
      observaciones: data.observaciones,
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
    .from('periodos')
    .select('*')
    .eq('branch_id', branchId)
    .order('periodo', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createPeriodo(branchId: string, periodo: string) {
  const { data, error } = await supabase
    .from('periodos')
    .insert({ branch_id: branchId, periodo, estado: 'abierto' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function cerrarPeriodo(id: string, userId?: string, motivo?: string) {
  const { error } = await supabase
    .from('periodos')
    .update({
      estado: 'cerrado',
      fecha_cierre: new Date().toISOString(),
      cerrado_por: userId,
      motivo_cierre: motivo || null,
    })
    .eq('id', id);
  if (error) throw error;
}

export async function reabrirPeriodo(id: string, userId?: string, motivo?: string) {
  const { error } = await supabase
    .from('periodos')
    .update({
      estado: 'abierto',
      fecha_reapertura: new Date().toISOString(),
      reabierto_por: userId,
      motivo_reapertura: motivo,
    })
    .eq('id', id);
  if (error) throw error;
}

// ── Facturas ────────────────────────────────────────────────────────

export async function fetchFacturas(branchId: string, periodo?: string) {
  let q = supabase
    .from('facturas_proveedores')
    .select(
      '*, proveedores(razon_social), items_factura(*, insumos(nombre), conceptos_servicio(nombre))',
    )
    .eq('branch_id', branchId)
    .is('deleted_at', null)
    .order('factura_fecha', { ascending: false });

  if (periodo) q = q.eq('periodo', periodo);

  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function fetchFacturaById(facturaId: string) {
  const { data, error } = await supabase
    .from('facturas_proveedores')
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
    factura_tipo: data.factura_tipo || null,
    factura_numero: data.factura_numero,
    factura_fecha: data.factura_fecha,
    subtotal: subtotalItems,
    iva: data.iva || 0,
    otros_impuestos: data.otros_impuestos || 0,
    total,
    condicion_pago: data.condicion_pago,
    fecha_vencimiento: data.fecha_vencimiento || null,
    estado_pago: estadoPago,
    saldo_pendiente: estadoPago === 'pagado' ? 0 : total,
    tipo: data.tipo || 'normal',
    motivo_extraordinaria: data.motivo_extraordinaria || null,
    periodo: data.periodo,
    observaciones: data.observaciones || null,
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

  const { data: facturaId, error } = await supabase.rpc('insert_factura_completa', {
    p_factura: facturaPayload,
    p_items: itemsPayload,
  });

  if (error) throw error;
  return { id: facturaId };
}

export async function softDeleteFactura(id: string) {
  const { error } = await supabase
    .from('facturas_proveedores')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// ── Pagos proveedor ─────────────────────────────────────────────────

export async function fetchPagosProveedor(facturaId: string) {
  const { data, error } = await supabase
    .from('pago_factura')
    .select('monto_aplicado, pagos_proveedores(*)')
    .eq('factura_id', facturaId);

  if (error) {
    const { data: legacyData, error: legacyErr } = await supabase
      .from('pagos_proveedores')
      .select('*')
      .eq('factura_id', facturaId)
      .is('deleted_at', null)
      .order('fecha_pago', { ascending: false });
    if (legacyErr) throw legacyErr;
    return legacyData;
  }

  return (data || []).map((row) => ({
    ...row.pagos_proveedores,
    monto_aplicado: row.monto_aplicado,
  }));
}

export async function createPagoProveedor(data: PagoProveedorFormData, userId?: string) {
  const { data: pago, error: pagoErr } = await supabase
    .from('pagos_proveedores')
    .insert({
      proveedor_id: data.proveedor_id,
      branch_id: data.branch_id,
      monto: data.monto,
      fecha_pago: data.fecha_pago,
      medio_pago: data.medio_pago,
      referencia: data.referencia || null,
      fecha_vencimiento_pago: data.fecha_vencimiento_pago || null,
      observaciones: data.observaciones || null,
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

    const { error: junctionErr } = await supabase.from('pago_factura').insert(junctionRows);
    if (junctionErr) throw junctionErr;

    for (const app of data.aplicaciones) {
      const { data: factura, error: facturaErr } = await supabase
        .from('facturas_proveedores')
        .select('saldo_pendiente')
        .eq('id', app.factura_id)
        .single();

      if (facturaErr) throw facturaErr;

      const nuevoSaldo = Math.max(0, (factura.saldo_pendiente || 0) - app.monto_aplicado);
      const { error: updateErr } = await supabase
        .from('facturas_proveedores')
        .update({
          saldo_pendiente: nuevoSaldo,
          estado_pago: nuevoSaldo === 0 ? 'pagado' : 'parcial',
        })
        .eq('id', app.factura_id);

      if (updateErr) throw updateErr;
    }
  }

  return pago;
}

export async function softDeletePago(id: string) {
  const { error } = await supabase
    .from('pagos_proveedores')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// ── Inversiones ─────────────────────────────────────────────────────

export async function fetchInversiones(branchId: string, periodo?: string) {
  let q = supabase
    .from('inversiones')
    .select('*')
    .eq('branch_id', branchId)
    .is('deleted_at', null)
    .order('fecha', { ascending: false });

  if (periodo) q = q.eq('periodo', periodo);

  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function createInversion(data: InversionFormData, userId?: string) {
  const { data: result, error } = await supabase
    .from('inversiones')
    .insert({ ...data, created_by: userId })
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function updateInversion(id: string, data: Partial<InversionFormData>) {
  const { error } = await supabase.from('inversiones').update(data).eq('id', id);
  if (error) throw error;
}

export async function softDeleteInversion(id: string) {
  const { error } = await supabase
    .from('inversiones')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// ── Consumos manuales ───────────────────────────────────────────────

export async function fetchConsumosManuales(branchId: string, periodo?: string) {
  let q = supabase
    .from('consumos_manuales')
    .select('*')
    .eq('branch_id', branchId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (periodo) q = q.eq('periodo', periodo);

  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function createConsumoManual(data: ConsumoManualFormData, userId?: string) {
  const { data: result, error } = await supabase
    .from('consumos_manuales')
    .insert({ ...data, created_by: userId })
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function updateConsumoManual(id: string, data: Partial<ConsumoManualFormData>) {
  const { error } = await supabase.from('consumos_manuales').update(data).eq('id', id);
  if (error) throw error;
}

export async function softDeleteConsumoManual(id: string) {
  const { error } = await supabase
    .from('consumos_manuales')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// ── Socios ──────────────────────────────────────────────────────────

export async function fetchSocios(branchId: string) {
  const { data, error } = await supabase
    .from('socios')
    .select('*')
    .eq('branch_id', branchId)
    .is('deleted_at', null)
    .order('porcentaje_participacion', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchMovimientosSocio(branchId: string, socioId?: string) {
  let q = supabase
    .from('movimientos_socio')
    .select('*')
    .eq('branch_id', branchId)
    .is('deleted_at', null)
    .order('fecha', { ascending: false });

  if (socioId) q = q.eq('socio_id', socioId);

  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function createSocio(data: SocioFormData, userId?: string) {
  const { data: result, error } = await supabase
    .from('socios')
    .insert({ ...data, created_by: userId })
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function updateSocio(id: string, data: Partial<SocioFormData>) {
  const { error } = await supabase.from('socios').update(data).eq('id', id);
  if (error) throw error;
}

export async function createMovimientoSocio(data: MovimientoSocioFormData, userId?: string) {
  const { data: result, error } = await supabase
    .from('movimientos_socio')
    .insert({ ...data, created_by: userId })
    .select()
    .single();
  if (error) throw error;
  return result;
}

// ── Conceptos de servicio ───────────────────────────────────────────

export async function fetchConceptosServicio() {
  const { data, error } = await supabase
    .from('conceptos_servicio')
    .select('*')
    .is('deleted_at', null)
    .order('tipo')
    .order('nombre');
  if (error) throw error;
  return data;
}

export async function createConceptoServicio(data: ConceptoServicioFormData) {
  const { data: result, error } = await supabase
    .from('conceptos_servicio')
    .insert(data as any)
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function updateConceptoServicio(
  id: string,
  data: Partial<ConceptoServicioFormData>,
) {
  const { error } = await supabase
    .from('conceptos_servicio')
    .update(data as any)
    .eq('id', id);
  if (error) throw error;
}

export async function softDeleteConceptoServicio(id: string) {
  const { error } = await supabase
    .from('conceptos_servicio')
    .update({ deleted_at: new Date().toISOString(), activo: false } as any)
    .eq('id', id);
  if (error) throw error;
}

export async function approvePagoProveedor(
  pagoId: string,
  userId: string,
  notas: string | null,
) {
  const { error } = await supabase
    .from('pagos_proveedores')
    .update({
      verificado: true,
      verificado_por: userId,
      verificado_at: new Date().toISOString(),
      verificado_notas: notas,
    })
    .eq('id', pagoId);
  if (error) throw error;
}

export async function rejectPagoProveedor(pagoId: string, notas: string) {
  const { error } = await supabase
    .from('pagos_proveedores')
    .update({
      deleted_at: new Date().toISOString(),
      verificado_notas: `RECHAZADO: ${notas}`,
    })
    .eq('id', pagoId);
  if (error) throw error;
}

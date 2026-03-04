import { supabase } from './supabaseClient';
import { fromUntyped } from '@/lib/supabase-helpers';
import type { ProveedorFormData } from '@/types/financial';

const BUCKET = 'proveedores-docs';
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// ---------------------------------------------------------------------------
// Proveedores
// ---------------------------------------------------------------------------

export async function fetchProveedores(branchId?: string) {
  let q = fromUntyped('suppliers').select('*').is('deleted_at', null).order('razon_social');

  if (branchId === '__marca_only__') {
    q = q.eq('ambito', 'marca');
  } else if (branchId) {
    q = q.or(`ambito.eq.marca,branch_id.eq.${branchId}`);
  }

  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function createProveedor(data: ProveedorFormData, userId?: string) {
  const { data: result, error } = await fromUntyped('suppliers')
    .insert({
      ...data,
      medios_pago_aceptados: data.medios_pago_aceptados || null,
      created_by: userId,
    })
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function updateProveedor(id: string, data: Partial<ProveedorFormData>) {
  const { error } = await fromUntyped('suppliers')
    .update({
      ...data,
      medios_pago_aceptados: data.medios_pago_aceptados || undefined,
    })
    .eq('id', id);
  if (error) throw error;
}

export async function softDeleteProveedor(id: string) {
  const { error } = await fromUntyped('suppliers')
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Condiciones locales
// ---------------------------------------------------------------------------

export interface UpsertCondicionesPayload {
  permite_cuenta_corriente: boolean;
  dias_pago_habitual?: number | null;
  descuento_pago_contado?: number | null;
  observaciones?: string | null;
}

export async function fetchCondicionesByBranch(branchId: string) {
  const { data, error } = await supabase
    .from('proveedor_condiciones_local')
    .select('*')
    .eq('branch_id', branchId);
  if (error) throw error;
  return data;
}

export async function fetchCondicionesProveedor(branchId: string, proveedorId: string) {
  const { data, error } = await supabase
    .from('proveedor_condiciones_local')
    .select('*')
    .eq('branch_id', branchId)
    .eq('proveedor_id', proveedorId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertCondiciones(
  proveedorId: string,
  branchId: string,
  data: UpsertCondicionesPayload,
) {
  const { error } = await supabase.from('proveedor_condiciones_local').upsert(
    {
      proveedor_id: proveedorId,
      branch_id: branchId,
      permite_cuenta_corriente: data.permite_cuenta_corriente,
      dias_pago_habitual: data.dias_pago_habitual ?? null,
      descuento_pago_contado: data.descuento_pago_contado ?? null,
      observaciones: data.observaciones ?? null,
    },
    { onConflict: 'proveedor_id,branch_id' },
  );
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Documentos de proveedor
// ---------------------------------------------------------------------------

export async function fetchProveedorDocumentos(proveedorId: string) {
  const { data, error } = await fromUntyped('proveedor_documentos')
    .select('*')
    .eq('proveedor_id', proveedorId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function uploadProveedorDoc(
  proveedorId: string,
  file: File,
  tipo: string,
  userId?: string,
) {
  if (file.type !== 'application/pdf') {
    throw new Error('Solo se permiten archivos PDF');
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error('El archivo no puede superar 10MB');
  }

  const ext = file.name.split('.').pop() || 'pdf';
  const storagePath = `${proveedorId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, file);
  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

  const { data: doc, error: dbError } = await fromUntyped('proveedor_documentos')
    .insert({
      proveedor_id: proveedorId,
      nombre_archivo: file.name,
      storage_path: storagePath,
      public_url: urlData.publicUrl,
      tipo,
      file_size_bytes: file.size,
      uploaded_by: userId,
    })
    .select()
    .single();

  if (dbError) throw dbError;
  return doc;
}

export async function softDeleteProveedorDoc(docId: string) {
  const { error } = await fromUntyped('proveedor_documentos')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', docId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Cuenta Corriente Proveedor
// ---------------------------------------------------------------------------

export async function fetchProveedorFacturas(branchId: string, proveedorId: string) {
  const { data, error } = await supabase
    .from('facturas_proveedores')
    .select('id, total, saldo_pendiente, estado_pago, fecha_vencimiento')
    .eq('branch_id', branchId)
    .eq('proveedor_id', proveedorId)
    .is('deleted_at', null);
  if (error) throw error;
  return data || [];
}

export async function fetchProveedorPagos(branchId: string, proveedorId: string) {
  const { data, error } = await supabase
    .from('pagos_proveedores')
    .select('id, monto, is_verified')
    .eq('branch_id', branchId)
    .eq('proveedor_id', proveedorId)
    .is('deleted_at', null);
  if (error) throw error;
  return data || [];
}

export async function fetchSaldoProveedor(branchId: string, proveedorId: string) {
  const { data, error } = await supabase
    .from('cuenta_corriente_proveedores')
    .select('*')
    .eq('proveedor_id', proveedorId)
    .eq('branch_id', branchId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchSaldosProveedores(branchId: string) {
  const { data, error } = await supabase
    .from('cuenta_corriente_proveedores')
    .select('proveedor_id, total_pendiente, monto_vencido, facturas_pendientes')
    .eq('branch_id', branchId);
  if (error) throw error;
  return data || [];
}

export async function fetchMovimientosProveedorData(branchId: string, proveedorId: string) {
  const { data: facturas, error: fErr } = await supabase
    .from('facturas_proveedores')
    .select(
      'id, factura_fecha, factura_tipo, factura_numero, total, saldo_pendiente, estado_pago, fecha_vencimiento, items_factura(id)',
    )
    .eq('branch_id', branchId)
    .eq('proveedor_id', proveedorId)
    .is('deleted_at', null)
    .order('factura_fecha', { ascending: true });
  if (fErr) throw fErr;

  const { data: pagos, error: pErr } = await supabase
    .from('pagos_proveedores')
    .select('id, fecha_pago, monto, medio_pago, referencia, factura_id, is_verified')
    .eq('branch_id', branchId)
    .eq('proveedor_id', proveedorId)
    .is('deleted_at', null)
    .order('fecha_pago', { ascending: true });
  if (pErr) throw pErr;

  return { facturas: facturas || [], pagos: pagos || [] };
}

export async function uploadFacturaPdf(facturaId: string, file: File) {
  if (file.type !== 'application/pdf') {
    throw new Error('Solo se permiten archivos PDF');
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error('El archivo no puede superar 10MB');
  }

  const storagePath = `facturas/${facturaId}/${Date.now()}.pdf`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, file);
  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

  const { error: dbError } = await fromUntyped('facturas_proveedores')
    .update({ factura_pdf_url: urlData.publicUrl })
    .eq('id', facturaId);
  if (dbError) throw dbError;

  return urlData.publicUrl;
}

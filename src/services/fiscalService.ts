import { supabase } from './supabaseClient';
import { fromUntyped } from '@/lib/supabase-helpers';

export async function fetchAfipConfig(branchId: string) {
  const { data, error } = await fromUntyped('afip_config')
    .select('*')
    .eq('branch_id', branchId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveAfipConfig(input: {
  branch_id: string;
  cuit?: string;
  razon_social?: string;
  direccion_fiscal?: string;
  inicio_actividades?: string;
  punto_venta?: number;
  certificado_crt?: string;
  clave_privada_enc?: string;
  es_produccion?: boolean;
}) {
  const { data: existing } = await fromUntyped('afip_config')
    .select('id')
    .eq('branch_id', input.branch_id)
    .maybeSingle();

  if (existing) {
    const { error } = await fromUntyped('afip_config')
      .update(input)
      .eq('branch_id', input.branch_id);
    if (error) throw error;
  } else {
    const { error } = await fromUntyped('afip_config').insert(input);
    if (error) throw error;
  }
}

export async function saveAfipKeyAndCSR(input: {
  branch_id: string;
  privateKeyPem: string;
  csrPem: string;
}) {
  const payload = {
    branch_id: input.branch_id,
    clave_privada_enc: btoa(input.privateKeyPem),
    csr_pem: input.csrPem,
    estado_certificado: 'csr_generado',
  };

  const { data: existing } = await fromUntyped('afip_config')
    .select('id')
    .eq('branch_id', input.branch_id)
    .maybeSingle();

  if (existing) {
    const { error } = await fromUntyped('afip_config')
      .update(payload)
      .eq('branch_id', input.branch_id);
    if (error) throw error;
  } else {
    const { error } = await fromUntyped('afip_config').insert(payload);
    if (error) throw error;
  }
}

export async function saveAfipCertificate(branchId: string, certificadoCrt: string) {
  const { error } = await fromUntyped('afip_config')
    .update({
      certificado_crt: certificadoCrt,
      estado_certificado: 'certificado_subido',
    })
    .eq('branch_id', branchId);
  if (error) throw error;
}

export async function testAfipConnection(branchId: string) {
  const { data, error } = await supabase.functions.invoke('probar-conexion-afip', {
    body: { branch_id: branchId },
  });
  if (error) throw error;
  return data;
}

export async function fetchPedidoWithDetails(pedidoId: string) {
  const [pedidoRes, itemsRes, pagosRes] = await Promise.all([
    supabase.from('pedidos').select('*').eq('id', pedidoId).single(),
    supabase.from('pedido_items').select('*').eq('pedido_id', pedidoId),
    supabase.from('pedido_pagos').select('*').eq('pedido_id', pedidoId).limit(1),
  ]);
  if (pedidoRes.error) throw pedidoRes.error;
  return {
    pedido: pedidoRes.data,
    items: itemsRes.data || [],
    pagos: pagosRes.data || [],
  };
}

export async function searchFacturasEmitidas(
  branchId: string,
  params: { mode: 'number' | 'recent' | 'date'; searchNumber?: string; searchDate?: string },
) {
  let query = supabase
    .from('facturas_emitidas')
    .select('*, pedidos!inner(numero_pedido, total, cliente_nombre)')
    .eq('branch_id', branchId)
    .order('created_at', { ascending: false });

  if (params.mode === 'number' && params.searchNumber) {
    query = query.eq('numero_comprobante', parseInt(params.searchNumber));
  } else if (params.mode === 'date' && params.searchDate) {
    query = query
      .gte('created_at', params.searchDate + 'T00:00:00')
      .lte('created_at', params.searchDate + 'T23:59:59');
  } else {
    query = query.limit(10);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function invokeEmitirNotaCredito(facturaId: string, branchId: string) {
  const { data, error } = await supabase.functions.invoke('emitir-nota-credito', {
    body: { factura_id: facturaId, branch_id: branchId },
  });
  if (error) {
    let detail = error.message;
    try {
      const body = await (
        error as Record<string, unknown> & {
          context?: { json?: () => Promise<Record<string, string>> };
        }
      ).context?.json?.();
      if (body?.error) detail = body.error;
      else if (body?.details) detail = body.details;
    } catch {
      /* use default */
    }
    throw new Error(detail);
  }
  if (!data?.success) throw new Error(data?.error || 'Error al emitir nota de crédito');
  return data;
}

export async function emitirFactura(input: {
  branch_id: string;
  pedido_id?: string;
  tipo_factura: 'A' | 'B';
  receptor_cuit?: string;
  receptor_razon_social?: string;
  receptor_condicion_iva?: string;
  items: { descripcion: string; cantidad: number; precio_unitario: number }[];
  total: number;
}) {
  const { data, error } = await supabase.functions.invoke('emitir-factura', {
    body: input,
  });
  if (error) {
    const bodyError = (data as Record<string, unknown> | null)?.error;
    if (typeof bodyError === 'string') {
      throw new Error(bodyError);
    }
    throw error;
  }
  if (data?.error) {
    throw new Error(data.error);
  }
  return data;
}

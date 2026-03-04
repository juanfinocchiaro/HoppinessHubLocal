import { supabase } from './supabaseClient';
import { fromUntyped } from '@/lib/supabase-helpers';

export async function insertPrintJob(data: {
  branch_id: string;
  printer_id: string;
  job_type: string;
  pedido_id?: string | null;
  payload: Record<string, unknown>;
  status: string;
}) {
  const { data: result, error } = await supabase
    .from('print_jobs')
    .insert(data as any)
    .select('id')
    .single();
  if (error) console.error('Failed to log print job:', error.message);
  return result;
}

export async function updatePrintJobStatus(
  jobId: string,
  status: string,
  errorMessage?: string,
) {
  const updateData: Record<string, unknown> = { status };
  if (errorMessage) updateData.error_message = errorMessage;
  const { error } = await supabase
    .from('print_jobs')
    .update(updateData)
    .eq('id', jobId);
  if (error) console.error('Failed to update print job:', error.message);
}

export async function logCompletedPrintJob(data: {
  branch_id: string;
  printer_id: string;
  pedido_id?: string | null;
  job_type: string;
  payload: Record<string, unknown>;
  status: string;
  error_message?: string;
}) {
  const { error } = await supabase.from('print_jobs').insert(data as any);
  if (error) console.error('Failed to log print job:', error.message);
}

export async function fetchPedidoForTracking(pedidoId: string) {
  const { data, error } = await fromUntyped('orders')
    .select('delivery_lat, delivery_lng, branch_id')
    .eq('id', pedidoId)
    .single();
  if (error) throw error;
  return data;
}

export async function fetchBranchCoords(branchId: string) {
  const { data, error } = await supabase
    .from('branches')
    .select('latitude, longitude')
    .eq('id', branchId)
    .single();
  if (error) throw error;
  return data;
}

export async function fetchPedidoForTicket(pedidoId: string) {
  const { data, error } = await fromUntyped('orders')
    .select(
      `id, numero_pedido, tipo_servicio, canal_venta, canal_app, numero_llamador, cliente_nombre, cliente_telefono, cliente_direccion, created_at, total, descuento,
       pedido_items(nombre, cantidad, notas, precio_unitario, subtotal, categoria_carta_id),
       pedido_pagos(metodo, monto, monto_recibido, vuelto, tarjeta_marca),
       facturas_emitidas(anulada, tipo_comprobante, punto_venta, numero_comprobante, cae, cae_vencimiento, fecha_emision, neto, iva, total, receptor_cuit, receptor_razon_social, receptor_condicion_iva)`,
    )
    .eq('id', pedidoId)
    .single();
  if (error) throw error;
  return data;
}

export async function fetchPedidoForDeliveryTicket(pedidoId: string) {
  const { data, error } = await fromUntyped('orders')
    .select(
      `id, numero_pedido, tipo_servicio, canal_venta, canal_app, numero_llamador,
       cliente_nombre, cliente_telefono, cliente_direccion,
       created_at, total, descuento,
       pedido_items(nombre, cantidad, notas, precio_unitario, subtotal, categoria_carta_id)`,
    )
    .eq('id', pedidoId)
    .single();
  if (error) throw error;
  return data;
}

export async function insertDeliveryTracking(data: {
  pedido_id: string;
  dest_lat: number | null;
  dest_lng: number | null;
  store_lat: number | null;
  store_lng: number | null;
}) {
  const { data: tracking, error } = await (supabase as any)
    .from('delivery_tracking')
    .insert(data as any)
    .select('tracking_token')
    .single();
  if (error) throw error;
  return tracking;
}

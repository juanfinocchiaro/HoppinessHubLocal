import { apiGet, apiPost, apiPatch } from './apiClient';

export async function insertPrintJob(data: {
  branch_id: string;
  printer_id: string;
  job_type: string;
  pedido_id?: string | null;
  payload: Record<string, unknown>;
  status: string;
}) {
  try {
    return await apiPost<{ id: string }>('/orders/print-jobs', data);
  } catch (err) {
    console.error('Failed to log print job:', (err as Error).message);
    return null;
  }
}

export async function updatePrintJobStatus(
  jobId: string,
  status: string,
  errorMessage?: string,
) {
  const updateData: Record<string, unknown> = { status };
  if (errorMessage) updateData.error_message = errorMessage;
  try {
    await apiPatch(`/orders/print-jobs/${jobId}/status`, updateData);
  } catch (err) {
    console.error('Failed to update print job:', (err as Error).message);
  }
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
  try {
    await apiPost('/orders/print-jobs/log', data);
  } catch (err) {
    console.error('Failed to log print job:', (err as Error).message);
  }
}

export async function fetchPedidoForTracking(pedidoId: string) {
  return apiGet(`/orders/${pedidoId}/tracking`);
}

export async function fetchBranchCoords(branchId: string) {
  return apiGet(`/orders/branches/${branchId}/coords`);
}

export async function fetchPedidoForTicket(pedidoId: string) {
  return apiGet(`/orders/${pedidoId}/ticket`);
}

export async function fetchPedidoForDeliveryTicket(pedidoId: string) {
  return apiGet(`/orders/${pedidoId}/delivery-ticket`);
}

export async function insertDeliveryTracking(data: {
  pedido_id: string;
  dest_lat: number | null;
  dest_lng: number | null;
  store_lat: number | null;
  store_lng: number | null;
}) {
  return apiPost<{ tracking_token: string }>('/orders/delivery-tracking', data);
}

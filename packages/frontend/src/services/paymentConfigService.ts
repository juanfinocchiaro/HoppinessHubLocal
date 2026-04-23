import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';

export async function fetchMercadoPagoConfig(branchId: string) {
  return apiGet(`/payments/config/${branchId}`);
}

export async function fetchMercadoPagoStatus(branchId: string) {
  return apiGet<{ connection_status: string } | null>(`/payments/config/${branchId}/status`);
}

export async function fetchPointDevices(branchId: string) {
  return apiPost<Array<{
    id: string;
    pos_id: number | null;
    operating_mode: string;
    external_pos_id: string | null;
  }>>('/payments/point/devices', { branch_id: branchId });
}

export async function upsertMercadoPagoConfig(
  branchId: string,
  values: { access_token: string; public_key: string },
) {
  return apiPut(`/payments/config/${branchId}`, values);
}

export async function testMercadoPagoConnection(branchId: string) {
  return apiPost('/payments/test-connection', { branch_id: branchId });
}

export async function disconnectMercadoPago(branchId: string) {
  return apiDelete(`/payments/config/${branchId}`);
}

export async function saveMercadoPagoDevice(
  branchId: string,
  values: { device_id: string; device_name: string },
) {
  return apiPost('/payments/point/setup', {
    branch_id: branchId,
    terminal_id: values.device_id,
    device_name: values.device_name,
    operating_mode: 'PDV',
  });
}

export async function changeMercadoPagoDeviceMode(
  branchId: string,
  operatingMode: 'PDV' | 'STANDALONE',
) {
  return apiPost('/payments/point/setup', {
    branch_id: branchId,
    operating_mode: operatingMode,
  });
}

export async function removeMercadoPagoDevice(branchId: string) {
  return apiDelete(`/payments/point/device/${branchId}`);
}

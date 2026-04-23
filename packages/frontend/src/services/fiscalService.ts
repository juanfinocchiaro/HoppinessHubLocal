import { apiGet, apiPost, apiPut } from './apiClient';

export async function fetchAfipConfig(branchId: string) {
  return apiGet('/fiscal/config', { branch_id: branchId });
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
  is_production?: boolean;
}) {
  return apiPost('/fiscal/config', input);
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
  return apiPost('/fiscal/config/key-csr', payload);
}

export async function saveAfipCertificate(branchId: string, certificadoCrt: string) {
  return apiPut('/fiscal/config/certificate', {
    branch_id: branchId,
    certificado_crt: certificadoCrt,
  });
}

export async function testAfipConnection(branchId: string) {
  return apiPost('/fiscal/test-connection', { branch_id: branchId });
}

export async function fetchPedidoWithDetails(pedidoId: string) {
  return apiGet(`/fiscal/orders/${pedidoId}/details`);
}

export async function searchFacturasEmitidas(
  branchId: string,
  params: { mode: 'number' | 'recent' | 'date'; searchNumber?: string; searchDate?: string },
) {
  const queryParams: Record<string, string> = {
    branch_id: branchId,
    mode: params.mode,
  };
  if (params.searchNumber) queryParams.search_number = params.searchNumber;
  if (params.searchDate) queryParams.search_date = params.searchDate;

  return apiGet('/fiscal/invoices', queryParams);
}

export async function invokeEmitirNotaCredito(facturaId: string, branchId: string) {
  return apiPost('/fiscal/emit-credit-note', {
    factura_id: facturaId,
    branch_id: branchId,
  });
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
  return apiPost('/fiscal/emit-invoice', input);
}

import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';
import type { ProveedorFormData } from '@/types/financial';

const BUCKET = 'proveedores-docs';
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// ---------------------------------------------------------------------------
// Proveedores
// ---------------------------------------------------------------------------

/**
 * Fetches suppliers scoped by location or account.
 *
 * @param locationId - UUID of the location to fetch suppliers for
 *   (includes account-level suppliers shared across locations).
 *   Pass `'__account_scope__'` to fetch only account-level suppliers.
 *   If undefined, returns all visible suppliers (admin use).
 */
export async function fetchProveedores(locationId?: string) {
  const params: Record<string, string> = {};
  if (locationId === '__account_scope__') {
    params.scope = 'account';
  } else if (locationId) {
    params.scope = 'location';
    params.branch_id = locationId;
  }
  return apiGet('/suppliers', params);
}

export async function createProveedor(data: ProveedorFormData, userId?: string) {
  return apiPost('/suppliers', {
    ...data,
    medios_pago_aceptados: data.medios_pago_aceptados || null,
    created_by: userId,
  });
}

export async function updateProveedor(id: string, data: Partial<ProveedorFormData>) {
  return apiPut(`/suppliers/${id}`, {
    ...data,
    medios_pago_aceptados: data.medios_pago_aceptados || undefined,
  });
}

export async function softDeleteProveedor(id: string) {
  return apiDelete(`/suppliers/${id}`);
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
  return apiGet(`/suppliers/terms`, { branch_id: branchId });
}

export async function fetchCondicionesProveedor(branchId: string, proveedorId: string) {
  return apiGet(`/suppliers/${proveedorId}/terms/${branchId}`);
}

export async function upsertCondiciones(
  proveedorId: string,
  branchId: string,
  data: UpsertCondicionesPayload,
) {
  return apiPost(`/suppliers/${proveedorId}/terms/${branchId}`, {
    permite_cuenta_corriente: data.permite_cuenta_corriente,
    dias_pago_habitual: data.dias_pago_habitual ?? null,
    descuento_pago_contado: data.descuento_pago_contado ?? null,
    notes: data.observaciones ?? null,
  });
}

// ---------------------------------------------------------------------------
// Documentos de proveedor
// ---------------------------------------------------------------------------

export async function fetchProveedorDocumentos(proveedorId: string) {
  return apiGet(`/suppliers/${proveedorId}/documents`);
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

  const formData = new FormData();
  formData.append('file', file);
  formData.append('tipo', tipo);
  if (userId) formData.append('uploaded_by', userId);

  return apiPost(`/suppliers/${proveedorId}/documents/upload`, formData);
}

export async function softDeleteProveedorDoc(docId: string) {
  return apiDelete(`/suppliers/documents/${docId}`);
}

// ---------------------------------------------------------------------------
// Cuenta Corriente Proveedor
// ---------------------------------------------------------------------------

export async function fetchProveedorFacturas(branchId: string, proveedorId: string) {
  return apiGet(`/suppliers/${proveedorId}/invoices`, { branch_id: branchId });
}

export async function fetchProveedorPagos(branchId: string, proveedorId: string) {
  return apiGet(`/suppliers/${proveedorId}/payments`, { branch_id: branchId });
}

export async function fetchSaldoProveedor(branchId: string, proveedorId: string) {
  return apiGet(`/suppliers/${proveedorId}/balance`, { branch_id: branchId });
}

export async function fetchSaldosProveedores(branchId: string) {
  return apiGet('/suppliers/balances', { branch_id: branchId });
}

export async function fetchMovimientosProveedorData(branchId: string, proveedorId: string) {
  return apiGet(`/suppliers/${proveedorId}/movements`, { branch_id: branchId });
}

export async function uploadFacturaPdf(facturaId: string, file: File) {
  if (file.type !== 'application/pdf') {
    throw new Error('Solo se permiten archivos PDF');
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error('El archivo no puede superar 10MB');
  }

  const formData = new FormData();
  formData.append('file', file);

  return apiPost<string>(`/suppliers/invoices/${facturaId}/upload-pdf`, formData);
}

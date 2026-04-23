import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';
import type { FacturaFormData, PagoProveedorFormData } from '@/types/compra';
import type { InversionFormData } from '@/hooks/useInversiones';
import type { ConsumoManualFormData } from '@/hooks/useConsumosManuales';
import type { SocioFormData, MovimientoSocioFormData } from '@/hooks/useSocios';
import type { ConceptoServicioFormData } from '@/hooks/useConceptosServicio';
import type { CanonLiquidacionFormData, PagoCanonFormData } from '@/types/ventas';

// ── Canon Liquidaciones ─────────────────────────────────────────────

export async function fetchCanonLiquidaciones(branchId?: string) {
  const params: Record<string, string> = {};
  if (branchId) params.branchId = branchId;
  return apiGet('/financial/canon-liquidaciones', params);
}

export async function createCanonLiquidacion(data: CanonLiquidacionFormData, userId?: string) {
  return apiPost('/financial/canon-liquidaciones', { ...data, userId });
}

export async function fetchPagosCanon(canonId: string) {
  return apiGet(`/financial/canon-liquidaciones/${canonId}/pagos`);
}

export async function fetchPagosCanonFromProveedores(branchId: string, periodo: string) {
  return apiGet('/financial/canon-pagos-proveedores', { branchId, periodo });
}

export async function createPagoCanon(data: PagoCanonFormData, userId?: string) {
  return apiPost('/financial/canon-pagos', { ...data, userId });
}

// ── Periodos ────────────────────────────────────────────────────────

export async function fetchPeriodos(branchId: string) {
  return apiGet('/financial/periodos', { branchId });
}

export async function createPeriodo(branchId: string, periodo: string) {
  return apiPost('/financial/periodos', { branchId, periodo });
}

export async function cerrarPeriodo(id: string, userId?: string, motivo?: string) {
  return apiPost(`/financial/periodos/${id}/cerrar`, { userId, motivo });
}

export async function reabrirPeriodo(id: string, userId?: string, motivo?: string) {
  return apiPost(`/financial/periodos/${id}/reabrir`, { userId, motivo });
}

// ── Facturas ────────────────────────────────────────────────────────

export async function fetchFacturas(branchId: string, periodo?: string) {
  const params: Record<string, string> = { branchId };
  if (periodo) params.periodo = periodo;
  return apiGet('/financial/facturas', params);
}

export async function fetchFacturaById(facturaId: string) {
  return apiGet(`/financial/facturas/${facturaId}`);
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
  return apiPost('/financial/facturas', { ...data, userId });
}

export async function softDeleteFactura(id: string) {
  return apiDelete(`/financial/facturas/${id}`);
}

// ── Pagos proveedor ─────────────────────────────────────────────────

export async function fetchPagosProveedor(facturaId: string) {
  return apiGet(`/financial/facturas/${facturaId}/pagos`);
}

export async function createPagoProveedor(data: PagoProveedorFormData, userId?: string) {
  return apiPost('/financial/pagos-proveedor', { ...data, userId });
}

export async function updatePagoFecha(id: string, newDate: string) {
  return apiPut(`/financial/pagos-proveedor/${id}/fecha`, { newDate });
}

export async function softDeletePago(id: string) {
  return apiDelete(`/financial/pagos-proveedor/${id}`);
}

// ── Inversiones ─────────────────────────────────────────────────────

export async function fetchInversiones(branchId: string, periodo?: string) {
  const params: Record<string, string> = { branchId };
  if (periodo) params.periodo = periodo;
  return apiGet('/financial/inversiones', params);
}

export async function createInversion(data: InversionFormData, userId?: string) {
  return apiPost('/financial/inversiones', { ...data, userId });
}

export async function updateInversion(id: string, data: Partial<InversionFormData>) {
  return apiPut(`/financial/inversiones/${id}`, data);
}

export async function softDeleteInversion(id: string) {
  return apiDelete(`/financial/inversiones/${id}`);
}

// ── Consumos manuales ───────────────────────────────────────────────

export async function fetchConsumosManuales(branchId: string, periodo?: string) {
  const params: Record<string, string> = { branchId };
  if (periodo) params.periodo = periodo;
  return apiGet('/financial/consumos-manuales', params);
}

export async function createConsumoManual(data: ConsumoManualFormData, userId?: string) {
  return apiPost('/financial/consumos-manuales', { ...data, userId });
}

export async function updateConsumoManual(id: string, data: Partial<ConsumoManualFormData>) {
  return apiPut(`/financial/consumos-manuales/${id}`, data);
}

export async function softDeleteConsumoManual(id: string) {
  return apiDelete(`/financial/consumos-manuales/${id}`);
}

// ── Socios ──────────────────────────────────────────────────────────

export async function fetchSocios(branchId: string) {
  return apiGet('/financial/socios', { branchId });
}

export async function fetchMovimientosSocio(branchId: string, socioId?: string) {
  const params: Record<string, string> = { branchId };
  if (socioId) params.socioId = socioId;
  return apiGet('/financial/movimientos-socio', params);
}

export async function createSocio(data: SocioFormData, userId?: string) {
  return apiPost('/financial/socios', { ...data, userId });
}

export async function updateSocio(id: string, data: Partial<SocioFormData>) {
  return apiPut(`/financial/socios/${id}`, data);
}

export async function createMovimientoSocio(data: MovimientoSocioFormData, userId?: string) {
  return apiPost('/financial/movimientos-socio', { ...data, userId });
}

// ── Conceptos de servicio ───────────────────────────────────────────

export async function fetchConceptosServicio() {
  return apiGet('/financial/conceptos-servicio');
}

export async function createConceptoServicio(data: ConceptoServicioFormData) {
  return apiPost('/financial/conceptos-servicio', data);
}

export async function updateConceptoServicio(
  id: string,
  data: Partial<ConceptoServicioFormData>,
) {
  return apiPut(`/financial/conceptos-servicio/${id}`, data);
}

export async function softDeleteConceptoServicio(id: string) {
  return apiDelete(`/financial/conceptos-servicio/${id}`);
}

export async function approvePagoProveedor(
  pagoId: string,
  userId: string,
  notas: string | null,
) {
  return apiPost(`/financial/pagos-proveedor/${pagoId}/approve`, { userId, notas });
}

export async function rejectPagoProveedor(pagoId: string, notas: string) {
  return apiPost(`/financial/pagos-proveedor/${pagoId}/reject`, { notas });
}

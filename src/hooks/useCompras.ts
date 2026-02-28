import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { FacturaFormData, PagoProveedorFormData } from '@/types/compra';
import {
  fetchFacturas,
  fetchFacturaById,
  insertFacturaCompleta,
  softDeleteFactura,
  fetchPagosProveedor,
  createPagoProveedor,
  softDeletePago as deletePagoService,
} from '@/services/financialService';

export function useFacturas(branchId: string, periodo?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['facturas', branchId, periodo],
    queryFn: () => fetchFacturas(branchId, periodo),
    enabled: !!user && !!branchId,
  });
}

export function useFacturaById(facturaId?: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['factura', facturaId],
    queryFn: () => fetchFacturaById(facturaId!),
    enabled: !!user && !!facturaId,
  });
}

export function useFacturaMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const create = useMutation({
    mutationFn: async (
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
    ) => {
      return insertFacturaCompleta(data, user?.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['facturas'] });
      qc.invalidateQueries({ queryKey: ['cuenta-corriente'] });
      toast.success('Factura registrada');
    },
    onError: (e) => toast.error(`Error al registrar factura: ${e.message}`),
  });

  const softDelete = useMutation({
    mutationFn: async (id: string) => {
      await softDeleteFactura(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['facturas'] });
      toast.success('Factura eliminada');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return { create, softDelete };
}

export function usePagosProveedor(facturaId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pagos-proveedor', facturaId],
    queryFn: () => fetchPagosProveedor(facturaId),
    enabled: !!user && !!facturaId,
  });
}

export function usePagoProveedorMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const create = useMutation({
    mutationFn: async (data: PagoProveedorFormData) => {
      return createPagoProveedor(data, user?.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pagos-proveedor'] });
      qc.invalidateQueries({ queryKey: ['facturas'] });
      qc.invalidateQueries({ queryKey: ['movimientos-proveedor'] });
      qc.invalidateQueries({ queryKey: ['saldo-proveedor'] });
      qc.invalidateQueries({ queryKey: ['resumen-proveedor'] });
      qc.invalidateQueries({ queryKey: ['cuenta-corriente'] });
      toast.success('Pago registrado');
    },
    onError: (e) => toast.error(`Error al registrar pago: ${e.message}`),
  });

  const softDeletePago = useMutation({
    mutationFn: async (id: string) => {
      await deletePagoService(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pagos-proveedor'] });
      qc.invalidateQueries({ queryKey: ['facturas'] });
      qc.invalidateQueries({ queryKey: ['movimientos-proveedor'] });
      qc.invalidateQueries({ queryKey: ['saldo-proveedor'] });
      qc.invalidateQueries({ queryKey: ['resumen-proveedor'] });
      toast.success('Pago eliminado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return { create, softDeletePago };
}

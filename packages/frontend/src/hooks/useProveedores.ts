import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { ProveedorFormData } from '@/types/financial';
import {
  fetchProveedores,
  createProveedor,
  updateProveedor,
  softDeleteProveedor,
} from '@/services/proveedoresService';
import { apiGet } from '@/services/apiClient';

export interface LastUsedSupplierEntry {
  location_id: string;
  insumo_id: string;
  proveedor_id: string;
  last_used_date: string;
}

/** Returns the last-used supplier per insumo for a given location (Sprint 5). */
export function useLastUsedSuppliers(locationId: string | undefined) {
  return useQuery({
    queryKey: ['suppliers-last-used', locationId],
    queryFn: async () => {
      const res = await apiGet<{ data: LastUsedSupplierEntry[] }>(
        `/suppliers/last-used?location_id=${locationId}`
      );
      return res.data;
    },
    enabled: !!locationId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useProveedores(branchId?: string) {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['proveedores', branchId],
    queryFn: () => fetchProveedores(branchId),
    enabled: !!user,
  });

  return query;
}

/** Lista proveedores de nivel cuenta (compartidos entre todas las locations). */
export function useAccountProveedores() {
  return useProveedores('__account_scope__');
}

export function useProveedorMutations() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const create = useMutation({
    mutationFn: (data: ProveedorFormData) => createProveedor(data, user?.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['proveedores'] });
      toast.success('Proveedor creado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProveedorFormData> }) =>
      updateProveedor(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['proveedores'] });
      toast.success('Proveedor actualizado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const softDelete = useMutation({
    mutationFn: (id: string) => softDeleteProveedor(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['proveedores'] });
      toast.success('Proveedor eliminado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return { create, update, softDelete };
}

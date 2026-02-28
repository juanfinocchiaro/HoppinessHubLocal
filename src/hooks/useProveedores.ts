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

export function useProveedores(branchId?: string) {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['proveedores', branchId],
    queryFn: () => fetchProveedores(branchId),
    enabled: !!user,
  });

  return query;
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

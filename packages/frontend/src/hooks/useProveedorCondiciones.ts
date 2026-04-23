import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import {
  fetchCondicionesByBranch,
  fetchCondicionesProveedor,
  upsertCondiciones,
} from '@/services/proveedoresService';

export interface CondicionesLocal {
  id: string;
  proveedor_id: string;
  branch_id: string;
  permite_cuenta_corriente: boolean;
  dias_pago_habitual: number | null;
  descuento_pago_contado: number | null;
  notes: string | null;
}

export interface CondicionesFormData {
  permite_cuenta_corriente: boolean;
  dias_pago_habitual?: number | null;
  descuento_pago_contado?: number | null;
  notes?: string | null;
}

/** Fetch all condiciones for a branch (keyed by proveedor_id) */
export function useCondicionesByBranch(branchId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['proveedor-condiciones', branchId],
    queryFn: async () => {
      const data = await fetchCondicionesByBranch(branchId!);
      const map: Record<string, CondicionesLocal> = {};
      data?.forEach((r: any) => {
        map[r.proveedor_id] = r;
      });
      return map;
    },
    enabled: !!user && !!branchId,
  });
}

/** Fetch condiciones for a single proveedor+branch */
export function useCondicionesProveedor(branchId?: string, proveedorId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['proveedor-condiciones', branchId, proveedorId],
    queryFn: async () => {
      const data = await fetchCondicionesProveedor(branchId!, proveedorId!);
      return data as CondicionesLocal | null;
    },
    enabled: !!user && !!branchId && !!proveedorId,
  });
}

export function useCondicionesMutations() {
  const qc = useQueryClient();

  const upsert = useMutation({
    mutationFn: ({
      proveedorId,
      branchId,
      data,
    }: {
      proveedorId: string;
      branchId: string;
      data: CondicionesFormData;
    }) => upsertCondiciones(proveedorId, branchId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['proveedor-condiciones'] });
      toast.success('Condiciones guardadas');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return { upsert };
}

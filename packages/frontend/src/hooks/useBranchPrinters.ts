/**
 * useBranchPrinters - CRUD for branch_printers table
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  fetchBranchPrinters,
  createBranchPrinter,
  updateBranchPrinter,
  deleteBranchPrinter,
} from '@/services/configService';

export type { BranchPrinter } from '@/services/configService';

export function useBranchPrinters(branchId: string) {
  const qc = useQueryClient();
  const queryKey = ['branch-printers', branchId];

  const query = useQuery({
    queryKey,
    queryFn: () => fetchBranchPrinters(branchId),
    enabled: !!branchId,
  });

  const create = useMutation({
    mutationFn: createBranchPrinter,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success('Impresora creada');
    },
    onError: () => toast.error('Error al crear impresora'),
  });

  const update = useMutation({
    mutationFn: updateBranchPrinter,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success('Impresora actualizada');
    },
    onError: () => toast.error('Error al actualizar'),
  });

  const remove = useMutation({
    mutationFn: deleteBranchPrinter,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success('Impresora eliminada');
    },
    onError: () => toast.error('Error al eliminar'),
  });

  return { ...query, create, update, remove };
}

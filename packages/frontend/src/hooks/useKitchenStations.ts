/**
 * useKitchenStations - CRUD for kitchen_stations table
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  fetchKitchenStations,
  createKitchenStation,
  updateKitchenStation,
  softDeleteKitchenStation,
} from '@/services/configService';

export type { KitchenStation } from '@/services/configService';

export function useKitchenStations(branchId: string) {
  const qc = useQueryClient();
  const queryKey = ['kitchen-stations', branchId];

  const query = useQuery({
    queryKey,
    queryFn: () => fetchKitchenStations(branchId),
    enabled: !!branchId,
  });

  const create = useMutation({
    mutationFn: createKitchenStation,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success('Estación creada');
    },
    onError: () => toast.error('Error al crear estación'),
  });

  const update = useMutation({
    mutationFn: updateKitchenStation,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success('Estación actualizada');
    },
    onError: () => toast.error('Error al actualizar'),
  });

  const remove = useMutation({
    mutationFn: softDeleteKitchenStation,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success('Estación eliminada');
    },
    onError: () => toast.error('Error al eliminar'),
  });

  return { ...query, create, update, remove };
}

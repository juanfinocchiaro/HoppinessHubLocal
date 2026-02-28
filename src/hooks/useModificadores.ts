import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  fetchModificadores,
  createModificador,
  updateModificador,
  deleteModificador,
} from '@/services/menuService';

export function useModificadores(itemId: string | undefined) {
  return useQuery({
    queryKey: ['modificadores', itemId],
    queryFn: () => (itemId ? fetchModificadores(itemId) : null),
    enabled: !!itemId,
  });
}

export function useModificadoresMutations() {
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: (data: Record<string, unknown>) => createModificador(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['modificadores', (variables as Record<string, unknown>).item_carta_id],
      });
      toast.success('Modificador agregado');
    },
    onError: (e: Error) => toast.error(`Error: ${e.message}`),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updateModificador(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modificadores'] });
    },
    onError: (e: Error) => toast.error(`Error: ${e.message}`),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteModificador(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modificadores'] });
      toast.success('Modificador eliminado');
    },
    onError: (e: Error) => toast.error(`Error: ${e.message}`),
  });

  return { create, update, remove };
}

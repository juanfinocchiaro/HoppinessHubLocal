import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  fetchComboComponents,
  replaceComboComponents,
  recalculateComboCost,
  type ComboComponentRow,
} from '@/services/comboService';

export type { ComboComponentRow };

export function useComboComponents(comboId: string | undefined) {
  return useQuery({
    queryKey: ['combo-components', comboId],
    queryFn: () => fetchComboComponents(comboId!),
    enabled: !!comboId,
  });
}

/**
 * Fase 6: reemplaza todos los componentes del combo y, tras guardar,
 * dispara el recalcule de `total_cost`/`fc_actual` en el backend.
 */
export function useReplaceComboComponents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      comboId: string;
      components: Array<{ component_id: string; quantity: number; sort_order?: number | null }>;
    }) => {
      await replaceComboComponents(params.comboId, params.components);
      await recalculateComboCost(params.comboId);
      return params.comboId;
    },
    onSuccess: (comboId) => {
      qc.invalidateQueries({ queryKey: ['combo-components', comboId] });
      qc.invalidateQueries({ queryKey: ['items-carta'] });
      toast.success('Combo guardado y costo recalculado');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Error al guardar el combo';
      toast.error(msg);
    },
  });
}

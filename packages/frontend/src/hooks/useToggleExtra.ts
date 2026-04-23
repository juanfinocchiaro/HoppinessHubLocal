import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  fetchExtrasCategoryId,
  findExistingExtraItem,
  createExtraItemCarta,
  reactivateExtraItemCarta,
  deleteComposicionByItem,
  insertComposicionRow,
  recalcularCostoItemCarta,
  upsertExtraAssignment,
  deleteExtraAssignment,
  countExtraAssignments,
  softDeleteItemCarta,
} from '@/services/menuService';

export function useToggleExtra() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      item_carta_id,
      tipo,
      ref_id,
      name,
      costo,
      cantidad = 1,
      activo,
    }: {
      item_carta_id: string;
      tipo: 'preparacion' | 'insumo';
      ref_id: string;
      name: string;
      costo: number;
      cantidad?: number;
      activo: boolean;
    }) => {
      if (activo) {
        let existing = await findExistingExtraItem(tipo, ref_id);
        let extraId: string;

        if (!existing) {
          const catId = await fetchExtrasCategoryId();
          const data = await createExtraItemCarta({
            nombre: `Extra ${name}`,
            catId,
            costo,
            composicion_ref_preparacion_id: tipo === 'preparacion' ? ref_id : null,
            composicion_ref_insumo_id: tipo === 'insumo' ? ref_id : null,
          });
          extraId = data.id;
        } else {
          extraId = existing.id;
          await reactivateExtraItemCarta(extraId, costo);
        }

        await deleteComposicionByItem(extraId);

        await insertComposicionRow({
          item_carta_id: extraId,
          preparacion_id: tipo === 'preparacion' ? ref_id : null,
          insumo_id: tipo === 'insumo' ? ref_id : null,
          cantidad: cantidad,
          orden: 0,
        });

        await recalcularCostoItemCarta(extraId);
        await upsertExtraAssignment(item_carta_id, extraId);
      } else {
        const existing = await findExistingExtraItem(tipo, ref_id);
        if (existing) {
          await deleteExtraAssignment(item_carta_id, existing.id);

          const count = await countExtraAssignments(existing.id);

          if (count === 0) {
            await deleteComposicionByItem(existing.id);
            await softDeleteItemCarta(existing.id);
          }
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['item-extra-asignaciones'] });
      qc.invalidateQueries({ queryKey: ['items-carta'] });
      toast.success('Extra actualizado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });
}

/**
 * Toggle assignment from the extra's side (Asignados tab)
 */
export function useToggleExtraAssignment() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      item_carta_id,
      extra_id,
      activo,
    }: {
      item_carta_id: string;
      extra_id: string;
      activo: boolean;
    }) => {
      if (activo) {
        await upsertExtraAssignment(item_carta_id, extra_id);
      } else {
        await deleteExtraAssignment(item_carta_id, extra_id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['item-extra-asignaciones'] });
      qc.invalidateQueries({ queryKey: ['items-carta'] });
      toast.success('Asignación actualizada');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });
}

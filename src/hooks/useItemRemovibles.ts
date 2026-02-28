import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  fetchItemRemovibles,
  upsertRemovible,
  deleteRemovibleByInsumo,
  deleteRemovibleByPreparacion,
  updateRemovibleNombreDisplay,
} from '@/services/menuService';

export function useItemRemovibles(itemId: string | undefined) {
  return useQuery({
    queryKey: ['item-removibles', itemId],
    queryFn: () => (itemId ? fetchItemRemovibles(itemId) : []),
    enabled: !!itemId,
  });
}

export function useItemRemoviblesMutations() {
  const qc = useQueryClient();

  const toggleInsumo = useMutation({
    mutationFn: async ({
      item_carta_id,
      insumo_id,
      activo,
      nombre_display,
    }: {
      item_carta_id: string;
      insumo_id: string;
      activo: boolean;
      nombre_display?: string;
    }) => {
      if (activo) {
        await upsertRemovible({
          item_carta_id,
          insumo_id,
          preparacion_id: null,
          nombre_display: nombre_display || null,
        });
      } else {
        await deleteRemovibleByInsumo(item_carta_id, insumo_id);
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['item-removibles', vars.item_carta_id] });
    },
    onError: (e: Error) => toast.error(`Error: ${e.message}`),
  });

  const togglePreparacion = useMutation({
    mutationFn: async ({
      item_carta_id,
      preparacion_id,
      activo,
      nombre_display,
    }: {
      item_carta_id: string;
      preparacion_id: string;
      activo: boolean;
      nombre_display?: string;
    }) => {
      if (activo) {
        await upsertRemovible({
          item_carta_id,
          insumo_id: null,
          preparacion_id,
          nombre_display: nombre_display || null,
        });
      } else {
        await deleteRemovibleByPreparacion(item_carta_id, preparacion_id);
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['item-removibles', vars.item_carta_id] });
    },
    onError: (e: Error) => toast.error(`Error: ${e.message}`),
  });

  const updateNombreDisplayMut = useMutation({
    mutationFn: ({ id, nombre_display }: { id: string; nombre_display: string }) =>
      updateRemovibleNombreDisplay(id, nombre_display),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['item-removibles'] });
    },
    onError: (e: Error) => toast.error(`Error: ${e.message}`),
  });

  // Keep backward compat
  const toggle = toggleInsumo;

  return { toggle, toggleInsumo, togglePreparacion, updateNombreDisplay: updateNombreDisplayMut };
}

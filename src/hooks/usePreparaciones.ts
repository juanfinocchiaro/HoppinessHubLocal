import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  fetchPreparaciones as fetchPreparacionesSvc,
  fetchPreparacionIngredientes,
  fetchPreparacionOpciones,
  createPreparacion,
  updatePreparacion,
  softDeletePreparacion,
  savePreparacionIngredientes,
  savePreparacionOpciones,
} from '@/services/menuService';

export function usePreparaciones() {
  return useQuery({
    queryKey: ['preparaciones'],
    queryFn: fetchPreparacionesSvc,
  });
}

export function usePreparacionIngredientes(preparacionId: string | undefined) {
  return useQuery({
    queryKey: ['preparacion-ingredientes', preparacionId],
    queryFn: async () => {
      if (!preparacionId) return [];
      return fetchPreparacionIngredientes(preparacionId);
    },
    enabled: !!preparacionId,
  });
}

export function usePreparacionOpciones(preparacionId: string | undefined) {
  return useQuery({
    queryKey: ['preparacion-opciones', preparacionId],
    queryFn: async () => {
      if (!preparacionId) return [];
      return fetchPreparacionOpciones(preparacionId);
    },
    enabled: !!preparacionId,
  });
}

export function usePreparacionMutations() {
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: (data: {
      nombre: string;
      descripcion?: string;
      tipo: string;
      is_interchangeable?: boolean;
      metodo_costeo?: string;
    }) => createPreparacion(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['preparaciones'] });
      toast.success('Preparación creada');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updatePreparacion(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['preparaciones'] });
      toast.success('Preparación actualizada');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const softDelete = useMutation({
    mutationFn: (id: string) => softDeletePreparacion(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['preparaciones'] });
      toast.success('Preparación eliminada');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const saveIngredientes = useMutation({
    mutationFn: ({ preparacion_id, items }: { preparacion_id: string; items: any[] }) =>
      savePreparacionIngredientes(preparacion_id, items),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['preparacion-ingredientes', vars.preparacion_id] });
      qc.invalidateQueries({ queryKey: ['preparaciones'] });
      toast.success('Ficha técnica guardada');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const saveOpciones = useMutation({
    mutationFn: ({
      preparacion_id,
      insumo_ids,
    }: {
      preparacion_id: string;
      insumo_ids: string[];
    }) => savePreparacionOpciones(preparacion_id, insumo_ids),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['preparacion-opciones', vars.preparacion_id] });
      qc.invalidateQueries({ queryKey: ['preparaciones'] });
      toast.success('Opciones guardadas');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return { create, update, softDelete, saveIngredientes, saveOpciones };
}

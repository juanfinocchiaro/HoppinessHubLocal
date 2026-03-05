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
    queryFn: async () => {
      const data = await fetchPreparacionesSvc();
      return (data || []).map((p: any) => ({ ...p, nombre: p.name ?? p.nombre }));
    },
  });
}

export function usePreparacionIngredientes(preparacionId: string | undefined) {
  return useQuery({
    queryKey: ['preparacion-ingredientes', preparacionId],
    queryFn: async () => {
      if (!preparacionId) return [];
      const data = await fetchPreparacionIngredientes(preparacionId);
      return (data || []).map((ing: any) => ({
        ...ing,
        insumos: ing.insumos ? { ...ing.insumos, nombre: ing.insumos.name ?? ing.insumos.nombre } : ing.insumos,
        preparaciones: ing.preparaciones ? { ...ing.preparaciones, nombre: ing.preparaciones.name ?? ing.preparaciones.nombre } : ing.preparaciones,
        supplies: ing.supplies ? { ...ing.supplies, nombre: ing.supplies.name ?? ing.supplies.nombre } : ing.supplies,
        recipes: ing.recipes ? { ...ing.recipes, nombre: ing.recipes.name ?? ing.recipes.nombre } : ing.recipes,
      }));
    },
    enabled: !!preparacionId,
  });
}

export function usePreparacionOpciones(preparacionId: string | undefined) {
  return useQuery({
    queryKey: ['preparacion-opciones', preparacionId],
    queryFn: async () => {
      if (!preparacionId) return [];
      const data = await fetchPreparacionOpciones(preparacionId);
      return (data || []).map((opt: any) => ({
        ...opt,
        insumos: opt.insumos ? { ...opt.insumos, nombre: opt.insumos.name ?? opt.insumos.nombre } : opt.insumos,
        supplies: opt.supplies ? { ...opt.supplies, nombre: opt.supplies.name ?? opt.supplies.nombre } : opt.supplies,
      }));
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

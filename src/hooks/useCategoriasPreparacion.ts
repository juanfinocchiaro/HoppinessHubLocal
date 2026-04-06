import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  fetchCategoriasPreparacion,
  createCategoriaPreparacion,
  updateCategoriaPreparacion,
  reorderCategoriasPreparacion,
  softDeleteCategoriaPreparacion,
} from '@/services/menuService';

export function useCategoriasPreparacion() {
  return useQuery({
    queryKey: ['categorias-preparacion'],
    queryFn: fetchCategoriasPreparacion,
  });
}

export function useCategoriaPreparacionMutations() {
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: (data: { nombre: string; orden: number }) => createCategoriaPreparacion(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categorias-preparacion'] });
      toast.success('Categoría creada');
    },
    onError: (e: Error) => toast.error(`Error: ${e.message}`),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updateCategoriaPreparacion(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categorias-preparacion'] });
      toast.success('Categoría actualizada');
    },
    onError: (e: Error) => toast.error(`Error: ${e.message}`),
  });

  const reorder = useMutation({
    mutationFn: (items: { id: string; orden: number }[]) => reorderCategoriasPreparacion(items),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categorias-preparacion'] }),
    onError: (e: Error) => toast.error(`Error: ${e.message}`),
  });

  const softDelete = useMutation({
    mutationFn: (id: string) => softDeleteCategoriaPreparacion(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categorias-preparacion'] });
      qc.invalidateQueries({ queryKey: ['preparaciones'] });
      toast.success('Categoría eliminada');
    },
    onError: (e: Error) => toast.error(`Error: ${e.message}`),
  });

  return { create, update, reorder, softDelete };
}

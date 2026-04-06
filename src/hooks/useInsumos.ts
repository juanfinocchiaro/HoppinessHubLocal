import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { InsumoFormData, CategoriaInsumoFormData } from '@/types/financial';
import {
  fetchCategoriasInsumo,
  createCategoriaInsumo,
  updateCategoriaInsumo,
  softDeleteCategoriaInsumo,
  fetchInsumos as fetchInsumosSvc,
  createInsumo,
  updateInsumo,
  softDeleteInsumo,
} from '@/services/menuService';

// ===== CATEGORÍAS =====
export function useCategoriasInsumo() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['categorias-insumo'],
    queryFn: fetchCategoriasInsumo,
    enabled: !!user,
  });
}

export function useCategoriaInsumoMutations() {
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: (data: CategoriaInsumoFormData) => createCategoriaInsumo(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categorias-insumo'] });
      toast.success('Categoría creada');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CategoriaInsumoFormData> }) =>
      updateCategoriaInsumo(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categorias-insumo'] });
      toast.success('Categoría actualizada');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const softDelete = useMutation({
    mutationFn: (id: string) => softDeleteCategoriaInsumo(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categorias-insumo'] });
      toast.success('Categoría eliminada');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return { create, update, softDelete };
}

// ===== INSUMOS =====
export function useInsumos() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['insumos'],
    queryFn: async () => {
      return (await fetchInsumosSvc()) || [];
    },
    enabled: !!user,
  });
}

export function useInsumoMutations() {
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: (data: InsumoFormData) => createInsumo(data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['insumos'] });
      const label =
        variables.tipo_item === 'producto'
          ? 'Producto'
          : variables.tipo_item === 'ingrediente'
            ? 'Ingrediente'
            : 'Insumo';
      toast.success(`${label} creado`);
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsumoFormData> }) =>
      updateInsumo(id, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['insumos'] });
      const tipo = variables.data.item_type;
      const label =
        tipo === 'producto' ? 'Producto' : tipo === 'ingrediente' ? 'Ingrediente' : 'Insumo';
      toast.success(`${label} actualizado`);
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const softDelete = useMutation({
    mutationFn: (id: string) => softDeleteInsumo(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['insumos'] });
      toast.success('Insumo eliminado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return { create, update, softDelete };
}

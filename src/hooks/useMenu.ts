import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  fetchMenuCategorias,
  createMenuCategoria,
  updateMenuCategoria,
  reorderMenuCategorias,
  softDeleteMenuCategoria,
  toggleMenuCategoriaVisibility,
  fetchMenuProductos,
  createMenuProducto,
  updateMenuProducto,
  softDeleteMenuProducto,
  fetchFichaTecnica,
  saveFichaTecnica,
  fetchHistorialPreciosMenu,
  cambiarPrecioMenuProducto,
} from '@/services/menuService';

// NOTA: v_menu_costos y menu_productos están deprecados.
// El sistema activo de costos usa items_carta + CentroCostosPage (useItemsCarta).

// Categorías del menú
export function useMenuCategorias() {
  return useQuery({
    queryKey: ['menu-categorias'],
    queryFn: fetchMenuCategorias,
  });
}

// Mutations para categorías
export function useMenuCategoriaMutations() {
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: (data: { nombre: string; descripcion?: string; orden?: number }) =>
      createMenuCategoria(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-categorias'] });
      toast.success('Categoría creada');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const update = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { nombre?: string; descripcion?: string; orden?: number };
    }) => updateMenuCategoria(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-categorias'] });
      toast.success('Categoría actualizada');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const reorder = useMutation({
    mutationFn: (items: { id: string; orden: number }[]) => reorderMenuCategorias(items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-categorias'] });
    },
    onError: (e) => toast.error(`Error al reordenar: ${e.message}`),
  });

  const softDelete = useMutation({
    mutationFn: (id: string) => softDeleteMenuCategoria(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-categorias'] });
      queryClient.invalidateQueries({ queryKey: ['menu-productos'] });
      toast.success('Categoría eliminada');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const toggleVisibility = useMutation({
    mutationFn: ({ id, visible }: { id: string; visible: boolean }) =>
      toggleMenuCategoriaVisibility(id, visible),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-categorias'] });
      toast.success('Visibilidad actualizada');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return { create, update, reorder, softDelete, toggleVisibility };
}

// Productos del menú con datos relacionados
export function useMenuProductos() {
  return useQuery({
    queryKey: ['menu-productos'],
    queryFn: fetchMenuProductos,
  });
}

// Ficha técnica de un producto
export function useFichaTecnica(productoId: string | undefined) {
  return useQuery({
    queryKey: ['ficha-tecnica', productoId],
    queryFn: () => (productoId ? fetchFichaTecnica(productoId) : null),
    enabled: !!productoId,
  });
}

// Mutations para productos
export function useMenuProductoMutations() {
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: (data: Record<string, unknown>) => createMenuProducto(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-productos'] });
      toast.success('Producto creado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updateMenuProducto(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-productos'] });
      toast.success('Producto actualizado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const softDelete = useMutation({
    mutationFn: (id: string) => softDeleteMenuProducto(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-productos'] });
      toast.success('Producto eliminado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return { create, update, softDelete };
}

// Mutations para ficha técnica
export function useFichaTecnicaMutations() {
  const queryClient = useQueryClient();

  const save = useMutation({
    mutationFn: ({
      menu_producto_id,
      items,
    }: {
      menu_producto_id: string;
      items: { insumo_id: string; cantidad: number; unidad: string }[];
    }) => saveFichaTecnica(menu_producto_id, items),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ficha-tecnica', variables.menu_producto_id] });
      queryClient.invalidateQueries({ queryKey: ['menu-productos'] });
      toast.success('Ficha técnica guardada');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return { save };
}

// Historial de precios
export function useHistorialPrecios(productoId: string | undefined) {
  return useQuery({
    queryKey: ['historial-precios', productoId],
    queryFn: () => fetchHistorialPreciosMenu(productoId!),
    enabled: !!productoId,
  });
}

// Cambiar precio (con historial)
export function useCambiarPrecioMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      productoId: string;
      precioAnterior: number;
      precioNuevo: number;
      motivo?: string;
      userId?: string;
    }) => cambiarPrecioMenuProducto(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-productos'] });
      queryClient.invalidateQueries({ queryKey: ['centro-costos'] });
      queryClient.invalidateQueries({ queryKey: ['historial-precios'] });
      toast.success('Precio actualizado');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });
}

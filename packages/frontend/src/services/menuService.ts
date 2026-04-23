/**
 * menuService - HTTP API operations for menu management
 * Covers: supply categories, supplies, recipes, menu items, menu categories,
 *         extras, removables, modifiers, option groups, webapp menu, product images
 */
import { apiGet, apiPost, apiPut, apiDelete, apiUpload } from './apiClient';
import type { InsumoFormData, CategoriaInsumoFormData } from '@/types/financial';

// ── Categorías Insumo ──────────────────────────────────────────────

export async function fetchCategoriasInsumo() {
  return apiGet('/menu/supply-categories');
}

export async function createCategoriaInsumo(payload: CategoriaInsumoFormData) {
  return apiPost('/menu/supply-categories', payload);
}

export async function updateCategoriaInsumo(
  id: string,
  payload: Partial<CategoriaInsumoFormData>,
) {
  return apiPut(`/menu/supply-categories/${id}`, payload);
}

export async function softDeleteCategoriaInsumo(id: string) {
  return apiDelete(`/menu/supply-categories/${id}`);
}

// ── Insumos ────────────────────────────────────────────────────────

export async function fetchInsumos() {
  return apiGet('/menu/supplies');
}

export async function createInsumo(payload: InsumoFormData) {
  return apiPost('/menu/supplies', payload);
}

export async function updateInsumo(id: string, payload: Partial<InsumoFormData>) {
  return apiPut(`/menu/supplies/${id}`, payload);
}

export async function softDeleteInsumo(id: string) {
  return apiDelete(`/menu/supplies/${id}`);
}

// ── Preparaciones ──────────────────────────────────────────────────

export async function fetchPreparaciones() {
  return apiGet('/menu/recipes');
}

export async function fetchPreparacionIngredientes(preparacionId: string) {
  return apiGet(`/menu/recipes/${preparacionId}/ingredients`);
}

export async function fetchPreparacionOpciones(preparacionId: string) {
  return apiGet(`/menu/recipes/${preparacionId}/options`);
}

export async function createPreparacion(payload: {
  nombre: string;
  descripcion?: string;
  tipo: string;
  is_interchangeable?: boolean;
  metodo_costeo?: string;
}) {
  return apiPost('/menu/recipes', payload);
}

export async function updatePreparacion(id: string, payload: any) {
  return apiPut(`/menu/recipes/${id}`, payload);
}

export async function softDeletePreparacion(id: string) {
  return apiDelete(`/menu/recipes/${id}`);
}

export async function savePreparacionIngredientes(
  preparacion_id: string,
  items: any[],
) {
  return apiPost(`/menu/recipes/${preparacion_id}/ingredients`, { items });
}

export async function savePreparacionOpciones(
  preparacion_id: string,
  insumo_ids: string[],
) {
  return apiPost(`/menu/recipes/${preparacion_id}/options`, { insumo_ids });
}

// ── Items Carta ────────────────────────────────────────────────────

export async function fetchBranchItemAvailability(branchId: string) {
  return apiGet('/menu/items/branch-availability', { branchId });
}

export async function fetchItemsCarta() {
  return apiGet('/menu/items');
}

export async function fetchItemCartaComposicion(itemId: string) {
  return apiGet(`/menu/items/${itemId}/composition`);
}

export async function fetchItemCartaHistorial(itemId: string) {
  return apiGet(`/menu/items/${itemId}/price-history`);
}

export async function createItemCarta(payload: {
  nombre: string;
  nombre_corto?: string;
  descripcion?: string;
  categoria_carta_id?: string | null;
  rdo_category_code?: string;
  precio_base: number;
  fc_objetivo?: number;
  disponible_delivery?: boolean;
  tipo?: string;
}) {
  return apiPost('/menu/items', payload);
}

export async function updateItemCarta(id: string, payload: any) {
  return apiPut(`/menu/items/${id}`, payload);
}

export async function softDeleteItemCarta(id: string) {
  return apiDelete(`/menu/items/${id}`);
}

export async function saveItemCartaComposicion(
  item_carta_id: string,
  items: { preparacion_id?: string; insumo_id?: string; cantidad: number }[],
) {
  return apiPost(`/menu/items/${item_carta_id}/composition`, { items });
}

export async function cambiarPrecioItemCarta(params: {
  itemId: string;
  precioAnterior: number;
  precioNuevo: number;
  motivo?: string;
  userId?: string;
}) {
  return apiPost(`/menu/items/${params.itemId}/change-price`, params);
}

// ── Recalcular costo (RPC helper) ───────────────────────────────────

export async function recalcularCostoItemCarta(itemId: string) {
  return apiPost(`/menu/items/${itemId}/recalculate-cost`);
}

// ── Menu Categorías ─────────────────────────────────────────────────

export async function fetchMenuCategorias() {
  return apiGet('/menu/categories');
}

export async function createMenuCategoria(payload: {
  name: string;
  description?: string | null;
  sort_order?: number;
  print_type?: string;
}) {
  return apiPost('/menu/categories', payload);
}

export async function updateMenuCategoria(
  id: string,
  payload: { name?: string; description?: string; sort_order?: number; print_type?: string },
) {
  return apiPut(`/menu/categories/${id}`, payload);
}

export async function reorderMenuCategorias(items: { id: string; sort_order: number }[]) {
  return apiPost('/menu/categories/reorder', { items });
}

export async function softDeleteMenuCategoria(id: string) {
  return apiDelete(`/menu/categories/${id}`);
}

export async function toggleMenuCategoriaVisibility(id: string, visible: boolean) {
  return apiPut(`/menu/categories/${id}/visibility`, { is_visible_menu: visible });
}

export async function fetchHiddenMenuCategoriaIds() {
  return apiGet<string[]>('/menu/categories/hidden-ids');
}

// ── Grupos Opcionales ───────────────────────────────────────────────

export async function fetchGruposOpcionales(itemId: string) {
  return apiGet(`/menu/items/${itemId}/option-groups`);
}

export async function createGrupoOpcional(params: {
  item_carta_id: string;
  nombre: string;
  orden: number;
}) {
  return apiPost('/menu/option-groups', params);
}

export async function updateGrupoOpcional(id: string, data: { nombre?: string }) {
  return apiPut(`/menu/option-groups/${id}`, data);
}

export async function deleteGrupoOpcional(id: string) {
  return apiDelete(`/menu/option-groups/${id}`);
}

export async function saveGrupoOpcionalItems(
  grupo_id: string,
  items: {
    insumo_id?: string | null;
    preparacion_id?: string | null;
    cantidad: number;
    costo_unitario: number;
  }[],
) {
  return apiPost(`/menu/option-groups/${grupo_id}/items`, { items });
}

export async function updateGrupoOpcionalCosto(grupo_id: string, costo_promedio: number) {
  return apiPut(`/menu/option-groups/${grupo_id}/cost`, { average_cost: Math.round(costo_promedio * 100) / 100 });
}

// ── Extras & Asignaciones ───────────────────────────────────────────

export async function fetchExtrasCategoryId(): Promise<string | null> {
  const data = await apiGet<{ id: string } | null>('/menu/extras/category-id');
  return data?.id || null;
}

export async function findExistingExtraItem(
  tipo: 'preparacion' | 'insumo',
  refId: string,
): Promise<{ id: string; is_active: boolean; deleted_at: string | null } | null> {
  return apiGet('/menu/extras/find-existing', { tipo, refId });
}

export async function createExtraItemCarta(params: {
  nombre: string;
  catId: string | null;
  costo: number;
  composicion_ref_preparacion_id?: string | null;
  composicion_ref_insumo_id?: string | null;
}) {
  return apiPost('/menu/extras', params);
}

export async function reactivateExtraItemCarta(id: string, costo: number) {
  return apiPut(`/menu/extras/${id}/reactivate`, { total_cost: costo });
}

export async function deleteComposicionByItem(item_carta_id: string) {
  return apiDelete(`/menu/items/${item_carta_id}/composition`);
}

export async function insertComposicionRow(row: {
  item_carta_id: string;
  preparacion_id?: string | null;
  insumo_id?: string | null;
  cantidad: number;
  orden: number;
}) {
  return apiPost('/menu/compositions', row);
}

export async function upsertExtraAssignment(item_carta_id: string, extra_id: string) {
  return apiPost('/menu/extra-assignments', { item_carta_id, extra_id });
}

export async function deleteExtraAssignment(item_carta_id: string, extra_id: string) {
  return apiDelete('/menu/extra-assignments', { item_carta_id, extra_id });
}

export async function countExtraAssignments(extra_id: string) {
  const data = await apiGet<{ count: number }>('/menu/extra-assignments/count', { extra_id });
  return data?.count ?? 0;
}

export async function fetchExtraAssignmentsByItem(itemId: string) {
  return apiGet<Array<Record<string, unknown>>>(`/menu/items/${itemId}/extra-assignments`);
}

export async function fetchExtraAssignmentsWithJoin(itemId: string) {
  return apiGet(`/menu/items/${itemId}/extra-assignments-with-join`);
}

export async function fetchExtraAssignmentsForExtra(extraId: string) {
  return apiGet(`/menu/extras/${extraId}/assignments`);
}

export async function fetchActiveExtrasByIds(extraIds: string[]) {
  return apiPost('/menu/extras/active-by-ids', { extraIds });
}

export async function saveExtraAssignments(item_carta_id: string, extra_ids: string[]) {
  return apiPost(`/menu/items/${item_carta_id}/save-extra-assignments`, { extra_ids });
}

export async function updatePrecioExtra(
  table: 'recipes' | 'supplies',
  id: string,
  precio_extra: number | null,
) {
  return apiPut(`/menu/${table}/${id}/extra-price`, { extra_price: precio_extra });
}

// ── Removibles ──────────────────────────────────────────────────────

export async function fetchItemRemovibles(itemId: string) {
  return apiGet<Array<Record<string, unknown>>>(`/menu/items/${itemId}/removables`);
}

export async function upsertRemovible(params: {
  item_carta_id: string;
  insumo_id?: string | null;
  preparacion_id?: string | null;
  nombre_display?: string | null;
}) {
  return apiPost('/menu/removables', params);
}

export async function deleteRemovibleByInsumo(item_carta_id: string, insumo_id: string) {
  return apiDelete('/menu/removables/by-insumo', { item_carta_id, insumo_id });
}

export async function deleteRemovibleByPreparacion(
  item_carta_id: string,
  preparacion_id: string,
) {
  return apiDelete('/menu/removables/by-preparacion', { item_carta_id, preparacion_id });
}

export async function updateRemovibleNombreDisplay(id: string, nombre_display: string) {
  return apiPut(`/menu/removables/${id}/display-name`, { display_name: nombre_display });
}

// ── Modificadores ───────────────────────────────────────────────────

export async function fetchModificadores(itemId: string) {
  return apiGet<Array<Record<string, unknown>>>(`/menu/items/${itemId}/modifiers`);
}

export async function createModificador(payload: Record<string, unknown>) {
  return apiPost('/menu/modifiers', payload);
}

export async function updateModificador(id: string, payload: Record<string, unknown>) {
  return apiPut(`/menu/modifiers/${id}`, payload);
}

export async function deleteModificador(id: string) {
  return apiDelete(`/menu/modifiers/${id}`);
}

// ── Webapp Menu ─────────────────────────────────────────────────────

export async function fetchWebappConfig(branchSlug: string) {
  return apiGet<{ branch: any; config: any }>(`/menu/webapp/config/${branchSlug}`);
}

export async function fetchWebappMenuItems(branchId: string) {
  return apiGet<{ items: any[]; availability: any[] }>('/menu/webapp/items', { branchId });
}

export async function fetchWebappItemOptionalGroups(itemId: string) {
  return apiGet<{ groups: Array<Record<string, unknown>>; options: Array<Record<string, unknown>> }>(
    `/menu/webapp/items/${itemId}/option-groups`,
  );
}

export async function fetchWebappItemExtras(itemId: string) {
  return apiGet(`/menu/webapp/items/${itemId}/extras`);
}

export async function fetchWebappItemRemovables(itemId: string) {
  return apiGet(`/menu/webapp/items/${itemId}/removables`);
}

// ── Categorías Preparación ──────────────────────────────────────────

export async function fetchCategoriasPreparacion() {
  return apiGet('/menu/recipe-categories');
}

export async function createCategoriaPreparacion(payload: { nombre: string; orden: number }) {
  return apiPost('/menu/recipe-categories', payload);
}

export async function updateCategoriaPreparacion(
  id: string,
  payload: Record<string, unknown>,
) {
  return apiPut(`/menu/recipe-categories/${id}`, payload);
}

export async function reorderCategoriasPreparacion(items: { id: string; orden: number }[]) {
  return apiPost('/menu/recipe-categories/reorder', { items });
}

export async function softDeleteCategoriaPreparacion(id: string) {
  return apiDelete(`/menu/recipe-categories/${id}`);
}

// ── Product Images ──────────────────────────────────────────────────

export async function uploadProductImage(itemId: string, file: File) {
  const data = await apiUpload<{ url: string }>(
    `/menu/items/${itemId}/upload-image`,
    file,
  );
  return data?.url ?? '';
}

export async function updateItemCartaImageUrl(itemId: string, url: string) {
  return apiPut(`/menu/items/${itemId}/image-url`, { image_url: url });
}

// ── Deep Ingredients ────────────────────────────────────────────────

export async function fetchPrepIngredientesForDeepList(prepId: string) {
  return apiGet(`/menu/recipes/${prepId}/deep-ingredients`);
}

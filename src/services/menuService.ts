import { supabase } from './supabaseClient';
import { fromUntyped } from '@/lib/supabase-helpers';
import type { InsumoFormData, CategoriaInsumoFormData } from '@/types/financial';

// ── Categorías Insumo ──────────────────────────────────────────────

export async function fetchCategoriasInsumo() {
  const { data, error } = await fromUntyped('supply_categories')
    .select('*')
    .is('deleted_at', null)
    .order('orden', { ascending: true });
  if (error) throw error;
  return data;
}

export async function createCategoriaInsumo(payload: CategoriaInsumoFormData) {
  const dbPayload = { ...payload, name: payload.nombre } as any;
  delete dbPayload.nombre;
  const { data, error } = await fromUntyped('supply_categories')
    .insert(dbPayload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCategoriaInsumo(
  id: string,
  payload: Partial<CategoriaInsumoFormData>,
) {
  const dbPayload = { ...payload } as any;
  if (dbPayload.nombre !== undefined) { dbPayload.name = dbPayload.nombre; delete dbPayload.nombre; }
  const { error } = await fromUntyped('supply_categories')
    .update(dbPayload)
    .eq('id', id);
  if (error) throw error;
}

export async function softDeleteCategoriaInsumo(id: string) {
  const { error } = await fromUntyped('supply_categories')
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq('id', id);
  if (error) throw error;
}

// ── Insumos ────────────────────────────────────────────────────────

export async function fetchInsumos() {
  const { data, error } = await fromUntyped('supplies')
    .select(
      '*, supply_categories(name, tipo), rdo_categories!supplies_rdo_category_code_fkey(code, name), proveedor_obligatorio:suppliers!supplies_proveedor_obligatorio_id_fkey(id, razon_social), proveedor_sugerido:suppliers!supplies_proveedor_sugerido_id_fkey(id, razon_social)',
    )
    .is('deleted_at', null)
    .neq('is_active', false)
    .order('name');
  if (error) throw error;
  return data;
}

export async function createInsumo(payload: InsumoFormData) {
  const dbPayload = { ...payload, name: payload.nombre } as any;
  delete dbPayload.nombre;
  const { data, error } = await fromUntyped('supplies')
    .insert(dbPayload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateInsumo(id: string, payload: Partial<InsumoFormData>) {
  const dbPayload = { ...payload } as any;
  if (dbPayload.nombre !== undefined) { dbPayload.name = dbPayload.nombre; delete dbPayload.nombre; }
  const { error } = await fromUntyped('supplies').update(dbPayload).eq('id', id);
  if (error) throw error;
  return payload;
}

export async function softDeleteInsumo(id: string) {
  const { error } = await fromUntyped('supplies')
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq('id', id);
  if (error) throw error;
}

// ── Preparaciones ──────────────────────────────────────────────────

export async function fetchPreparaciones() {
  const { data, error } = await fromUntyped('recipes')
    .select('*')
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('name');
  if (error) throw error;
  return data;
}

export async function fetchPreparacionIngredientes(preparacionId: string) {
  const { data, error } = await fromUntyped('recipe_ingredients')
    .select(
      `*, supplies(id, name, unidad_base, costo_por_unidad_base), recipes!recipe_ingredients_sub_preparacion_id_fkey(id, name, costo_calculado)`,
    )
    .eq('preparacion_id', preparacionId)
    .order('orden');
  if (error) throw error;
  return data;
}

export async function fetchPreparacionOpciones(preparacionId: string) {
  const { data, error } = await fromUntyped('recipe_options')
    .select(`*, supplies(id, name, costo_por_unidad_base)`)
    .eq('preparacion_id', preparacionId)
    .order('orden');
  if (error) throw error;
  return data;
}

export async function createPreparacion(payload: {
  nombre: string;
  descripcion?: string;
  tipo: string;
  is_interchangeable?: boolean;
  metodo_costeo?: string;
}) {
  const dbPayload = { ...payload, name: payload.nombre } as any;
  delete dbPayload.nombre;
  const { data, error } = await fromUntyped('recipes')
    .insert(dbPayload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePreparacion(id: string, payload: any) {
  const dbPayload = { ...payload, updated_at: new Date().toISOString() };
  if (dbPayload.nombre !== undefined) { dbPayload.name = dbPayload.nombre; delete dbPayload.nombre; }
  const { error } = await fromUntyped('recipes')
    .update(dbPayload)
    .eq('id', id);
  if (error) throw error;
}

export async function softDeletePreparacion(id: string) {
  const { error } = await fromUntyped('recipes')
    .update({ is_active: false, deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function savePreparacionIngredientes(
  preparacion_id: string,
  items: any[],
) {
  await fromUntyped('recipe_ingredients')
    .delete()
    .eq('preparacion_id', preparacion_id);

  if (items.length > 0) {
    const { error } = await fromUntyped('recipe_ingredients').insert(
      items.map((item, index) => ({
        preparacion_id,
        insumo_id: item.insumo_id || null,
        sub_preparacion_id: item.sub_preparacion_id || null,
        cantidad: item.cantidad,
        unidad: item.unidad,
        orden: index,
      })),
    );
    if (error) throw error;
  }

  await supabase.rpc('recalculate_recipe_cost', { _prep_id: preparacion_id });
}

export async function savePreparacionOpciones(
  preparacion_id: string,
  insumo_ids: string[],
) {
  await fromUntyped('recipe_options')
    .delete()
    .eq('preparacion_id', preparacion_id);

  if (insumo_ids.length > 0) {
    const { error } = await fromUntyped('recipe_options').insert(
      insumo_ids.map((insumo_id, index) => ({
        preparacion_id,
        insumo_id,
        orden: index,
      })),
    );
    if (error) throw error;
  }

  await supabase.rpc('recalculate_recipe_cost', { _prep_id: preparacion_id });
}

// ── Items Carta ────────────────────────────────────────────────────

const ITEMS_CARTA_SELECT = `
  *,
  menu_categories:categoria_carta_id(id, name, orden),
  rdo_categories:rdo_category_code(code, name)
`;

export async function fetchBranchItemAvailability(branchId: string) {
  const { data, error } = await fromUntyped('branch_item_availability')
    .select('item_carta_id, available, available_salon, out_of_stock')
    .eq('branch_id', branchId);
  if (error) throw error;
  return data;
}

export async function fetchItemsCarta() {
  const { data, error } = await fromUntyped('menu_items')
    .select(ITEMS_CARTA_SELECT)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('orden');
  if (error) throw error;
  return data;
}

export async function fetchItemCartaComposicion(itemId: string) {
  const { data, error } = await fromUntyped('menu_item_compositions')
    .select(
      `
      *,
      recipes(id, name, costo_calculado, tipo),
      supplies(id, name, costo_por_unidad_base, unidad_base)
    `,
    )
    .eq('item_carta_id', itemId)
    .order('orden');
  if (error) throw error;
  return data;
}

export async function fetchItemCartaHistorial(itemId: string) {
  const { data, error } = await fromUntyped('menu_item_price_history')
    .select('*')
    .eq('item_carta_id', itemId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
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
  const dbPayload = { ...payload, name: payload.nombre } as any;
  delete dbPayload.nombre;
  const { data, error } = await fromUntyped('menu_items')
    .insert(dbPayload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateItemCarta(id: string, payload: any) {
  const dbPayload = { ...payload };
  if (dbPayload.nombre !== undefined) { dbPayload.name = dbPayload.nombre; delete dbPayload.nombre; }
  const { error } = await fromUntyped('menu_items')
    .update(dbPayload)
    .eq('id', id);
  if (error) throw error;
}

export async function softDeleteItemCarta(id: string) {
  const { error } = await fromUntyped('menu_items')
    .update({ is_active: false, deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function saveItemCartaComposicion(
  item_carta_id: string,
  items: { preparacion_id?: string; insumo_id?: string; cantidad: number }[],
) {
  await fromUntyped('menu_item_compositions')
    .delete()
    .eq('item_carta_id', item_carta_id);

  if (items.length > 0) {
    const { error } = await fromUntyped('menu_item_compositions').insert(
      items.map((item, index) => ({
        item_carta_id,
        preparacion_id: item.preparacion_id || null,
        insumo_id: item.insumo_id || null,
        cantidad: item.cantidad,
        orden: index,
      })),
    );
    if (error) throw error;
  }

  await supabase.rpc('recalculate_menu_item_cost', { _item_id: item_carta_id });
}

export async function cambiarPrecioItemCarta(params: {
  itemId: string;
  precioAnterior: number;
  precioNuevo: number;
  motivo?: string;
  userId?: string;
}) {
  const { itemId, precioAnterior, precioNuevo, motivo, userId } = params;

  const { error: errUpdate } = await fromUntyped('menu_items')
    .update({ precio_base: precioNuevo })
    .eq('id', itemId);
  if (errUpdate) throw errUpdate;

  const { error: errHist } = await fromUntyped('menu_item_price_history')
    .insert({
      item_carta_id: itemId,
      precio_anterior: precioAnterior,
      precio_nuevo: precioNuevo,
      motivo: motivo || null,
      usuario_id: userId || null,
    });
  if (errHist) throw errHist;

  await supabase.rpc('recalculate_menu_item_cost', { _item_id: itemId });
}

// ── Recalcular costo (RPC helper) ───────────────────────────────────

export async function recalcularCostoItemCarta(itemId: string) {
  const { error } = await supabase.rpc('recalcular_costo_item_carta', { _item_id: itemId });
  if (error) throw error;
}

// ── Menu Categorías ─────────────────────────────────────────────────

export async function fetchMenuCategorias() {
  const { data, error } = await fromUntyped('menu_categories')
    .select('*')
    .eq('is_active', true)
    .order('orden');
  if (error) throw error;
  return data;
}

export async function createMenuCategoria(payload: {
  nombre: string;
  descripcion?: string | null;
  orden?: number;
}) {
  const { data, error } = await fromUntyped('menu_categories')
    .insert({
      name: payload.nombre,
      descripcion: payload.descripcion || null,
      orden: payload.orden || 99,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateMenuCategoria(
  id: string,
  payload: { nombre?: string; descripcion?: string; orden?: number },
) {
  const dbPayload: any = { ...payload, updated_at: new Date().toISOString() };
  if (dbPayload.nombre !== undefined) { dbPayload.name = dbPayload.nombre; delete dbPayload.nombre; }
  const { error } = await fromUntyped('menu_categories')
    .update(dbPayload)
    .eq('id', id);
  if (error) throw error;
}

export async function reorderMenuCategorias(items: { id: string; orden: number }[]) {
  for (const item of items) {
    const { error } = await fromUntyped('menu_categories')
      .update({ orden: item.orden, updated_at: new Date().toISOString() })
      .eq('id', item.id);
    if (error) throw error;
  }
}

export async function softDeleteMenuCategoria(id: string) {
  const { error } = await fromUntyped('menu_categories')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function toggleMenuCategoriaVisibility(id: string, visible: boolean) {
  const { error } = await fromUntyped('menu_categories')
    .update({ visible_en_carta: visible, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function fetchHiddenMenuCategoriaIds() {
  const { data } = await fromUntyped('menu_categories')
    .select('id')
    .eq('visible_en_carta', false);
  return ((data || []) as Array<Record<string, unknown>>).map((c) => c.id as string);
}

// ── Legacy menu_productos/menu_precios/menu_fichas_tecnicas removed (Phase 0 cleanup) ──

// ── Grupos Opcionales ───────────────────────────────────────────────

export async function fetchGruposOpcionales(itemId: string) {
  const { data, error } = await fromUntyped('menu_item_option_groups')
    .select(
      `
      *,
      items:menu_item_option_group_items(
        *,
        supplies(id, name, costo_por_unidad_base),
        recipes(id, name, costo_calculado)
      )
    `,
    )
    .eq('item_carta_id', itemId)
    .order('orden');
  if (error) throw error;
  return data || [];
}

export async function createGrupoOpcional(params: {
  item_carta_id: string;
  nombre: string;
  orden: number;
}) {
  const dbParams = { ...params, name: params.nombre } as any;
  delete dbParams.nombre;
  const { data, error } = await fromUntyped('menu_item_option_groups')
    .insert(dbParams)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateGrupoOpcional(id: string, data: { nombre?: string }) {
  const dbData: any = { ...data };
  if (dbData.nombre !== undefined) { dbData.name = dbData.nombre; delete dbData.nombre; }
  const { error } = await fromUntyped('menu_item_option_groups')
    .update(dbData as Record<string, unknown>)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteGrupoOpcional(id: string) {
  const { error } = await fromUntyped('menu_item_option_groups').delete().eq('id', id);
  if (error) throw error;
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
  await fromUntyped('menu_item_option_group_items').delete().eq('grupo_id', grupo_id);

  if (items.length > 0) {
    const { error } = await fromUntyped('menu_item_option_group_items').insert(
      items.map((item) => ({
        grupo_id,
        insumo_id: item.insumo_id || null,
        preparacion_id: item.preparacion_id || null,
        cantidad: item.cantidad,
        costo_unitario: item.costo_unitario,
      })),
    );
    if (error) throw error;
  }
}

export async function updateGrupoOpcionalCosto(grupo_id: string, costo_promedio: number) {
  const { error } = await fromUntyped('menu_item_option_groups')
    .update({ costo_promedio: Math.round(costo_promedio * 100) / 100 })
    .eq('id', grupo_id);
  if (error) throw error;
}

// ── Extras & Asignaciones ───────────────────────────────────────────

export async function fetchExtrasCategoryId(): Promise<string | null> {
  const { data, error } = await fromUntyped('menu_categories')
    .select('id')
    .ilike('name', '%extras%')
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return ((data as Record<string, unknown>)?.id as string) || null;
}

export async function findExistingExtraItem(
  tipo: 'preparacion' | 'insumo',
  refId: string,
): Promise<{ id: string; is_active: boolean; deleted_at: string | null } | null> {
  const field =
    tipo === 'preparacion' ? 'composicion_ref_preparacion_id' : 'composicion_ref_insumo_id';
  const { data, error } = await fromUntyped('menu_items')
    .select('id, is_active, deleted_at')
    .eq('tipo', 'extra')
    .eq(field, refId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  if (tipo === 'preparacion') {
    const { data: prep, error: prepErr } = await fromUntyped('recipes')
      .select('id')
      .eq('id', refId)
      .is('deleted_at', null)
      .maybeSingle();
    if (prepErr) throw prepErr;
    if (!prep) return null;
  }

  return { id: (data as any).id, is_active: (data as any).is_active ?? true, deleted_at: (data as any).deleted_at ?? null };
}

export async function createExtraItemCarta(params: {
  nombre: string;
  catId: string | null;
  costo: number;
  composicion_ref_preparacion_id?: string | null;
  composicion_ref_insumo_id?: string | null;
}) {
  const { data, error } = await fromUntyped('menu_items')
    .insert({
      name: params.nombre,
      tipo: 'extra',
      categoria_carta_id: params.catId,
      precio_base: 0,
      costo_total: params.costo,
      fc_objetivo: 30,
      composicion_ref_preparacion_id: params.composicion_ref_preparacion_id || null,
      composicion_ref_insumo_id: params.composicion_ref_insumo_id || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function reactivateExtraItemCarta(id: string, costo: number) {
  const { error } = await fromUntyped('menu_items')
    .update({ is_active: true, deleted_at: null, costo_total: costo })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteComposicionByItem(item_carta_id: string) {
  await fromUntyped('menu_item_compositions').delete().eq('item_carta_id', item_carta_id);
}

export async function insertComposicionRow(row: {
  item_carta_id: string;
  preparacion_id?: string | null;
  insumo_id?: string | null;
  cantidad: number;
  orden: number;
}) {
  const { error } = await fromUntyped('menu_item_compositions').insert(row);
  if (error) throw error;
}

export async function upsertExtraAssignment(item_carta_id: string, extra_id: string) {
  const { error } = await fromUntyped('extra_assignments').upsert(
    { item_carta_id, extra_id },
    { onConflict: 'item_carta_id,extra_id' },
  );
  if (error) throw error;
}

export async function deleteExtraAssignment(item_carta_id: string, extra_id: string) {
  await fromUntyped('extra_assignments')
    .delete()
    .eq('item_carta_id', item_carta_id)
    .eq('extra_id', extra_id);
}

export async function countExtraAssignments(extra_id: string) {
  const { count } = await fromUntyped('extra_assignments')
    .select('id', { count: 'exact', head: true })
    .eq('extra_id', extra_id);
  return count ?? 0;
}

export async function fetchExtraAssignmentsByItem(itemId: string) {
  const { data, error } = await fromUntyped('extra_assignments')
    .select('extra_id')
    .eq('item_carta_id', itemId);
  if (error) throw error;
  return (data || []) as Array<Record<string, unknown>>;
}

export async function fetchExtraAssignmentsWithJoin(itemId: string) {
  const { data, error } = await fromUntyped('extra_assignments')
    .select('*, extra:extra_id(id, name, precio_base, costo_total, tipo)')
    .eq('item_carta_id', itemId);
  if (error) throw error;
  return data || [];
}

export async function fetchExtraAssignmentsForExtra(extraId: string) {
  const { data, error } = await fromUntyped('extra_assignments')
    .select('*')
    .eq('extra_id', extraId);
  if (error) throw error;
  return data || [];
}

export async function fetchActiveExtrasByIds(extraIds: string[]) {
  const { data, error } = await fromUntyped('menu_items')
    .select('id, name, precio_base, is_active')
    .in('id', extraIds)
    .eq('is_active', true)
    .is('deleted_at', null);
  if (error) throw error;
  return data || [];
}

export async function saveExtraAssignments(item_carta_id: string, extra_ids: string[]) {
  const { error: delErr } = await fromUntyped('extra_assignments')
    .delete()
    .eq('item_carta_id', item_carta_id);
  if (delErr) throw delErr;

  if (extra_ids.length > 0) {
    const { error } = await fromUntyped('extra_assignments').insert(
      extra_ids.map((extra_id) => ({ item_carta_id, extra_id })),
    );
    if (error) throw error;
  }
}

export async function updatePrecioExtra(
  table: 'recipes' | 'supplies',
  id: string,
  precio_extra: number | null,
) {
  const { error } = await fromUntyped(table)
    .update({ precio_extra })
    .eq('id', id);
  if (error) throw error;
}

// ── Removibles ──────────────────────────────────────────────────────

export async function fetchItemRemovibles(itemId: string) {
  const { data, error } = await fromUntyped('removable_items')
    .select('*, supplies(id, name), recipes(id, name)')
    .eq('item_carta_id', itemId)
    .eq('is_active', true);
  if (error) throw error;
  return data as Array<Record<string, unknown>>;
}

export async function upsertRemovible(params: {
  item_carta_id: string;
  insumo_id?: string | null;
  preparacion_id?: string | null;
  nombre_display?: string | null;
}) {
  const field = params.insumo_id ? 'insumo_id' : 'preparacion_id';
  const refId = params.insumo_id || params.preparacion_id;

  const { data: existing } = await fromUntyped('removable_items')
    .select('id')
    .eq('item_carta_id', params.item_carta_id)
    .eq(field, refId!)
    .maybeSingle();

  if (existing) {
    const { error } = await fromUntyped('removable_items')
      .update({ is_active: true, nombre_display: params.nombre_display || null })
      .eq('id', (existing as Record<string, unknown>).id as string);
    if (error) throw error;
  } else {
    const { error } = await fromUntyped('removable_items').insert({
      item_carta_id: params.item_carta_id,
      insumo_id: params.insumo_id || null,
      preparacion_id: params.preparacion_id || null,
      is_active: true,
      nombre_display: params.nombre_display || null,
    });
    if (error) throw error;
  }
}

export async function deleteRemovibleByInsumo(item_carta_id: string, insumo_id: string) {
  await fromUntyped('removable_items')
    .delete()
    .eq('item_carta_id', item_carta_id)
    .eq('insumo_id', insumo_id);
}

export async function deleteRemovibleByPreparacion(
  item_carta_id: string,
  preparacion_id: string,
) {
  await fromUntyped('removable_items')
    .delete()
    .eq('item_carta_id', item_carta_id)
    .eq('preparacion_id', preparacion_id);
}

export async function updateRemovibleNombreDisplay(id: string, nombre_display: string) {
  const { error } = await fromUntyped('removable_items').update({ nombre_display }).eq('id', id);
  if (error) throw error;
}

// ── Modificadores ───────────────────────────────────────────────────

export async function fetchModificadores(itemId: string) {
  const { data, error } = await fromUntyped('item_modifiers')
    .select('*')
    .eq('item_carta_id', itemId)
    .order('tipo')
    .order('orden');
  if (error) throw error;
  return data as Array<Record<string, unknown>>;
}

export async function createModificador(payload: Record<string, unknown>) {
  const { data, error } = await fromUntyped('item_modifiers')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateModificador(id: string, payload: Record<string, unknown>) {
  const { error } = await fromUntyped('item_modifiers')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteModificador(id: string) {
  const { error } = await fromUntyped('item_modifiers').delete().eq('id', id);
  if (error) throw error;
}

// ── Webapp Menu ─────────────────────────────────────────────────────

export async function fetchWebappConfig(branchSlug: string) {
  const { data: branch, error: branchErr } = await supabase
    .from('branches')
    .select(
      'id, name, address, city, slug, opening_time, closing_time, public_hours, latitude, longitude, google_place_id',
    )
    .eq('slug', branchSlug)
    .eq('is_active', true)
    .single();
  if (branchErr) throw branchErr;

  const { data: config, error: configErr } = await fromUntyped('webapp_config')
    .select('*, webapp_activa')
    .eq('branch_id', branch.id)
    .single();
  if (configErr) throw configErr;

  return { branch, config };
}

export async function fetchWebappMenuItems(branchId: string) {
  const hiddenCatIds = await fetchHiddenMenuCategoriaIds();

  const query = fromUntyped('menu_items')
    .select(
      `
      id, name, nombre_corto, descripcion, imagen_url,
      precio_base, precio_promo, promo_etiqueta,
      categoria_carta_id, orden, disponible_delivery,
      disponible_webapp, tipo,
      menu_categories:categoria_carta_id(id, name, orden)
    `,
    )
    .eq('is_active', true)
    .is('deleted_at', null)
    .eq('disponible_webapp', true)
    .order('orden');

  // Note: fromUntyped doesn't support chaining .not() easily, filter after
  const { data, error } = await query;
  if (error) throw error;

  let items = data || [];
  if (hiddenCatIds.length > 0) {
    items = items.filter((i: any) => !hiddenCatIds.includes(i.categoria_carta_id));
  }

  const { data: availability, error: avErr } = await fromUntyped('branch_item_availability')
    .select('item_carta_id, available, available_webapp, out_of_stock')
    .eq('branch_id', branchId);
  if (avErr) throw avErr;

  return { items, availability: availability || [] };
}

export async function fetchWebappItemOptionalGroups(itemId: string) {
  const { data: groups, error: gErr } = await fromUntyped('menu_item_option_groups')
    .select('id, name, is_required, max_selecciones, orden')
    .eq('item_carta_id', itemId)
    .order('orden');
  if (gErr) throw gErr;
  if (!groups || groups.length === 0) return { groups: [], options: [] };

  const groupIds = (groups as Array<Record<string, unknown>>).map(
    (g: Record<string, unknown>) => g.id as string,
  );
  const { data: options, error: oErr } = await fromUntyped('menu_item_option_group_items')
    .select(
      'id, grupo_id, insumo_id, preparacion_id, costo_unitario, supplies(id, name), recipes(id, name)',
    )
    .in('grupo_id', groupIds);
  if (oErr) throw oErr;

  return {
    groups: groups as Array<Record<string, unknown>>,
    options: (options || []) as Array<Record<string, unknown>>,
  };
}

export async function fetchWebappItemExtras(itemId: string) {
  const asignaciones = await fetchExtraAssignmentsByItem(itemId);
  const extraIds = asignaciones.map((a) => a.extra_id as string);
  if (extraIds.length === 0) return [];

  const { data, error } = await fromUntyped('menu_items')
    .select('id, name, precio_base, imagen_url')
    .in('id', extraIds)
    .eq('is_active', true)
    .is('deleted_at', null);
  if (error) throw error;
  return data || [];
}

export async function fetchWebappItemRemovables(itemId: string) {
  const { data, error } = await fromUntyped('removable_items')
    .select(
      'id, nombre_display, is_active, insumo_id, preparacion_id, supplies(id, name), recipes(id, name)',
    )
    .eq('item_carta_id', itemId)
    .eq('is_active', true);
  if (error) throw error;
  return data ?? [];
}

// ── Categorías Preparación ──────────────────────────────────────────

export async function fetchCategoriasPreparacion() {
  const { data, error } = await fromUntyped('recipe_categories')
    .select('*')
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('orden');
  if (error) throw error;
  return data;
}

export async function createCategoriaPreparacion(payload: { nombre: string; orden: number }) {
  const dbPayload = { name: payload.nombre, orden: payload.orden };
  const { data, error } = await fromUntyped('recipe_categories')
    .insert(dbPayload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCategoriaPreparacion(
  id: string,
  payload: Record<string, unknown>,
) {
  const dbPayload: any = { ...payload, updated_at: new Date().toISOString() };
  if (dbPayload.nombre !== undefined) { dbPayload.name = dbPayload.nombre; delete dbPayload.nombre; }
  const { error } = await fromUntyped('recipe_categories')
    .update(dbPayload)
    .eq('id', id);
  if (error) throw error;
}

export async function reorderCategoriasPreparacion(items: { id: string; orden: number }[]) {
  for (const item of items) {
    const { error } = await fromUntyped('recipe_categories')
      .update({ orden: item.orden })
      .eq('id', item.id);
    if (error) throw error;
  }
}

export async function softDeleteCategoriaPreparacion(id: string) {
  const { error } = await fromUntyped('recipe_categories')
    .update({
      is_active: false,
      deleted_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw error;
  await fromUntyped('recipes')
    .update({ categoria_preparacion_id: null })
    .eq('categoria_preparacion_id', id);
}

// ── Deep Ingredients ────────────────────────────────────────────────

export async function uploadProductImage(itemId: string, file: File) {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `items/${itemId}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from('product-images')
    .upload(path, file, { upsert: true });
  if (upErr) throw upErr;
  const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(path);
  return `${urlData.publicUrl}?t=${Date.now()}`;
}

export async function updateItemCartaImageUrl(itemId: string, url: string) {
  const { error } = await fromUntyped('menu_items')
    .update({ imagen_url: url })
    .eq('id', itemId);
  if (error) throw error;
}

export async function fetchPrepIngredientesForDeepList(prepId: string) {
  const { data, error } = await fromUntyped('recipe_ingredients')
    .select(
      `
      *,
      supplies(id, name, costo_por_unidad_base, unidad_base),
      sub_prep:recipes!recipe_ingredients_sub_preparacion_id_fkey(id, name)
    `,
    )
    .eq('preparacion_id', prepId)
    .order('orden');
  if (error) throw error;
  return data || [];
}

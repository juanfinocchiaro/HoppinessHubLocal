import { supabase } from './supabaseClient';
import { fromUntyped } from '@/lib/supabase-helpers';
import type { InsumoFormData, CategoriaInsumoFormData } from '@/types/financial';

// ── Categorías Insumo ──────────────────────────────────────────────

export async function fetchCategoriasInsumo() {
  const { data, error } = await fromUntyped('supply_categories')
    .select('*')
    .is('deleted_at', null)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data;
}

export async function createCategoriaInsumo(payload: CategoriaInsumoFormData) {
  const dbPayload = { ...payload } as any;
  delete dbPayload.nombre;
  if (dbPayload.orden !== undefined) { dbPayload.sort_order = dbPayload.orden; delete dbPayload.orden; }
  if (dbPayload.tipo !== undefined) { dbPayload.type = dbPayload.tipo; delete dbPayload.tipo; }
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
  if (dbPayload.orden !== undefined) { dbPayload.sort_order = dbPayload.orden; delete dbPayload.orden; }
  if (dbPayload.tipo !== undefined) { dbPayload.type = dbPayload.tipo; delete dbPayload.tipo; }
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
      '*, supply_categories(name, type), rdo_categories!insumos_rdo_category_code_fkey(code, name), proveedor_obligatorio:suppliers!insumos_proveedor_obligatorio_id_fkey(id, business_name), proveedor_sugerido:suppliers!insumos_proveedor_sugerido_id_fkey(id, business_name)',
    )
    .is('deleted_at', null)
    .neq('is_active', false)
    .order('name');
  if (error) throw error;
  return data;
}

export async function createInsumo(payload: InsumoFormData) {
  const dbPayload = { ...payload } as any;
  delete dbPayload.nombre;
  if (dbPayload.descripcion !== undefined) { dbPayload.description = dbPayload.descripcion; delete dbPayload.descripcion; }
  if (dbPayload.unidad_base !== undefined) { dbPayload.base_unit = dbPayload.unidad_base; delete dbPayload.unidad_base; }
  if (dbPayload.costo_por_unidad_base !== undefined) { dbPayload.base_unit_cost = dbPayload.costo_por_unidad_base; delete dbPayload.costo_por_unidad_base; }
  if (dbPayload.activo !== undefined) { dbPayload.is_active = dbPayload.activo; delete dbPayload.activo; }
  if (dbPayload.tipo_item !== undefined) { dbPayload.item_type = dbPayload.tipo_item; delete dbPayload.tipo_item; }
  if (dbPayload.precio_referencia !== undefined) { dbPayload.reference_price = dbPayload.precio_referencia; delete dbPayload.precio_referencia; }
  if (dbPayload.precio_venta !== undefined) { dbPayload.sale_price = dbPayload.precio_venta; delete dbPayload.precio_venta; }
  if (dbPayload.unidad_compra !== undefined) { dbPayload.purchase_unit = dbPayload.unidad_compra; delete dbPayload.unidad_compra; }
  if (dbPayload.unidad_compra_contenido !== undefined) { dbPayload.purchase_unit_content = dbPayload.unidad_compra_contenido; delete dbPayload.unidad_compra_contenido; }
  if (dbPayload.unidad_compra_precio !== undefined) { dbPayload.purchase_unit_price = dbPayload.unidad_compra_precio; delete dbPayload.unidad_compra_precio; }
  if (dbPayload.precio_maximo_sugerido !== undefined) { dbPayload.max_suggested_price = dbPayload.precio_maximo_sugerido; delete dbPayload.precio_maximo_sugerido; }
  if (dbPayload.puede_ser_extra !== undefined) { dbPayload.can_be_extra = dbPayload.puede_ser_extra; delete dbPayload.puede_ser_extra; }
  if (dbPayload.precio_extra !== undefined) { dbPayload.extra_price = dbPayload.precio_extra; delete dbPayload.precio_extra; }
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
  if (dbPayload.descripcion !== undefined) { dbPayload.description = dbPayload.descripcion; delete dbPayload.descripcion; }
  if (dbPayload.unidad_base !== undefined) { dbPayload.base_unit = dbPayload.unidad_base; delete dbPayload.unidad_base; }
  if (dbPayload.costo_por_unidad_base !== undefined) { dbPayload.base_unit_cost = dbPayload.costo_por_unidad_base; delete dbPayload.costo_por_unidad_base; }
  if (dbPayload.activo !== undefined) { dbPayload.is_active = dbPayload.activo; delete dbPayload.activo; }
  if (dbPayload.tipo_item !== undefined) { dbPayload.item_type = dbPayload.tipo_item; delete dbPayload.tipo_item; }
  if (dbPayload.precio_referencia !== undefined) { dbPayload.reference_price = dbPayload.precio_referencia; delete dbPayload.precio_referencia; }
  if (dbPayload.precio_venta !== undefined) { dbPayload.sale_price = dbPayload.precio_venta; delete dbPayload.precio_venta; }
  if (dbPayload.unidad_compra !== undefined) { dbPayload.purchase_unit = dbPayload.unidad_compra; delete dbPayload.unidad_compra; }
  if (dbPayload.unidad_compra_contenido !== undefined) { dbPayload.purchase_unit_content = dbPayload.unidad_compra_contenido; delete dbPayload.unidad_compra_contenido; }
  if (dbPayload.unidad_compra_precio !== undefined) { dbPayload.purchase_unit_price = dbPayload.unidad_compra_precio; delete dbPayload.unidad_compra_precio; }
  if (dbPayload.precio_maximo_sugerido !== undefined) { dbPayload.max_suggested_price = dbPayload.precio_maximo_sugerido; delete dbPayload.precio_maximo_sugerido; }
  if (dbPayload.puede_ser_extra !== undefined) { dbPayload.can_be_extra = dbPayload.puede_ser_extra; delete dbPayload.puede_ser_extra; }
  if (dbPayload.precio_extra !== undefined) { dbPayload.extra_price = dbPayload.precio_extra; delete dbPayload.precio_extra; }
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
      `*, supplies(id, name, base_unit, base_unit_cost), recipes!preparacion_ingredientes_sub_preparacion_id_fkey(id, name, calculated_cost)`,
    )
    .eq('preparacion_id', preparacionId)
    .order('sort_order');
  if (error) throw error;
  return data;
}

export async function fetchPreparacionOpciones(preparacionId: string) {
  const { data, error } = await fromUntyped('recipe_options')
    .select(`*, supplies(id, name, base_unit_cost)`)
    .eq('preparacion_id', preparacionId)
    .order('sort_order');
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
  if (dbPayload.descripcion !== undefined) { dbPayload.description = dbPayload.descripcion; delete dbPayload.descripcion; }
  if (dbPayload.tipo !== undefined) { dbPayload.type = dbPayload.tipo; delete dbPayload.tipo; }
  if (dbPayload.metodo_costeo !== undefined) { dbPayload.costing_method = dbPayload.metodo_costeo; delete dbPayload.metodo_costeo; }
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
  if (dbPayload.descripcion !== undefined) { dbPayload.description = dbPayload.descripcion; delete dbPayload.descripcion; }
  if (dbPayload.costo_calculado !== undefined) { dbPayload.calculated_cost = dbPayload.costo_calculado; delete dbPayload.costo_calculado; }
  if (dbPayload.costo_manual !== undefined) { dbPayload.manual_cost = dbPayload.costo_manual; delete dbPayload.costo_manual; }
  if (dbPayload.activo !== undefined) { dbPayload.is_active = dbPayload.activo; delete dbPayload.activo; }
  if (dbPayload.tipo !== undefined) { dbPayload.type = dbPayload.tipo; delete dbPayload.tipo; }
  if (dbPayload.metodo_costeo !== undefined) { dbPayload.costing_method = dbPayload.metodo_costeo; delete dbPayload.metodo_costeo; }
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
        quantity: item.cantidad,
        unit: item.unidad,
        sort_order: index,
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
        sort_order: index,
      })),
    );
    if (error) throw error;
  }

  await supabase.rpc('recalculate_recipe_cost', { _prep_id: preparacion_id });
}

// ── Items Carta ────────────────────────────────────────────────────

const ITEMS_CARTA_SELECT = `
  *,
  menu_categories:categoria_carta_id(id, name, sort_order),
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
    .order('sort_order');
  if (error) throw error;
  return data;
}

export async function fetchItemCartaComposicion(itemId: string) {
  const { data, error } = await fromUntyped('menu_item_compositions')
    .select(
      `
      *,
      recipes(id, name, calculated_cost, type),
      supplies(id, name, base_unit_cost, base_unit)
    `,
    )
    .eq('item_carta_id', itemId)
    .order('sort_order');
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
  if (dbPayload.nombre_corto !== undefined) { dbPayload.short_name = dbPayload.nombre_corto; delete dbPayload.nombre_corto; }
  if (dbPayload.descripcion !== undefined) { dbPayload.description = dbPayload.descripcion; delete dbPayload.descripcion; }
  if (dbPayload.imagen_url !== undefined) { dbPayload.image_url = dbPayload.imagen_url; delete dbPayload.imagen_url; }
  if (dbPayload.precio_base !== undefined) { dbPayload.base_price = dbPayload.precio_base; delete dbPayload.precio_base; }
  if (dbPayload.activo !== undefined) { dbPayload.is_active = dbPayload.activo; delete dbPayload.activo; }
  if (dbPayload.orden !== undefined) { dbPayload.sort_order = dbPayload.orden; delete dbPayload.orden; }
  if (dbPayload.disponible_delivery !== undefined) { dbPayload.available_delivery = dbPayload.disponible_delivery; delete dbPayload.disponible_delivery; }
  if (dbPayload.disponible_webapp !== undefined) { dbPayload.available_webapp = dbPayload.disponible_webapp; delete dbPayload.disponible_webapp; }
  if (dbPayload.tipo !== undefined) { dbPayload.type = dbPayload.tipo; delete dbPayload.tipo; }
  if (dbPayload.costo_total !== undefined) { dbPayload.total_cost = dbPayload.costo_total; delete dbPayload.costo_total; }
  if (dbPayload.precio_referencia !== undefined) { dbPayload.reference_price = dbPayload.precio_referencia; delete dbPayload.precio_referencia; }
  if (dbPayload.precio_promo !== undefined) { dbPayload.promo_price = dbPayload.precio_promo; delete dbPayload.precio_promo; }
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
  if (dbPayload.nombre_corto !== undefined) { dbPayload.short_name = dbPayload.nombre_corto; delete dbPayload.nombre_corto; }
  if (dbPayload.descripcion !== undefined) { dbPayload.description = dbPayload.descripcion; delete dbPayload.descripcion; }
  if (dbPayload.imagen_url !== undefined) { dbPayload.image_url = dbPayload.imagen_url; delete dbPayload.imagen_url; }
  if (dbPayload.precio_base !== undefined) { dbPayload.base_price = dbPayload.precio_base; delete dbPayload.precio_base; }
  if (dbPayload.activo !== undefined) { dbPayload.is_active = dbPayload.activo; delete dbPayload.activo; }
  if (dbPayload.orden !== undefined) { dbPayload.sort_order = dbPayload.orden; delete dbPayload.orden; }
  if (dbPayload.disponible_delivery !== undefined) { dbPayload.available_delivery = dbPayload.disponible_delivery; delete dbPayload.disponible_delivery; }
  if (dbPayload.disponible_webapp !== undefined) { dbPayload.available_webapp = dbPayload.disponible_webapp; delete dbPayload.disponible_webapp; }
  if (dbPayload.tipo !== undefined) { dbPayload.type = dbPayload.tipo; delete dbPayload.tipo; }
  if (dbPayload.costo_total !== undefined) { dbPayload.total_cost = dbPayload.costo_total; delete dbPayload.costo_total; }
  if (dbPayload.precio_referencia !== undefined) { dbPayload.reference_price = dbPayload.precio_referencia; delete dbPayload.precio_referencia; }
  if (dbPayload.precio_promo !== undefined) { dbPayload.promo_price = dbPayload.precio_promo; delete dbPayload.precio_promo; }
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
        quantity: item.cantidad,
        sort_order: index,
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
    .update({ base_price: precioNuevo })
    .eq('id', itemId);
  if (errUpdate) throw errUpdate;

  const { error: errHist } = await fromUntyped('menu_item_price_history')
    .insert({
      item_carta_id: itemId,
      previous_price: precioAnterior,
      new_price: precioNuevo,
      reason: motivo || null,
      user_id: userId || null,
    });
  if (errHist) throw errHist;

  await supabase.rpc('recalculate_menu_item_cost', { _item_id: itemId });
}

// ── Recalcular costo (RPC helper) ───────────────────────────────────

export async function recalcularCostoItemCarta(itemId: string) {
  const { error } = await supabase.rpc('recalculate_menu_item_cost', { _item_id: itemId });
  if (error) throw error;
}

// ── Menu Categorías ─────────────────────────────────────────────────

export async function fetchMenuCategorias() {
  const { data, error } = await fromUntyped('menu_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw error;
  return data;
}

export async function createMenuCategoria(payload: {
  name: string;
  description?: string | null;
  sort_order?: number;
  print_type?: string;
}) {
  const { data, error } = await fromUntyped('menu_categories')
    .insert({
      name: payload.name,
      description: payload.description || null,
      sort_order: payload.sort_order || 99,
      print_type: payload.print_type || 'comanda',
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateMenuCategoria(
  id: string,
  payload: { name?: string; description?: string; sort_order?: number; print_type?: string },
) {
  const { error } = await fromUntyped('menu_categories')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function reorderMenuCategorias(items: { id: string; sort_order: number }[]) {
  for (const item of items) {
    const { error } = await fromUntyped('menu_categories')
      .update({ sort_order: item.sort_order, updated_at: new Date().toISOString() })
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
    .update({ is_visible_menu: visible, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function fetchHiddenMenuCategoriaIds() {
  const { data } = await fromUntyped('menu_categories')
    .select('id')
    .eq('is_visible_menu', false);
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
        supplies(id, name, base_unit_cost),
        recipes(id, name, calculated_cost)
      )
    `,
    )
    .eq('item_carta_id', itemId)
    .order('sort_order');
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
  if (dbParams.orden !== undefined) { dbParams.sort_order = dbParams.orden; delete dbParams.orden; }
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
        quantity: item.cantidad,
        unit_cost: item.costo_unitario,
      })),
    );
    if (error) throw error;
  }
}

export async function updateGrupoOpcionalCosto(grupo_id: string, costo_promedio: number) {
  const { error } = await fromUntyped('menu_item_option_groups')
    .update({ average_cost: Math.round(costo_promedio * 100) / 100 })
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
    .eq('type', 'extra')
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
      type: 'extra',
      categoria_carta_id: params.catId,
      base_price: 0,
      total_cost: params.costo,
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
    .update({ is_active: true, deleted_at: null, total_cost: costo })
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
  const dbRow = { ...row, quantity: row.cantidad, sort_order: row.orden } as any;
  delete dbRow.cantidad;
  delete dbRow.orden;
  const { error } = await fromUntyped('menu_item_compositions').insert(dbRow);
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
    .select('*, extra:extra_id(id, name, base_price, total_cost, type)')
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
    .select('id, name, base_price, is_active')
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
    .update({ extra_price: precio_extra })
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
      .update({ is_active: true, display_name: params.nombre_display || null })
      .eq('id', (existing as Record<string, unknown>).id as string);
    if (error) throw error;
  } else {
    const { error } = await fromUntyped('removable_items').insert({
      item_carta_id: params.item_carta_id,
      insumo_id: params.insumo_id || null,
      preparacion_id: params.preparacion_id || null,
      is_active: true,
      display_name: params.nombre_display || null,
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
  const { error } = await fromUntyped('removable_items').update({ display_name: nombre_display }).eq('id', id);
  if (error) throw error;
}

// ── Modificadores ───────────────────────────────────────────────────

export async function fetchModificadores(itemId: string) {
  const { data, error } = await fromUntyped('item_modifiers')
    .select('*')
    .eq('item_carta_id', itemId)
    .order('type')
    .order('sort_order');
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
      id, name, short_name, description, image_url,
      base_price, promo_price, promo_etiqueta,
      categoria_carta_id, sort_order, available_delivery,
      available_webapp, type,
      menu_categories:categoria_carta_id(id, name, sort_order)
    `,
    )
    .eq('is_active', true)
    .is('deleted_at', null)
    .eq('available_webapp', true)
    .order('sort_order');

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
    .select('id, name, is_required, max_selecciones, sort_order')
    .eq('item_carta_id', itemId)
    .order('sort_order');
  if (gErr) throw gErr;
  if (!groups || groups.length === 0) return { groups: [], options: [] };

  const groupIds = (groups as Array<Record<string, unknown>>).map(
    (g: Record<string, unknown>) => g.id as string,
  );
  const { data: options, error: oErr } = await fromUntyped('menu_item_option_group_items')
    .select(
      'id, grupo_id, insumo_id, preparacion_id, unit_cost, supplies(id, name), recipes(id, name)',
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
    .select('id, name, base_price, image_url')
    .in('id', extraIds)
    .eq('is_active', true)
    .is('deleted_at', null);
  if (error) throw error;
  return data || [];
}

export async function fetchWebappItemRemovables(itemId: string) {
  const { data, error } = await fromUntyped('removable_items')
    .select(
      'id, display_name, is_active, insumo_id, preparacion_id, supplies(id, name), recipes(id, name)',
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
    .order('sort_order');
  if (error) throw error;
  return data;
}

export async function createCategoriaPreparacion(payload: { nombre: string; orden: number }) {
  const dbPayload = { name: payload.nombre, sort_order: payload.orden };
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
  if (dbPayload.orden !== undefined) { dbPayload.sort_order = dbPayload.orden; delete dbPayload.orden; }
  const { error } = await fromUntyped('recipe_categories')
    .update(dbPayload)
    .eq('id', id);
  if (error) throw error;
}

export async function reorderCategoriasPreparacion(items: { id: string; orden: number }[]) {
  for (const item of items) {
    const { error } = await fromUntyped('recipe_categories')
      .update({ sort_order: item.orden })
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
    .update({ image_url: url })
    .eq('id', itemId);
  if (error) throw error;
}

export async function fetchPrepIngredientesForDeepList(prepId: string) {
  const { data, error } = await fromUntyped('recipe_ingredients')
    .select(
      `
      *,
      supplies(id, name, base_unit_cost, base_unit),
      sub_prep:recipes!preparacion_ingredientes_sub_preparacion_id_fkey(id, name)
    `,
    )
    .eq('preparacion_id', prepId)
    .order('sort_order');
  if (error) throw error;
  return data || [];
}

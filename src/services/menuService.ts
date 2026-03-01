import { supabase } from './supabaseClient';
import { fromUntyped } from '@/lib/supabase-helpers';
import type { InsumoFormData, CategoriaInsumoFormData } from '@/types/financial';

// ── Categorías Insumo ──────────────────────────────────────────────

export async function fetchCategoriasInsumo() {
  const { data, error } = await supabase
    .from('categorias_insumo')
    .select('*')
    .is('deleted_at', null)
    .order('orden', { ascending: true });
  if (error) throw error;
  return data;
}

export async function createCategoriaInsumo(payload: CategoriaInsumoFormData) {
  const { data, error } = await supabase
    .from('categorias_insumo')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCategoriaInsumo(
  id: string,
  payload: Partial<CategoriaInsumoFormData>,
) {
  const { error } = await supabase
    .from('categorias_insumo')
    .update(payload)
    .eq('id', id);
  if (error) throw error;
}

export async function softDeleteCategoriaInsumo(id: string) {
  const { error } = await supabase
    .from('categorias_insumo')
    .update({ deleted_at: new Date().toISOString(), activo: false })
    .eq('id', id);
  if (error) throw error;
}

// ── Insumos ────────────────────────────────────────────────────────

export async function fetchInsumos() {
  const { data, error } = await supabase
    .from('insumos')
    .select(
      '*, categorias_insumo(nombre, tipo), rdo_categories!insumos_rdo_category_code_fkey(code, name), proveedor_obligatorio:proveedores!insumos_proveedor_obligatorio_id_fkey(id, razon_social), proveedor_sugerido:proveedores!insumos_proveedor_sugerido_id_fkey(id, razon_social)',
    )
    .is('deleted_at', null)
    .neq('activo', false)
    .order('nombre');
  if (error) throw error;
  return data;
}

export async function createInsumo(payload: InsumoFormData) {
  const { data, error } = await supabase
    .from('insumos')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateInsumo(id: string, payload: Partial<InsumoFormData>) {
  const { error } = await supabase.from('insumos').update(payload).eq('id', id);
  if (error) throw error;
  return payload;
}

export async function softDeleteInsumo(id: string) {
  const { error } = await supabase
    .from('insumos')
    .update({ deleted_at: new Date().toISOString(), activo: false })
    .eq('id', id);
  if (error) throw error;
}

// ── Preparaciones ──────────────────────────────────────────────────

export async function fetchPreparaciones() {
  const { data, error } = await supabase
    .from('preparaciones')
    .select('*')
    .eq('activo', true)
    .is('deleted_at', null)
    .order('nombre');
  if (error) throw error;
  return data;
}

export async function fetchPreparacionIngredientes(preparacionId: string) {
  const { data, error } = await supabase
    .from('preparacion_ingredientes')
    .select(
      `*, insumos(id, nombre, unidad_base, costo_por_unidad_base), preparaciones!preparacion_ingredientes_sub_preparacion_id_fkey(id, nombre, costo_calculado)`,
    )
    .eq('preparacion_id', preparacionId)
    .order('orden');
  if (error) throw error;
  return data;
}

export async function fetchPreparacionOpciones(preparacionId: string) {
  const { data, error } = await supabase
    .from('preparacion_opciones')
    .select(`*, insumos(id, nombre, costo_por_unidad_base)`)
    .eq('preparacion_id', preparacionId)
    .order('orden');
  if (error) throw error;
  return data;
}

export async function createPreparacion(payload: {
  nombre: string;
  descripcion?: string;
  tipo: string;
  es_intercambiable?: boolean;
  metodo_costeo?: string;
}) {
  const { data, error } = await supabase
    .from('preparaciones')
    .insert(payload as any)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePreparacion(id: string, payload: any) {
  const { error } = await supabase
    .from('preparaciones')
    .update({ ...payload, updated_at: new Date().toISOString() } as any)
    .eq('id', id);
  if (error) throw error;
}

export async function softDeletePreparacion(id: string) {
  const { error } = await supabase
    .from('preparaciones')
    .update({ activo: false, deleted_at: new Date().toISOString() } as any)
    .eq('id', id);
  if (error) throw error;
}

export async function savePreparacionIngredientes(
  preparacion_id: string,
  items: any[],
) {
  await supabase
    .from('preparacion_ingredientes')
    .delete()
    .eq('preparacion_id', preparacion_id);

  if (items.length > 0) {
    const { error } = await supabase.from('preparacion_ingredientes').insert(
      items.map((item, index) => ({
        preparacion_id,
        insumo_id: item.insumo_id || null,
        sub_preparacion_id: item.sub_preparacion_id || null,
        cantidad: item.cantidad,
        unidad: item.unidad,
        orden: index,
      })) as any,
    );
    if (error) throw error;
  }

  await supabase.rpc('recalcular_costo_preparacion', { _prep_id: preparacion_id });
}

export async function savePreparacionOpciones(
  preparacion_id: string,
  insumo_ids: string[],
) {
  await supabase
    .from('preparacion_opciones')
    .delete()
    .eq('preparacion_id', preparacion_id);

  if (insumo_ids.length > 0) {
    const { error } = await supabase.from('preparacion_opciones').insert(
      insumo_ids.map((insumo_id, index) => ({
        preparacion_id,
        insumo_id,
        orden: index,
      })) as any,
    );
    if (error) throw error;
  }

  await supabase.rpc('recalcular_costo_preparacion', { _prep_id: preparacion_id });
}

// ── Items Carta ────────────────────────────────────────────────────

const ITEMS_CARTA_SELECT = `
  *,
  menu_categorias:categoria_carta_id(id, nombre, orden),
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
  const { data, error } = await supabase
    .from('items_carta')
    .select(ITEMS_CARTA_SELECT)
    .eq('activo', true)
    .is('deleted_at', null)
    .order('orden');
  if (error) throw error;
  return data;
}

export async function fetchItemCartaComposicion(itemId: string) {
  const { data, error } = await supabase
    .from('item_carta_composicion')
    .select(
      `
      *,
      preparaciones(id, nombre, costo_calculado, tipo),
      insumos(id, nombre, costo_por_unidad_base, unidad_base)
    `,
    )
    .eq('item_carta_id', itemId)
    .order('orden');
  if (error) throw error;
  return data;
}

export async function fetchItemCartaHistorial(itemId: string) {
  const { data, error } = await supabase
    .from('item_carta_precios_historial')
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
  const { data, error } = await supabase
    .from('items_carta')
    .insert(payload as any)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateItemCarta(id: string, payload: any) {
  const { error } = await supabase
    .from('items_carta')
    .update({ ...payload } as any)
    .eq('id', id);
  if (error) throw error;
}

export async function softDeleteItemCarta(id: string) {
  const { error } = await supabase
    .from('items_carta')
    .update({ activo: false, deleted_at: new Date().toISOString() } as any)
    .eq('id', id);
  if (error) throw error;
}

export async function saveItemCartaComposicion(
  item_carta_id: string,
  items: { preparacion_id?: string; insumo_id?: string; cantidad: number }[],
) {
  await supabase
    .from('item_carta_composicion')
    .delete()
    .eq('item_carta_id', item_carta_id);

  if (items.length > 0) {
    const { error } = await supabase.from('item_carta_composicion').insert(
      items.map((item, index) => ({
        item_carta_id,
        preparacion_id: item.preparacion_id || null,
        insumo_id: item.insumo_id || null,
        cantidad: item.cantidad,
        orden: index,
      })) as any,
    );
    if (error) throw error;
  }

  await supabase.rpc('recalcular_costo_item_carta', { _item_id: item_carta_id });
}

export async function cambiarPrecioItemCarta(params: {
  itemId: string;
  precioAnterior: number;
  precioNuevo: number;
  motivo?: string;
  userId?: string;
}) {
  const { itemId, precioAnterior, precioNuevo, motivo, userId } = params;

  const { error: errUpdate } = await supabase
    .from('items_carta')
    .update({ precio_base: precioNuevo } as any)
    .eq('id', itemId);
  if (errUpdate) throw errUpdate;

  const { error: errHist } = await supabase
    .from('item_carta_precios_historial')
    .insert({
      item_carta_id: itemId,
      precio_anterior: precioAnterior,
      precio_nuevo: precioNuevo,
      motivo: motivo || null,
      usuario_id: userId || null,
    } as any);
  if (errHist) throw errHist;

  await supabase.rpc('recalcular_costo_item_carta', { _item_id: itemId });
}

// ── Recalcular costo (RPC helper) ───────────────────────────────────

export async function recalcularCostoItemCarta(itemId: string) {
  const { error } = await supabase.rpc('recalcular_costo_item_carta', { _item_id: itemId });
  if (error) throw error;
}

// ── Menu Categorías ─────────────────────────────────────────────────

export async function fetchMenuCategorias() {
  const { data, error } = await supabase
    .from('menu_categorias')
    .select('*')
    .eq('activo', true)
    .order('orden');
  if (error) throw error;
  return data;
}

export async function createMenuCategoria(payload: {
  nombre: string;
  descripcion?: string | null;
  orden?: number;
}) {
  const { data, error } = await fromUntyped('menu_categorias')
    .insert({
      nombre: payload.nombre,
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
  const { error } = await fromUntyped('menu_categorias')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function reorderMenuCategorias(items: { id: string; orden: number }[]) {
  for (const item of items) {
    const { error } = await fromUntyped('menu_categorias')
      .update({ orden: item.orden, updated_at: new Date().toISOString() })
      .eq('id', item.id);
    if (error) throw error;
  }
}

export async function softDeleteMenuCategoria(id: string) {
  const { error } = await fromUntyped('menu_categorias')
    .update({ activo: false, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function toggleMenuCategoriaVisibility(id: string, visible: boolean) {
  const { error } = await fromUntyped('menu_categorias')
    .update({ visible_en_carta: visible, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function fetchHiddenMenuCategoriaIds() {
  const { data } = await fromUntyped('menu_categorias')
    .select('id')
    .eq('visible_en_carta', false);
  return ((data || []) as Array<Record<string, unknown>>).map((c) => c.id as string);
}

// ── Menu Productos ──────────────────────────────────────────────────

export async function fetchMenuProductos() {
  const { data, error } = await supabase
    .from('menu_productos')
    .select(
      `
      *,
      menu_categorias(id, nombre),
      menu_precios(precio_base, fc_objetivo),
      insumos(id, nombre, costo_por_unidad_base)
    `,
    )
    .eq('activo', true)
    .order('orden');
  if (error) throw error;
  return data;
}

export async function createMenuProducto(payload: Record<string, unknown>) {
  const { data, error } = await fromUntyped('menu_productos')
    .insert({
      nombre: payload.nombre,
      nombre_corto: payload.nombre_corto,
      descripcion: payload.descripcion,
      tipo: payload.tipo,
      categoria_id: payload.categoria_id,
      insumo_id: payload.insumo_id,
      disponible_delivery: payload.disponible_delivery,
      visible_en_carta: payload.visible_en_carta ?? true,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateMenuProducto(id: string, payload: Record<string, unknown>) {
  const { error } = await fromUntyped('menu_productos')
    .update({
      nombre: payload.nombre,
      nombre_corto: payload.nombre_corto,
      descripcion: payload.descripcion,
      tipo: payload.tipo,
      categoria_id: payload.categoria_id,
      insumo_id: payload.insumo_id,
      disponible_delivery: payload.disponible_delivery,
      visible_en_carta: payload.visible_en_carta ?? true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw error;
}

export async function softDeleteMenuProducto(id: string) {
  const { error } = await fromUntyped('menu_productos')
    .update({ activo: false, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// ── Fichas Técnicas ─────────────────────────────────────────────────

export async function fetchFichaTecnica(productoId: string) {
  const { data, error } = await supabase
    .from('menu_fichas_tecnicas')
    .select(`*, insumos(id, nombre, unidad_base, costo_por_unidad_base)`)
    .eq('menu_producto_id', productoId)
    .order('orden');
  if (error) throw error;
  return data;
}

export async function saveFichaTecnica(
  menu_producto_id: string,
  items: { insumo_id: string; cantidad: number; unidad: string }[],
) {
  await supabase.from('menu_fichas_tecnicas').delete().eq('menu_producto_id', menu_producto_id);

  if (items.length > 0) {
    const { error } = await fromUntyped('menu_fichas_tecnicas').insert(
      items.map((item, index) => ({
        menu_producto_id,
        insumo_id: item.insumo_id,
        cantidad: item.cantidad,
        unidad: item.unidad,
        orden: index,
      })),
    );
    if (error) throw error;
  }
}

// ── Historial Precios Menu ──────────────────────────────────────────

export async function fetchHistorialPreciosMenu(productoId: string) {
  const { data, error } = await supabase
    .from('menu_precios_historial')
    .select('*')
    .eq('menu_producto_id', productoId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function cambiarPrecioMenuProducto(params: {
  productoId: string;
  precioAnterior: number;
  precioNuevo: number;
  motivo?: string;
  userId?: string;
}) {
  const { productoId, precioAnterior, precioNuevo, motivo, userId } = params;

  const { error: errPrecio } = await fromUntyped('menu_precios').upsert(
    {
      menu_producto_id: productoId,
      precio_base: precioNuevo,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'menu_producto_id' },
  );
  if (errPrecio) throw errPrecio;

  const { error: errHist } = await fromUntyped('menu_precios_historial').insert({
    menu_producto_id: productoId,
    precio_anterior: precioAnterior,
    precio_nuevo: precioNuevo,
    motivo: motivo || null,
    usuario_id: userId || null,
  });
  if (errHist) throw errHist;
}

// ── Grupos Opcionales ───────────────────────────────────────────────

export async function fetchGruposOpcionales(itemId: string) {
  const { data, error } = await fromUntyped('item_carta_grupo_opcional')
    .select(
      `
      *,
      items:item_carta_grupo_opcional_items(
        *,
        insumos(id, nombre, costo_por_unidad_base),
        preparaciones(id, nombre, costo_calculado)
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
  const { data, error } = await fromUntyped('item_carta_grupo_opcional')
    .insert(params)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateGrupoOpcional(id: string, data: { nombre?: string }) {
  const { error } = await fromUntyped('item_carta_grupo_opcional')
    .update(data as Record<string, unknown>)
    .eq('id', id);
  if (error) throw error;
}

export async function deleteGrupoOpcional(id: string) {
  const { error } = await fromUntyped('item_carta_grupo_opcional').delete().eq('id', id);
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
  await fromUntyped('item_carta_grupo_opcional_items').delete().eq('grupo_id', grupo_id);

  if (items.length > 0) {
    const { error } = await fromUntyped('item_carta_grupo_opcional_items').insert(
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
  const { error } = await fromUntyped('item_carta_grupo_opcional')
    .update({ costo_promedio: Math.round(costo_promedio * 100) / 100 })
    .eq('id', grupo_id);
  if (error) throw error;
}

// ── Extras & Asignaciones ───────────────────────────────────────────

export async function fetchExtrasCategoryId(): Promise<string | null> {
  const { data, error } = await fromUntyped('menu_categorias')
    .select('id')
    .ilike('nombre', '%extras%')
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return ((data as Record<string, unknown>)?.id as string) || null;
}

export async function findExistingExtraItem(
  tipo: 'preparacion' | 'insumo',
  refId: string,
): Promise<{ id: string; activo: boolean; deleted_at: string | null } | null> {
  const field =
    tipo === 'preparacion' ? 'composicion_ref_preparacion_id' : 'composicion_ref_insumo_id';
  const { data, error } = await supabase
    .from('items_carta')
    .select('id, activo, deleted_at')
    .eq('tipo', 'extra')
    .eq(field, refId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  if (tipo === 'preparacion') {
    const { data: prep, error: prepErr } = await supabase
      .from('preparaciones')
      .select('id')
      .eq('id', refId)
      .is('deleted_at', null)
      .maybeSingle();
    if (prepErr) throw prepErr;
    if (!prep) return null;
  }

  return { id: data.id, activo: data.activo ?? true, deleted_at: data.deleted_at ?? null };
}

export async function createExtraItemCarta(params: {
  nombre: string;
  catId: string | null;
  costo: number;
  composicion_ref_preparacion_id?: string | null;
  composicion_ref_insumo_id?: string | null;
}) {
  const { data, error } = await fromUntyped('items_carta')
    .insert({
      nombre: params.nombre,
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
  const { error } = await fromUntyped('items_carta')
    .update({ activo: true, deleted_at: null, costo_total: costo })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteComposicionByItem(item_carta_id: string) {
  await supabase.from('item_carta_composicion').delete().eq('item_carta_id', item_carta_id);
}

export async function insertComposicionRow(row: {
  item_carta_id: string;
  preparacion_id?: string | null;
  insumo_id?: string | null;
  cantidad: number;
  orden: number;
}) {
  const { error } = await supabase.from('item_carta_composicion').insert(row as any);
  if (error) throw error;
}

export async function upsertExtraAssignment(item_carta_id: string, extra_id: string) {
  const { error } = await fromUntyped('item_extra_asignaciones').upsert(
    { item_carta_id, extra_id },
    { onConflict: 'item_carta_id,extra_id' },
  );
  if (error) throw error;
}

export async function deleteExtraAssignment(item_carta_id: string, extra_id: string) {
  await fromUntyped('item_extra_asignaciones')
    .delete()
    .eq('item_carta_id', item_carta_id)
    .eq('extra_id', extra_id);
}

export async function countExtraAssignments(extra_id: string) {
  const { count } = await fromUntyped('item_extra_asignaciones')
    .select('id', { count: 'exact', head: true })
    .eq('extra_id', extra_id);
  return count ?? 0;
}

export async function fetchExtraAssignmentsByItem(itemId: string) {
  const { data, error } = await fromUntyped('item_extra_asignaciones')
    .select('extra_id')
    .eq('item_carta_id', itemId);
  if (error) throw error;
  return (data || []) as Array<Record<string, unknown>>;
}

export async function fetchExtraAssignmentsWithJoin(itemId: string) {
  const { data, error } = await fromUntyped('item_extra_asignaciones')
    .select('*, extra:extra_id(id, nombre, precio_base, costo_total, tipo)')
    .eq('item_carta_id', itemId);
  if (error) throw error;
  return data || [];
}

export async function fetchExtraAssignmentsForExtra(extraId: string) {
  const { data, error } = await fromUntyped('item_extra_asignaciones')
    .select('*')
    .eq('extra_id', extraId);
  if (error) throw error;
  return data || [];
}

export async function fetchActiveExtrasByIds(extraIds: string[]) {
  const { data, error } = await supabase
    .from('items_carta')
    .select('id, nombre, precio_base, activo')
    .in('id', extraIds)
    .eq('activo', true)
    .is('deleted_at', null);
  if (error) throw error;
  return data || [];
}

export async function saveExtraAssignments(item_carta_id: string, extra_ids: string[]) {
  const { error: delErr } = await fromUntyped('item_extra_asignaciones')
    .delete()
    .eq('item_carta_id', item_carta_id);
  if (delErr) throw delErr;

  if (extra_ids.length > 0) {
    const { error } = await fromUntyped('item_extra_asignaciones').insert(
      extra_ids.map((extra_id) => ({ item_carta_id, extra_id })),
    );
    if (error) throw error;
  }
}

export async function updatePrecioExtra(
  table: 'preparaciones' | 'insumos',
  id: string,
  precio_extra: number | null,
) {
  const { error } = await supabase
    .from(table)
    .update({ precio_extra } as Record<string, unknown>)
    .eq('id', id);
  if (error) throw error;
}

// ── Removibles ──────────────────────────────────────────────────────

export async function fetchItemRemovibles(itemId: string) {
  const { data, error } = await fromUntyped('item_removibles')
    .select('*, insumos(id, nombre), preparaciones(id, nombre)')
    .eq('item_carta_id', itemId)
    .eq('activo', true);
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

  const { data: existing } = await fromUntyped('item_removibles')
    .select('id')
    .eq('item_carta_id', params.item_carta_id)
    .eq(field, refId!)
    .maybeSingle();

  if (existing) {
    const { error } = await fromUntyped('item_removibles')
      .update({ activo: true, nombre_display: params.nombre_display || null })
      .eq('id', (existing as Record<string, unknown>).id as string);
    if (error) throw error;
  } else {
    const { error } = await fromUntyped('item_removibles').insert({
      item_carta_id: params.item_carta_id,
      insumo_id: params.insumo_id || null,
      preparacion_id: params.preparacion_id || null,
      activo: true,
      nombre_display: params.nombre_display || null,
    });
    if (error) throw error;
  }
}

export async function deleteRemovibleByInsumo(item_carta_id: string, insumo_id: string) {
  await fromUntyped('item_removibles')
    .delete()
    .eq('item_carta_id', item_carta_id)
    .eq('insumo_id', insumo_id);
}

export async function deleteRemovibleByPreparacion(
  item_carta_id: string,
  preparacion_id: string,
) {
  await fromUntyped('item_removibles')
    .delete()
    .eq('item_carta_id', item_carta_id)
    .eq('preparacion_id', preparacion_id);
}

export async function updateRemovibleNombreDisplay(id: string, nombre_display: string) {
  const { error } = await fromUntyped('item_removibles').update({ nombre_display }).eq('id', id);
  if (error) throw error;
}

// ── Modificadores ───────────────────────────────────────────────────

export async function fetchModificadores(itemId: string) {
  const { data, error } = await fromUntyped('item_modificadores')
    .select('*')
    .eq('item_carta_id', itemId)
    .order('tipo')
    .order('orden');
  if (error) throw error;
  return data as Array<Record<string, unknown>>;
}

export async function createModificador(payload: Record<string, unknown>) {
  const { data, error } = await fromUntyped('item_modificadores')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateModificador(id: string, payload: Record<string, unknown>) {
  const { error } = await fromUntyped('item_modificadores')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteModificador(id: string) {
  const { error } = await fromUntyped('item_modificadores').delete().eq('id', id);
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

  let query = supabase
    .from('items_carta')
    .select(
      `
      id, nombre, nombre_corto, descripcion, imagen_url,
      precio_base, precio_promo, promo_etiqueta,
      categoria_carta_id, orden, disponible_delivery,
      disponible_webapp, tipo,
      menu_categorias:categoria_carta_id(id, nombre, orden)
    `,
    )
    .eq('activo', true)
    .is('deleted_at', null)
    .eq('disponible_webapp', true)
    .order('orden');

  if (hiddenCatIds.length > 0) {
    query = query.not('categoria_carta_id', 'in', `(${hiddenCatIds.join(',')})`);
  }

  const { data, error } = await query;
  if (error) throw error;

  const { data: availability, error: avErr } = await fromUntyped('branch_item_availability')
    .select('item_carta_id, available, available_webapp, out_of_stock')
    .eq('branch_id', branchId);
  if (avErr) throw avErr;

  return { items: data || [], availability: availability || [] };
}

export async function fetchWebappItemOptionalGroups(itemId: string) {
  const { data: groups, error: gErr } = await fromUntyped('item_carta_grupo_opcional')
    .select('id, nombre, es_obligatorio, max_selecciones, orden')
    .eq('item_carta_id', itemId)
    .order('orden');
  if (gErr) throw gErr;
  if (!groups || groups.length === 0) return { groups: [], options: [] };

  const groupIds = (groups as Array<Record<string, unknown>>).map(
    (g: Record<string, unknown>) => g.id as string,
  );
  const { data: options, error: oErr } = await fromUntyped('item_carta_grupo_opcional_items')
    .select(
      'id, grupo_id, insumo_id, preparacion_id, costo_unitario, insumos(id, nombre), preparaciones(id, nombre)',
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

  const { data, error } = await supabase
    .from('items_carta')
    .select('id, nombre, precio_base, imagen_url')
    .in('id', extraIds)
    .eq('activo', true)
    .is('deleted_at', null);
  if (error) throw error;
  return data || [];
}

export async function fetchWebappItemRemovables(itemId: string) {
  const { data, error } = await fromUntyped('item_removibles')
    .select(
      'id, nombre_display, activo, insumo_id, preparacion_id, insumos(id, nombre), preparaciones(id, nombre)',
    )
    .eq('item_carta_id', itemId)
    .eq('activo', true);
  if (error) throw error;
  return data ?? [];
}

// ── Categorías Preparación ──────────────────────────────────────────

export async function fetchCategoriasPreparacion() {
  const { data, error } = await supabase
    .from('categorias_preparacion')
    .select('*')
    .eq('activo', true)
    .is('deleted_at', null)
    .order('orden');
  if (error) throw error;
  return data;
}

export async function createCategoriaPreparacion(payload: { nombre: string; orden: number }) {
  const { data, error } = await supabase
    .from('categorias_preparacion')
    .insert(payload as any)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCategoriaPreparacion(
  id: string,
  payload: Record<string, unknown>,
) {
  const { error } = await supabase
    .from('categorias_preparacion')
    .update({ ...payload, updated_at: new Date().toISOString() } as Record<string, unknown>)
    .eq('id', id);
  if (error) throw error;
}

export async function reorderCategoriasPreparacion(items: { id: string; orden: number }[]) {
  for (const item of items) {
    const { error } = await supabase
      .from('categorias_preparacion')
      .update({ orden: item.orden } as Record<string, unknown>)
      .eq('id', item.id);
    if (error) throw error;
  }
}

export async function softDeleteCategoriaPreparacion(id: string) {
  const { error } = await supabase
    .from('categorias_preparacion')
    .update({
      activo: false,
      deleted_at: new Date().toISOString(),
    } as Record<string, unknown>)
    .eq('id', id);
  if (error) throw error;
  await supabase
    .from('preparaciones')
    .update({ categoria_preparacion_id: null } as Record<string, unknown>)
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
  const { error } = await supabase
    .from('items_carta')
    .update({ imagen_url: url } as any)
    .eq('id', itemId);
  if (error) throw error;
}

export async function fetchPrepIngredientesForDeepList(prepId: string) {
  const { data, error } = await supabase
    .from('preparacion_ingredientes')
    .select(
      `
      *,
      insumos(id, nombre, costo_por_unidad_base, unidad_base),
      sub_prep:preparaciones!preparacion_ingredientes_sub_preparacion_id_fkey(id, nombre)
    `,
    )
    .eq('preparacion_id', prepId)
    .order('orden');
  if (error) throw error;
  return data || [];
}

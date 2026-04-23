import { Router } from 'express';
import { db } from '../db/connection.js';
import {
  supply_categories, supplies,
  recipes, recipe_ingredients, recipe_options, recipe_categories,
  menu_categories, menu_items, menu_item_compositions, menu_item_components, menu_item_extras,
  menu_item_option_groups, menu_item_option_group_items, menu_item_price_history,
  extra_assignments, removable_items, item_modifiers,
  sales_channels, price_lists, price_list_items,
  branch_item_availability,
  branches, webapp_config,
  product_location_presence, locations,
} from '../db/schema.js';
import { eq, and, desc, sql, isNull, inArray } from 'drizzle-orm';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { buildSellableMenu } from '../services/sellableMenu.js';
import { rollupItemCost, rollupRecipeChange, rollupComboChange, rollupSupplyChange } from '../services/costRollup.js';
import { publishMenu, getCurrentSnapshot, listRecentSnapshots } from '../services/menuSnapshot.js';
import { getModifiersForItem } from '../services/modifiers.js';

const router = Router();

// ============================================================================
// SELLABLE MENU (Fase 1 — contrato canónico)
// ============================================================================

/**
 * Devuelve el menú vendible resuelto para (channel, branch, at).
 * Fuente única de verdad para POS y WebApp. Reemplaza la lectura cruda de
 * `menu_items` + cruces ad-hoc. Ver `services/sellableMenu.ts`.
 */
router.get('/sellable', optionalAuth, async (req, res, next) => {
  try {
    const channel = (req.query.channel as string | undefined) || 'mostrador';
    const branch = (req.query.branch as string | undefined) || null;
    const at = (req.query.at as string | undefined) || undefined;
    const useSnapshot = req.query.live !== 'true' && !at;

    // Fase 6: si hay snapshot current para (scope, channel), lo devolvemos.
    // Caller puede pedir `?live=true` para forzar el builder (útil en preview).
    if (useSnapshot && branch) {
      const snapshot = await getCurrentSnapshot('branch', branch, channel);
      if (snapshot) {
        res.json({ data: snapshot });
        return;
      }
    }

    const response = await buildSellableMenu({ channelCode: channel, branchId: branch, at });
    res.json({ data: response });
  } catch (err) { next(err); }
});

// ============================================================================
// PUBLISH WORKFLOW (Fase 6)
// ============================================================================

/**
 * Publica el estado actual del menú para (scope, channel). Genera un nuevo
 * `menu_snapshot is_current=true` y baja al anterior. POS y WebApp leen del
 * snapshot en la próxima request a `/menu/sellable`.
 */
router.post('/publish', requireAuth, async (req, res, next) => {
  try {
    const { scope_type, scope_id, channel_code } = req.body as {
      scope_type: 'brand' | 'branch';
      scope_id: string;
      channel_code: string;
    };
    if (!scope_type || !scope_id || !channel_code) {
      throw new AppError(400, 'scope_type, scope_id and channel_code are required');
    }
    const result = await publishMenu({
      scopeType: scope_type,
      scopeId: scope_id,
      channelCode: channel_code,
      publishedBy: req.user?.userId,
    });
    res.status(201).json({ data: result });
  } catch (err) { next(err); }
});

// ============================================================================
// MODIFIERS (Fase 7 — unificados)
// ============================================================================

/**
 * Devuelve los modifier groups de un item (fuente única de verdad Fase 7).
 * POS/WebApp/Admin deberían migrar a consumir este endpoint en vez de leer
 * las 4 tablas legacy por separado.
 */
router.get('/items/:id/modifiers', optionalAuth, async (req, res, next) => {
  try {
    const data = await getModifiersForItem(req.params.id);
    res.json({ data });
  } catch (err) { next(err); }
});

router.get('/snapshots', requireAuth, async (req, res, next) => {
  try {
    const scopeType = (req.query.scope_type as string) || 'branch';
    const scopeId = req.query.scope_id as string;
    const channel = req.query.channel_code as string | undefined;
    if (!scopeId) throw new AppError(400, 'scope_id is required');
    const rows = await listRecentSnapshots(scopeType, scopeId, channel);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

// ============================================================================
// VISIBILITY (Fase 3 — entity_channel_visibility)
// ============================================================================

import * as schemaExt from '../db/schema.js';

/**
 * Devuelve para una entidad (item/category/promo) el mapa canal → is_visible.
 * Ausencia de fila = visible por default.
 */
router.get('/visibility/:entityType/:entityId', requireAuth, async (req, res, next) => {
  try {
    const { entityType, entityId } = req.params;
    const rows = await db.select().from(schemaExt.entity_channel_visibility).where(and(
      eq(schemaExt.entity_channel_visibility.entity_type, entityType),
      eq(schemaExt.entity_channel_visibility.entity_id, entityId),
    ));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

/**
 * Upsert de visibilidad para (entity, channel). `is_visible = true` borra
 * la fila explícita (vuelve al default visible). `is_visible = false` la
 * persiste como override.
 */
router.put('/visibility/:entityType/:entityId/:channelCode', requireAuth, async (req, res, next) => {
  try {
    const { entityType, entityId, channelCode } = req.params;
    const { is_visible } = req.body as { is_visible: boolean };
    const now = new Date().toISOString();

    if (is_visible === true) {
      await db.delete(schemaExt.entity_channel_visibility).where(and(
        eq(schemaExt.entity_channel_visibility.entity_type, entityType),
        eq(schemaExt.entity_channel_visibility.entity_id, entityId),
        eq(schemaExt.entity_channel_visibility.channel_code, channelCode),
      ));
      res.json({ data: { entity_type: entityType, entity_id: entityId, channel_code: channelCode, is_visible: true } });
      return;
    }

    const existing = await db.select().from(schemaExt.entity_channel_visibility).where(and(
      eq(schemaExt.entity_channel_visibility.entity_type, entityType),
      eq(schemaExt.entity_channel_visibility.entity_id, entityId),
      eq(schemaExt.entity_channel_visibility.channel_code, channelCode),
    )).get();

    if (existing) {
      await db.update(schemaExt.entity_channel_visibility)
        .set({ is_visible: false, updated_at: now })
        .where(eq(schemaExt.entity_channel_visibility.id, existing.id));
    } else {
      await db.insert(schemaExt.entity_channel_visibility).values({
        id: crypto.randomUUID(),
        entity_type: entityType,
        entity_id: entityId,
        channel_code: channelCode,
        is_visible: false,
        created_at: now,
        updated_at: now,
      });
    }
    res.json({ data: { entity_type: entityType, entity_id: entityId, channel_code: channelCode, is_visible: false } });
  } catch (err) { next(err); }
});

// ============================================================================
// SUPPLY CATEGORIES
// ============================================================================

router.get('/supply-categories', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(supply_categories)
      .where(isNull(supply_categories.deleted_at))
      .orderBy(supply_categories.sort_order);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/supply-categories', requireAuth, async (req, res, next) => {
  try {
    const { name, type, description, sort_order } = req.body;
    if (!name) throw new AppError(400, 'Name is required');
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(supply_categories).values({
      id, name, type, description, sort_order,
      is_active: true, created_at: now, updated_at: now,
    });
    const row = await db.select().from(supply_categories).where(eq(supply_categories.id, id)).get();
    res.status(201).json({ data: row });
  } catch (err) { next(err); }
});

router.put('/supply-categories/:id', requireAuth, async (req, res, next) => {
  try {
    const { name, type, description, sort_order, is_active } = req.body;
    const now = new Date().toISOString();
    await db.update(supply_categories).set({
      ...(name !== undefined && { name }),
      ...(type !== undefined && { type }),
      ...(description !== undefined && { description }),
      ...(sort_order !== undefined && { sort_order }),
      ...(is_active !== undefined && { is_active }),
      updated_at: now,
    }).where(eq(supply_categories.id, req.params.id));
    const row = await db.select().from(supply_categories).where(eq(supply_categories.id, req.params.id)).get();
    if (!row) throw new AppError(404, 'Supply category not found');
    res.json({ data: row });
  } catch (err) { next(err); }
});

router.delete('/supply-categories/:id', requireAuth, async (req, res, next) => {
  try {
    const now = new Date().toISOString();
    await db.update(supply_categories).set({ deleted_at: now, is_active: false, updated_at: now })
      .where(eq(supply_categories.id, req.params.id));
    res.json({ data: null });
  } catch (err) { next(err); }
});

// ============================================================================
// SUPPLIES (insumos)
// ============================================================================

router.get('/supplies', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(supplies)
      .where(isNull(supplies.deleted_at))
      .orderBy(supplies.name);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/supplies', requireAuth, async (req, res, next) => {
  try {
    const { name, categoria_id, base_unit, pl_category, description, item_type,
      rdo_category_code, tracks_stock, purchase_unit, purchase_unit_content,
      purchase_unit_price, base_unit_cost, default_alicuota_iva, reference_price,
      nivel_control, especificacion, proveedor_sugerido_id, proveedor_obligatorio_id,
      max_suggested_price, control_reason, sale_price, can_be_extra, extra_price,
      extra_target_fc } = req.body;
    if (!name) throw new AppError(400, 'Name is required');
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(supplies).values({
      id, name, categoria_id, base_unit, pl_category, description, item_type,
      rdo_category_code, tracks_stock, purchase_unit, purchase_unit_content,
      purchase_unit_price, base_unit_cost, default_alicuota_iva, reference_price,
      nivel_control, especificacion, proveedor_sugerido_id, proveedor_obligatorio_id,
      max_suggested_price, control_reason, sale_price, can_be_extra, extra_price,
      extra_target_fc,
      creado_por: req.user?.userId,
      is_active: true, created_at: now, updated_at: now,
    });
    const row = await db.select().from(supplies).where(eq(supplies.id, id)).get();
    res.status(201).json({ data: row });
  } catch (err) { next(err); }
});

router.put('/supplies/:id', requireAuth, async (req, res, next) => {
  try {
    const { name, categoria_id, base_unit, pl_category, description, item_type,
      rdo_category_code, tracks_stock, purchase_unit, purchase_unit_content,
      purchase_unit_price, base_unit_cost, default_alicuota_iva, reference_price,
      nivel_control, especificacion, proveedor_sugerido_id, proveedor_obligatorio_id,
      max_suggested_price, control_reason, sale_price, is_active, can_be_extra,
      extra_price, extra_target_fc, margen_bruto, margen_porcentaje } = req.body;
    const prev = await db.select().from(supplies).where(eq(supplies.id, req.params.id)).get();
    const now = new Date().toISOString();
    await db.update(supplies).set({
      ...(name !== undefined && { name }),
      ...(categoria_id !== undefined && { categoria_id }),
      ...(base_unit !== undefined && { base_unit }),
      ...(pl_category !== undefined && { pl_category }),
      ...(description !== undefined && { description }),
      ...(item_type !== undefined && { item_type }),
      ...(rdo_category_code !== undefined && { rdo_category_code }),
      ...(tracks_stock !== undefined && { tracks_stock }),
      ...(purchase_unit !== undefined && { purchase_unit }),
      ...(purchase_unit_content !== undefined && { purchase_unit_content }),
      ...(purchase_unit_price !== undefined && { purchase_unit_price }),
      ...(base_unit_cost !== undefined && { base_unit_cost }),
      ...(default_alicuota_iva !== undefined && { default_alicuota_iva }),
      ...(reference_price !== undefined && { reference_price }),
      ...(nivel_control !== undefined && { nivel_control }),
      ...(especificacion !== undefined && { especificacion }),
      ...(proveedor_sugerido_id !== undefined && { proveedor_sugerido_id }),
      ...(proveedor_obligatorio_id !== undefined && { proveedor_obligatorio_id }),
      ...(max_suggested_price !== undefined && { max_suggested_price }),
      ...(control_reason !== undefined && { control_reason }),
      ...(sale_price !== undefined && { sale_price }),
      ...(is_active !== undefined && { is_active }),
      ...(can_be_extra !== undefined && { can_be_extra }),
      ...(extra_price !== undefined && { extra_price }),
      ...(extra_target_fc !== undefined && { extra_target_fc }),
      ...(margen_bruto !== undefined && { margen_bruto }),
      ...(margen_porcentaje !== undefined && { margen_porcentaje }),
      updated_at: now,
    }).where(eq(supplies.id, req.params.id));
    const row = await db.select().from(supplies).where(eq(supplies.id, req.params.id)).get();
    if (!row) throw new AppError(404, 'Supply not found');
    // Fase 2: si cambió base_unit_cost, dispara rollup para todas las recetas
    // e items que dependen de este insumo.
    if (
      base_unit_cost !== undefined &&
      prev && Number(prev.base_unit_cost ?? 0) !== Number(base_unit_cost ?? 0)
    ) {
      await rollupSupplyChange(req.params.id, { triggeredBy: req.user?.userId });
    }
    res.json({ data: row });
  } catch (err) { next(err); }
});

router.delete('/supplies/:id', requireAuth, async (req, res, next) => {
  try {
    const now = new Date().toISOString();
    await db.update(supplies).set({ deleted_at: now, is_active: false, updated_at: now })
      .where(eq(supplies.id, req.params.id));
    res.json({ data: null });
  } catch (err) { next(err); }
});

router.put('/supplies/:id/extra-price', requireAuth, async (req, res, next) => {
  try {
    const { extra_price } = req.body;
    await db.update(supplies).set({ extra_price, updated_at: new Date().toISOString() })
      .where(eq(supplies.id, req.params.id));
    res.json({ data: null });
  } catch (err) { next(err); }
});

// ============================================================================
// RECIPES (preparaciones)
// ============================================================================

router.get('/recipes', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(recipes)
      .where(isNull(recipes.deleted_at))
      .orderBy(recipes.name);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/recipes', requireAuth, async (req, res, next) => {
  try {
    const { nombre, descripcion, tipo, is_interchangeable, metodo_costeo,
      categoria_preparacion_id } = req.body;
    if (!nombre) throw new AppError(400, 'Name is required');
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(recipes).values({
      id,
      name: nombre,
      description: descripcion,
      type: tipo,
      is_interchangeable: is_interchangeable ?? false,
      costing_method: metodo_costeo,
      categoria_preparacion_id,
      is_active: true, created_at: now, updated_at: now,
    });
    const row = await db.select().from(recipes).where(eq(recipes.id, id)).get();
    res.status(201).json({ data: row });
  } catch (err) { next(err); }
});

router.put('/recipes/:id', requireAuth, async (req, res, next) => {
  try {
    const { name, nombre, description, descripcion, type, tipo,
      is_interchangeable, costing_method, metodo_costeo,
      manual_cost, calculated_cost, categoria_preparacion_id,
      is_active, can_be_extra, extra_price, extra_target_fc } = req.body;
    const now = new Date().toISOString();
    await db.update(recipes).set({
      ...((name ?? nombre) !== undefined && { name: name ?? nombre }),
      ...((description ?? descripcion) !== undefined && { description: description ?? descripcion }),
      ...((type ?? tipo) !== undefined && { type: type ?? tipo }),
      ...(is_interchangeable !== undefined && { is_interchangeable }),
      ...((costing_method ?? metodo_costeo) !== undefined && { costing_method: costing_method ?? metodo_costeo }),
      ...(manual_cost !== undefined && { manual_cost }),
      ...(calculated_cost !== undefined && { calculated_cost }),
      ...(categoria_preparacion_id !== undefined && { categoria_preparacion_id }),
      ...(is_active !== undefined && { is_active }),
      ...(can_be_extra !== undefined && { can_be_extra }),
      ...(extra_price !== undefined && { extra_price }),
      ...(extra_target_fc !== undefined && { extra_target_fc }),
      updated_at: now,
    }).where(eq(recipes.id, req.params.id));
    const row = await db.select().from(recipes).where(eq(recipes.id, req.params.id)).get();
    if (!row) throw new AppError(404, 'Recipe not found');
    res.json({ data: row });
  } catch (err) { next(err); }
});

router.delete('/recipes/:id', requireAuth, async (req, res, next) => {
  try {
    const now = new Date().toISOString();
    await db.update(recipes).set({ deleted_at: now, is_active: false, updated_at: now })
      .where(eq(recipes.id, req.params.id));
    res.json({ data: null });
  } catch (err) { next(err); }
});

router.put('/recipes/:id/extra-price', requireAuth, async (req, res, next) => {
  try {
    const { extra_price } = req.body;
    await db.update(recipes).set({ extra_price, updated_at: new Date().toISOString() })
      .where(eq(recipes.id, req.params.id));
    res.json({ data: null });
  } catch (err) { next(err); }
});

// ── Recipe Ingredients ──

router.get('/recipes/:id/ingredients', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(recipe_ingredients)
      .where(eq(recipe_ingredients.preparacion_id, req.params.id))
      .orderBy(recipe_ingredients.sort_order);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/recipes/:id/ingredients', requireAuth, async (req, res, next) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) throw new AppError(400, 'items must be an array');

    await db.delete(recipe_ingredients)
      .where(eq(recipe_ingredients.preparacion_id, req.params.id));

    const now = new Date().toISOString();
    for (let i = 0; i < items.length; i++) {
      const ing = items[i];
      await db.insert(recipe_ingredients).values({
        id: crypto.randomUUID(),
        preparacion_id: req.params.id,
        insumo_id: ing.insumo_id || null,
        sub_preparacion_id: ing.sub_preparacion_id || null,
        quantity: ing.quantity ?? ing.cantidad ?? 1,
        unit: ing.unit || ing.unidad,
        sort_order: ing.sort_order ?? i,
        created_at: now,
      });
    }
    // Fase 2: dispara rollup de la receta. Propaga a items y combos aguas arriba.
    await rollupRecipeChange(req.params.id, { triggeredBy: req.user?.userId });
    const rows = await db.select().from(recipe_ingredients)
      .where(eq(recipe_ingredients.preparacion_id, req.params.id));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

// ── Recipe Options (interchangeable supplies) ──

router.get('/recipes/:id/options', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(recipe_options)
      .where(eq(recipe_options.preparacion_id, req.params.id))
      .orderBy(recipe_options.sort_order);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/recipes/:id/options', requireAuth, async (req, res, next) => {
  try {
    const { insumo_ids } = req.body;
    if (!Array.isArray(insumo_ids)) throw new AppError(400, 'insumo_ids must be an array');

    await db.delete(recipe_options)
      .where(eq(recipe_options.preparacion_id, req.params.id));

    const now = new Date().toISOString();
    for (let i = 0; i < insumo_ids.length; i++) {
      await db.insert(recipe_options).values({
        id: crypto.randomUUID(),
        preparacion_id: req.params.id,
        insumo_id: insumo_ids[i],
        sort_order: i,
        created_at: now,
      });
    }
    const rows = await db.select().from(recipe_options)
      .where(eq(recipe_options.preparacion_id, req.params.id));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

// ── Deep Ingredients (recursive) ──

async function getDeepIngredients(prepId: string): Promise<Array<Record<string, unknown>>> {
  const ingredients = await db.select().from(recipe_ingredients)
    .where(eq(recipe_ingredients.preparacion_id, prepId));

  const result: Array<Record<string, unknown>> = [];
  for (const ing of ingredients) {
    if (ing.sub_preparacion_id) {
      const subIngs = await getDeepIngredients(ing.sub_preparacion_id);
      for (const si of subIngs) {
        result.push({
          ...si,
          quantity: ((si.quantity as number) ?? 1) * (ing.quantity ?? 1),
        });
      }
    } else {
      result.push(ing);
    }
  }
  return result;
}

router.get('/recipes/:id/deep-ingredients', requireAuth, async (req, res, next) => {
  try {
    const rows = await getDeepIngredients(req.params.id);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

// ============================================================================
// RECIPE CATEGORIES (categorías preparación)
// ============================================================================

router.get('/recipe-categories', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(recipe_categories)
      .where(isNull(recipe_categories.deleted_at))
      .orderBy(recipe_categories.sort_order);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/recipe-categories', requireAuth, async (req, res, next) => {
  try {
    const { nombre, orden } = req.body;
    if (!nombre) throw new AppError(400, 'Name is required');
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(recipe_categories).values({
      id, name: nombre, sort_order: orden,
      is_active: true, created_at: now, updated_at: now,
    });
    const row = await db.select().from(recipe_categories).where(eq(recipe_categories.id, id)).get();
    res.status(201).json({ data: row });
  } catch (err) { next(err); }
});

router.put('/recipe-categories/:id', requireAuth, async (req, res, next) => {
  try {
    const { nombre, name, orden, sort_order, is_active } = req.body;
    const now = new Date().toISOString();
    await db.update(recipe_categories).set({
      ...((name ?? nombre) !== undefined && { name: name ?? nombre }),
      ...((sort_order ?? orden) !== undefined && { sort_order: sort_order ?? orden }),
      ...(is_active !== undefined && { is_active }),
      updated_at: now,
    }).where(eq(recipe_categories.id, req.params.id));
    const row = await db.select().from(recipe_categories).where(eq(recipe_categories.id, req.params.id)).get();
    if (!row) throw new AppError(404, 'Recipe category not found');
    res.json({ data: row });
  } catch (err) { next(err); }
});

router.post('/recipe-categories/reorder', requireAuth, async (req, res, next) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) throw new AppError(400, 'items must be an array');
    const now = new Date().toISOString();
    for (const item of items) {
      await db.update(recipe_categories)
        .set({ sort_order: item.orden ?? item.sort_order, updated_at: now })
        .where(eq(recipe_categories.id, item.id));
    }
    res.json({ data: null });
  } catch (err) { next(err); }
});

router.delete('/recipe-categories/:id', requireAuth, async (req, res, next) => {
  try {
    const now = new Date().toISOString();
    await db.update(recipe_categories).set({ deleted_at: now, is_active: false, updated_at: now })
      .where(eq(recipe_categories.id, req.params.id));
    res.json({ data: null });
  } catch (err) { next(err); }
});

// ============================================================================
// MENU CATEGORIES (categorías carta)
// ============================================================================

router.get('/categories', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(menu_categories)
      .where(eq(menu_categories.is_active, true))
      .orderBy(menu_categories.sort_order);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/categories/hidden-ids', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select({ id: menu_categories.id }).from(menu_categories)
      .where(eq(menu_categories.is_visible_menu, false));
    res.json({ data: rows.map(r => r.id) });
  } catch (err) { next(err); }
});

router.post('/categories', requireAuth, async (req, res, next) => {
  try {
    const { name, description, sort_order, print_type } = req.body;
    if (!name) throw new AppError(400, 'Name is required');
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(menu_categories).values({
      id, name, description, sort_order, print_type,
      is_active: true, is_visible_menu: true,
      created_at: now, updated_at: now,
    });
    const row = await db.select().from(menu_categories).where(eq(menu_categories.id, id)).get();
    res.status(201).json({ data: row });
  } catch (err) { next(err); }
});

router.put('/categories/:id', requireAuth, async (req, res, next) => {
  try {
    const { name, description, sort_order, print_type, is_active } = req.body;
    const now = new Date().toISOString();
    await db.update(menu_categories).set({
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(sort_order !== undefined && { sort_order }),
      ...(print_type !== undefined && { print_type }),
      ...(is_active !== undefined && { is_active }),
      updated_at: now,
    }).where(eq(menu_categories.id, req.params.id));
    const row = await db.select().from(menu_categories).where(eq(menu_categories.id, req.params.id)).get();
    if (!row) throw new AppError(404, 'Category not found');
    res.json({ data: row });
  } catch (err) { next(err); }
});

router.post('/categories/reorder', requireAuth, async (req, res, next) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) throw new AppError(400, 'items must be an array');
    const now = new Date().toISOString();
    for (const item of items) {
      await db.update(menu_categories)
        .set({ sort_order: item.sort_order, updated_at: now })
        .where(eq(menu_categories.id, item.id));
    }
    res.json({ data: null });
  } catch (err) { next(err); }
});

router.delete('/categories/:id', requireAuth, async (req, res, next) => {
  try {
    const now = new Date().toISOString();
    await db.update(menu_categories).set({ is_active: false, updated_at: now })
      .where(eq(menu_categories.id, req.params.id));
    res.json({ data: null });
  } catch (err) { next(err); }
});

router.put('/categories/:id/visibility', requireAuth, async (req, res, next) => {
  try {
    const { is_visible_menu } = req.body;
    const now = new Date().toISOString();
    await db.update(menu_categories)
      .set({ is_visible_menu, updated_at: now })
      .where(eq(menu_categories.id, req.params.id));
    const row = await db.select().from(menu_categories).where(eq(menu_categories.id, req.params.id)).get();
    res.json({ data: row });
  } catch (err) { next(err); }
});

// ============================================================================
// MENU ITEMS (items carta)
// ============================================================================

// ── Must be before /items/:id to avoid param capture ──

router.get('/items/branch-availability', requireAuth, async (req, res, next) => {
  try {
    const branchId = req.query.branchId as string;
    if (!branchId) throw new AppError(400, 'branchId is required');
    const rows = await db.select().from(branch_item_availability)
      .where(eq(branch_item_availability.branch_id, branchId));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/items', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(menu_items)
      .where(isNull(menu_items.deleted_at))
      .orderBy(menu_items.sort_order);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/items', requireAuth, async (req, res, next) => {
  try {
    const { nombre, nombre_corto, descripcion, categoria_carta_id,
      rdo_category_code, precio_base, fc_objetivo, disponible_delivery,
      tipo, kitchen_station_id, image_url, closure_category,
      composicion_ref_preparacion_id, composicion_ref_insumo_id,
      available_webapp, promo_price, promo_etiqueta } = req.body;
    if (!nombre) throw new AppError(400, 'Name is required');
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(menu_items).values({
      id,
      name: nombre,
      short_name: nombre_corto,
      description: descripcion,
      categoria_carta_id: categoria_carta_id || null,
      rdo_category_code,
      base_price: precio_base,
      fc_objetivo,
      available_delivery: disponible_delivery,
      type: tipo,
      kitchen_station_id,
      image_url,
      closure_category,
      composicion_ref_preparacion_id,
      composicion_ref_insumo_id,
      available_webapp,
      promo_price,
      promo_etiqueta,
      is_active: true,
      created_at: now, updated_at: now,
    });
    const row = await db.select().from(menu_items).where(eq(menu_items.id, id)).get();
    res.status(201).json({ data: row });
  } catch (err) { next(err); }
});

router.put('/items/:id', requireAuth, async (req, res, next) => {
  try {
    const b = req.body;
    const now = new Date().toISOString();
    await db.update(menu_items).set({
      ...(b.name !== undefined && { name: b.name }),
      ...(b.nombre !== undefined && { name: b.nombre }),
      ...(b.short_name !== undefined && { short_name: b.short_name }),
      ...(b.nombre_corto !== undefined && { short_name: b.nombre_corto }),
      ...(b.description !== undefined && { description: b.description }),
      ...(b.descripcion !== undefined && { description: b.descripcion }),
      ...(b.image_url !== undefined && { image_url: b.image_url }),
      ...(b.categoria_carta_id !== undefined && { categoria_carta_id: b.categoria_carta_id }),
      ...(b.rdo_category_code !== undefined && { rdo_category_code: b.rdo_category_code }),
      ...(b.base_price !== undefined && { base_price: b.base_price }),
      ...(b.precio_base !== undefined && { base_price: b.precio_base }),
      ...(b.fc_objetivo !== undefined && { fc_objetivo: b.fc_objetivo }),
      ...(b.total_cost !== undefined && { total_cost: b.total_cost }),
      ...(b.fc_actual !== undefined && { fc_actual: b.fc_actual }),
      ...(b.available_delivery !== undefined && { available_delivery: b.available_delivery }),
      ...(b.disponible_delivery !== undefined && { available_delivery: b.disponible_delivery }),
      ...(b.sort_order !== undefined && { sort_order: b.sort_order }),
      ...(b.is_active !== undefined && { is_active: b.is_active }),
      ...(b.type !== undefined && { type: b.type }),
      ...(b.tipo !== undefined && { type: b.tipo }),
      ...(b.kitchen_station_id !== undefined && { kitchen_station_id: b.kitchen_station_id }),
      ...(b.closure_category !== undefined && { closure_category: b.closure_category }),
      ...(b.reference_price !== undefined && { reference_price: b.reference_price }),
      ...(b.composicion_ref_preparacion_id !== undefined && { composicion_ref_preparacion_id: b.composicion_ref_preparacion_id }),
      ...(b.composicion_ref_insumo_id !== undefined && { composicion_ref_insumo_id: b.composicion_ref_insumo_id }),
      ...(b.available_webapp !== undefined && { available_webapp: b.available_webapp }),
      ...(b.promo_price !== undefined && { promo_price: b.promo_price }),
      ...(b.promo_etiqueta !== undefined && { promo_etiqueta: b.promo_etiqueta }),
      updated_at: now,
    }).where(eq(menu_items.id, req.params.id));
    const row = await db.select().from(menu_items).where(eq(menu_items.id, req.params.id)).get();
    if (!row) throw new AppError(404, 'Item not found');
    res.json({ data: row });
  } catch (err) { next(err); }
});

router.delete('/items/:id', requireAuth, async (req, res, next) => {
  try {
    const now = new Date().toISOString();
    await db.update(menu_items).set({ deleted_at: now, is_active: false, updated_at: now })
      .where(eq(menu_items.id, req.params.id));
    res.json({ data: null });
  } catch (err) { next(err); }
});

// ── Compositions ──

router.get('/items/:id/composition', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(menu_item_compositions)
      .where(eq(menu_item_compositions.item_carta_id, req.params.id))
      .orderBy(menu_item_compositions.sort_order);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/items/:id/composition', requireAuth, async (req, res, next) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) throw new AppError(400, 'items must be an array');

    await db.delete(menu_item_compositions)
      .where(eq(menu_item_compositions.item_carta_id, req.params.id));

    const now = new Date().toISOString();
    for (let i = 0; i < items.length; i++) {
      const c = items[i];
      await db.insert(menu_item_compositions).values({
        id: crypto.randomUUID(),
        item_carta_id: req.params.id,
        preparacion_id: c.preparacion_id || null,
        insumo_id: c.insumo_id || null,
        quantity: c.cantidad ?? c.quantity ?? 1,
        sort_order: c.orden ?? c.sort_order ?? i,
        created_at: now,
      });
    }
    // Fase 2: dispara el rollup engine automáticamente. Reemplaza el patrón
    // anterior donde el frontend tenía que llamar explícito a recalculate-cost.
    await rollupItemCost(req.params.id, {
      trigger: 'item_composition_changed',
      triggeredBy: req.user?.userId,
    });
    const rows = await db.select().from(menu_item_compositions)
      .where(eq(menu_item_compositions.item_carta_id, req.params.id));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.delete('/items/:id/composition', requireAuth, async (req, res, next) => {
  try {
    await db.delete(menu_item_compositions)
      .where(eq(menu_item_compositions.item_carta_id, req.params.id));
    res.json({ data: null });
  } catch (err) { next(err); }
});

router.post('/compositions', requireAuth, async (req, res, next) => {
  try {
    const { item_carta_id, preparacion_id, insumo_id, cantidad, orden } = req.body;
    const id = crypto.randomUUID();
    await db.insert(menu_item_compositions).values({
      id, item_carta_id,
      preparacion_id: preparacion_id || null,
      insumo_id: insumo_id || null,
      quantity: cantidad ?? 1,
      sort_order: orden ?? 0,
      created_at: new Date().toISOString(),
    });
    res.json({ data: { id } });
  } catch (err) { next(err); }
});

// ── Price History ──

router.get('/items/:id/price-history', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(menu_item_price_history)
      .where(eq(menu_item_price_history.item_carta_id, req.params.id))
      .orderBy(desc(menu_item_price_history.created_at));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/items/:id/change-price', requireAuth, async (req, res, next) => {
  try {
    const { precioAnterior, precioNuevo, motivo, userId } = req.body;
    const now = new Date().toISOString();
    await db.insert(menu_item_price_history).values({
      id: crypto.randomUUID(),
      item_carta_id: req.params.id,
      previous_price: precioAnterior,
      new_price: precioNuevo,
      reason: motivo,
      user_id: userId || req.user?.userId,
      created_at: now,
    });
    await db.update(menu_items)
      .set({ base_price: precioNuevo, updated_at: now })
      .where(eq(menu_items.id, req.params.id));
    const row = await db.select().from(menu_items).where(eq(menu_items.id, req.params.id)).get();
    res.json({ data: row });
  } catch (err) { next(err); }
});

// ── Recalculate Cost (Fase 2: usa cost rollup engine) ──

router.post('/items/:id/recalculate-cost', requireAuth, async (req, res, next) => {
  try {
    await rollupItemCost(req.params.id, {
      trigger: 'manual_full_rollup',
      triggeredBy: req.user?.userId,
    });
    const updated = await db.select().from(menu_items).where(eq(menu_items.id, req.params.id)).get();
    res.json({ data: updated });
  } catch (err) { next(err); }
});

// ── Combo components (Fase 6) ──

/**
 * Lista los componentes de un combo, enriquecidos con info del producto base.
 */
router.get('/items/:id/combo-components', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(menu_item_components)
      .where(eq(menu_item_components.combo_id, req.params.id))
      .orderBy(menu_item_components.sort_order);
    if (rows.length === 0) return res.json({ data: [] });

    const componentIds = rows.map((r) => r.component_id);
    const menuData = await db.select({
      id: menu_items.id,
      name: menu_items.name,
      base_price: menu_items.base_price,
      total_cost: menu_items.total_cost,
      image_url: menu_items.image_url,
    }).from(menu_items).where(inArray(menu_items.id, componentIds));

    const menuById = new Map(menuData.map((m) => [m.id, m]));
    const enriched = rows.map((r) => ({
      ...r,
      component: menuById.get(r.component_id) ?? null,
    }));
    res.json({ data: enriched });
  } catch (err) { next(err); }
});

/**
 * Reemplaza todos los componentes del combo por el array recibido.
 * Idempotente: el caller manda el estado deseado.
 */
router.put('/items/:id/combo-components', requireAuth, async (req, res, next) => {
  try {
    const comboId = req.params.id;
    const { components } = req.body as {
      components: Array<{ component_id: string; quantity: number; sort_order?: number | null }>;
    };
    const existing = await db.select().from(menu_items).where(eq(menu_items.id, comboId)).get();
    if (!existing) throw new AppError(404, 'Combo item not found');

    const now = new Date().toISOString();
    await db.delete(menu_item_components)
      .where(eq(menu_item_components.combo_id, comboId));

    for (const [idx, comp] of components.entries()) {
      if (!comp.component_id || !comp.quantity || comp.quantity <= 0) continue;
      await db.insert(menu_item_components).values({
        id: crypto.randomUUID(),
        combo_id: comboId,
        component_id: comp.component_id,
        quantity: comp.quantity,
        sort_order: comp.sort_order ?? idx,
        created_at: now,
        updated_at: now,
      });
    }

    // Fase 2: rollup automático del combo al guardar sus componentes.
    await rollupComboChange(comboId, { triggeredBy: req.user?.userId });
    const rows = await db.select().from(menu_item_components)
      .where(eq(menu_item_components.combo_id, comboId));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

/**
 * Fase 2: mantenido como endpoint explícito para force-recalc. Internamente
 * usa el cost rollup engine en vez del cálculo ad-hoc anterior.
 */
router.post('/items/:id/recalculate-combo-cost', requireAuth, async (req, res, next) => {
  try {
    await rollupComboChange(req.params.id, { triggeredBy: req.user?.userId });
    const updated = await db.select().from(menu_items).where(eq(menu_items.id, req.params.id)).get();
    res.json({ data: updated });
  } catch (err) { next(err); }
});

// ── Upload Image (placeholder — needs multer for multipart) ──

router.post('/items/:id/upload-image', requireAuth, async (_req, res, next) => {
  try {
    throw new AppError(501, 'File upload not configured. Use PUT /items/:id/image-url instead.');
  } catch (err) { next(err); }
});

router.put('/items/:id/image-url', requireAuth, async (req, res, next) => {
  try {
    const { image_url } = req.body;
    const now = new Date().toISOString();
    await db.update(menu_items)
      .set({ image_url, updated_at: now })
      .where(eq(menu_items.id, req.params.id));
    res.json({ data: null });
  } catch (err) { next(err); }
});

// ============================================================================
// OPTION GROUPS (grupos opcionales)
// ============================================================================

router.get('/items/:id/option-groups', requireAuth, async (req, res, next) => {
  try {
    const groups = await db.select().from(menu_item_option_groups)
      .where(eq(menu_item_option_groups.item_carta_id, req.params.id))
      .orderBy(menu_item_option_groups.sort_order);

    const result = [];
    for (const g of groups) {
      const items = await db.select().from(menu_item_option_group_items)
        .where(eq(menu_item_option_group_items.grupo_id, g.id));
      result.push({ ...g, items });
    }
    res.json({ data: result });
  } catch (err) { next(err); }
});

router.post('/option-groups', requireAuth, async (req, res, next) => {
  try {
    const { item_carta_id, nombre, orden } = req.body;
    if (!item_carta_id) throw new AppError(400, 'item_carta_id is required');
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(menu_item_option_groups).values({
      id, item_carta_id,
      name: nombre,
      sort_order: orden ?? 0,
      created_at: now, updated_at: now,
    });
    const row = await db.select().from(menu_item_option_groups).where(eq(menu_item_option_groups.id, id)).get();
    res.status(201).json({ data: row });
  } catch (err) { next(err); }
});

router.put('/option-groups/:id', requireAuth, async (req, res, next) => {
  try {
    const { nombre, name, sort_order, is_required, max_selecciones } = req.body;
    const now = new Date().toISOString();
    await db.update(menu_item_option_groups).set({
      ...((name ?? nombre) !== undefined && { name: name ?? nombre }),
      ...(sort_order !== undefined && { sort_order }),
      ...(is_required !== undefined && { is_required }),
      ...(max_selecciones !== undefined && { max_selecciones }),
      updated_at: now,
    }).where(eq(menu_item_option_groups.id, req.params.id));
    const row = await db.select().from(menu_item_option_groups)
      .where(eq(menu_item_option_groups.id, req.params.id)).get();
    if (!row) throw new AppError(404, 'Option group not found');
    res.json({ data: row });
  } catch (err) { next(err); }
});

router.delete('/option-groups/:id', requireAuth, async (req, res, next) => {
  try {
    await db.delete(menu_item_option_group_items)
      .where(eq(menu_item_option_group_items.grupo_id, req.params.id));
    await db.delete(menu_item_option_groups)
      .where(eq(menu_item_option_groups.id, req.params.id));
    res.json({ data: null });
  } catch (err) { next(err); }
});

router.post('/option-groups/:id/items', requireAuth, async (req, res, next) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) throw new AppError(400, 'items must be an array');

    await db.delete(menu_item_option_group_items)
      .where(eq(menu_item_option_group_items.grupo_id, req.params.id));

    const now = new Date().toISOString();
    for (const item of items) {
      await db.insert(menu_item_option_group_items).values({
        id: crypto.randomUUID(),
        grupo_id: req.params.id,
        insumo_id: item.insumo_id || null,
        preparacion_id: item.preparacion_id || null,
        quantity: item.cantidad ?? item.quantity ?? 1,
        unit_cost: item.costo_unitario ?? item.unit_cost ?? 0,
        created_at: now,
      });
    }
    const rows = await db.select().from(menu_item_option_group_items)
      .where(eq(menu_item_option_group_items.grupo_id, req.params.id));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.put('/option-groups/:id/cost', requireAuth, async (req, res, next) => {
  try {
    const { average_cost } = req.body;
    const now = new Date().toISOString();
    await db.update(menu_item_option_groups)
      .set({ average_cost, updated_at: now })
      .where(eq(menu_item_option_groups.id, req.params.id));
    res.json({ data: null });
  } catch (err) { next(err); }
});

// ============================================================================
// EXTRAS & EXTRA ASSIGNMENTS
// ============================================================================

router.get('/extras/category-id', requireAuth, async (_req, res, next) => {
  try {
    const cat = await db.select({ id: menu_categories.id }).from(menu_categories)
      .where(and(
        sql`lower(${menu_categories.name}) like '%extra%'`,
        eq(menu_categories.is_active, true),
      ))
      .get();
    res.json({ data: cat || null });
  } catch (err) { next(err); }
});

router.get('/extras/find-existing', requireAuth, async (req, res, next) => {
  try {
    const { tipo, refId } = req.query;
    const condition = tipo === 'preparacion'
      ? eq(menu_items.composicion_ref_preparacion_id, refId as string)
      : eq(menu_items.composicion_ref_insumo_id, refId as string);
    const row = await db.select({
      id: menu_items.id,
      is_active: menu_items.is_active,
      deleted_at: menu_items.deleted_at,
    }).from(menu_items).where(condition).get();
    res.json({ data: row || null });
  } catch (err) { next(err); }
});

router.post('/extras', requireAuth, async (req, res, next) => {
  try {
    const { nombre, catId, costo, composicion_ref_preparacion_id,
      composicion_ref_insumo_id } = req.body;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(menu_items).values({
      id,
      name: nombre,
      categoria_carta_id: catId,
      total_cost: costo,
      type: 'extra',
      composicion_ref_preparacion_id: composicion_ref_preparacion_id || null,
      composicion_ref_insumo_id: composicion_ref_insumo_id || null,
      is_active: true,
      created_at: now, updated_at: now,
    });
    const row = await db.select().from(menu_items).where(eq(menu_items.id, id)).get();
    res.status(201).json({ data: row });
  } catch (err) { next(err); }
});

router.put('/extras/:id/reactivate', requireAuth, async (req, res, next) => {
  try {
    const { total_cost } = req.body;
    const now = new Date().toISOString();
    await db.update(menu_items).set({
      is_active: true, deleted_at: null,
      total_cost,
      updated_at: now,
    }).where(eq(menu_items.id, req.params.id));
    const row = await db.select().from(menu_items).where(eq(menu_items.id, req.params.id)).get();
    res.json({ data: row });
  } catch (err) { next(err); }
});

router.get('/extras/:id/assignments', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(extra_assignments)
      .where(eq(extra_assignments.extra_id, req.params.id));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/extras/active-by-ids', requireAuth, async (req, res, next) => {
  try {
    const { extraIds } = req.body;
    if (!Array.isArray(extraIds) || extraIds.length === 0) return res.json({ data: [] });
    const rows = await db.select().from(menu_items)
      .where(and(
        inArray(menu_items.id, extraIds),
        eq(menu_items.is_active, true),
        isNull(menu_items.deleted_at),
      ));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

// ── Extra Assignments ──

router.get('/items/:id/extra-assignments', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(extra_assignments)
      .where(eq(extra_assignments.item_carta_id, req.params.id));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/items/:id/extra-assignments-with-join', requireAuth, async (req, res, next) => {
  try {
    const assignments = await db.select().from(extra_assignments)
      .where(eq(extra_assignments.item_carta_id, req.params.id));

    const result = [];
    for (const a of assignments) {
      const extra = a.extra_id
        ? await db.select().from(menu_items).where(eq(menu_items.id, a.extra_id)).get()
        : null;
      result.push({ ...a, extra });
    }
    res.json({ data: result });
  } catch (err) { next(err); }
});

router.post('/items/:id/save-extra-assignments', requireAuth, async (req, res, next) => {
  try {
    const { extra_ids } = req.body;
    await db.delete(extra_assignments)
      .where(eq(extra_assignments.item_carta_id, req.params.id));

    const now = new Date().toISOString();
    for (const extraId of (extra_ids || [])) {
      await db.insert(extra_assignments).values({
        id: crypto.randomUUID(),
        item_carta_id: req.params.id,
        extra_id: extraId,
        created_at: now,
      });
    }
    const rows = await db.select().from(extra_assignments)
      .where(eq(extra_assignments.item_carta_id, req.params.id));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/extra-assignments', requireAuth, async (req, res, next) => {
  try {
    const { item_carta_id, extra_id } = req.body;
    const existing = await db.select().from(extra_assignments)
      .where(and(
        eq(extra_assignments.item_carta_id, item_carta_id),
        eq(extra_assignments.extra_id, extra_id),
      )).get();
    if (existing) return res.json({ data: existing });

    const id = crypto.randomUUID();
    await db.insert(extra_assignments).values({
      id, item_carta_id, extra_id,
      created_at: new Date().toISOString(),
    });
    const row = await db.select().from(extra_assignments).where(eq(extra_assignments.id, id)).get();
    res.json({ data: row });
  } catch (err) { next(err); }
});

router.delete('/extra-assignments', requireAuth, async (req, res, next) => {
  try {
    const { item_carta_id, extra_id } = req.body;
    await db.delete(extra_assignments)
      .where(and(
        eq(extra_assignments.item_carta_id, item_carta_id),
        eq(extra_assignments.extra_id, extra_id),
      ));
    res.json({ data: null });
  } catch (err) { next(err); }
});

router.get('/extra-assignments/count', requireAuth, async (req, res, next) => {
  try {
    const extraId = req.query.extra_id as string;
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(extra_assignments)
      .where(eq(extra_assignments.extra_id, extraId))
      .get();
    res.json({ data: { count: result?.count ?? 0 } });
  } catch (err) { next(err); }
});

// ============================================================================
// REMOVABLES
// ============================================================================

router.get('/items/:id/removables', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(removable_items)
      .where(and(
        eq(removable_items.item_carta_id, req.params.id),
        eq(removable_items.is_active, true),
      ));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/removables', requireAuth, async (req, res, next) => {
  try {
    const { item_carta_id, insumo_id, preparacion_id, nombre_display } = req.body;
    const id = crypto.randomUUID();
    await db.insert(removable_items).values({
      id, item_carta_id,
      insumo_id: insumo_id || null,
      preparacion_id: preparacion_id || null,
      display_name: nombre_display || null,
      is_active: true,
      created_at: new Date().toISOString(),
    });
    const row = await db.select().from(removable_items).where(eq(removable_items.id, id)).get();
    res.json({ data: row });
  } catch (err) { next(err); }
});

router.delete('/removables/by-insumo', requireAuth, async (req, res, next) => {
  try {
    const { item_carta_id, insumo_id } = req.body;
    await db.delete(removable_items)
      .where(and(
        eq(removable_items.item_carta_id, item_carta_id),
        eq(removable_items.insumo_id, insumo_id),
      ));
    res.json({ data: null });
  } catch (err) { next(err); }
});

router.delete('/removables/by-preparacion', requireAuth, async (req, res, next) => {
  try {
    const { item_carta_id, preparacion_id } = req.body;
    await db.delete(removable_items)
      .where(and(
        eq(removable_items.item_carta_id, item_carta_id),
        eq(removable_items.preparacion_id, preparacion_id),
      ));
    res.json({ data: null });
  } catch (err) { next(err); }
});

router.put('/removables/:id/display-name', requireAuth, async (req, res, next) => {
  try {
    const { display_name } = req.body;
    await db.update(removable_items)
      .set({ display_name })
      .where(eq(removable_items.id, req.params.id));
    res.json({ data: null });
  } catch (err) { next(err); }
});

// ============================================================================
// MODIFIERS
// ============================================================================

router.get('/items/:id/modifiers', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(item_modifiers)
      .where(and(
        eq(item_modifiers.item_carta_id, req.params.id),
        eq(item_modifiers.is_active, true),
      ))
      .orderBy(item_modifiers.sort_order);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/modifiers', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(item_modifiers).values({
      id,
      item_carta_id: req.body.item_carta_id,
      type: req.body.type,
      name: req.body.name,
      ingrediente_id: req.body.ingrediente_id,
      receta_id: req.body.receta_id,
      saving_quantity: req.body.saving_quantity,
      saving_unit: req.body.saving_unit,
      saving_cost: req.body.saving_cost,
      ingrediente_extra_id: req.body.ingrediente_extra_id,
      receta_extra_id: req.body.receta_extra_id,
      extra_quantity: req.body.extra_quantity,
      extra_unit: req.body.extra_unit,
      extra_price: req.body.extra_price,
      extra_cost: req.body.extra_cost,
      ingrediente_original_id: req.body.ingrediente_original_id,
      ingrediente_nuevo_id: req.body.ingrediente_nuevo_id,
      new_quantity: req.body.new_quantity,
      new_unit: req.body.new_unit,
      price_difference: req.body.price_difference,
      cost_difference: req.body.cost_difference,
      sort_order: req.body.sort_order ?? 0,
      is_active: true,
      created_at: now, updated_at: now,
    });
    const row = await db.select().from(item_modifiers).where(eq(item_modifiers.id, id)).get();
    res.status(201).json({ data: row });
  } catch (err) { next(err); }
});

router.put('/modifiers/:id', requireAuth, async (req, res, next) => {
  try {
    const b = req.body;
    const now = new Date().toISOString();
    await db.update(item_modifiers).set({
      ...(b.type !== undefined && { type: b.type }),
      ...(b.name !== undefined && { name: b.name }),
      ...(b.ingrediente_id !== undefined && { ingrediente_id: b.ingrediente_id }),
      ...(b.receta_id !== undefined && { receta_id: b.receta_id }),
      ...(b.saving_quantity !== undefined && { saving_quantity: b.saving_quantity }),
      ...(b.saving_unit !== undefined && { saving_unit: b.saving_unit }),
      ...(b.saving_cost !== undefined && { saving_cost: b.saving_cost }),
      ...(b.ingrediente_extra_id !== undefined && { ingrediente_extra_id: b.ingrediente_extra_id }),
      ...(b.receta_extra_id !== undefined && { receta_extra_id: b.receta_extra_id }),
      ...(b.extra_quantity !== undefined && { extra_quantity: b.extra_quantity }),
      ...(b.extra_unit !== undefined && { extra_unit: b.extra_unit }),
      ...(b.extra_price !== undefined && { extra_price: b.extra_price }),
      ...(b.extra_cost !== undefined && { extra_cost: b.extra_cost }),
      ...(b.ingrediente_original_id !== undefined && { ingrediente_original_id: b.ingrediente_original_id }),
      ...(b.ingrediente_nuevo_id !== undefined && { ingrediente_nuevo_id: b.ingrediente_nuevo_id }),
      ...(b.new_quantity !== undefined && { new_quantity: b.new_quantity }),
      ...(b.new_unit !== undefined && { new_unit: b.new_unit }),
      ...(b.price_difference !== undefined && { price_difference: b.price_difference }),
      ...(b.cost_difference !== undefined && { cost_difference: b.cost_difference }),
      ...(b.sort_order !== undefined && { sort_order: b.sort_order }),
      ...(b.is_active !== undefined && { is_active: b.is_active }),
      updated_at: now,
    }).where(eq(item_modifiers.id, req.params.id));
    const row = await db.select().from(item_modifiers).where(eq(item_modifiers.id, req.params.id)).get();
    if (!row) throw new AppError(404, 'Modifier not found');
    res.json({ data: row });
  } catch (err) { next(err); }
});

router.delete('/modifiers/:id', requireAuth, async (req, res, next) => {
  try {
    await db.delete(item_modifiers).where(eq(item_modifiers.id, req.params.id));
    res.json({ data: null });
  } catch (err) { next(err); }
});

// ============================================================================
// WEBAPP MENU (public-facing)
// ============================================================================

router.get('/webapp/config/:branchSlug', optionalAuth, async (req, res, next) => {
  try {
    const branch = await db.select().from(branches)
      .where(eq(branches.slug, req.params.branchSlug)).get();
    if (!branch) throw new AppError(404, 'Branch not found');

    const config = await db.select().from(webapp_config)
      .where(eq(webapp_config.branch_id, branch.id)).get();
    res.json({ data: { branch, config: config || null } });
  } catch (err) { next(err); }
});

router.get('/webapp/items', optionalAuth, async (req, res, next) => {
  try {
    const branchId = req.query.branchId as string;
    const items = await db.select().from(menu_items)
      .where(and(
        eq(menu_items.is_active, true),
        isNull(menu_items.deleted_at),
      ))
      .orderBy(menu_items.sort_order);

    const availability = branchId
      ? await db.select().from(branch_item_availability)
          .where(eq(branch_item_availability.branch_id, branchId))
      : [];
    res.json({ data: { items, availability } });
  } catch (err) { next(err); }
});

router.get('/webapp/items/:id/option-groups', optionalAuth, async (req, res, next) => {
  try {
    const groups = await db.select().from(menu_item_option_groups)
      .where(eq(menu_item_option_groups.item_carta_id, req.params.id))
      .orderBy(menu_item_option_groups.sort_order);

    const groupIds = groups.map(g => g.id);
    const options = groupIds.length > 0
      ? await db.select().from(menu_item_option_group_items)
          .where(inArray(menu_item_option_group_items.grupo_id, groupIds))
      : [];
    res.json({ data: { groups, options } });
  } catch (err) { next(err); }
});

router.get('/webapp/items/:id/extras', optionalAuth, async (req, res, next) => {
  try {
    const assignments = await db.select().from(extra_assignments)
      .where(eq(extra_assignments.item_carta_id, req.params.id));

    const extraIds = assignments.map(a => a.extra_id).filter(Boolean) as string[];
    const extras = extraIds.length > 0
      ? await db.select().from(menu_items)
          .where(and(inArray(menu_items.id, extraIds), eq(menu_items.is_active, true)))
      : [];
    res.json({ data: extras });
  } catch (err) { next(err); }
});

router.get('/webapp/items/:id/removables', optionalAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(removable_items)
      .where(and(
        eq(removable_items.item_carta_id, req.params.id),
        eq(removable_items.is_active, true),
      ));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

// ============================================================================
// SALES CHANNELS
// ============================================================================

router.get('/channels', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(sales_channels).orderBy(sales_channels.sort_order);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/channels', requireAuth, async (req, res, next) => {
  try {
    const { code, name, adjustment_type, adjustment_value, is_base, sort_order } = req.body;
    if (!name) throw new AppError(400, 'Name is required');
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(sales_channels).values({
      id, code, name, adjustment_type, adjustment_value, is_base,
      is_active: true, sort_order, created_at: now, updated_at: now,
    });
    const row = await db.select().from(sales_channels).where(eq(sales_channels.id, id)).get();
    res.status(201).json({ data: row });
  } catch (err) { next(err); }
});

router.put('/channels/:id', requireAuth, async (req, res, next) => {
  try {
    const { code, name, adjustment_type, adjustment_value, is_base,
      is_active, sort_order } = req.body;
    const now = new Date().toISOString();
    await db.update(sales_channels).set({
      ...(code !== undefined && { code }),
      ...(name !== undefined && { name }),
      ...(adjustment_type !== undefined && { adjustment_type }),
      ...(adjustment_value !== undefined && { adjustment_value }),
      ...(is_base !== undefined && { is_base }),
      ...(is_active !== undefined && { is_active }),
      ...(sort_order !== undefined && { sort_order }),
      updated_at: now,
    }).where(eq(sales_channels.id, req.params.id));
    const row = await db.select().from(sales_channels).where(eq(sales_channels.id, req.params.id)).get();
    if (!row) throw new AppError(404, 'Channel not found');
    res.json({ data: row });
  } catch (err) { next(err); }
});

// ============================================================================
// PRICE LISTS
// ============================================================================

router.get('/price-lists', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(price_lists).orderBy(price_lists.name);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/price-lists', requireAuth, async (req, res, next) => {
  try {
    const { name, channel, is_default, pricing_mode, pricing_value, mirror_channel } = req.body;
    if (!name) throw new AppError(400, 'Name is required');
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(price_lists).values({
      id, name, channel, is_default, pricing_mode, pricing_value, mirror_channel,
      is_active: true, created_at: now, updated_at: now,
    });
    const row = await db.select().from(price_lists).where(eq(price_lists.id, id)).get();
    res.status(201).json({ data: row });
  } catch (err) { next(err); }
});

router.put('/price-lists/:id', requireAuth, async (req, res, next) => {
  try {
    const { name, channel, is_default, is_active, pricing_mode,
      pricing_value, mirror_channel } = req.body;
    const now = new Date().toISOString();
    await db.update(price_lists).set({
      ...(name !== undefined && { name }),
      ...(channel !== undefined && { channel }),
      ...(is_default !== undefined && { is_default }),
      ...(is_active !== undefined && { is_active }),
      ...(pricing_mode !== undefined && { pricing_mode }),
      ...(pricing_value !== undefined && { pricing_value }),
      ...(mirror_channel !== undefined && { mirror_channel }),
      updated_at: now,
    }).where(eq(price_lists.id, req.params.id));
    const row = await db.select().from(price_lists).where(eq(price_lists.id, req.params.id)).get();
    if (!row) throw new AppError(404, 'Price list not found');
    res.json({ data: row });
  } catch (err) { next(err); }
});

router.get('/price-lists/:id/items', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(price_list_items)
      .where(eq(price_list_items.price_list_id, req.params.id));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/price-lists/:id/items', requireAuth, async (req, res, next) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) throw new AppError(400, 'items must be an array');

    await db.delete(price_list_items)
      .where(eq(price_list_items.price_list_id, req.params.id));

    const now = new Date().toISOString();
    for (const item of items) {
      await db.insert(price_list_items).values({
        id: crypto.randomUUID(),
        price_list_id: req.params.id,
        item_carta_id: item.item_carta_id || item.menu_item_id,
        price: item.price,
        created_at: now, updated_at: now,
      });
    }
    const rows = await db.select().from(price_list_items)
      .where(eq(price_list_items.price_list_id, req.params.id));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

// ============================================================================
// PRODUCT LOCATION PRESENCE (Sprint 2 — catalog presence model)
// ============================================================================

/**
 * GET /menu/items/:id/presence
 * Returns the presence configuration for a product:
 * {
 *   present_at_all_locations: boolean,
 *   exceptions: Array<{ location_id, is_present }>
 * }
 */
router.get('/items/:id/presence', requireAuth, async (req, res, next) => {
  try {
    const item = await db
      .select({ id: menu_items.id, present_at_all_locations: menu_items.present_at_all_locations })
      .from(menu_items)
      .where(eq(menu_items.id, req.params.id))
      .get();
    if (!item) throw new AppError(404, 'Item not found');

    const exceptions = await db
      .select()
      .from(product_location_presence)
      .where(eq(product_location_presence.product_id, req.params.id));

    res.json({
      data: {
        present_at_all_locations: !!item.present_at_all_locations,
        exceptions,
      },
    });
  } catch (err) { next(err); }
});

/**
 * PUT /menu/items/:id/presence
 * Body: { present_at_all_locations: boolean, exceptions: Array<{ location_id, is_present }> }
 */
router.put('/items/:id/presence', requireAuth, async (req, res, next) => {
  try {
    const { present_at_all_locations, exceptions } = req.body as {
      present_at_all_locations: boolean;
      exceptions: Array<{ location_id: string; is_present: boolean }>;
    };

    const item = await db
      .select({ id: menu_items.id })
      .from(menu_items)
      .where(eq(menu_items.id, req.params.id))
      .get();
    if (!item) throw new AppError(404, 'Item not found');

    await db
      .update(menu_items)
      .set({
        present_at_all_locations: present_at_all_locations,
        updated_at: new Date().toISOString(),
      })
      .where(eq(menu_items.id, req.params.id));

    // Replace exceptions
    await db
      .delete(product_location_presence)
      .where(eq(product_location_presence.product_id, req.params.id));

    if (exceptions.length > 0) {
      const now = new Date().toISOString();
      await db.insert(product_location_presence).values(
        exceptions.map((ex) => ({
          product_id: req.params.id,
          location_id: ex.location_id,
          is_present: ex.is_present ? 1 : 0,
          created_at: now,
        }))
      );
    }

    res.json({ data: { present_at_all_locations, exceptions } });
  } catch (err) { next(err); }
});

export { router as menuRoutes };

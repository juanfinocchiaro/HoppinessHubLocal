/**
 * Fase 2 — Cost Rollup Engine.
 *
 * Motor de costos BOM-style. Dado un evento (cambio de supply, recipe,
 * composición o combo), recorre el grafo de dependencias y recalcula todo
 * lo afectado, propagando hacia arriba.
 *
 * Inspirado en OpenBOM / D365 (detección de ciclos, rollup recursivo).
 *
 * Grafo:
 *   supplies                             (leaf cost = base_unit_cost)
 *     ↓ recipe_ingredients
 *   recipes (calculated_cost)            (puede tener sub_preparacion_id = otra receta)
 *     ↓ menu_item_compositions + menu_item_option_groups
 *   menu_items simples (total_cost)
 *     ↓ menu_item_components
 *   combos (total_cost)
 *
 * Invariante: cada llamada persiste el costo calculado y emite un delta en
 * `cost_rollup_audit` si cambió.
 */

import { db } from '../db/connection.js';
import * as schema from '../db/schema.js';
import { and, eq, inArray, isNull } from 'drizzle-orm';

const IVA = 1.21; // coherente con cálculos existentes en menu.routes.ts

export type RollupTrigger =
  | 'supply_price_changed'
  | 'recipe_ingredients_changed'
  | 'item_composition_changed'
  | 'combo_components_changed'
  | 'manual_full_rollup';

interface RollupStats {
  recipes_recalculated: number;
  items_recalculated: number;
  combos_recalculated: number;
  items_unchanged: number;
  cycles_detected: string[];
}

/**
 * Calcula el costo de una receta a partir de sus ingredientes.
 * Ingredientes pueden ser insumos directos o sub-preparaciones (recursión).
 * Retorna el nuevo `calculated_cost`.
 */
async function calculateRecipeCost(
  recipeId: string,
  visited: Set<string>,
  cycles: string[],
): Promise<number> {
  if (visited.has(recipeId)) {
    cycles.push(`recipe:${recipeId}`);
    return 0;
  }
  visited.add(recipeId);

  const ingredients = await db.select().from(schema.recipe_ingredients)
    .where(eq(schema.recipe_ingredients.preparacion_id, recipeId));

  let total = 0;
  for (const ing of ingredients) {
    const qty = Number(ing.quantity ?? 0);
    if (ing.sub_preparacion_id) {
      // Sub-receta: rollup recursivo
      const subCost = await calculateRecipeCost(ing.sub_preparacion_id, visited, cycles);
      total += subCost * qty;
    } else if (ing.insumo_id) {
      const supply = await db.select({
        base_unit_cost: schema.supplies.base_unit_cost,
      }).from(schema.supplies).where(eq(schema.supplies.id, ing.insumo_id)).get();
      total += Number(supply?.base_unit_cost ?? 0) * qty;
    }
  }

  visited.delete(recipeId);
  return Math.round(total * 10000) / 10000;
}

/**
 * Calcula el costo total de un `menu_item` a partir de su composición y
 * option groups. Para combos, usa `menu_item_components` + `total_cost` de
 * cada componente.
 */
async function calculateItemCost(
  itemId: string,
  visited: Set<string>,
  cycles: string[],
): Promise<number> {
  if (visited.has(itemId)) {
    cycles.push(`item:${itemId}`);
    return 0;
  }
  visited.add(itemId);

  const item = await db.select().from(schema.menu_items).where(eq(schema.menu_items.id, itemId)).get();
  if (!item) {
    visited.delete(itemId);
    return 0;
  }

  let total = 0;

  if (item.type === 'combo') {
    const components = await db.select().from(schema.menu_item_components)
      .where(eq(schema.menu_item_components.combo_id, itemId));
    for (const comp of components) {
      if (!comp.component_id) continue;
      // Costo del componente = su total_cost ya calculado
      const compItem = await db.select({
        total_cost: schema.menu_items.total_cost,
      }).from(schema.menu_items).where(eq(schema.menu_items.id, comp.component_id)).get();
      total += Number(compItem?.total_cost ?? 0) * (comp.quantity ?? 1);
    }
  } else {
    // Item simple: composición directa
    const compositions = await db.select().from(schema.menu_item_compositions)
      .where(eq(schema.menu_item_compositions.item_carta_id, itemId));
    for (const comp of compositions) {
      const qty = Number(comp.quantity ?? 1);
      if (comp.preparacion_id) {
        const recipe = await db.select({
          calculated_cost: schema.recipes.calculated_cost,
          manual_cost: schema.recipes.manual_cost,
        }).from(schema.recipes).where(eq(schema.recipes.id, comp.preparacion_id)).get();
        total += Number(recipe?.calculated_cost ?? recipe?.manual_cost ?? 0) * qty;
      } else if (comp.insumo_id) {
        const supply = await db.select({
          base_unit_cost: schema.supplies.base_unit_cost,
        }).from(schema.supplies).where(eq(schema.supplies.id, comp.insumo_id)).get();
        total += Number(supply?.base_unit_cost ?? 0) * qty;
      }
    }

    // Option groups: suman el average_cost (promedio entre las opciones)
    const optGroups = await db.select().from(schema.menu_item_option_groups)
      .where(eq(schema.menu_item_option_groups.item_carta_id, itemId));
    for (const g of optGroups) {
      total += Number(g.average_cost ?? 0);
    }
  }

  visited.delete(itemId);
  return Math.round(total * 100) / 100;
}

async function audit(
  itemId: string,
  trigger: RollupTrigger,
  oldCost: number | null,
  newCost: number,
  triggeredBy: string | null,
) {
  if (oldCost != null && Math.abs((oldCost ?? 0) - newCost) < 0.005) return;
  await db.insert(schema.cost_rollup_audit).values({
    id: crypto.randomUUID(),
    item_id: itemId,
    trigger,
    old_cost: oldCost ?? null,
    new_cost: newCost,
    triggered_by: triggeredBy,
    at: new Date().toISOString(),
  });
}

/**
 * Persiste el costo calculado en un `menu_item`, actualiza `fc_actual`,
 * y registra el delta en `cost_rollup_audit` si cambió.
 */
async function persistItemCost(
  itemId: string,
  newCost: number,
  trigger: RollupTrigger,
  triggeredBy: string | null,
): Promise<{ changed: boolean }> {
  const item = await db.select().from(schema.menu_items).where(eq(schema.menu_items.id, itemId)).get();
  if (!item) return { changed: false };
  const oldCost = item.total_cost ?? null;
  const fcActual = item.base_price && item.base_price > 0
    ? Math.round((newCost / item.base_price) * 10000) / 100
    : null;

  await db.update(schema.menu_items)
    .set({
      total_cost: newCost,
      fc_actual: fcActual,
      updated_at: new Date().toISOString(),
    })
    .where(eq(schema.menu_items.id, itemId));

  const changed = oldCost == null || Math.abs(oldCost - newCost) >= 0.005;
  if (changed) await audit(itemId, trigger, oldCost, newCost, triggeredBy);
  return { changed };
}

async function persistRecipeCost(recipeId: string, newCost: number): Promise<void> {
  await db.update(schema.recipes)
    .set({ calculated_cost: newCost, updated_at: new Date().toISOString() })
    .where(eq(schema.recipes.id, recipeId));
}

/**
 * Re-rollup de todos los items que dependen directa o transitivamente de
 * una receta. Busca en `menu_item_compositions.preparacion_id`.
 */
async function recalcItemsUsingRecipe(
  recipeId: string,
  trigger: RollupTrigger,
  triggeredBy: string | null,
  stats: RollupStats,
  cycles: string[],
) {
  const compositions = await db.select({
    item_carta_id: schema.menu_item_compositions.item_carta_id,
  }).from(schema.menu_item_compositions)
    .where(eq(schema.menu_item_compositions.preparacion_id, recipeId));
  const itemIds = [...new Set(compositions.map((c) => c.item_carta_id).filter(Boolean))] as string[];
  for (const itemId of itemIds) {
    const newCost = await calculateItemCost(itemId, new Set(), cycles);
    const { changed } = await persistItemCost(itemId, newCost, trigger, triggeredBy);
    if (changed) {
      stats.items_recalculated += 1;
      await recalcCombosUsingItem(itemId, trigger, triggeredBy, stats, cycles);
    } else {
      stats.items_unchanged += 1;
    }
  }
}

/**
 * Re-rollup de todos los combos que incluyen a un item como componente.
 */
async function recalcCombosUsingItem(
  componentId: string,
  trigger: RollupTrigger,
  triggeredBy: string | null,
  stats: RollupStats,
  cycles: string[],
) {
  const rows = await db.select({
    combo_id: schema.menu_item_components.combo_id,
  }).from(schema.menu_item_components)
    .where(eq(schema.menu_item_components.component_id, componentId));
  const comboIds = [...new Set(rows.map((r) => r.combo_id).filter(Boolean))] as string[];
  for (const comboId of comboIds) {
    const newCost = await calculateItemCost(comboId, new Set(), cycles);
    const { changed } = await persistItemCost(comboId, newCost, trigger, triggeredBy);
    if (changed) stats.combos_recalculated += 1;
  }
}

/**
 * Público: se llamó desde `POST /items/:id/composition` o tras cambiar
 * grupos opcionales / extras. Recalcula el item y propaga a combos.
 */
export async function rollupItemCost(
  itemId: string,
  opts: { trigger?: RollupTrigger; triggeredBy?: string | null } = {},
): Promise<RollupStats> {
  const trigger = opts.trigger ?? 'item_composition_changed';
  const triggeredBy = opts.triggeredBy ?? null;
  const stats: RollupStats = { recipes_recalculated: 0, items_recalculated: 0, combos_recalculated: 0, items_unchanged: 0, cycles_detected: [] };
  const cycles: string[] = [];

  const newCost = await calculateItemCost(itemId, new Set(), cycles);
  const { changed } = await persistItemCost(itemId, newCost, trigger, triggeredBy);
  if (changed) stats.items_recalculated += 1; else stats.items_unchanged += 1;
  await recalcCombosUsingItem(itemId, trigger, triggeredBy, stats, cycles);

  stats.cycles_detected = [...new Set(cycles)];
  return stats;
}

/**
 * Público: se llama cuando cambia el precio de un insumo.
 */
export async function rollupSupplyChange(
  supplyId: string,
  opts: { triggeredBy?: string | null } = {},
): Promise<RollupStats> {
  const triggeredBy = opts.triggeredBy ?? null;
  const stats: RollupStats = { recipes_recalculated: 0, items_recalculated: 0, combos_recalculated: 0, items_unchanged: 0, cycles_detected: [] };
  const cycles: string[] = [];

  // 1) Recetas que usan este supply directo
  const recipes = await db.select({
    preparacion_id: schema.recipe_ingredients.preparacion_id,
  }).from(schema.recipe_ingredients)
    .where(eq(schema.recipe_ingredients.insumo_id, supplyId));
  const recipeIds = [...new Set(recipes.map((r) => r.preparacion_id).filter(Boolean))] as string[];

  for (const recipeId of recipeIds) {
    const newCost = await calculateRecipeCost(recipeId, new Set(), cycles);
    await persistRecipeCost(recipeId, newCost);
    stats.recipes_recalculated += 1;
    await recalcItemsUsingRecipe(recipeId, 'supply_price_changed', triggeredBy, stats, cycles);
    // Cascada: recetas que referencian a esta sub_preparacion
    await cascadeRecipesUsingSubRecipe(recipeId, triggeredBy, stats, cycles);
  }

  // 2) Items que usan este supply directo (via menu_item_compositions)
  const directItems = await db.select({
    item_carta_id: schema.menu_item_compositions.item_carta_id,
  }).from(schema.menu_item_compositions)
    .where(eq(schema.menu_item_compositions.insumo_id, supplyId));
  const directItemIds = [...new Set(directItems.map((r) => r.item_carta_id).filter(Boolean))] as string[];
  for (const itemId of directItemIds) {
    const newCost = await calculateItemCost(itemId, new Set(), cycles);
    const { changed } = await persistItemCost(itemId, newCost, 'supply_price_changed', triggeredBy);
    if (changed) {
      stats.items_recalculated += 1;
      await recalcCombosUsingItem(itemId, 'supply_price_changed', triggeredBy, stats, cycles);
    } else {
      stats.items_unchanged += 1;
    }
  }

  stats.cycles_detected = [...new Set(cycles)];
  return stats;
}

/**
 * Cascada cuando una receta cambia: recetas que la usan como sub-receta
 * deben recalcularse (y así sucesivamente hacia arriba).
 */
async function cascadeRecipesUsingSubRecipe(
  subRecipeId: string,
  triggeredBy: string | null,
  stats: RollupStats,
  cycles: string[],
  depth = 0,
) {
  if (depth > 10) {
    cycles.push(`deep-chain:${subRecipeId}`);
    return;
  }
  const parents = await db.select({
    preparacion_id: schema.recipe_ingredients.preparacion_id,
  }).from(schema.recipe_ingredients)
    .where(eq(schema.recipe_ingredients.sub_preparacion_id, subRecipeId));
  const parentIds = [...new Set(parents.map((r) => r.preparacion_id).filter(Boolean))] as string[];
  for (const parentId of parentIds) {
    const newCost = await calculateRecipeCost(parentId, new Set(), cycles);
    await persistRecipeCost(parentId, newCost);
    stats.recipes_recalculated += 1;
    await recalcItemsUsingRecipe(parentId, 'recipe_ingredients_changed', triggeredBy, stats, cycles);
    await cascadeRecipesUsingSubRecipe(parentId, triggeredBy, stats, cycles, depth + 1);
  }
}

/**
 * Público: se llama cuando los ingredientes de una receta cambian.
 */
export async function rollupRecipeChange(
  recipeId: string,
  opts: { triggeredBy?: string | null } = {},
): Promise<RollupStats> {
  const triggeredBy = opts.triggeredBy ?? null;
  const stats: RollupStats = { recipes_recalculated: 0, items_recalculated: 0, combos_recalculated: 0, items_unchanged: 0, cycles_detected: [] };
  const cycles: string[] = [];

  const newCost = await calculateRecipeCost(recipeId, new Set(), cycles);
  await persistRecipeCost(recipeId, newCost);
  stats.recipes_recalculated += 1;
  await recalcItemsUsingRecipe(recipeId, 'recipe_ingredients_changed', triggeredBy, stats, cycles);
  await cascadeRecipesUsingSubRecipe(recipeId, triggeredBy, stats, cycles);

  stats.cycles_detected = [...new Set(cycles)];
  return stats;
}

/**
 * Público: se llama cuando los componentes de un combo cambian.
 * Reemplaza `POST /items/:id/recalculate-combo-cost`.
 */
export async function rollupComboChange(
  comboId: string,
  opts: { triggeredBy?: string | null } = {},
): Promise<RollupStats> {
  const triggeredBy = opts.triggeredBy ?? null;
  const stats: RollupStats = { recipes_recalculated: 0, items_recalculated: 0, combos_recalculated: 0, items_unchanged: 0, cycles_detected: [] };
  const cycles: string[] = [];

  const newCost = await calculateItemCost(comboId, new Set(), cycles);
  const { changed } = await persistItemCost(comboId, newCost, 'combo_components_changed', triggeredBy);
  if (changed) stats.combos_recalculated += 1;
  stats.cycles_detected = [...new Set(cycles)];
  return stats;
}

/**
 * Rollup global: recorre leaves → recetas → items → combos.
 * Usado por `POST /admin/recalculate-all-costs` (antes stub).
 */
export async function rollupAll(triggeredBy?: string | null): Promise<RollupStats> {
  const stats: RollupStats = { recipes_recalculated: 0, items_recalculated: 0, combos_recalculated: 0, items_unchanged: 0, cycles_detected: [] };
  const cycles: string[] = [];

  // 1) Recetas: recalcular todas (dos pasadas para resolver sub-recipes simples)
  const recipes = await db.select({ id: schema.recipes.id })
    .from(schema.recipes).where(and(
      eq(schema.recipes.is_active, true),
      isNull(schema.recipes.deleted_at),
    ));
  for (let pass = 0; pass < 3; pass++) {
    for (const r of recipes) {
      const newCost = await calculateRecipeCost(r.id, new Set(), cycles);
      await persistRecipeCost(r.id, newCost);
      if (pass === 0) stats.recipes_recalculated += 1;
    }
  }

  // 2) Items simples (no combos)
  const simpleItems = await db.select({ id: schema.menu_items.id })
    .from(schema.menu_items).where(and(
      eq(schema.menu_items.is_active, true),
      isNull(schema.menu_items.deleted_at),
    ));
  const simpleIds = simpleItems.map((i) => i.id);
  for (const itemId of simpleIds) {
    const item = await db.select({ type: schema.menu_items.type })
      .from(schema.menu_items).where(eq(schema.menu_items.id, itemId)).get();
    if (item?.type === 'combo') continue;
    const newCost = await calculateItemCost(itemId, new Set(), cycles);
    const { changed } = await persistItemCost(itemId, newCost, 'manual_full_rollup', triggeredBy ?? null);
    if (changed) stats.items_recalculated += 1;
    else stats.items_unchanged += 1;
  }

  // 3) Combos al final (necesitan item costs frescos)
  const combos = await db.select({ id: schema.menu_items.id })
    .from(schema.menu_items).where(and(
      eq(schema.menu_items.type, 'combo'),
      eq(schema.menu_items.is_active, true),
      isNull(schema.menu_items.deleted_at),
    ));
  for (const c of combos) {
    const newCost = await calculateItemCost(c.id, new Set(), cycles);
    const { changed } = await persistItemCost(c.id, newCost, 'manual_full_rollup', triggeredBy ?? null);
    if (changed) stats.combos_recalculated += 1;
  }

  stats.cycles_detected = [...new Set(cycles)];
  return stats;
}

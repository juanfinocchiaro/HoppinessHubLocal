import { Router } from 'express';
import { db } from '../db/connection.js';
import {
  menu_categories,
  menu_items,
  menu_item_extras,
  menu_item_option_groups,
  menu_item_option_group_items,
  menu_item_compositions,
  menu_item_price_history,
  item_modifiers,
  removable_items,
  recipes,
  recipe_ingredients,
  recipe_categories,
  supply_categories,
  supplies,
  sales_channels,
  price_lists,
  price_list_items,
  branch_item_availability,
} from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// ============================================================================
// CATEGORIES
// ============================================================================

router.get('/categories', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(menu_categories).orderBy(menu_categories.sort_order);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/categories', requireAuth, async (req, res, next) => {
  try {
    const { name, description, sort_order, icon, color, parent_id } = req.body;
    if (!name) throw new AppError(400, 'Name is required');

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(menu_categories).values({
      id, name, description, sort_order, icon, color, parent_id,
      is_active: true, created_at: now, updated_at: now,
    });
    const row = await db.select().from(menu_categories).where(eq(menu_categories.id, id)).get();
    res.status(201).json({ data: row });
  } catch (err) {
    next(err);
  }
});

router.put('/categories/:id', requireAuth, async (req, res, next) => {
  try {
    const { name, description, sort_order, icon, color, parent_id, is_active } = req.body;
    const now = new Date().toISOString();
    await db.update(menu_categories).set({
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(sort_order !== undefined && { sort_order }),
      ...(icon !== undefined && { icon }),
      ...(color !== undefined && { color }),
      ...(parent_id !== undefined && { parent_id }),
      ...(is_active !== undefined && { is_active }),
      updated_at: now,
    }).where(eq(menu_categories.id, req.params.id));
    const row = await db.select().from(menu_categories).where(eq(menu_categories.id, req.params.id)).get();
    if (!row) throw new AppError(404, 'Category not found');
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
});

router.delete('/categories/:id', requireAuth, async (req, res, next) => {
  try {
    const now = new Date().toISOString();
    await db.update(menu_categories).set({ is_active: false, updated_at: now })
      .where(eq(menu_categories.id, req.params.id));
    res.json({ message: 'Category deactivated' });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// ITEMS
// ============================================================================

router.get('/items', requireAuth, async (req, res, next) => {
  try {
    const { category_id, branch_id } = req.query;
    let rows;
    if (category_id && branch_id) {
      rows = await db.select().from(menu_items)
        .where(and(eq(menu_items.category_id, category_id as string), eq(menu_items.is_active, true)))
        .orderBy(menu_items.sort_order);
    } else if (category_id) {
      rows = await db.select().from(menu_items)
        .where(eq(menu_items.category_id, category_id as string))
        .orderBy(menu_items.sort_order);
    } else {
      rows = await db.select().from(menu_items).orderBy(menu_items.sort_order);
    }
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/items/:id', requireAuth, async (req, res, next) => {
  try {
    const row = await db.select().from(menu_items).where(eq(menu_items.id, req.params.id)).get();
    if (!row) throw new AppError(404, 'Item not found');
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
});

router.post('/items', requireAuth, async (req, res, next) => {
  try {
    const {
      name, description, category_id, base_price, image_url,
      sort_order, kitchen_station_id, preparation_time_min, tags, allergens,
      is_combo, combo_items, cost, margin_percentage, sku,
    } = req.body;
    if (!name) throw new AppError(400, 'Name is required');

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(menu_items).values({
      id, name, description, category_id, base_price, image_url,
      is_active: true, sort_order, kitchen_station_id, preparation_time_min,
      tags, allergens, is_combo, combo_items, cost, margin_percentage, sku,
      created_at: now, updated_at: now,
    });
    const row = await db.select().from(menu_items).where(eq(menu_items.id, id)).get();
    res.status(201).json({ data: row });
  } catch (err) {
    next(err);
  }
});

router.put('/items/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(menu_items).where(eq(menu_items.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Item not found');

    const {
      name, description, category_id, base_price, image_url,
      sort_order, kitchen_station_id, preparation_time_min, tags, allergens,
      is_combo, combo_items, cost, margin_percentage, sku, is_active,
    } = req.body;

    const now = new Date().toISOString();

    if (base_price !== undefined && base_price !== existing.base_price) {
      await db.insert(menu_item_price_history).values({
        id: crypto.randomUUID(),
        menu_item_id: req.params.id,
        old_price: existing.base_price,
        new_price: base_price,
        changed_by: req.user!.userId,
        created_at: now,
      });
    }

    await db.update(menu_items).set({
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(category_id !== undefined && { category_id }),
      ...(base_price !== undefined && { base_price }),
      ...(image_url !== undefined && { image_url }),
      ...(sort_order !== undefined && { sort_order }),
      ...(kitchen_station_id !== undefined && { kitchen_station_id }),
      ...(preparation_time_min !== undefined && { preparation_time_min }),
      ...(tags !== undefined && { tags }),
      ...(allergens !== undefined && { allergens }),
      ...(is_combo !== undefined && { is_combo }),
      ...(combo_items !== undefined && { combo_items }),
      ...(cost !== undefined && { cost }),
      ...(margin_percentage !== undefined && { margin_percentage }),
      ...(sku !== undefined && { sku }),
      ...(is_active !== undefined && { is_active }),
      updated_at: now,
    }).where(eq(menu_items.id, req.params.id));

    const row = await db.select().from(menu_items).where(eq(menu_items.id, req.params.id)).get();
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
});

router.delete('/items/:id', requireAuth, async (req, res, next) => {
  try {
    const now = new Date().toISOString();
    await db.update(menu_items).set({ is_active: false, updated_at: now })
      .where(eq(menu_items.id, req.params.id));
    res.json({ message: 'Item deactivated' });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// ITEM EXTRAS
// ============================================================================

router.get('/items/:id/extras', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(menu_item_extras)
      .where(eq(menu_item_extras.menu_item_id, req.params.id))
      .orderBy(menu_item_extras.sort_order);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/items/:id/extras', requireAuth, async (req, res, next) => {
  try {
    const { extras } = req.body;
    if (!Array.isArray(extras)) throw new AppError(400, 'extras must be an array');

    await db.delete(menu_item_extras).where(eq(menu_item_extras.menu_item_id, req.params.id));

    const now = new Date().toISOString();
    for (const extra of extras) {
      await db.insert(menu_item_extras).values({
        id: crypto.randomUUID(),
        menu_item_id: req.params.id,
        extra_name: extra.extra_name,
        extra_price: extra.extra_price,
        is_active: extra.is_active ?? true,
        sort_order: extra.sort_order,
        category: extra.category,
        created_at: now,
        updated_at: now,
      });
    }
    const rows = await db.select().from(menu_item_extras)
      .where(eq(menu_item_extras.menu_item_id, req.params.id))
      .orderBy(menu_item_extras.sort_order);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// OPTION GROUPS
// ============================================================================

router.get('/items/:id/option-groups', requireAuth, async (req, res, next) => {
  try {
    const groups = await db.select().from(menu_item_option_groups)
      .where(eq(menu_item_option_groups.menu_item_id, req.params.id))
      .orderBy(menu_item_option_groups.sort_order);

    const result = [];
    for (const group of groups) {
      const items = await db.select().from(menu_item_option_group_items)
        .where(eq(menu_item_option_group_items.group_id, group.id))
        .orderBy(menu_item_option_group_items.sort_order);
      result.push({ ...group, items });
    }
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

router.post('/items/:id/option-groups', requireAuth, async (req, res, next) => {
  try {
    const { name, is_required, min_selections, max_selections, sort_order } = req.body;
    if (!name) throw new AppError(400, 'Name is required');

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(menu_item_option_groups).values({
      id, menu_item_id: req.params.id, name, is_required,
      min_selections, max_selections, sort_order, is_active: true,
      created_at: now, updated_at: now,
    });
    const row = await db.select().from(menu_item_option_groups).where(eq(menu_item_option_groups.id, id)).get();
    res.status(201).json({ data: row });
  } catch (err) {
    next(err);
  }
});

router.put('/option-groups/:id', requireAuth, async (req, res, next) => {
  try {
    const { name, is_required, min_selections, max_selections, sort_order, is_active } = req.body;
    const now = new Date().toISOString();
    await db.update(menu_item_option_groups).set({
      ...(name !== undefined && { name }),
      ...(is_required !== undefined && { is_required }),
      ...(min_selections !== undefined && { min_selections }),
      ...(max_selections !== undefined && { max_selections }),
      ...(sort_order !== undefined && { sort_order }),
      ...(is_active !== undefined && { is_active }),
      updated_at: now,
    }).where(eq(menu_item_option_groups.id, req.params.id));
    const row = await db.select().from(menu_item_option_groups)
      .where(eq(menu_item_option_groups.id, req.params.id)).get();
    if (!row) throw new AppError(404, 'Option group not found');
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
});

router.delete('/option-groups/:id', requireAuth, async (req, res, next) => {
  try {
    await db.delete(menu_item_option_group_items)
      .where(eq(menu_item_option_group_items.group_id, req.params.id));
    await db.delete(menu_item_option_groups)
      .where(eq(menu_item_option_groups.id, req.params.id));
    res.json({ message: 'Option group deleted' });
  } catch (err) {
    next(err);
  }
});

router.post('/option-groups/:id/items', requireAuth, async (req, res, next) => {
  try {
    const { name, price_adjustment, is_default, sort_order } = req.body;
    if (!name) throw new AppError(400, 'Name is required');

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(menu_item_option_group_items).values({
      id, group_id: req.params.id, name, price_adjustment, is_default,
      sort_order, is_active: true, created_at: now,
    });
    const row = await db.select().from(menu_item_option_group_items)
      .where(eq(menu_item_option_group_items.id, id)).get();
    res.status(201).json({ data: row });
  } catch (err) {
    next(err);
  }
});

router.put('/option-group-items/:id', requireAuth, async (req, res, next) => {
  try {
    const { name, price_adjustment, is_default, sort_order, is_active } = req.body;
    await db.update(menu_item_option_group_items).set({
      ...(name !== undefined && { name }),
      ...(price_adjustment !== undefined && { price_adjustment }),
      ...(is_default !== undefined && { is_default }),
      ...(sort_order !== undefined && { sort_order }),
      ...(is_active !== undefined && { is_active }),
    }).where(eq(menu_item_option_group_items.id, req.params.id));
    const row = await db.select().from(menu_item_option_group_items)
      .where(eq(menu_item_option_group_items.id, req.params.id)).get();
    if (!row) throw new AppError(404, 'Option group item not found');
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
});

router.delete('/option-group-items/:id', requireAuth, async (req, res, next) => {
  try {
    await db.delete(menu_item_option_group_items)
      .where(eq(menu_item_option_group_items.id, req.params.id));
    res.json({ message: 'Option group item deleted' });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// COMPOSITIONS
// ============================================================================

router.get('/items/:id/compositions', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(menu_item_compositions)
      .where(eq(menu_item_compositions.menu_item_id, req.params.id));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/items/:id/compositions', requireAuth, async (req, res, next) => {
  try {
    const { compositions } = req.body;
    if (!Array.isArray(compositions)) throw new AppError(400, 'compositions must be an array');

    await db.delete(menu_item_compositions)
      .where(eq(menu_item_compositions.menu_item_id, req.params.id));

    const now = new Date().toISOString();
    for (const comp of compositions) {
      await db.insert(menu_item_compositions).values({
        id: crypto.randomUUID(),
        menu_item_id: req.params.id,
        recipe_id: comp.recipe_id,
        quantity: comp.quantity,
        unit: comp.unit,
        notes: comp.notes,
        created_at: now,
      });
    }
    const rows = await db.select().from(menu_item_compositions)
      .where(eq(menu_item_compositions.menu_item_id, req.params.id));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// REMOVABLES
// ============================================================================

router.get('/items/:id/removables', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(removable_items)
      .where(eq(removable_items.menu_item_id, req.params.id))
      .orderBy(removable_items.sort_order);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/items/:id/removables', requireAuth, async (req, res, next) => {
  try {
    const { removables } = req.body;
    if (!Array.isArray(removables)) throw new AppError(400, 'removables must be an array');

    await db.delete(removable_items).where(eq(removable_items.menu_item_id, req.params.id));

    const now = new Date().toISOString();
    for (const r of removables) {
      await db.insert(removable_items).values({
        id: crypto.randomUUID(),
        menu_item_id: req.params.id,
        ingredient_name: r.ingredient_name,
        is_active: r.is_active ?? true,
        sort_order: r.sort_order,
        created_at: now,
      });
    }
    const rows = await db.select().from(removable_items)
      .where(eq(removable_items.menu_item_id, req.params.id))
      .orderBy(removable_items.sort_order);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// MODIFIERS
// ============================================================================

router.get('/items/:id/modifiers', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(item_modifiers)
      .where(eq(item_modifiers.menu_item_id, req.params.id))
      .orderBy(item_modifiers.sort_order);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/items/:id/modifiers', requireAuth, async (req, res, next) => {
  try {
    const { name, type, options, is_required, max_selections, sort_order } = req.body;
    if (!name) throw new AppError(400, 'Name is required');

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(item_modifiers).values({
      id, menu_item_id: req.params.id, name, type, options,
      is_required, max_selections, sort_order, is_active: true,
      created_at: now, updated_at: now,
    });
    const row = await db.select().from(item_modifiers).where(eq(item_modifiers.id, id)).get();
    res.status(201).json({ data: row });
  } catch (err) {
    next(err);
  }
});

router.put('/modifiers/:id', requireAuth, async (req, res, next) => {
  try {
    const { name, type, options, is_required, max_selections, sort_order, is_active } = req.body;
    const now = new Date().toISOString();
    await db.update(item_modifiers).set({
      ...(name !== undefined && { name }),
      ...(type !== undefined && { type }),
      ...(options !== undefined && { options }),
      ...(is_required !== undefined && { is_required }),
      ...(max_selections !== undefined && { max_selections }),
      ...(sort_order !== undefined && { sort_order }),
      ...(is_active !== undefined && { is_active }),
      updated_at: now,
    }).where(eq(item_modifiers.id, req.params.id));
    const row = await db.select().from(item_modifiers).where(eq(item_modifiers.id, req.params.id)).get();
    if (!row) throw new AppError(404, 'Modifier not found');
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
});

router.delete('/modifiers/:id', requireAuth, async (req, res, next) => {
  try {
    await db.delete(item_modifiers).where(eq(item_modifiers.id, req.params.id));
    res.json({ message: 'Modifier deleted' });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// RECIPES
// ============================================================================

router.get('/recipes', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(recipes).orderBy(recipes.name);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/recipes/:id', requireAuth, async (req, res, next) => {
  try {
    const recipe = await db.select().from(recipes).where(eq(recipes.id, req.params.id)).get();
    if (!recipe) throw new AppError(404, 'Recipe not found');

    const ingredients = await db.select().from(recipe_ingredients)
      .where(eq(recipe_ingredients.recipe_id, req.params.id));
    res.json({ data: { ...recipe, ingredients } });
  } catch (err) {
    next(err);
  }
});

router.post('/recipes', requireAuth, async (req, res, next) => {
  try {
    const {
      name, description, category_id, yield_quantity, yield_unit,
      cost_per_unit, total_cost, instructions,
    } = req.body;
    if (!name) throw new AppError(400, 'Name is required');

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(recipes).values({
      id, name, description, category_id, yield_quantity, yield_unit,
      cost_per_unit, total_cost, instructions, is_active: true,
      created_at: now, updated_at: now,
    });
    const row = await db.select().from(recipes).where(eq(recipes.id, id)).get();
    res.status(201).json({ data: row });
  } catch (err) {
    next(err);
  }
});

router.put('/recipes/:id', requireAuth, async (req, res, next) => {
  try {
    const {
      name, description, category_id, yield_quantity, yield_unit,
      cost_per_unit, total_cost, instructions, is_active,
    } = req.body;
    const now = new Date().toISOString();
    await db.update(recipes).set({
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(category_id !== undefined && { category_id }),
      ...(yield_quantity !== undefined && { yield_quantity }),
      ...(yield_unit !== undefined && { yield_unit }),
      ...(cost_per_unit !== undefined && { cost_per_unit }),
      ...(total_cost !== undefined && { total_cost }),
      ...(instructions !== undefined && { instructions }),
      ...(is_active !== undefined && { is_active }),
      updated_at: now,
    }).where(eq(recipes.id, req.params.id));
    const row = await db.select().from(recipes).where(eq(recipes.id, req.params.id)).get();
    if (!row) throw new AppError(404, 'Recipe not found');
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
});

router.delete('/recipes/:id', requireAuth, async (req, res, next) => {
  try {
    const now = new Date().toISOString();
    await db.update(recipes).set({ is_active: false, updated_at: now })
      .where(eq(recipes.id, req.params.id));
    res.json({ message: 'Recipe deactivated' });
  } catch (err) {
    next(err);
  }
});

router.get('/recipes/:id/ingredients', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(recipe_ingredients)
      .where(eq(recipe_ingredients.recipe_id, req.params.id));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/recipes/:id/ingredients', requireAuth, async (req, res, next) => {
  try {
    const { ingredients } = req.body;
    if (!Array.isArray(ingredients)) throw new AppError(400, 'ingredients must be an array');

    await db.delete(recipe_ingredients).where(eq(recipe_ingredients.recipe_id, req.params.id));

    const now = new Date().toISOString();
    for (const ing of ingredients) {
      await db.insert(recipe_ingredients).values({
        id: crypto.randomUUID(),
        recipe_id: req.params.id,
        supply_id: ing.supply_id,
        quantity: ing.quantity,
        unit: ing.unit,
        waste_percentage: ing.waste_percentage,
        notes: ing.notes,
        created_at: now,
        updated_at: now,
      });
    }
    const rows = await db.select().from(recipe_ingredients)
      .where(eq(recipe_ingredients.recipe_id, req.params.id));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// RECIPE CATEGORIES
// ============================================================================

router.get('/recipe-categories', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(recipe_categories).orderBy(recipe_categories.sort_order);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/recipe-categories', requireAuth, async (req, res, next) => {
  try {
    const { name, sort_order } = req.body;
    if (!name) throw new AppError(400, 'Name is required');

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(recipe_categories).values({
      id, name, sort_order, is_active: true, created_at: now,
    });
    const row = await db.select().from(recipe_categories).where(eq(recipe_categories.id, id)).get();
    res.status(201).json({ data: row });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// SUPPLY CATEGORIES
// ============================================================================

router.get('/supply-categories', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(supply_categories).orderBy(supply_categories.sort_order);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/supply-categories', requireAuth, async (req, res, next) => {
  try {
    const { name, sort_order } = req.body;
    if (!name) throw new AppError(400, 'Name is required');

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(supply_categories).values({
      id, name, sort_order, is_active: true, created_at: now,
    });
    const row = await db.select().from(supply_categories).where(eq(supply_categories.id, id)).get();
    res.status(201).json({ data: row });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// SUPPLIES
// ============================================================================

router.get('/supplies', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(supplies).orderBy(supplies.name);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/supplies', requireAuth, async (req, res, next) => {
  try {
    const { name, category_id, unit, cost_per_unit, min_stock, sku } = req.body;
    if (!name) throw new AppError(400, 'Name is required');

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(supplies).values({
      id, name, category_id, unit, cost_per_unit, min_stock, sku,
      is_active: true, created_at: now, updated_at: now,
    });
    const row = await db.select().from(supplies).where(eq(supplies.id, id)).get();
    res.status(201).json({ data: row });
  } catch (err) {
    next(err);
  }
});

router.put('/supplies/:id', requireAuth, async (req, res, next) => {
  try {
    const { name, category_id, unit, cost_per_unit, min_stock, sku, is_active } = req.body;
    const now = new Date().toISOString();
    await db.update(supplies).set({
      ...(name !== undefined && { name }),
      ...(category_id !== undefined && { category_id }),
      ...(unit !== undefined && { unit }),
      ...(cost_per_unit !== undefined && { cost_per_unit }),
      ...(min_stock !== undefined && { min_stock }),
      ...(sku !== undefined && { sku }),
      ...(is_active !== undefined && { is_active }),
      updated_at: now,
    }).where(eq(supplies.id, req.params.id));
    const row = await db.select().from(supplies).where(eq(supplies.id, req.params.id)).get();
    if (!row) throw new AppError(404, 'Supply not found');
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// SALES CHANNELS
// ============================================================================

router.get('/channels', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(sales_channels).orderBy(sales_channels.sort_order);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/channels', requireAuth, async (req, res, next) => {
  try {
    const { name, slug, description, icon, sort_order } = req.body;
    if (!name) throw new AppError(400, 'Name is required');

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(sales_channels).values({
      id, name, slug, description, is_active: true, sort_order, icon,
      created_at: now, updated_at: now,
    });
    const row = await db.select().from(sales_channels).where(eq(sales_channels.id, id)).get();
    res.status(201).json({ data: row });
  } catch (err) {
    next(err);
  }
});

router.put('/channels/:id', requireAuth, async (req, res, next) => {
  try {
    const { name, slug, description, icon, sort_order, is_active } = req.body;
    const now = new Date().toISOString();
    await db.update(sales_channels).set({
      ...(name !== undefined && { name }),
      ...(slug !== undefined && { slug }),
      ...(description !== undefined && { description }),
      ...(icon !== undefined && { icon }),
      ...(sort_order !== undefined && { sort_order }),
      ...(is_active !== undefined && { is_active }),
      updated_at: now,
    }).where(eq(sales_channels.id, req.params.id));
    const row = await db.select().from(sales_channels).where(eq(sales_channels.id, req.params.id)).get();
    if (!row) throw new AppError(404, 'Channel not found');
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// PRICE LISTS
// ============================================================================

router.get('/price-lists', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(price_lists).orderBy(price_lists.name);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/price-lists', requireAuth, async (req, res, next) => {
  try {
    const { name, description, channel_id } = req.body;
    if (!name) throw new AppError(400, 'Name is required');

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(price_lists).values({
      id, name, description, channel_id, is_active: true,
      created_at: now, updated_at: now,
    });
    const row = await db.select().from(price_lists).where(eq(price_lists.id, id)).get();
    res.status(201).json({ data: row });
  } catch (err) {
    next(err);
  }
});

router.put('/price-lists/:id', requireAuth, async (req, res, next) => {
  try {
    const { name, description, channel_id, is_active } = req.body;
    const now = new Date().toISOString();
    await db.update(price_lists).set({
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(channel_id !== undefined && { channel_id }),
      ...(is_active !== undefined && { is_active }),
      updated_at: now,
    }).where(eq(price_lists.id, req.params.id));
    const row = await db.select().from(price_lists).where(eq(price_lists.id, req.params.id)).get();
    if (!row) throw new AppError(404, 'Price list not found');
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
});

router.get('/price-lists/:id/items', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(price_list_items)
      .where(eq(price_list_items.price_list_id, req.params.id));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/price-lists/:id/items', requireAuth, async (req, res, next) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) throw new AppError(400, 'items must be an array');

    await db.delete(price_list_items).where(eq(price_list_items.price_list_id, req.params.id));

    const now = new Date().toISOString();
    for (const item of items) {
      await db.insert(price_list_items).values({
        id: crypto.randomUUID(),
        price_list_id: req.params.id,
        menu_item_id: item.menu_item_id,
        price: item.price,
        created_at: now,
        updated_at: now,
      });
    }
    const rows = await db.select().from(price_list_items)
      .where(eq(price_list_items.price_list_id, req.params.id));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// BRANCH ITEM AVAILABILITY
// ============================================================================

router.get('/branches/:branchId/availability', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(branch_item_availability)
      .where(eq(branch_item_availability.branch_id, req.params.branchId));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.put('/branches/:branchId/availability/:id', requireAuth, async (req, res, next) => {
  try {
    const { available, available_salon, available_webapp, out_of_stock } = req.body;
    const now = new Date().toISOString();
    await db.update(branch_item_availability).set({
      ...(available !== undefined && { available }),
      ...(available_salon !== undefined && { available_salon }),
      ...(available_webapp !== undefined && { available_webapp }),
      ...(out_of_stock !== undefined && { out_of_stock }),
      updated_at: now,
    }).where(eq(branch_item_availability.id, req.params.id));
    const row = await db.select().from(branch_item_availability)
      .where(eq(branch_item_availability.id, req.params.id)).get();
    if (!row) throw new AppError(404, 'Availability record not found');
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// PRICE HISTORY
// ============================================================================

router.get('/items/:id/price-history', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(menu_item_price_history)
      .where(eq(menu_item_price_history.menu_item_id, req.params.id))
      .orderBy(desc(menu_item_price_history.created_at));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// RECALCULATE COSTS (TODO)
// ============================================================================

router.post('/recalculate-costs', requireAuth, async (_req, res, next) => {
  try {
    // TODO: iterate menu items → sum recipe ingredient costs → update menu_items.cost
    res.json({ message: 'Cost recalculation not yet implemented' });
  } catch (err) {
    next(err);
  }
});

export { router as menuRoutes };

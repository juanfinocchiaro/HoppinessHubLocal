/**
 * Fase 7 — Modifier unification service.
 *
 * API única para leer los modificadores de un item. Reemplaza la lectura
 * ad-hoc de `menu_item_option_groups` + `extra_assignments` + `removable_items`.
 *
 * El consumer (POS `ModifiersModal`, WebApp `ProductCustomizeSheet`, admin)
 * debería migrar a este service en un PR separado.
 */

import { db } from '../db/connection.js';
import * as schema from '../db/schema.js';
import { eq, inArray } from 'drizzle-orm';

export interface UnifiedModifierOption {
  id: string;
  type: 'supply' | 'recipe' | 'menu_item' | 'text_only';
  ref_id: string | null;
  display_name: string;
  price_delta: number;
  is_default_selected: boolean;
  sort_order: number | null;
}

export interface UnifiedModifierGroup {
  id: string;
  name: string;
  min_selected: number;
  max_selected: number | null;
  is_required: boolean;
  pricing_mode: 'individual' | 'group_average' | null;
  sort_order: number | null;
  options: UnifiedModifierOption[];
}

export async function getModifiersForItem(menuItemId: string): Promise<UnifiedModifierGroup[]> {
  const links = await db.select().from(schema.item_modifier_groups)
    .where(eq(schema.item_modifier_groups.menu_item_id, menuItemId));
  if (!links.length) return [];

  const groupIds = links.map((l) => l.modifier_group_id);
  const groups = await db.select().from(schema.modifier_groups)
    .where(inArray(schema.modifier_groups.id, groupIds));

  const mods = await db.select().from(schema.modifier_group_modifiers)
    .where(inArray(schema.modifier_group_modifiers.modifier_group_id, groupIds));

  const modsByGroup = new Map<string, Array<typeof schema.modifier_group_modifiers.$inferSelect>>();
  for (const m of mods) {
    const list = modsByGroup.get(m.modifier_group_id) ?? [];
    list.push(m);
    modsByGroup.set(m.modifier_group_id, list);
  }

  // Enriquecer display_name si es null usando el supply/recipe/menu_item original
  const supplyIds = mods.filter((m) => m.modifier_type === 'supply' && !m.display_name).map((m) => m.ref_id).filter(Boolean) as string[];
  const recipeIds = mods.filter((m) => m.modifier_type === 'recipe' && !m.display_name).map((m) => m.ref_id).filter(Boolean) as string[];
  const menuItemIds = mods.filter((m) => m.modifier_type === 'menu_item' && !m.display_name).map((m) => m.ref_id).filter(Boolean) as string[];

  const [supplyNames, recipeNames, menuItemNames] = await Promise.all([
    supplyIds.length ? db.select({ id: schema.supplies.id, name: schema.supplies.name })
      .from(schema.supplies).where(inArray(schema.supplies.id, supplyIds)) : Promise.resolve([]),
    recipeIds.length ? db.select({ id: schema.recipes.id, name: schema.recipes.name })
      .from(schema.recipes).where(inArray(schema.recipes.id, recipeIds)) : Promise.resolve([]),
    menuItemIds.length ? db.select({ id: schema.menu_items.id, name: schema.menu_items.name })
      .from(schema.menu_items).where(inArray(schema.menu_items.id, menuItemIds)) : Promise.resolve([]),
  ]);

  const nameMap = new Map<string, string>();
  for (const s of supplyNames) if (s.name) nameMap.set(s.id, s.name);
  for (const r of recipeNames) if (r.name) nameMap.set(r.id, r.name);
  for (const m of menuItemNames) if (m.name) nameMap.set(m.id, m.name);

  const result: UnifiedModifierGroup[] = [];
  for (const link of links.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))) {
    const group = groups.find((g) => g.id === link.modifier_group_id);
    if (!group) continue;
    const options = (modsByGroup.get(link.modifier_group_id) ?? [])
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map<UnifiedModifierOption>((m) => ({
        id: m.id,
        type: (m.modifier_type ?? 'text_only') as UnifiedModifierOption['type'],
        ref_id: m.ref_id ?? null,
        display_name: m.display_name ?? (m.ref_id ? nameMap.get(m.ref_id) ?? '' : ''),
        price_delta: m.price_delta ?? 0,
        is_default_selected: m.is_default_selected === true,
        sort_order: m.sort_order ?? null,
      }));
    result.push({
      id: group.id,
      name: group.name,
      min_selected: group.min_selected ?? 0,
      max_selected: group.max_selected ?? null,
      is_required: group.is_required === true,
      pricing_mode: (group.pricing_mode ?? null) as UnifiedModifierGroup['pricing_mode'],
      sort_order: link.sort_order ?? null,
      options,
    });
  }

  return result;
}

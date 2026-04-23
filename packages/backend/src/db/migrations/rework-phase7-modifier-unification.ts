/**
 * Rework Fase 7 — Modifier unification.
 *
 * Crea `modifier_groups`, `modifier_group_modifiers`, `item_modifier_groups`
 * y migra las 4 tablas legacy:
 *  - `menu_item_option_groups` + `menu_item_option_group_items`
 *    -> `modifier_groups` (uno por item) + `modifier_group_modifiers`
 *     + `item_modifier_groups`.
 *  - `extra_assignments` -> `modifier_group_modifiers` en un group auto
 *    creado por ítem con min=0, max=N.
 *  - `removable_items` -> modifiers con `is_default_selected=1` y
 *    `price_delta=0` (destildar = remover; patrón Toast).
 *  - `item_modifiers` (4ta tabla legacy) -> idem, pattern de "sin X".
 *
 * Legacy tables quedan intactas (shadow).
 *
 * Idempotente: usa INSERT OR IGNORE y verifica existencia antes de crear
 * groups auto-generated.
 */

import { sqlite } from '../connection.js';

function main() {
  console.log('Rework Phase 7 migration: modifier unification');

  console.log('[1/4] Creating new tables...');
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS modifier_groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      min_selected INTEGER NOT NULL DEFAULT 0,
      max_selected INTEGER,
      is_required INTEGER NOT NULL DEFAULT 0,
      pricing_mode TEXT,
      scope_type TEXT,
      scope_id TEXT,
      created_at TEXT,
      updated_at TEXT
    )
  `);
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS modifier_group_modifiers (
      id TEXT PRIMARY KEY,
      modifier_group_id TEXT NOT NULL,
      modifier_type TEXT NOT NULL,
      ref_id TEXT,
      display_name TEXT,
      price_delta REAL NOT NULL DEFAULT 0,
      is_default_selected INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER,
      created_at TEXT
    )
  `);
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS item_modifier_groups (
      id TEXT PRIMARY KEY,
      menu_item_id TEXT NOT NULL,
      modifier_group_id TEXT NOT NULL,
      sort_order INTEGER,
      UNIQUE(menu_item_id, modifier_group_id)
    )
  `);
  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_mgm_group ON modifier_group_modifiers (modifier_group_id)
  `);
  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_img_item ON item_modifier_groups (menu_item_id)
  `);
  console.log('  [ok]   tables + indexes ready');

  const now = new Date().toISOString();

  // Idempotencia: si ya corrimos la migración, no duplicar
  const alreadyMigrated = sqlite.prepare(`
    SELECT 1 FROM modifier_groups LIMIT 1
  `).get();
  if (alreadyMigrated) {
    console.log('  [skip] modifier_groups already has data, skipping backfill');
    console.log('Done.');
    return;
  }

  console.log('[2/4] Backfilling from menu_item_option_groups...');
  let optGroupsCount = 0;
  const optGroups = sqlite.prepare(`SELECT * FROM menu_item_option_groups`).all() as Array<{
    id: string; item_carta_id: string | null; name: string | null;
    sort_order: number | null; is_required: number | null; average_cost: number | null;
  }>;
  for (const og of optGroups) {
    if (!og.item_carta_id) continue;
    const newGroupId = crypto.randomUUID();
    sqlite.prepare(`
      INSERT INTO modifier_groups (id, name, min_selected, max_selected, is_required, pricing_mode, created_at, updated_at)
      VALUES (?, ?, 0, 1, ?, 'group_average', ?, ?)
    `).run(newGroupId, og.name ?? 'Opción', og.is_required ?? 0, now, now);

    const items = sqlite.prepare(`SELECT * FROM menu_item_option_group_items WHERE grupo_id = ?`).all(og.id) as Array<{
      id: string; grupo_id: string; insumo_id: string | null; preparacion_id: string | null;
      quantity: number | null; unit_cost: number | null;
    }>;
    for (const [idx, it] of items.entries()) {
      const refId = it.insumo_id ?? it.preparacion_id;
      const refType = it.insumo_id ? 'supply' : it.preparacion_id ? 'recipe' : 'text_only';
      sqlite.prepare(`
        INSERT INTO modifier_group_modifiers (id, modifier_group_id, modifier_type, ref_id, price_delta, is_default_selected, sort_order, created_at)
        VALUES (?, ?, ?, ?, ?, 0, ?, ?)
      `).run(crypto.randomUUID(), newGroupId, refType, refId, it.unit_cost ?? 0, idx, now);
    }

    sqlite.prepare(`
      INSERT OR IGNORE INTO item_modifier_groups (id, menu_item_id, modifier_group_id, sort_order)
      VALUES (?, ?, ?, ?)
    `).run(crypto.randomUUID(), og.item_carta_id, newGroupId, og.sort_order ?? 0);
    optGroupsCount += 1;
  }
  console.log(`  [ok]   ${optGroupsCount} option_groups migrated`);

  console.log('[3/4] Backfilling from extra_assignments...');
  let extrasCount = 0;
  const extras = sqlite.prepare(`
    SELECT ea.id, ea.item_carta_id, ea.extra_id,
           mi.name as extra_name, mi.base_price as extra_price
    FROM extra_assignments ea
    LEFT JOIN menu_items mi ON mi.id = ea.extra_id
    WHERE ea.item_carta_id IS NOT NULL
  `).all() as Array<{ id: string; item_carta_id: string; extra_id: string | null; extra_name: string | null; extra_price: number | null }>;
  // Un grupo "Extras" por item_carta_id
  const extrasGroupByItem = new Map<string, string>();
  for (const ex of extras) {
    if (!ex.extra_id) continue;
    let groupId = extrasGroupByItem.get(ex.item_carta_id);
    if (!groupId) {
      groupId = crypto.randomUUID();
      extrasGroupByItem.set(ex.item_carta_id, groupId);
      sqlite.prepare(`
        INSERT INTO modifier_groups (id, name, min_selected, max_selected, is_required, pricing_mode, created_at, updated_at)
        VALUES (?, 'Extras', 0, NULL, 0, 'individual', ?, ?)
      `).run(groupId, now, now);
      sqlite.prepare(`
        INSERT OR IGNORE INTO item_modifier_groups (id, menu_item_id, modifier_group_id, sort_order)
        VALUES (?, ?, ?, 100)
      `).run(crypto.randomUUID(), ex.item_carta_id, groupId);
    }
    sqlite.prepare(`
      INSERT INTO modifier_group_modifiers (id, modifier_group_id, modifier_type, ref_id, display_name, price_delta, is_default_selected, sort_order, created_at)
      VALUES (?, ?, 'menu_item', ?, ?, ?, 0, ?, ?)
    `).run(crypto.randomUUID(), groupId, ex.extra_id, ex.extra_name ?? null, ex.extra_price ?? 0, extrasCount, now);
    extrasCount += 1;
  }
  console.log(`  [ok]   ${extrasCount} extras migrated (${extrasGroupByItem.size} groups)`);

  console.log('[4/4] Backfilling from removable_items...');
  let removablesCount = 0;
  const removables = sqlite.prepare(`
    SELECT ri.id, ri.item_carta_id, ri.insumo_id, ri.preparacion_id, ri.display_name,
           COALESCE(s.name, r.name) as ref_name
    FROM removable_items ri
    LEFT JOIN supplies s ON s.id = ri.insumo_id
    LEFT JOIN recipes r ON r.id = ri.preparacion_id
    WHERE ri.is_active = 1 AND ri.item_carta_id IS NOT NULL
  `).all() as Array<{
    id: string; item_carta_id: string; insumo_id: string | null;
    preparacion_id: string | null; display_name: string | null; ref_name: string | null;
  }>;
  const removableGroupByItem = new Map<string, string>();
  for (const ri of removables) {
    let groupId = removableGroupByItem.get(ri.item_carta_id);
    if (!groupId) {
      groupId = crypto.randomUUID();
      removableGroupByItem.set(ri.item_carta_id, groupId);
      sqlite.prepare(`
        INSERT INTO modifier_groups (id, name, min_selected, max_selected, is_required, pricing_mode, created_at, updated_at)
        VALUES (?, 'Quitar', 0, NULL, 0, 'individual', ?, ?)
      `).run(groupId, now, now);
      sqlite.prepare(`
        INSERT OR IGNORE INTO item_modifier_groups (id, menu_item_id, modifier_group_id, sort_order)
        VALUES (?, ?, ?, 50)
      `).run(crypto.randomUUID(), ri.item_carta_id, groupId);
    }
    const refId = ri.insumo_id ?? ri.preparacion_id;
    const refType = ri.insumo_id ? 'supply' : ri.preparacion_id ? 'recipe' : 'text_only';
    sqlite.prepare(`
      INSERT INTO modifier_group_modifiers (id, modifier_group_id, modifier_type, ref_id, display_name, price_delta, is_default_selected, sort_order, created_at)
      VALUES (?, ?, ?, ?, ?, 0, 1, ?, ?)
    `).run(crypto.randomUUID(), groupId, refType, refId, ri.display_name ?? ri.ref_name ?? 'Ingrediente', removablesCount, now);
    removablesCount += 1;
  }
  console.log(`  [ok]   ${removablesCount} removables migrated (${removableGroupByItem.size} groups)`);

  const total = sqlite.prepare(`SELECT COUNT(*) as c FROM modifier_groups`).get() as { c: number };
  console.log(`[result] ${total.c} modifier_groups total`);
  console.log('Done.');
  // Nota: `item_modifiers` (4ta tabla legacy) no se migra automáticamente;
  // su estructura es heterogénea (type=extra/sin/substitucion). Script
  // custom para ese caso si aparece en producción.
}

main();

/**
 * Rework Fase 3 — Visibility unificada.
 *
 * Crea `entity_channel_visibility` y backfillea desde las 4 columnas
 * legacy:
 *  - `menu_categories.is_visible_menu` → visibility de category en canal webapp/mostrador.
 *  - `menu_items.available_delivery` → visibility de item en rappi/pedidos_ya/mp_delivery.
 *  - `menu_items.available_webapp` → visibility de item en webapp.
 *  - `price_list_items.is_visible` → visibility por item × canal (ya granular).
 *  - `promotions.show_in_webapp_section` → hint, no se migra (es display-only).
 *
 * Mantiene columnas legacy shadow por 1 release.
 * Idempotente.
 */

import { sqlite } from '../connection.js';

const CHANNELS = ['mostrador', 'webapp', 'rappi', 'pedidos_ya', 'mp_delivery'] as const;

function main() {
  console.log('Rework Phase 3 migration: entity_channel_visibility');

  console.log('[1/2] Creating table + indexes...');
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS entity_channel_visibility (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      channel_code TEXT NOT NULL,
      is_visible INTEGER NOT NULL DEFAULT 1,
      scope_type TEXT,
      scope_id TEXT,
      created_at TEXT,
      updated_at TEXT
    )
  `);
  sqlite.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_ecv_entity_channel_scope
      ON entity_channel_visibility (entity_type, entity_id, channel_code, COALESCE(scope_type, ''), COALESCE(scope_id, ''))
  `);
  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_ecv_channel
      ON entity_channel_visibility (channel_code)
  `);
  console.log('  [ok]   table + indexes ready');

  console.log('[2/2] Backfilling from legacy columns...');
  const now = new Date().toISOString();
  let inserted = 0;

  const insertStmt = sqlite.prepare(`
    INSERT OR IGNORE INTO entity_channel_visibility
      (id, entity_type, entity_id, channel_code, is_visible, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // 2.1 menu_categories.is_visible_menu → hidden en todos los canales si false
  const categories = sqlite
    .prepare(`SELECT id, is_visible_menu FROM menu_categories WHERE is_active = 1 AND is_visible_menu = 0`)
    .all() as Array<{ id: string; is_visible_menu: number | null }>;
  for (const cat of categories) {
    for (const ch of CHANNELS) {
      insertStmt.run(crypto.randomUUID(), 'menu_category', cat.id, ch, 0, now, now);
      inserted += 1;
    }
  }

  // 2.2 menu_items.available_delivery = false → hidden en rappi/py/mpd
  const deliveryOff = sqlite
    .prepare(`SELECT id FROM menu_items WHERE available_delivery = 0 AND deleted_at IS NULL`)
    .all() as Array<{ id: string }>;
  for (const item of deliveryOff) {
    for (const ch of ['rappi', 'pedidos_ya', 'mp_delivery']) {
      insertStmt.run(crypto.randomUUID(), 'menu_item', item.id, ch, 0, now, now);
      inserted += 1;
    }
  }

  // 2.3 menu_items.available_webapp = false → hidden en webapp
  const webappOff = sqlite
    .prepare(`SELECT id FROM menu_items WHERE available_webapp = 0 AND deleted_at IS NULL`)
    .all() as Array<{ id: string }>;
  for (const item of webappOff) {
    insertStmt.run(crypto.randomUUID(), 'menu_item', item.id, 'webapp', 0, now, now);
    inserted += 1;
  }

  // 2.4 price_list_items.is_visible = false → hidden en el canal de la lista
  const priceRows = sqlite
    .prepare(`
      SELECT pli.item_carta_id, pl.channel
      FROM price_list_items pli
      JOIN price_lists pl ON pl.id = pli.price_list_id
      WHERE pli.is_visible = 0 AND pli.item_carta_id IS NOT NULL AND pl.channel IS NOT NULL
    `)
    .all() as Array<{ item_carta_id: string; channel: string }>;
  for (const row of priceRows) {
    insertStmt.run(crypto.randomUUID(), 'menu_item', row.item_carta_id, row.channel, 0, now, now);
    inserted += 1;
  }

  console.log(`  [ok]   ${inserted} rows inserted (legacy columns preserved as shadow)`);
  console.log('Done.');
}

main();

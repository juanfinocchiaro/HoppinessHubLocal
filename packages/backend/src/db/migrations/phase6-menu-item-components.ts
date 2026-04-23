/**
 * Fase 6 — Combos como producto
 *
 * Crea la tabla `menu_item_components` para modelar la composición de un
 * combo (qué productos simples lo arman, en qué cantidad). Con esto los
 * combos dejan de ser "promos simuladas" y pasan a tener FC real.
 *
 * Idempotente.
 *
 * Ejecutar con: `npm run db:migrate:phase6 -w @hoppiness/backend`
 */

import { sqlite } from '../connection.js';

function main() {
  console.log('Phase 6 migration: menu_item_components');

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS menu_item_components (
      id TEXT PRIMARY KEY,
      combo_id TEXT NOT NULL,
      component_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      sort_order INTEGER,
      created_at TEXT,
      updated_at TEXT
    )
  `);
  sqlite.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_menu_item_components_unique
      ON menu_item_components (combo_id, component_id)
  `);
  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_menu_item_components_combo
      ON menu_item_components (combo_id)
  `);
  console.log('  [ok]   menu_item_components + indexes ready');
  console.log('Done.');
}

main();

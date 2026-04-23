/**
 * Fase 3 — Matriz ítem × canal extendida
 *
 * Extiende `price_list_items` con `is_visible`, `custom_name`,
 * `custom_image_url`, `custom_description` para soportar:
 *  - Artículos canal-exclusivos (ocultos en canales donde is_visible=false).
 *  - Overrides visuales por canal (nombre, foto, descripción propios).
 *
 * Backfill: `is_visible = 1` para todas las filas existentes (preserva
 * comportamiento actual donde todo lo que tiene fila en price_list_items
 * se vende).
 *
 * Idempotente: se puede correr múltiples veces.
 *
 * Ejecutar con: `npm run db:migrate:phase3 -w @hoppiness/backend`
 */

import { sqlite } from '../connection.js';

function columnExists(table: string, column: string): boolean {
  const rows = sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return rows.some((r) => r.name === column);
}

function addColumnIfMissing(table: string, column: string, definition: string) {
  if (columnExists(table, column)) {
    console.log(`  [skip] ${table}.${column} already exists`);
    return;
  }
  sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  console.log(`  [ok]   added ${table}.${column}`);
}

function main() {
  console.log('Phase 3 migration: price_list_items visibility + custom overrides');

  console.log('[1/2] Extending price_list_items table...');
  addColumnIfMissing('price_list_items', 'is_visible', 'INTEGER');
  addColumnIfMissing('price_list_items', 'custom_name', 'TEXT');
  addColumnIfMissing('price_list_items', 'custom_image_url', 'TEXT');
  addColumnIfMissing('price_list_items', 'custom_description', 'TEXT');

  console.log('[2/2] Backfilling is_visible=1 for existing rows...');
  const result = sqlite
    .prepare(`UPDATE price_list_items SET is_visible = 1 WHERE is_visible IS NULL`)
    .run();
  console.log(`  [ok]   ${result.changes} rows updated`);
  console.log('Done.');
}

main();

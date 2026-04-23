/**
 * Rework Fase 2 — Cost rollup engine audit table.
 *
 * Crea `cost_rollup_audit` para trazabilidad de cambios de costo. No mueve
 * datos; idempotente.
 */

import { sqlite } from '../connection.js';

function main() {
  console.log('Rework Phase 2 migration: cost_rollup_audit');
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS cost_rollup_audit (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      trigger TEXT NOT NULL,
      old_cost REAL,
      new_cost REAL NOT NULL,
      triggered_by TEXT,
      at TEXT NOT NULL
    )
  `);
  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_cost_rollup_audit_item_at
      ON cost_rollup_audit (item_id, at DESC)
  `);
  console.log('  [ok]   cost_rollup_audit + index');
  console.log('Done.');
}

main();

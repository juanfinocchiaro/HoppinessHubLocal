/**
 * Rework Fase 6 — Menu snapshot / Publish workflow.
 *
 * Crea `menu_snapshot`. Sin backfill: los snapshots se crean on-demand al
 * primer publish. Los canales sin snapshot caen al builder live (compat).
 */

import { sqlite } from '../connection.js';

function main() {
  console.log('Rework Phase 6 migration: menu_snapshot');
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS menu_snapshot (
      id TEXT PRIMARY KEY,
      scope_type TEXT NOT NULL,
      scope_id TEXT NOT NULL,
      channel_code TEXT NOT NULL,
      payload TEXT NOT NULL,
      item_count INTEGER,
      published_at TEXT NOT NULL,
      published_by TEXT,
      is_current INTEGER NOT NULL DEFAULT 1
    )
  `);
  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_menu_snapshot_current
      ON menu_snapshot (scope_type, scope_id, channel_code, is_current)
  `);
  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_menu_snapshot_published_at
      ON menu_snapshot (scope_type, scope_id, channel_code, published_at DESC)
  `);
  console.log('  [ok]   menu_snapshot + indexes ready');
  console.log('Done.');
}

main();

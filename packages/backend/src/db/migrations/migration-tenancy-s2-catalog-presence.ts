/**
 * Sprint 2 — Catalog presence model
 *
 * Applies the Square CatalogObject pattern to menu_items:
 *  - Adds `present_at_all_locations BOOLEAN DEFAULT TRUE` to `menu_items`.
 *  - Creates `product_location_presence` (exceptions table).
 *  - Backfills from `branch_item_availability`:
 *      * If a product is available in all locations → present_at_all_locations = TRUE (no rows needed).
 *      * If in some but not all → present_at_all_locations = FALSE + rows for each location it IS in.
 *      * If in none → present_at_all_locations = FALSE (no presence rows).
 *
 * Idempotent: safe to run multiple times.
 *
 * Run with: npm run db:migrate:tenancy-s2 -w @hoppiness/backend
 */

import { sqlite } from '../connection.js';

function tableExists(name: string): boolean {
  const row = sqlite
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
    .get(name);
  return !!row;
}

function columnExists(table: string, column: string): boolean {
  const rows = sqlite
    .prepare(`PRAGMA table_info(${table})`)
    .all() as Array<{ name: string }>;
  return rows.some((r) => r.name === column);
}

function addColumnIfMissing(table: string, column: string, definition: string) {
  if (columnExists(table, column)) {
    console.log(`  [skip] ${table}.${column} already exists`);
    return false;
  }
  sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  console.log(`  [ok]   added ${table}.${column}`);
  return true;
}

function main() {
  console.log('=== Sprint 2: Catalog presence migration ===');

  const run = sqlite.transaction(() => {
    // ── Step 1: Add present_at_all_locations to menu_items ──────────────────
    console.log('\n[1/3] Adding present_at_all_locations to menu_items...');
    addColumnIfMissing('menu_items', 'present_at_all_locations', 'INTEGER NOT NULL DEFAULT 1');

    // ── Step 2: Create product_location_presence ─────────────────────────────
    console.log('\n[2/3] Creating product_location_presence table...');
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS product_location_presence (
        product_id  TEXT NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
        location_id TEXT NOT NULL REFERENCES locations(id)  ON DELETE CASCADE,
        is_present  INTEGER NOT NULL,
        created_at  TEXT,
        PRIMARY KEY (product_id, location_id)
      )
    `);
    sqlite.exec(
      `CREATE INDEX IF NOT EXISTS idx_plp_product ON product_location_presence(product_id)`
    );
    sqlite.exec(
      `CREATE INDEX IF NOT EXISTS idx_plp_location ON product_location_presence(location_id)`
    );

    // ── Step 3: Backfill from branch_item_availability ───────────────────────
    console.log('\n[3/3] Backfilling from branch_item_availability...');

    if (!tableExists('branch_item_availability')) {
      console.log('  [skip] branch_item_availability table not found');
      return;
    }

    // Total active locations
    const totalLocations = (
      sqlite
        .prepare('SELECT COUNT(*) as cnt FROM locations WHERE is_active = 1')
        .get() as { cnt: number }
    ).cnt;

    if (totalLocations === 0) {
      console.log('  [skip] no active locations found');
      return;
    }

    // For each product, count how many locations have it available
    const productStats = sqlite
      .prepare(
        `SELECT
           item_carta_id AS product_id,
           COUNT(*) AS total_entries,
           SUM(CASE WHEN available = 1 THEN 1 ELSE 0 END) AS available_count
         FROM branch_item_availability
         GROUP BY item_carta_id`
      )
      .all() as Array<{
        product_id: string;
        total_entries: number;
        available_count: number;
      }>;

    let updatedAll = 0;
    let updatedSome = 0;

    const updatePresenceAll = sqlite.prepare(
      `UPDATE menu_items SET present_at_all_locations = ? WHERE id = ?`
    );
    const insertPresence = sqlite.prepare(
      `INSERT OR IGNORE INTO product_location_presence (product_id, location_id, is_present, created_at)
       SELECT ?, branch_id, 1, datetime('now')
       FROM branch_item_availability
       WHERE item_carta_id = ? AND available = 1`
    );

    for (const stat of productStats) {
      if (stat.available_count >= totalLocations) {
        // Available everywhere — set flag, no exceptions needed
        updatePresenceAll.run(1, stat.product_id);
        updatedAll++;
      } else {
        // Available only in some locations — flag false + insert presence rows
        updatePresenceAll.run(0, stat.product_id);
        insertPresence.run(stat.product_id, stat.product_id);
        updatedSome++;
      }
    }

    // Products NOT in branch_item_availability at all → stay present_at_all_locations=TRUE (default)
    console.log(
      `  [ok] ${updatedAll} products set to present_at_all_locations=TRUE`
    );
    console.log(
      `  [ok] ${updatedSome} products set to present_at_all_locations=FALSE with location exceptions`
    );

    // Verify
    const plpCount = (
      sqlite
        .prepare('SELECT COUNT(*) as cnt FROM product_location_presence')
        .get() as { cnt: number }
    ).cnt;
    console.log(`  [ok] product_location_presence: ${plpCount} exception row(s)`);
  });

  run();
  console.log('\n✓ Sprint 2 migration finished\n');
}

main();

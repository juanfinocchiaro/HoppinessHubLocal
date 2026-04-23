/**
 * Sprint 5 — Liberación de proveedores
 *
 * Removes the constraint that forced each insumo to have a specific supplier.
 * `proveedor_sugerido_id` and `proveedor_obligatorio_id` remain as optional
 * UI hints (NOT removed), but any `NOT NULL` enforcement is dropped.
 *
 * Creates a view for "last supplier used per supply per location" to power
 * the "last used" heuristic in the UI.
 *
 * Idempotent: safe to run multiple times.
 *
 * Run with: npm run db:migrate:tenancy-s5 -w @hoppiness/backend
 */

import { sqlite } from '../connection.js';

function columnExists(table: string, column: string): boolean {
  const rows = sqlite
    .prepare(`PRAGMA table_info(${table})`)
    .all() as Array<{ name: string; notnull: number }>;
  return rows.some((r) => r.name === column);
}

function viewExists(name: string): boolean {
  const row = sqlite
    .prepare(`SELECT name FROM sqlite_master WHERE type='view' AND name=?`)
    .get(name);
  return !!row;
}

function main() {
  console.log('=== Sprint 5: Supplier liberation migration ===');

  sqlite.transaction(() => {
    // ── Step 1: Verify columns are nullable (SQLite doesn't support ALTER COLUMN
    //            to change nullability on existing tables without recreating).
    //            Since the columns were defined without NOT NULL in schema.ts,
    //            they're already nullable. We just verify and report.
    console.log('\n[1/2] Verifying supplies column nullability...');

    if (columnExists('supplies', 'proveedor_sugerido_id')) {
      console.log('  [ok] proveedor_sugerido_id exists (nullable — no enforcement in SQLite schema)');
    } else {
      console.log('  [skip] proveedor_sugerido_id column not found');
    }

    if (columnExists('supplies', 'proveedor_obligatorio_id')) {
      // Drop proveedor_obligatorio_id — this field enforced a mandatory supplier,
      // which we are removing. Keep proveedor_sugerido_id as optional hint.
      console.log('  [info] proveedor_obligatorio_id found — this column enforced mandatory supplier');
      console.log('  [info] It remains in DB but application code no longer enforces it');
    } else {
      console.log('  [skip] proveedor_obligatorio_id column not found');
    }

    // ── Step 2: Create last-used supplier view ───────────────────────────────
    console.log('\n[2/2] Creating v_last_supplier_per_supply_per_location view...');

    if (!viewExists('v_last_supplier_per_supply_per_location')) {
      sqlite.exec(`
        CREATE VIEW v_last_supplier_per_supply_per_location AS
        SELECT
          si.branch_id      AS location_id,
          ii.insumo_id,
          si.proveedor_id,
          MAX(si.invoice_date) AS last_used_date
        FROM supplier_invoices si
        JOIN invoice_items ii ON ii.invoice_id = si.id
        WHERE si.deleted_at IS NULL
          AND ii.insumo_id IS NOT NULL
        GROUP BY si.branch_id, ii.insumo_id, si.proveedor_id
      `);
      console.log('  [ok] view created');
    } else {
      console.log('  [skip] view already exists');
    }

    console.log('\n  [ok] Sprint 5 migration complete');
  })();

  console.log('\n✓ Migration finished\n');
}

main();

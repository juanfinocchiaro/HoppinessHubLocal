/**
 * Sprint 1 — Schema foundations
 *
 * 1. Creates billing tables (accounts, plans, subscriptions, invoices,
 *    payment_events, subscription_addons, feature_flags, admin_actions)
 *    if they don't already exist.
 * 2. Seeds the canonical Hoppiness Club account.
 * 3. Renames `branches` → `locations` and adds `account_id` with backfill.
 * 4. Adds `account_id` to `suppliers` and drops the legacy `ambito` column.
 * 5. Adds `account_id` to `delivery_pricing_config`, `discount_codes`,
 *    `promotions` (keeping `brand_id` for backward compat).
 *
 * Idempotent: safe to run multiple times.
 *
 * Run with: npm run db:migrate:tenancy-s1 -w @hoppiness/backend
 */

import { sqlite } from '../connection.js';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

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
    return;
  }
  sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  console.log(`  [ok]   added ${table}.${column}`);
}

function dropColumnIfExists(table: string, column: string) {
  if (!columnExists(table, column)) {
    console.log(`  [skip] ${table}.${column} doesn't exist`);
    return;
  }
  sqlite.exec(`ALTER TABLE ${table} DROP COLUMN ${column}`);
  console.log(`  [ok]   dropped ${table}.${column}`);
}

// ──────────────────────────────────────────────────────────────────────────────
// Step 1 — Billing tables (additive, safe)
// ──────────────────────────────────────────────────────────────────────────────

function step1_billingTables() {
  console.log('\n[1/6] Creating billing tables...');

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id             TEXT PRIMARY KEY,
      name           TEXT NOT NULL,
      slug           TEXT NOT NULL UNIQUE,
      country_code   TEXT NOT NULL DEFAULT 'AR',
      currency_code  TEXT NOT NULL DEFAULT 'ARS',
      timezone       TEXT NOT NULL DEFAULT 'America/Argentina/Cordoba',
      business_type  TEXT,
      is_grandfathered INTEGER NOT NULL DEFAULT 0,
      billing_email  TEXT,
      created_at     TEXT NOT NULL,
      updated_at     TEXT NOT NULL
    )
  `);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS plans (
      id                    TEXT PRIMARY KEY,
      slug                  TEXT NOT NULL UNIQUE,
      name                  TEXT NOT NULL,
      description           TEXT,
      tier                  INTEGER NOT NULL,
      price_monthly_usd     REAL NOT NULL DEFAULT 0,
      price_yearly_usd      REAL NOT NULL DEFAULT 0,
      max_locations         INTEGER,
      features_json         TEXT NOT NULL DEFAULT '[]',
      mercadopago_plan_id_ars TEXT,
      is_active             INTEGER NOT NULL DEFAULT 1,
      created_at            TEXT NOT NULL,
      updated_at            TEXT NOT NULL
    )
  `);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id                         TEXT PRIMARY KEY,
      account_id                 TEXT NOT NULL UNIQUE REFERENCES accounts(id),
      plan_id                    TEXT NOT NULL REFERENCES plans(id),
      status                     TEXT NOT NULL DEFAULT 'trialing',
      mercadopago_preapproval_id TEXT,
      trial_ends_at              TEXT,
      current_period_start       TEXT,
      current_period_end         TEXT,
      billing_cycle              TEXT NOT NULL DEFAULT 'monthly',
      cancel_at_period_end       INTEGER NOT NULL DEFAULT 0,
      cancelled_at               TEXT,
      created_at                 TEXT NOT NULL,
      updated_at                 TEXT NOT NULL
    )
  `);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS invoices (
      id               TEXT PRIMARY KEY,
      subscription_id  TEXT NOT NULL REFERENCES subscriptions(id),
      account_id       TEXT NOT NULL REFERENCES accounts(id),
      amount_usd       REAL NOT NULL,
      amount_local     REAL,
      currency_local   TEXT,
      fx_rate          REAL,
      status           TEXT NOT NULL DEFAULT 'pending',
      mercadopago_payment_id TEXT,
      paid_at          TEXT,
      failed_at        TEXT,
      retry_count      INTEGER NOT NULL DEFAULT 0,
      afip_cae         TEXT,
      afip_invoice_number TEXT,
      period_start     TEXT,
      period_end       TEXT,
      created_at       TEXT NOT NULL
    )
  `);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS payment_events (
      id                       TEXT PRIMARY KEY,
      event_type               TEXT NOT NULL,
      mercadopago_resource_id  TEXT,
      subscription_id          TEXT REFERENCES subscriptions(id),
      account_id               TEXT REFERENCES accounts(id),
      payload_json             TEXT,
      processed_at             TEXT,
      created_at               TEXT NOT NULL
    )
  `);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS subscription_addons (
      id              TEXT PRIMARY KEY,
      subscription_id TEXT NOT NULL REFERENCES subscriptions(id),
      addon_slug      TEXT NOT NULL,
      price_usd       REAL NOT NULL DEFAULT 0,
      activated_at    TEXT NOT NULL,
      cancelled_at    TEXT
    )
  `);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS feature_flags (
      id           TEXT PRIMARY KEY,
      account_id   TEXT NOT NULL REFERENCES accounts(id),
      feature_slug TEXT NOT NULL,
      is_enabled   INTEGER NOT NULL DEFAULT 1,
      source       TEXT NOT NULL,
      created_at   TEXT NOT NULL,
      updated_at   TEXT NOT NULL
    )
  `);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS admin_actions (
      id                    TEXT PRIMARY KEY,
      admin_user_id         TEXT NOT NULL,
      target_account_id     TEXT REFERENCES accounts(id),
      action                TEXT NOT NULL,
      details_json          TEXT,
      impersonating_user_id TEXT,
      created_at            TEXT NOT NULL
    )
  `);

  console.log('  [ok] billing tables ready');
}

// ──────────────────────────────────────────────────────────────────────────────
// Step 2 — Seed Hoppiness Club account
// ──────────────────────────────────────────────────────────────────────────────

const HOPPINESS_ACCOUNT_ID = '00000000-0000-0000-0000-000000000001';

function step2_seedHoppiness() {
  console.log('\n[2/6] Seeding Hoppiness Club account...');
  const now = new Date().toISOString();
  const existing = sqlite
    .prepare('SELECT id FROM accounts WHERE id = ?')
    .get(HOPPINESS_ACCOUNT_ID);

  if (existing) {
    console.log('  [skip] Hoppiness account already exists');
    return;
  }

  sqlite
    .prepare(
      `INSERT INTO accounts (id, name, slug, business_type, is_grandfathered, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, ?, ?)`
    )
    .run(HOPPINESS_ACCOUNT_ID, 'Hoppiness Club', 'hoppiness', 'burger', now, now);

  console.log(`  [ok] inserted Hoppiness Club (id=${HOPPINESS_ACCOUNT_ID})`);
}

// ──────────────────────────────────────────────────────────────────────────────
// Step 3 — Rename branches → locations, add account_id
// ──────────────────────────────────────────────────────────────────────────────

function step3_renameBranchesToLocations() {
  console.log('\n[3/6] Renaming branches → locations...');

  // If `locations` already exists, the rename was already done.
  if (tableExists('locations')) {
    console.log('  [skip] locations table already exists');
  } else if (tableExists('branches')) {
    sqlite.exec('ALTER TABLE branches RENAME TO locations');
    console.log('  [ok] renamed branches → locations');
  } else {
    console.log('  [warn] neither branches nor locations table found');
  }

  // Ensure account_id exists
  addColumnIfMissing('locations', 'account_id', 'TEXT REFERENCES accounts(id)');

  // Backfill account_id for existing rows
  const nullCount = (
    sqlite
      .prepare('SELECT COUNT(*) as cnt FROM locations WHERE account_id IS NULL')
      .get() as { cnt: number }
  ).cnt;

  if (nullCount > 0) {
    sqlite
      .prepare('UPDATE locations SET account_id = ? WHERE account_id IS NULL')
      .run(HOPPINESS_ACCOUNT_ID);
    console.log(`  [ok] backfilled account_id for ${nullCount} locations`);
  } else {
    console.log('  [skip] all locations already have account_id');
  }

  // Create index
  sqlite.exec(
    `CREATE INDEX IF NOT EXISTS idx_locations_account ON locations(account_id)`
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Step 4 — suppliers: add account_id, drop ambito
// ──────────────────────────────────────────────────────────────────────────────

function step4_updateSuppliers() {
  console.log('\n[4/6] Updating suppliers table...');

  addColumnIfMissing('suppliers', 'account_id', 'TEXT REFERENCES accounts(id)');

  // Backfill account_id: use branch's account_id when branch_id is set,
  // otherwise fall back to Hoppiness (= brand-level suppliers).
  const nullCount = (
    sqlite
      .prepare('SELECT COUNT(*) as cnt FROM suppliers WHERE account_id IS NULL')
      .get() as { cnt: number }
  ).cnt;

  if (nullCount > 0) {
    // Branch-scoped suppliers → inherit account from their location
    sqlite.exec(`
      UPDATE suppliers
      SET account_id = (
        SELECT loc.account_id FROM locations loc WHERE loc.id = suppliers.branch_id
      )
      WHERE account_id IS NULL AND branch_id IS NOT NULL
    `);
    // Brand-level suppliers (ambito='marca') or NULL branch → Hoppiness account
    sqlite
      .prepare(
        'UPDATE suppliers SET account_id = ? WHERE account_id IS NULL'
      )
      .run(HOPPINESS_ACCOUNT_ID);
    console.log(`  [ok] backfilled account_id for ${nullCount} suppliers`);
  } else {
    console.log('  [skip] all suppliers already have account_id');
  }

  dropColumnIfExists('suppliers', 'ambito');

  sqlite.exec(
    `CREATE INDEX IF NOT EXISTS idx_suppliers_account ON suppliers(account_id)`
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Step 5 — delivery_pricing_config, discount_codes, promotions: add account_id
// ──────────────────────────────────────────────────────────────────────────────

function step5_addAccountIdToAccountTables() {
  console.log('\n[5/6] Adding account_id to delivery_pricing_config, discount_codes, promotions...');

  for (const table of ['delivery_pricing_config', 'discount_codes', 'promotions']) {
    addColumnIfMissing(table, 'account_id', 'TEXT REFERENCES accounts(id)');

    const nullCount = (
      sqlite
        .prepare(`SELECT COUNT(*) as cnt FROM ${table} WHERE account_id IS NULL`)
        .get() as { cnt: number }
    ).cnt;

    if (nullCount > 0) {
      sqlite
        .prepare(`UPDATE ${table} SET account_id = ? WHERE account_id IS NULL`)
        .run(HOPPINESS_ACCOUNT_ID);
      console.log(`  [ok] backfilled account_id for ${nullCount} rows in ${table}`);
    } else {
      console.log(`  [skip] ${table}: all rows already have account_id`);
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Step 6 — Verify
// ──────────────────────────────────────────────────────────────────────────────

function step6_verify() {
  console.log('\n[6/6] Verification...');

  const accountCount = (
    sqlite.prepare('SELECT COUNT(*) as cnt FROM accounts').get() as { cnt: number }
  ).cnt;
  console.log(`  accounts: ${accountCount} row(s)`);

  const locationCount = (
    sqlite.prepare('SELECT COUNT(*) as cnt FROM locations').get() as { cnt: number }
  ).cnt;
  console.log(`  locations: ${locationCount} row(s)`);

  const locWithoutAccount = (
    sqlite
      .prepare('SELECT COUNT(*) as cnt FROM locations WHERE account_id IS NULL')
      .get() as { cnt: number }
  ).cnt;
  if (locWithoutAccount > 0) {
    console.warn(`  [warn] ${locWithoutAccount} locations without account_id`);
  }

  const suppliersWithAmbito = columnExists('suppliers', 'ambito')
    ? (sqlite.prepare('SELECT COUNT(*) as cnt FROM suppliers WHERE ambito IS NOT NULL').get() as { cnt: number }).cnt
    : 0;
  if (suppliersWithAmbito > 0) {
    console.warn(`  [warn] suppliers still have ambito data (column may need manual review)`);
  }

  console.log('  [ok] Sprint 1 migration complete');
}

// ──────────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────────

function main() {
  console.log('=== Sprint 1: Tenancy foundations migration ===');
  console.log(`Database: ${process.env.DB_PATH ?? 'hoppiness.db'}`);

  const run = sqlite.transaction(() => {
    step1_billingTables();
    step2_seedHoppiness();
    step3_renameBranchesToLocations();
    step4_updateSuppliers();
    step5_addAccountIdToAccountTables();
    step6_verify();
  });

  run();
  console.log('\n✓ Migration finished successfully\n');
}

main();

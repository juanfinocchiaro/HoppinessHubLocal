/**
 * Sprint 0 — Tenancy Foundation for Billing
 *
 * Creates the `accounts` table as the root tenant entity for the SaaS billing system.
 * Adds `account_id` FK to `branches` (nullable to avoid breaking existing data).
 * Seeds the Hoppiness Club account and assigns all existing branches to it.
 * Inserts the `restostack_admin` role into the roles table.
 *
 * Idempotent: safe to run multiple times.
 */

import { sqlite } from '../connection.js';
import { randomUUID } from 'crypto';

function main() {
  console.log('Sprint 0 — Tenancy Foundation migration');

  console.log('[1/4] Creating accounts table...');
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      country_code TEXT NOT NULL DEFAULT 'AR',
      currency_code TEXT NOT NULL DEFAULT 'ARS',
      timezone TEXT NOT NULL DEFAULT 'America/Argentina/Cordoba',
      business_type TEXT,
      is_grandfathered INTEGER NOT NULL DEFAULT 0,
      billing_email TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  console.log('  [ok]   accounts table ready');

  console.log('[2/4] Adding account_id to branches...');
  const branchCols = sqlite.prepare(`PRAGMA table_info(branches)`).all() as Array<{ name: string }>;
  const hasAccountId = branchCols.some(c => c.name === 'account_id');
  if (!hasAccountId) {
    sqlite.exec(`ALTER TABLE branches ADD COLUMN account_id TEXT REFERENCES accounts(id)`);
    console.log('  [ok]   account_id column added to branches');
  } else {
    console.log('  [skip] account_id already exists in branches');
  }

  console.log('[3/4] Seeding Hoppiness Club account...');
  const HOPPINESS_ACCOUNT_ID = '00000000-0000-0000-0000-000000000001';
  const existing = sqlite.prepare(`SELECT id FROM accounts WHERE id = ?`).get(HOPPINESS_ACCOUNT_ID);
  const now = new Date().toISOString();

  if (!existing) {
    sqlite.prepare(`
      INSERT INTO accounts (id, name, slug, country_code, currency_code, timezone, business_type, is_grandfathered, billing_email, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      HOPPINESS_ACCOUNT_ID,
      'Hoppiness Club',
      'hoppiness-club',
      'AR',
      'ARS',
      'America/Argentina/Cordoba',
      'burger',
      1,
      'admin@hoppiness.com.ar',
      now,
      now
    );
    console.log('  [ok]   Hoppiness Club account created');
  } else {
    console.log('  [skip] Hoppiness Club account already exists');
  }

  const unassigned = sqlite.prepare(`SELECT COUNT(*) as c FROM branches WHERE account_id IS NULL`).get() as { c: number };
  if (unassigned.c > 0) {
    sqlite.prepare(`UPDATE branches SET account_id = ? WHERE account_id IS NULL`).run(HOPPINESS_ACCOUNT_ID);
    console.log(`  [ok]   ${unassigned.c} branches assigned to Hoppiness Club`);
  } else {
    console.log('  [skip] all branches already assigned');
  }

  console.log('[4/4] Inserting restostack_admin role...');
  const roleExists = sqlite.prepare(`SELECT id FROM roles WHERE key = 'restostack_admin'`).get();
  if (!roleExists) {
    sqlite.prepare(`
      INSERT INTO roles (id, key, display_name, scope, hierarchy_level, is_system, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(randomUUID(), 'restostack_admin', 'RestoStack Admin', 'system', 0, 1, now);
    console.log('  [ok]   restostack_admin role created');
  } else {
    console.log('  [skip] restostack_admin role already exists');
  }

  console.log('Done. Sprint 0 migration complete.');
}

main();

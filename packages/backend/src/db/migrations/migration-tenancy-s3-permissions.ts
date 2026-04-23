/**
 * Sprint 3 — Capability-based permissions
 *
 * 1. Creates `user_location_access` (per-location write capabilities).
 * 2. Creates `user_account_access` (per-account aggregate/read capabilities).
 * 3. Migrates existing `user_role_assignments` → new tables using role→capability map.
 *
 * Role → capability mapping:
 *   superadmin        → ALL location + ALL account capabilities
 *   coordinador       → ALL location caps + account: view_aggregate_sales, manage_account_catalog
 *   contador_marca    → account: view_aggregate_finance
 *   informes          → account: view_aggregate_sales
 *   franquiciado      → location: ALL caps (own branch only)
 *   encargado         → location: operate_pos, manage_staff, manage_inventory,
 *                        manage_catalog_local, manage_promotions (own branch only)
 *   contador_local    → location: view_finance (own branch only)
 *   cajero            → location: operate_pos (own branch only)
 *   empleado          → location: operate_pos (own branch only, minimal)
 *
 * Idempotent: skips rows that already exist.
 *
 * Run with: npm run db:migrate:tenancy-s3 -w @hoppiness/backend
 */

import { sqlite } from '../connection.js';

function tableExists(name: string): boolean {
  const row = sqlite
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
    .get(name);
  return !!row;
}

const HOPPINESS_ACCOUNT_ID = '00000000-0000-0000-0000-000000000001';

const ALL_LOCATION_CAPS = JSON.stringify([
  'operate_pos',
  'manage_staff',
  'manage_inventory',
  'manage_catalog_local',
  'view_finance',
  'manage_finance',
  'manage_promotions',
]);

const ALL_ACCOUNT_CAPS = JSON.stringify([
  'view_aggregate_sales',
  'view_aggregate_finance',
  'manage_account_catalog',
  'manage_account_users',
  'manage_account_settings',
]);

const ROLE_LOCATION_CAPS: Record<string, string[]> = {
  superadmin: JSON.parse(ALL_LOCATION_CAPS),
  admin: JSON.parse(ALL_LOCATION_CAPS),
  coordinador: JSON.parse(ALL_LOCATION_CAPS),
  franquiciado: JSON.parse(ALL_LOCATION_CAPS),
  encargado: [
    'operate_pos',
    'manage_staff',
    'manage_inventory',
    'manage_catalog_local',
    'manage_promotions',
  ],
  contador_local: ['view_finance'],
  cajero: ['operate_pos'],
  empleado: ['operate_pos'],
};

const ROLE_ACCOUNT_CAPS: Record<string, string[]> = {
  superadmin: JSON.parse(ALL_ACCOUNT_CAPS),
  admin: JSON.parse(ALL_ACCOUNT_CAPS),
  coordinador: ['view_aggregate_sales', 'manage_account_catalog'],
  contador_marca: ['view_aggregate_finance'],
  informes: ['view_aggregate_sales'],
};

function main() {
  console.log('=== Sprint 3: Capability-based permissions migration ===');

  const run = sqlite.transaction(() => {
    // ── Step 1: Create tables ────────────────────────────────────────────────
    console.log('\n[1/3] Creating user_location_access and user_account_access...');

    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS user_location_access (
        id          TEXT PRIMARY KEY,
        user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
        capabilities TEXT NOT NULL DEFAULT '[]',
        created_at  TEXT,
        updated_at  TEXT,
        UNIQUE (user_id, location_id)
      )
    `);
    sqlite.exec(
      `CREATE INDEX IF NOT EXISTS idx_ula_user ON user_location_access(user_id)`
    );

    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS user_account_access (
        id          TEXT PRIMARY KEY,
        user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        account_id  TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        capabilities TEXT NOT NULL DEFAULT '[]',
        created_at  TEXT,
        updated_at  TEXT,
        UNIQUE (user_id, account_id)
      )
    `);
    sqlite.exec(
      `CREATE INDEX IF NOT EXISTS idx_uaa_user ON user_account_access(user_id)`
    );

    console.log('  [ok] tables ready');

    // ── Step 2: Migrate from user_role_assignments ───────────────────────────
    console.log('\n[2/3] Migrating user_role_assignments...');

    if (!tableExists('user_role_assignments') || !tableExists('roles')) {
      console.log('  [skip] user_role_assignments or roles table not found');
    } else {
      const assignments = sqlite
        .prepare(
          `SELECT ura.user_id, ura.branch_id, r.key AS role_key, r.scope
           FROM user_role_assignments ura
           JOIN roles r ON r.id = ura.role_id
           WHERE ura.is_active = 1`
        )
        .all() as Array<{
          user_id: string;
          branch_id: string | null;
          role_key: string;
          scope: string;
        }>;

      const now = new Date().toISOString();
      let insertedLocation = 0;
      let insertedAccount = 0;

      const upsertLocation = sqlite.prepare(`
        INSERT OR IGNORE INTO user_location_access (id, user_id, location_id, capabilities, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const upsertAccount = sqlite.prepare(`
        INSERT OR IGNORE INTO user_account_access (id, user_id, account_id, capabilities, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const a of assignments) {
        const roleKey = a.role_key?.toLowerCase().replace(/-/g, '_');

        // Location-level (branch-scoped) assignment
        if (a.scope === 'branch' && a.branch_id) {
          const caps = ROLE_LOCATION_CAPS[roleKey];
          if (caps?.length) {
            upsertLocation.run(
              crypto.randomUUID(),
              a.user_id,
              a.branch_id,
              JSON.stringify(caps),
              now,
              now
            );
            insertedLocation++;
          }
        }

        // Account-level assignment (brand scope or superadmin across all locations)
        if (a.scope === 'brand') {
          const accountCaps = ROLE_ACCOUNT_CAPS[roleKey];
          if (accountCaps?.length) {
            upsertAccount.run(
              crypto.randomUUID(),
              a.user_id,
              HOPPINESS_ACCOUNT_ID,
              JSON.stringify(accountCaps),
              now,
              now
            );
            insertedAccount++;
          }

          // Superadmin/coordinador also get location caps for ALL locations
          const locationCaps = ROLE_LOCATION_CAPS[roleKey];
          if (locationCaps?.length) {
            const allLocations = sqlite
              .prepare(
                'SELECT id FROM locations WHERE account_id = ? AND is_active = 1'
              )
              .all(HOPPINESS_ACCOUNT_ID) as Array<{ id: string }>;

            for (const loc of allLocations) {
              upsertLocation.run(
                crypto.randomUUID(),
                a.user_id,
                loc.id,
                JSON.stringify(locationCaps),
                now,
                now
              );
              insertedLocation++;
            }
          }
        }
      }

      console.log(`  [ok] inserted ${insertedLocation} user_location_access rows`);
      console.log(`  [ok] inserted ${insertedAccount} user_account_access rows`);
    }

    // ── Step 3: Verify ───────────────────────────────────────────────────────
    console.log('\n[3/3] Verification...');
    const ulaCount = (
      sqlite.prepare('SELECT COUNT(*) as cnt FROM user_location_access').get() as { cnt: number }
    ).cnt;
    const uaaCount = (
      sqlite.prepare('SELECT COUNT(*) as cnt FROM user_account_access').get() as { cnt: number }
    ).cnt;
    console.log(`  user_location_access: ${ulaCount} row(s)`);
    console.log(`  user_account_access: ${uaaCount} row(s)`);
    console.log('  [ok] Sprint 3 migration complete');
  });

  run();
  console.log('\n✓ Migration finished successfully\n');
}

main();

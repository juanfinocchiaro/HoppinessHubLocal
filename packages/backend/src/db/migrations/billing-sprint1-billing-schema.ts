/**
 * Sprint 1 — Billing Schema
 *
 * Creates all billing tables:
 *   plans, subscriptions, invoices, payment_events,
 *   subscription_addons, feature_flags, admin_actions
 *
 * Seeds the 4 initial plans (Starter, Pro, Chain, Enterprise).
 * Seeds Hoppiness Club with a grandfathered Chain subscription.
 * Creates a SQLite trigger to sync feature_flags when plan_id changes.
 *
 * Idempotent: uses CREATE TABLE IF NOT EXISTS and INSERT OR IGNORE.
 */

import { sqlite } from '../connection.js';
import { randomUUID } from 'crypto';

const HOPPINESS_ACCOUNT_ID = '00000000-0000-0000-0000-000000000001';

const PLAN_FEATURES: Record<string, string[]> = {
  starter: [
    'pos_basic', 'webapp_orders', 'afip_invoicing', 'basic_reports',
    'cash_management', 'single_location',
  ],
  pro: [
    'pos_basic', 'webapp_orders', 'afip_invoicing', 'basic_reports',
    'cash_management', 'multi_location', 'modifier_groups', 'cost_tracking',
    'multi_channel', 'promotions', 'staff_management', 'advanced_reports',
  ],
  chain: [
    'pos_basic', 'webapp_orders', 'afip_invoicing', 'basic_reports',
    'cash_management', 'multi_location', 'modifier_groups', 'cost_tracking',
    'multi_channel', 'promotions', 'staff_management', 'advanced_reports',
    'aggregate_dashboard', 'api_access', 'priority_support', 'custom_branding',
    'unlimited_locations',
  ],
  enterprise: ['all'],
};

function main() {
  console.log('Sprint 1 — Billing Schema migration');
  const now = new Date().toISOString();

  // ── 1. plans ─────────────────────────────────────────────────────────────
  console.log('[1/7] Creating plans table...');
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      tier INTEGER NOT NULL,
      price_monthly_usd REAL NOT NULL DEFAULT 0,
      price_yearly_usd REAL NOT NULL DEFAULT 0,
      max_locations INTEGER,
      features_json TEXT NOT NULL DEFAULT '[]',
      mercadopago_plan_id_ars TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  console.log('  [ok]   plans table ready');

  // ── 2. subscriptions ─────────────────────────────────────────────────────
  console.log('[2/7] Creating subscriptions table...');
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL UNIQUE REFERENCES accounts(id) ON DELETE CASCADE,
      plan_id TEXT NOT NULL REFERENCES plans(id),
      status TEXT NOT NULL DEFAULT 'trialing'
        CHECK (status IN ('trialing','active','past_due','read_only','suspended','cancelled')),
      mercadopago_preapproval_id TEXT,
      trial_ends_at TEXT,
      current_period_start TEXT,
      current_period_end TEXT,
      billing_cycle TEXT NOT NULL DEFAULT 'monthly'
        CHECK (billing_cycle IN ('monthly','yearly')),
      cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
      cancelled_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_subscriptions_account ON subscriptions(account_id)`);
  sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status)`);
  sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_subscriptions_mp ON subscriptions(mercadopago_preapproval_id)`);
  console.log('  [ok]   subscriptions table ready');

  // ── 3. billing_invoices ───────────────────────────────────────────────────
  console.log('[3/7] Creating billing_invoices table...');
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS billing_invoices (
      id TEXT PRIMARY KEY,
      subscription_id TEXT NOT NULL REFERENCES subscriptions(id),
      account_id TEXT NOT NULL REFERENCES accounts(id),
      amount_usd REAL NOT NULL,
      amount_local REAL,
      currency_local TEXT,
      fx_rate REAL,
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','paid','failed','refunded')),
      mercadopago_payment_id TEXT,
      paid_at TEXT,
      failed_at TEXT,
      retry_count INTEGER NOT NULL DEFAULT 0,
      afip_cae TEXT,
      afip_invoice_number TEXT,
      period_start TEXT,
      period_end TEXT,
      created_at TEXT NOT NULL
    )
  `);
  sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_billing_invoices_subscription ON billing_invoices(subscription_id)`);
  sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_billing_invoices_status ON billing_invoices(status)`);
  sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_billing_invoices_mp ON billing_invoices(mercadopago_payment_id)`);
  console.log('  [ok]   billing_invoices table ready');

  // ── 4. billing_payment_events ─────────────────────────────────────────────
  console.log('[4/7] Creating billing_payment_events table...');
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS billing_payment_events (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      mercadopago_resource_id TEXT,
      subscription_id TEXT REFERENCES subscriptions(id),
      account_id TEXT REFERENCES accounts(id),
      payload_json TEXT,
      processed_at TEXT,
      created_at TEXT NOT NULL,
      UNIQUE(event_type, mercadopago_resource_id)
    )
  `);
  console.log('  [ok]   billing_payment_events table ready');

  // ── 5. subscription_addons ───────────────────────────────────────────────
  console.log('[5/7] Creating subscription_addons and feature_flags tables...');
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS subscription_addons (
      id TEXT PRIMARY KEY,
      subscription_id TEXT NOT NULL REFERENCES subscriptions(id),
      addon_slug TEXT NOT NULL,
      price_usd REAL NOT NULL DEFAULT 0,
      activated_at TEXT NOT NULL,
      cancelled_at TEXT
    )
  `);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS feature_flags (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      feature_slug TEXT NOT NULL,
      is_enabled INTEGER NOT NULL DEFAULT 1,
      source TEXT NOT NULL CHECK (source IN ('plan','addon','manual_override')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(account_id, feature_slug)
    )
  `);
  sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_feature_flags_account ON feature_flags(account_id)`);
  console.log('  [ok]   subscription_addons and feature_flags tables ready');

  // ── 6. admin_actions (audit log for admin panel) ─────────────────────────
  console.log('[6/7] Creating admin_actions table...');
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS admin_actions (
      id TEXT PRIMARY KEY,
      admin_user_id TEXT NOT NULL,
      target_account_id TEXT REFERENCES accounts(id),
      action TEXT NOT NULL,
      details_json TEXT,
      impersonating_user_id TEXT,
      created_at TEXT NOT NULL
    )
  `);
  sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_admin_actions_account ON admin_actions(target_account_id)`);
  console.log('  [ok]   admin_actions table ready');

  // ── 7. Trigger: sync feature_flags when plan_id changes ──────────────────
  sqlite.exec(`DROP TRIGGER IF EXISTS trg_sync_features_on_plan_change`);
  sqlite.exec(`
    CREATE TRIGGER trg_sync_features_on_plan_change
    AFTER UPDATE OF plan_id ON subscriptions
    FOR EACH ROW
    WHEN OLD.plan_id IS NOT NEW.plan_id
    BEGIN
      DELETE FROM feature_flags WHERE account_id = NEW.account_id AND source = 'plan';
    END
  `);
  console.log('  [ok]   trigger trg_sync_features_on_plan_change ready');

  // ── Seed plans ─────────────────────────────────────────────────────────────
  console.log('[seed] Seeding 4 plans...');
  const plans = [
    {
      id: randomUUID(),
      slug: 'starter',
      name: 'Starter',
      description: 'Para restaurantes de 1 local que quieren empezar a operar',
      tier: 1,
      price_monthly_usd: 30,
      price_yearly_usd: 324,
      max_locations: 1,
    },
    {
      id: randomUUID(),
      slug: 'pro',
      name: 'Pro',
      description: 'Para restaurantes que quieren optimizar su operación',
      tier: 2,
      price_monthly_usd: 70,
      price_yearly_usd: 756,
      max_locations: 3,
    },
    {
      id: randomUUID(),
      slug: 'chain',
      name: 'Chain',
      description: 'Para chains de varios locales con dashboard consolidado',
      tier: 3,
      price_monthly_usd: 180,
      price_yearly_usd: 1944,
      max_locations: null,
    },
    {
      id: randomUUID(),
      slug: 'enterprise',
      name: 'Enterprise',
      description: 'Custom — para holdings y franquicias grandes',
      tier: 4,
      price_monthly_usd: 0,
      price_yearly_usd: 0,
      max_locations: null,
    },
  ];

  const insertPlan = sqlite.prepare(`
    INSERT OR IGNORE INTO plans
      (id, slug, name, description, tier, price_monthly_usd, price_yearly_usd,
       max_locations, features_json, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);

  for (const p of plans) {
    const features = PLAN_FEATURES[p.slug] ?? [];
    insertPlan.run(
      p.id, p.slug, p.name, p.description, p.tier,
      p.price_monthly_usd, p.price_yearly_usd,
      p.max_locations,
      JSON.stringify(features),
      now, now
    );
  }
  console.log('  [ok]   4 plans seeded');

  // ── Seed Hoppiness grandfathered subscription ─────────────────────────────
  const chainPlan = sqlite.prepare(`SELECT id FROM plans WHERE slug = 'chain'`).get() as { id: string } | undefined;
  if (!chainPlan) {
    console.warn('  [warn] chain plan not found, skipping Hoppiness subscription seed');
  } else {
    const existingSub = sqlite.prepare(`SELECT id FROM subscriptions WHERE account_id = ?`).get(HOPPINESS_ACCOUNT_ID);
    if (!existingSub) {
      sqlite.prepare(`
        INSERT INTO subscriptions
          (id, account_id, plan_id, status, billing_cycle, created_at, updated_at)
        VALUES (?, ?, ?, 'active', 'monthly', ?, ?)
      `).run(randomUUID(), HOPPINESS_ACCOUNT_ID, chainPlan.id, now, now);
      console.log('  [ok]   Hoppiness Club subscription seeded (grandfathered chain)');
    } else {
      console.log('  [skip] Hoppiness subscription already exists');
    }

    // Seed feature flags for Hoppiness from chain plan
    const existingFlags = sqlite.prepare(`SELECT COUNT(*) as c FROM feature_flags WHERE account_id = ?`).get(HOPPINESS_ACCOUNT_ID) as { c: number };
    if (existingFlags.c === 0) {
      const chainFeatures = PLAN_FEATURES['chain'];
      const insertFlag = sqlite.prepare(`
        INSERT OR IGNORE INTO feature_flags (id, account_id, feature_slug, is_enabled, source, created_at, updated_at)
        VALUES (?, ?, ?, 1, 'plan', ?, ?)
      `);
      for (const slug of chainFeatures) {
        insertFlag.run(randomUUID(), HOPPINESS_ACCOUNT_ID, slug, now, now);
      }
      console.log(`  [ok]   ${chainFeatures.length} feature flags seeded for Hoppiness`);
    } else {
      console.log('  [skip] feature flags already seeded for Hoppiness');
    }
  }

  console.log('Done. Sprint 1 migration complete.');
}

main();

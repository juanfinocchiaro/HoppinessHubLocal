import { db, sqlite } from '../db/connection.js';
import { accounts, plans, subscriptions, feature_flags, admin_actions } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';

// ── Types ─────────────────────────────────────────────────────────────────────

export type SubscriptionStatus =
  | 'trialing' | 'active' | 'past_due' | 'read_only' | 'suspended' | 'cancelled';

export type BillingCycle = 'monthly' | 'yearly';

export type InvoiceStatus = 'pending' | 'paid' | 'failed' | 'refunded';

// ── Subscription resolution ───────────────────────────────────────────────────

export async function getSubscriptionByAccountId(accountId: string) {
  const rows = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.account_id, accountId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getPlanById(planId: string) {
  const rows = await db.select().from(plans).where(eq(plans.id, planId)).limit(1);
  return rows[0] ?? null;
}

export async function getActivePlans() {
  return db.select().from(plans).where(eq(plans.is_active, true));
}

// ── Feature flags ─────────────────────────────────────────────────────────────

export async function getFeaturesForAccount(accountId: string) {
  return db
    .select()
    .from(feature_flags)
    .where(and(eq(feature_flags.account_id, accountId), eq(feature_flags.is_enabled, true)));
}

export async function isFeatureEnabled(accountId: string, featureSlug: string): Promise<boolean> {
  const rows = await db
    .select({ is_enabled: feature_flags.is_enabled })
    .from(feature_flags)
    .where(
      and(
        eq(feature_flags.account_id, accountId),
        eq(feature_flags.feature_slug, featureSlug),
      )
    )
    .limit(1);
  if (rows.length === 0) return false;
  return rows[0].is_enabled === true;
}

export async function syncFeaturesFromPlan(accountId: string): Promise<void> {
  const sub = await getSubscriptionByAccountId(accountId);
  if (!sub) return;

  const plan = await getPlanById(sub.plan_id);
  if (!plan) return;

  const featuresJson: unknown = plan.features_json;
  const features: string[] = Array.isArray(featuresJson)
    ? featuresJson
    : typeof featuresJson === 'string'
      ? JSON.parse(featuresJson)
      : [];

  const now = new Date().toISOString();

  sqlite.transaction(() => {
    sqlite.prepare(`DELETE FROM feature_flags WHERE account_id = ? AND source = 'plan'`).run(accountId);
    const insert = sqlite.prepare(`
      INSERT OR REPLACE INTO feature_flags (id, account_id, feature_slug, is_enabled, source, created_at, updated_at)
      VALUES (?, ?, ?, 1, 'plan', ?, ?)
    `);
    for (const slug of features) {
      insert.run(randomUUID(), accountId, slug, now, now);
    }
  })();
}

export async function setFeatureOverride(
  accountId: string,
  featureSlug: string,
  isEnabled: boolean,
  adminUserId: string,
): Promise<void> {
  const now = new Date().toISOString();
  sqlite.prepare(`
    INSERT OR REPLACE INTO feature_flags (id, account_id, feature_slug, is_enabled, source, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'manual_override', ?, ?)
  `).run(randomUUID(), accountId, featureSlug, isEnabled ? 1 : 0, now, now);

  await logAdminAction(adminUserId, accountId, 'feature_override', { featureSlug, isEnabled });
}

// ── Subscription lifecycle ────────────────────────────────────────────────────

export async function createSubscription(params: {
  accountId: string;
  planId: string;
  billingCycle: BillingCycle;
  trialDays?: number;
  mercadopagoPreapprovalId?: string;
}): Promise<string> {
  const now = new Date().toISOString();
  const trialEndsAt = params.trialDays
    ? new Date(Date.now() + params.trialDays * 86_400_000).toISOString()
    : null;

  const id = randomUUID();
  sqlite.prepare(`
    INSERT INTO subscriptions
      (id, account_id, plan_id, status, mercadopago_preapproval_id, trial_ends_at,
       billing_cycle, cancel_at_period_end, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
  `).run(
    id,
    params.accountId,
    params.planId,
    params.trialDays ? 'trialing' : 'active',
    params.mercadopagoPreapprovalId ?? null,
    trialEndsAt,
    params.billingCycle,
    now,
    now,
  );

  await syncFeaturesFromPlan(params.accountId);
  return id;
}

export async function updateSubscriptionStatus(
  accountId: string,
  status: SubscriptionStatus,
): Promise<void> {
  const now = new Date().toISOString();
  sqlite.prepare(`
    UPDATE subscriptions SET status = ?, updated_at = ?${status === 'cancelled' ? ', cancelled_at = ?' : ''}
    WHERE account_id = ?
  `).run(...(status === 'cancelled' ? [status, now, now, accountId] : [status, now, accountId]));
}

export async function changePlan(accountId: string, newPlanId: string): Promise<void> {
  const now = new Date().toISOString();
  sqlite.prepare(`UPDATE subscriptions SET plan_id = ?, updated_at = ? WHERE account_id = ?`).run(newPlanId, now, accountId);
  await syncFeaturesFromPlan(accountId);
}

// ── Invoice management (uses billing_invoices table) ─────────────────────────

export async function createInvoice(params: {
  subscriptionId: string;
  accountId: string;
  amountUsd: number;
  amountLocal?: number;
  currencyLocal?: string;
  fxRate?: number;
  periodStart?: string;
  periodEnd?: string;
  mercadopagoPaymentId?: string;
}): Promise<string> {
  const id = randomUUID();
  const now = new Date().toISOString();
  sqlite.prepare(`
    INSERT INTO billing_invoices
      (id, subscription_id, account_id, amount_usd, amount_local, currency_local, fx_rate,
       status, mercadopago_payment_id, retry_count, period_start, period_end, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, 0, ?, ?, ?)
  `).run(
    id,
    params.subscriptionId,
    params.accountId,
    params.amountUsd,
    params.amountLocal ?? null,
    params.currencyLocal ?? null,
    params.fxRate ?? null,
    params.mercadopagoPaymentId ?? null,
    params.periodStart ?? null,
    params.periodEnd ?? null,
    now,
  );
  return id;
}

export async function markInvoicePaid(invoiceId: string, mercadopagoPaymentId?: string): Promise<void> {
  const now = new Date().toISOString();
  sqlite.prepare(`
    UPDATE billing_invoices SET status = 'paid', paid_at = ?${mercadopagoPaymentId ? ', mercadopago_payment_id = ?' : ''}
    WHERE id = ?
  `).run(...(mercadopagoPaymentId ? [now, mercadopagoPaymentId, invoiceId] : [now, invoiceId]));
}

export async function markInvoiceFailed(invoiceId: string): Promise<{ retryCount: number }> {
  const row = sqlite.prepare(`SELECT retry_count FROM billing_invoices WHERE id = ?`).get(invoiceId) as { retry_count: number } | undefined;
  const newCount = (row?.retry_count ?? 0) + 1;
  const now = new Date().toISOString();
  sqlite.prepare(`UPDATE billing_invoices SET status = 'failed', failed_at = ?, retry_count = ? WHERE id = ?`).run(now, newCount, invoiceId);
  return { retryCount: newCount };
}

export async function getInvoicesByAccountId(accountId: string, limit = 50) {
  return sqlite.prepare(`
    SELECT * FROM billing_invoices WHERE account_id = ? ORDER BY created_at DESC LIMIT ?
  `).all(accountId, limit) as Array<{
    id: string; subscription_id: string; account_id: string;
    amount_usd: number; status: string; paid_at: string | null;
    failed_at: string | null; retry_count: number;
    period_start: string | null; period_end: string | null;
    created_at: string;
  }>;
}

// ── Payment events (webhook audit — uses billing_payment_events) ──────────────

export async function logPaymentEvent(params: {
  eventType: string;
  mercadopagoResourceId?: string;
  subscriptionId?: string;
  accountId?: string;
  payload: unknown;
}): Promise<boolean> {
  if (!params.mercadopagoResourceId) {
    const now = new Date().toISOString();
    sqlite.prepare(`
      INSERT INTO billing_payment_events (id, event_type, subscription_id, account_id, payload_json, processed_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(randomUUID(), params.eventType, params.subscriptionId ?? null, params.accountId ?? null, JSON.stringify(params.payload), now, now);
    return true;
  }

  const existing = sqlite.prepare(
    `SELECT id FROM billing_payment_events WHERE event_type = ? AND mercadopago_resource_id = ?`
  ).get(params.eventType, params.mercadopagoResourceId);

  if (existing) return false;

  const now = new Date().toISOString();
  sqlite.prepare(`
    INSERT INTO billing_payment_events (id, event_type, mercadopago_resource_id, subscription_id, account_id, payload_json, processed_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    randomUUID(),
    params.eventType,
    params.mercadopagoResourceId,
    params.subscriptionId ?? null,
    params.accountId ?? null,
    JSON.stringify(params.payload),
    now,
    now,
  );
  return true;
}

// ── Admin audit ───────────────────────────────────────────────────────────────

export async function logAdminAction(
  adminUserId: string,
  targetAccountId: string | undefined,
  action: string,
  details?: Record<string, unknown>,
  impersonatingUserId?: string,
): Promise<void> {
  sqlite.prepare(`
    INSERT INTO admin_actions (id, admin_user_id, target_account_id, action, details_json, impersonating_user_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    randomUUID(),
    adminUserId,
    targetAccountId ?? null,
    action,
    details ? JSON.stringify(details) : null,
    impersonatingUserId ?? null,
    new Date().toISOString(),
  );
}

// ── Grandfathered check ───────────────────────────────────────────────────────

export async function isAccountGrandfathered(accountId: string): Promise<boolean> {
  const rows = await db
    .select({ is_grandfathered: accounts.is_grandfathered })
    .from(accounts)
    .where(eq(accounts.id, accountId))
    .limit(1);
  return rows[0]?.is_grandfathered === true;
}

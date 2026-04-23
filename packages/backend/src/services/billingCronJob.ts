import cron from 'node-cron';
import { sqlite } from '../db/connection.js';
import { db } from '../db/connection.js';
import { subscriptions, accounts } from '../db/schema.js';
import { eq, and, lt, lte } from 'drizzle-orm';
import { updateSubscriptionStatus } from './billingService.js';
import { sendEmail } from './emailService.js';

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';
const BILLING_URL = `${FRONTEND_URL}/billing`;

interface AccountWithSub {
  account_id: string;
  billing_email: string | null;
  account_name: string;
  subscription_id: string;
  status: string;
  trial_ends_at: string | null;
}

/**
 * Runs the daily billing maintenance job.
 *
 * Tasks:
 * 1. Trial reminders (4 days and 1 day before end)
 * 2. Expired trials → read_only
 * 3. past_due > 7 days → read_only (and then suspended if > 14 days)
 * 4. suspended > 90 days → hard delete (GDPR purge)
 */
async function runDailyBillingJob() {
  console.log('[billing-cron] Daily billing job started', new Date().toISOString());

  const now = new Date();

  // ── Trial reminders ──────────────────────────────────────────────────────────
  const trialing = sqlite.prepare(`
    SELECT
      s.account_id, s.trial_ends_at, s.id as subscription_id, s.status,
      a.billing_email, a.name as account_name
    FROM subscriptions s
    JOIN accounts a ON a.id = s.account_id
    WHERE s.status = 'trialing' AND s.trial_ends_at IS NOT NULL
  `).all() as AccountWithSub[];

  for (const sub of trialing) {
    if (!sub.trial_ends_at) continue;
    const endsAt = new Date(sub.trial_ends_at);
    const daysLeft = Math.ceil((endsAt.getTime() - now.getTime()) / 86_400_000);

    if (daysLeft === 4) {
      await sendEmail({
        to: sub.billing_email ?? '',
        template: 'trial_ending_4d',
        vars: { business_name: sub.account_name, trial_ends: endsAt.toLocaleDateString('es-AR') },
      });
      console.log(`[billing-cron] trial_ending_4d sent to ${sub.billing_email}`);
    }

    if (daysLeft <= 0) {
      // Trial expired: move to read_only
      await updateSubscriptionStatus(sub.account_id, 'read_only');
      await sendEmail({
        to: sub.billing_email ?? '',
        template: 'trial_ended',
        vars: { business_name: sub.account_name, billing_url: BILLING_URL },
      });
      console.log(`[billing-cron] trial expired → read_only: ${sub.account_id}`);
    } else if (daysLeft === 1) {
      await sendEmail({
        to: sub.billing_email ?? '',
        template: 'trial_ending_1d',
        vars: { business_name: sub.account_name, billing_url: BILLING_URL },
      });
      console.log(`[billing-cron] trial_ending_1d sent to ${sub.billing_email}`);
    }
  }

  // ── past_due → read_only (after 7 days past_due) ────────────────────────────
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 86_400_000).toISOString();

  const pastDue = sqlite.prepare(`
    SELECT s.account_id, s.updated_at, a.billing_email, a.name as account_name
    FROM subscriptions s
    JOIN accounts a ON a.id = s.account_id
    WHERE s.status = 'past_due'
  `).all() as Array<{ account_id: string; updated_at: string; billing_email: string | null; account_name: string }>;

  for (const sub of pastDue) {
    const updatedAt = new Date(sub.updated_at);
    if (updatedAt <= new Date(fourteenDaysAgo)) {
      // 14+ days past_due → suspended
      await updateSubscriptionStatus(sub.account_id, 'suspended');
      await sendEmail({
        to: sub.billing_email ?? '',
        template: 'payment_failed_final',
        vars: { business_name: sub.account_name, billing_url: BILLING_URL },
      });
      console.log(`[billing-cron] past_due → suspended (14d): ${sub.account_id}`);
    } else if (updatedAt <= new Date(sevenDaysAgo)) {
      // 7+ days past_due → read_only
      await updateSubscriptionStatus(sub.account_id, 'read_only');
      console.log(`[billing-cron] past_due → read_only (7d): ${sub.account_id}`);
    }
  }

  // ── suspended > 90 days → hard delete ────────────────────────────────────────
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 86_400_000).toISOString();
  const staleAccounts = sqlite.prepare(`
    SELECT s.account_id, a.billing_email, a.name as account_name, s.cancelled_at
    FROM subscriptions s
    JOIN accounts a ON a.id = s.account_id
    WHERE s.status = 'suspended'
      AND s.cancelled_at IS NOT NULL
      AND s.cancelled_at <= ?
      AND a.is_grandfathered = 0
  `).all(ninetyDaysAgo) as Array<{ account_id: string; billing_email: string | null; account_name: string }>;

  for (const sub of staleAccounts) {
    await sendEmail({
      to: sub.billing_email ?? '',
      template: 'subscription_cancelled',
      vars: { business_name: sub.account_name },
    });
    // Hard delete account (cascade deletes subscription, invoices, feature_flags)
    sqlite.prepare(`DELETE FROM accounts WHERE id = ? AND is_grandfathered = 0`).run(sub.account_id);
    console.log(`[billing-cron] DELETED stale account (90d): ${sub.account_id}`);
  }

  console.log('[billing-cron] Daily billing job completed', new Date().toISOString());
}

/**
 * Starts the daily billing cron job.
 * Runs every day at 06:00 AM server time.
 */
export function startBillingCron() {
  cron.schedule('0 6 * * *', () => {
    runDailyBillingJob().catch(err => {
      console.error('[billing-cron] Error in daily billing job:', err);
    });
  });

  console.log('[billing-cron] Daily billing job scheduled (runs at 06:00 daily)');
}

// Export for manual runs (e.g. from admin panel or tests)
export { runDailyBillingJob };

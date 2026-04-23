import { Router } from 'express';
import { db, sqlite } from '../db/connection.js';
import { accounts, plans, subscriptions, profiles } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { requireRestostackAdmin } from '../middleware/permissions.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  getSubscriptionByAccountId,
  getPlanById,
  getActivePlans,
  getFeaturesForAccount,
  getInvoicesByAccountId,
  createSubscription,
  updateSubscriptionStatus,
  changePlan,
  createInvoice,
  markInvoicePaid,
  markInvoiceFailed,
  logPaymentEvent,
  isAccountGrandfathered,
  syncFeaturesFromPlan,
  setFeatureOverride,
  logAdminAction,
} from '../services/billingService.js';
import { getAccountIdForUser, getAccountById } from '../services/accountService.js';
import { randomUUID } from 'crypto';

const router = Router();

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN ?? '';
const MP_API_BASE = 'https://api.mercadopago.com';

// ── Helper: resolve accountId from request ────────────────────────────────────

async function resolveAccountId(userId: string): Promise<string> {
  const accountId = await getAccountIdForUser(userId);
  if (!accountId) throw new AppError(400, 'No account associated with this user');
  return accountId;
}

// ── Plans (public-facing) ─────────────────────────────────────────────────────

// GET /api/billing/plans
router.get('/plans', async (_req, res, next) => {
  try {
    const allPlans = await getActivePlans();
    res.json({ data: allPlans });
  } catch (err) {
    next(err);
  }
});

// ── Subscription (authenticated) ──────────────────────────────────────────────

// GET /api/billing/subscription
router.get('/subscription', requireAuth, async (req, res, next) => {
  try {
    const accountId = await resolveAccountId(req.user!.userId);
    const sub = await getSubscriptionByAccountId(accountId);
    if (!sub) return res.json({ data: null });

    const plan = await getPlanById(sub.plan_id);
    res.json({ data: { ...sub, plan } });
  } catch (err) {
    next(err);
  }
});

// GET /api/billing/features
router.get('/features', requireAuth, async (req, res, next) => {
  try {
    const accountId = await resolveAccountId(req.user!.userId);
    const flags = await getFeaturesForAccount(accountId);
    res.json({ data: flags });
  } catch (err) {
    next(err);
  }
});

// GET /api/billing/invoices
router.get('/invoices', requireAuth, async (req, res, next) => {
  try {
    const accountId = await resolveAccountId(req.user!.userId);
    const rows = await getInvoicesByAccountId(accountId, 50);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/billing/subscriptions
// Creates a MercadoPago preapproval and activates the subscription.
router.post('/subscriptions', requireAuth, async (req, res, next) => {
  try {
    const { planId, billingCycle, cardTokenId } = req.body as {
      planId: string;
      billingCycle: 'monthly' | 'yearly';
      cardTokenId: string;
    };

    if (!planId || !billingCycle || !cardTokenId) {
      throw new AppError(400, 'planId, billingCycle, and cardTokenId are required');
    }

    const accountId = await resolveAccountId(req.user!.userId);

    if (await isAccountGrandfathered(accountId)) {
      throw new AppError(400, 'Grandfathered account — no billing required');
    }

    const plan = await getPlanById(planId);
    if (!plan || !plan.is_active) throw new AppError(404, 'Plan not found');

    const account = await getAccountById(accountId);
    if (!account) throw new AppError(404, 'Account not found');

    const mpPlanId = plan.mercadopago_plan_id_ars;
    if (!mpPlanId) throw new AppError(400, 'Plan not configured in MercadoPago yet');

    const transactionAmount = billingCycle === 'yearly'
      ? plan.price_yearly_usd
      : plan.price_monthly_usd;

    const mpBody = {
      preapproval_plan_id: mpPlanId,
      reason: `RestoStack ${plan.name} - ${account.name}`,
      external_reference: accountId,
      payer_email: account.billing_email ?? req.user!.email,
      card_token_id: cardTokenId,
      status: 'authorized',
      back_url: `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/billing/success`,
      auto_recurring: {
        frequency: billingCycle === 'yearly' ? 12 : 1,
        frequency_type: 'months',
        transaction_amount: transactionAmount,
        currency_id: account.currency_code,
        billing_day: 1,
        billing_day_proportional: true,
      },
    };

    const mpResponse = await fetch(`${MP_API_BASE}/preapproval`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mpBody),
    });

    const mpData = await mpResponse.json() as { id?: string; status?: string; message?: string };

    if (!mpResponse.ok || !mpData.id) {
      throw new AppError(502, `MercadoPago error: ${mpData.message ?? 'unknown'}`);
    }

    const existing = await getSubscriptionByAccountId(accountId);
    const now = new Date().toISOString();

    if (existing) {
      sqlite.prepare(`
        UPDATE subscriptions SET
          plan_id = ?, status = 'active', mercadopago_preapproval_id = ?,
          billing_cycle = ?, current_period_start = ?, current_period_end = ?,
          cancel_at_period_end = 0, cancelled_at = NULL, updated_at = ?
        WHERE account_id = ?
      `).run(planId, mpData.id, billingCycle, now, addPeriodEnd(now, billingCycle), now, accountId);
    } else {
      await createSubscription({
        accountId,
        planId,
        billingCycle,
        mercadopagoPreapprovalId: mpData.id,
      });
      sqlite.prepare(`
        UPDATE subscriptions SET status = 'active', current_period_start = ?, current_period_end = ?, updated_at = ?
        WHERE account_id = ?
      `).run(now, addPeriodEnd(now, billingCycle), now, accountId);
    }

    await syncFeaturesFromPlan(accountId);

    const sub = await getSubscriptionByAccountId(accountId);
    if (sub) {
      await createInvoice({
        subscriptionId: sub.id,
        accountId,
        amountUsd: transactionAmount,
        currencyLocal: account.currency_code,
        mercadopagoPaymentId: mpData.id,
      });
    }

    res.status(201).json({ data: { subscription_id: mpData.id } });
  } catch (err) {
    next(err);
  }
});

// PUT /api/billing/subscriptions/cancel
router.put('/subscriptions/cancel', requireAuth, async (req, res, next) => {
  try {
    const accountId = await resolveAccountId(req.user!.userId);
    const sub = await getSubscriptionByAccountId(accountId);
    if (!sub) throw new AppError(404, 'No active subscription');

    if (sub.mercadopago_preapproval_id && MP_ACCESS_TOKEN) {
      await fetch(`${MP_API_BASE}/preapproval/${sub.mercadopago_preapproval_id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'cancelled' }),
      });
    }

    const now = new Date().toISOString();
    sqlite.prepare(`UPDATE subscriptions SET cancel_at_period_end = 1, updated_at = ? WHERE account_id = ?`).run(now, accountId);

    res.json({ data: { cancelled: true } });
  } catch (err) {
    next(err);
  }
});

// PUT /api/billing/subscriptions/change-plan
router.put('/subscriptions/change-plan', requireAuth, async (req, res, next) => {
  try {
    const { planId, billingCycle } = req.body as { planId: string; billingCycle: 'monthly' | 'yearly' };
    if (!planId) throw new AppError(400, 'planId is required');

    const accountId = await resolveAccountId(req.user!.userId);
    const plan = await getPlanById(planId);
    if (!plan || !plan.is_active) throw new AppError(404, 'Plan not found');

    if (await isAccountGrandfathered(accountId)) {
      throw new AppError(400, 'Grandfathered account — cannot change plan');
    }

    await changePlan(accountId, planId);

    if (billingCycle) {
      const now = new Date().toISOString();
      sqlite.prepare(`UPDATE subscriptions SET billing_cycle = ?, updated_at = ? WHERE account_id = ?`).run(billingCycle, now, accountId);
    }

    res.json({ data: { success: true } });
  } catch (err) {
    next(err);
  }
});

// ── MercadoPago webhook ───────────────────────────────────────────────────────

// POST /api/billing/webhooks/mercadopago
router.post('/webhooks/mercadopago', async (req, res, next) => {
  try {
    // Respond immediately to avoid MP retry
    res.status(200).json({ received: true });

    const { type, data, action } = req.body as {
      type?: string;
      action?: string;
      data?: { id?: string };
    };

    const resourceId = data?.id;
    const eventType = type ?? action ?? 'unknown';

    const isNew = await logPaymentEvent({
      eventType,
      mercadopagoResourceId: resourceId,
      payload: req.body,
    });

    if (!isNew) return; // duplicate webhook, already processed

    if (!MP_ACCESS_TOKEN || !resourceId) return;

    if (type === 'payment') {
      await handlePaymentWebhook(resourceId, eventType);
    } else if (type === 'preapproval') {
      await handlePreapprovalWebhook(resourceId);
    }
  } catch (err) {
    next(err);
  }
});

async function handlePaymentWebhook(paymentId: string, _eventType: string) {
  const mpRes = await fetch(`${MP_API_BASE}/v1/payments/${paymentId}`, {
    headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` },
  });
  if (!mpRes.ok) return;

  const payment = await mpRes.json() as {
    id: string;
    status: string;
    external_reference?: string;
    transaction_amount?: number;
    currency_id?: string;
  };

  const accountId = payment.external_reference;
  if (!accountId) return;

  const sub = await getSubscriptionByAccountId(accountId);
  if (!sub) return;

  const existingInvoice = sqlite.prepare(
    `SELECT id FROM billing_invoices WHERE mercadopago_payment_id = ?`
  ).get(payment.id.toString()) as { id: string } | undefined;

  if (payment.status === 'approved') {
    if (existingInvoice) {
      await markInvoicePaid(existingInvoice.id, payment.id.toString());
    } else {
      const invoiceId = await createInvoice({
        subscriptionId: sub.id,
        accountId,
        amountUsd: payment.transaction_amount ?? 0,
        currencyLocal: payment.currency_id,
        mercadopagoPaymentId: payment.id.toString(),
      });
      await markInvoicePaid(invoiceId, payment.id.toString());
    }
    if (sub.status === 'past_due' || sub.status === 'read_only') {
      await updateSubscriptionStatus(accountId, 'active');
    }
  } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
    if (existingInvoice) {
      const { retryCount } = await markInvoiceFailed(existingInvoice.id);
      if (retryCount >= 3) {
        await updateSubscriptionStatus(accountId, 'past_due');
      }
    }
  }
}

async function handlePreapprovalWebhook(preapprovalId: string) {
  const mpRes = await fetch(`${MP_API_BASE}/preapproval/${preapprovalId}`, {
    headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` },
  });
  if (!mpRes.ok) return;

  const preapproval = await mpRes.json() as {
    id: string;
    status: string;
    external_reference?: string;
  };

  const accountId = preapproval.external_reference;
  if (!accountId) return;

  if (preapproval.status === 'cancelled') {
    const sub = await getSubscriptionByAccountId(accountId);
    if (sub && sub.status !== 'cancelled') {
      await updateSubscriptionStatus(accountId, 'suspended');
    }
  } else if (preapproval.status === 'paused') {
    await updateSubscriptionStatus(accountId, 'past_due');
  }
}

// ── MP Plan Sync (admin-only) ─────────────────────────────────────────────────

// POST /api/billing/mp-plans/sync
router.post('/mp-plans/sync', requireAuth, requireRestostackAdmin, async (_req, res, next) => {
  try {
    if (!MP_ACCESS_TOKEN) throw new AppError(500, 'MP_ACCESS_TOKEN not configured');

    const activePlans = await getActivePlans();
    const results: Array<{ slug: string; mp_plan_id: string | null; status: string }> = [];

    for (const plan of activePlans) {
      if (plan.slug === 'enterprise') {
        results.push({ slug: plan.slug, mp_plan_id: null, status: 'skipped (enterprise/custom)' });
        continue;
      }

      if (plan.mercadopago_plan_id_ars) {
        results.push({ slug: plan.slug, mp_plan_id: plan.mercadopago_plan_id_ars, status: 'already synced' });
        continue;
      }

      const mpBody = {
        reason: `RestoStack ${plan.name}`,
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: plan.price_monthly_usd,
          currency_id: 'ARS',
          billing_day: 1,
          billing_day_proportional: true,
          free_trial: { frequency: 14, frequency_type: 'days' },
        },
        back_url: `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/billing/success`,
      };

      const mpRes = await fetch(`${MP_API_BASE}/preapproval_plan`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mpBody),
      });

      const mpData = await mpRes.json() as { id?: string; message?: string };

      if (mpRes.ok && mpData.id) {
        const now = new Date().toISOString();
        sqlite.prepare(`UPDATE plans SET mercadopago_plan_id_ars = ?, updated_at = ? WHERE id = ?`).run(mpData.id, now, plan.id);
        results.push({ slug: plan.slug, mp_plan_id: mpData.id, status: 'created' });
      } else {
        results.push({ slug: plan.slug, mp_plan_id: null, status: `error: ${mpData.message ?? 'unknown'}` });
      }
    }

    res.json({ data: results });
  } catch (err) {
    next(err);
  }
});

// ── Admin: account subscription management ────────────────────────────────────

// GET /api/billing/admin/accounts
router.get('/admin/accounts', requireAuth, requireRestostackAdmin, async (req, res, next) => {
  try {
    const { status, planSlug, limit = '50', offset = '0' } = req.query as Record<string, string>;

    let sql = `
      SELECT a.*, s.id as sub_id, s.status as sub_status, s.billing_cycle,
             s.trial_ends_at, s.current_period_end, s.plan_id, s.cancel_at_period_end,
             p.slug as plan_slug, p.name as plan_name, p.price_monthly_usd, p.price_yearly_usd
      FROM accounts a
      LEFT JOIN subscriptions s ON s.account_id = a.id
      LEFT JOIN plans p ON p.id = s.plan_id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (status) { sql += ` AND s.status = ?`; params.push(status); }
    if (planSlug) { sql += ` AND p.slug = ?`; params.push(planSlug); }
    sql += ` LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const rows = sqlite.prepare(sql).all(...params) as Array<Record<string, unknown>>;

    const data = rows.map(r => ({
      account: {
        id: r.id, name: r.name, slug: r.slug, country_code: r.country_code,
        business_type: r.business_type, is_grandfathered: Boolean(r.is_grandfathered), created_at: r.created_at,
      },
      subscription: r.sub_id ? {
        id: r.sub_id, status: r.sub_status, billing_cycle: r.billing_cycle,
        trial_ends_at: r.trial_ends_at, current_period_end: r.current_period_end,
        plan_id: r.plan_id, cancel_at_period_end: Boolean(r.cancel_at_period_end),
      } : null,
      plan: r.plan_slug ? {
        id: r.plan_id, slug: r.plan_slug, name: r.plan_name,
        price_monthly_usd: r.price_monthly_usd, price_yearly_usd: r.price_yearly_usd,
      } : null,
    }));

    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// GET /api/billing/admin/accounts/:accountId
router.get('/admin/accounts/:accountId', requireAuth, requireRestostackAdmin, async (req, res, next) => {
  try {
    const accountId = req.params.accountId as string;
    const account = await getAccountById(accountId);
    if (!account) throw new AppError(404, 'Account not found');

    const sub = await getSubscriptionByAccountId(accountId);
    const plan = sub ? await getPlanById(sub.plan_id) : null;
    const features = await getFeaturesForAccount(accountId);
    const accountInvoices = await getInvoicesByAccountId(accountId, 20);

    res.json({ data: { account, subscription: sub, plan, features, invoices: accountInvoices } });
  } catch (err) {
    next(err);
  }
});

// PUT /api/billing/admin/accounts/:accountId/suspend
router.put('/admin/accounts/:accountId/suspend', requireAuth, requireRestostackAdmin, async (req, res, next) => {
  try {
    const accountId = req.params.accountId as string;
    await updateSubscriptionStatus(accountId, 'suspended');
    await logAdminAction(req.user!.userId, accountId, 'account_suspended', { reason: req.body.reason });
    res.json({ data: { success: true } });
  } catch (err) {
    next(err);
  }
});

// PUT /api/billing/admin/accounts/:accountId/reactivate
router.put('/admin/accounts/:accountId/reactivate', requireAuth, requireRestostackAdmin, async (req, res, next) => {
  try {
    const accountId = req.params.accountId as string;
    await updateSubscriptionStatus(accountId, 'active');
    await logAdminAction(req.user!.userId, accountId, 'account_reactivated');
    res.json({ data: { success: true } });
  } catch (err) {
    next(err);
  }
});

// PUT /api/billing/admin/accounts/:accountId/features
router.put('/admin/accounts/:accountId/features', requireAuth, requireRestostackAdmin, async (req, res, next) => {
  try {
    const accountId = req.params.accountId as string;
    const { featureSlug, isEnabled } = req.body as { featureSlug: string; isEnabled: boolean };
    if (!featureSlug) throw new AppError(400, 'featureSlug is required');
    await setFeatureOverride(accountId, featureSlug, isEnabled, req.user!.userId);
    res.json({ data: { success: true } });
  } catch (err) {
    next(err);
  }
});

// PUT /api/billing/admin/accounts/:accountId/change-plan
router.put('/admin/accounts/:accountId/change-plan', requireAuth, requireRestostackAdmin, async (req, res, next) => {
  try {
    const accountId = req.params.accountId as string;
    const { planId } = req.body as { planId: string };
    if (!planId) throw new AppError(400, 'planId is required');

    const plan = await getPlanById(planId);
    if (!plan) throw new AppError(404, 'Plan not found');

    await changePlan(accountId, planId);
    await logAdminAction(req.user!.userId, accountId, 'plan_changed', { newPlanId: planId, newPlanSlug: plan.slug });
    res.json({ data: { success: true } });
  } catch (err) {
    next(err);
  }
});

// POST /api/billing/admin/impersonate/:userId
router.post('/admin/impersonate/:userId', requireAuth, requireRestostackAdmin, async (req, res, next) => {
  try {
    const userId = req.params.userId as string;
    const adminId = req.user!.userId;

    const { generateTokens } = await import('../middleware/auth.js');

    const targetProfile = sqlite.prepare(`SELECT id, email FROM profiles WHERE id = ?`).get(userId) as { id: string; email: string } | undefined;
    if (!targetProfile) throw new AppError(404, 'User not found');

    const targetEmail = targetProfile.email ?? '';

    const token = generateTokens({
      userId,
      email: targetEmail,
      impersonatingUserId: userId,
      originalAdminId: adminId,
    } as any);

    await logAdminAction(adminId, undefined, 'impersonation_started', { impersonated_user_id: userId });

    res.json({ data: { tokens: token, impersonating_user_id: userId } });
  } catch (err) {
    next(err);
  }
});

// ── Plans CRUD (admin) ────────────────────────────────────────────────────────

// GET /api/billing/admin/plans
router.get('/admin/plans', requireAuth, requireRestostackAdmin, async (_req, res, next) => {
  try {
    const allPlans = sqlite.prepare(`SELECT * FROM plans ORDER BY tier`).all();
    res.json({ data: allPlans });
  } catch (err) {
    next(err);
  }
});

// PUT /api/billing/admin/plans/:planId
router.put('/admin/plans/:planId', requireAuth, requireRestostackAdmin, async (req, res, next) => {
  try {
    const { planId } = req.params;
    const { name, description, price_monthly_usd, price_yearly_usd, max_locations, is_active } = req.body;
    const now = new Date().toISOString();
    sqlite.prepare(`
      UPDATE plans SET name = ?, description = ?, price_monthly_usd = ?, price_yearly_usd = ?,
      max_locations = ?, is_active = ?, updated_at = ? WHERE id = ?
    `).run(name, description, price_monthly_usd, price_yearly_usd, max_locations, is_active ? 1 : 0, now, planId);
    res.json({ data: { success: true } });
  } catch (err) {
    next(err);
  }
});

// ── MRR metrics (admin) ───────────────────────────────────────────────────────

// GET /api/billing/admin/metrics/mrr
router.get('/admin/metrics/mrr', requireAuth, requireRestostackAdmin, async (_req, res, next) => {
  try {
    const activeSubsWithPlan = sqlite.prepare(`
      SELECT
        p.slug, p.name,
        p.price_monthly_usd, p.price_yearly_usd,
        s.billing_cycle,
        COUNT(*) as count
      FROM subscriptions s
      JOIN plans p ON p.id = s.plan_id
      WHERE s.status IN ('active', 'trialing')
      GROUP BY p.slug, p.name, p.price_monthly_usd, p.price_yearly_usd, s.billing_cycle
    `).all() as Array<{
      slug: string; name: string;
      price_monthly_usd: number; price_yearly_usd: number;
      billing_cycle: string; count: number;
    }>;

    let totalMrr = 0;
    const breakdown = activeSubsWithPlan.map(r => {
      const mrrContribution = r.billing_cycle === 'yearly'
        ? (r.price_yearly_usd / 12) * r.count
        : r.price_monthly_usd * r.count;
      totalMrr += mrrContribution;
      return { plan: r.slug, plan_name: r.name, billing_cycle: r.billing_cycle, count: r.count, mrr_usd: mrrContribution };
    });

    const totalActive = (sqlite.prepare(
      `SELECT COUNT(*) as c FROM subscriptions WHERE status IN ('active','trialing')`
    ).get() as { c: number }).c;

    const newSignups30d = (sqlite.prepare(
      `SELECT COUNT(*) as c FROM accounts WHERE created_at >= datetime('now','-30 days')`
    ).get() as { c: number }).c;

    const churned30d = (sqlite.prepare(
      `SELECT COUNT(*) as c FROM subscriptions WHERE status = 'cancelled' AND cancelled_at >= datetime('now','-30 days')`
    ).get() as { c: number }).c;

    const totalAtStart = totalActive + churned30d;
    const churnRate = totalAtStart > 0 ? (churned30d / totalAtStart) * 100 : 0;

    res.json({
      data: {
        mrr_usd: totalMrr,
        arr_usd: totalMrr * 12,
        active_accounts: totalActive,
        new_signups_30d: newSignups30d,
        churn_rate_30d: Number(churnRate.toFixed(2)),
        breakdown,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/billing/admin/run-daily-job (manual trigger for testing)
router.post('/admin/run-daily-job', requireAuth, requireRestostackAdmin, async (_req, res, next) => {
  try {
    const { runDailyBillingJob } = await import('../services/billingCronJob.js');
    runDailyBillingJob().catch(console.error);
    res.json({ data: { message: 'Daily billing job started in background' } });
  } catch (err) {
    next(err);
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function addPeriodEnd(start: string, cycle: 'monthly' | 'yearly'): string {
  const d = new Date(start);
  if (cycle === 'yearly') {
    d.setFullYear(d.getFullYear() + 1);
  } else {
    d.setMonth(d.getMonth() + 1);
  }
  return d.toISOString();
}

export { router as billingRoutes };

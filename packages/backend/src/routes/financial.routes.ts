import { Router } from 'express';
import { db } from '../db/connection.js';
import {
  periods,
  expenses,
  rdo_movements,
  rdo_categories,
  cash_registers,
  cash_register_shifts,
  cash_register_movements,
  investments,
  partners,
  partner_movements,
  branch_monthly_sales,
  canon_settlements,
  canon_payments,
} from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// ── Periods ─────────────────────────────────────────────────────────────────

router.get('/periods/:branchId', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(periods).where(eq(periods.branch_id, req.params.branchId));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/periods', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(periods).values({ id, ...req.body, status: 'open', created_at: now, updated_at: now });
    const created = await db.select().from(periods).where(eq(periods.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

router.put('/periods/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(periods).where(eq(periods.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Period not found');
    await db.update(periods).set({ ...req.body, updated_at: new Date().toISOString() }).where(eq(periods.id, req.params.id));
    const updated = await db.select().from(periods).where(eq(periods.id, req.params.id)).get();
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// ── Expenses ────────────────────────────────────────────────────────────────

router.get('/expenses/:branchId', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(expenses).where(eq(expenses.branch_id, req.params.branchId));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/expenses', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    await db.insert(expenses).values({ id, ...req.body, created_by: req.user!.userId, created_at: new Date().toISOString() });
    const created = await db.select().from(expenses).where(eq(expenses.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

router.put('/expenses/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(expenses).where(eq(expenses.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Expense not found');
    await db.update(expenses).set(req.body).where(eq(expenses.id, req.params.id));
    const updated = await db.select().from(expenses).where(eq(expenses.id, req.params.id)).get();
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

router.delete('/expenses/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(expenses).where(eq(expenses.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Expense not found');
    await db.update(expenses).set({ deleted_at: new Date().toISOString() }).where(eq(expenses.id, req.params.id));
    res.json({ message: 'Expense soft-deleted' });
  } catch (err) {
    next(err);
  }
});

// ── RDO Movements ───────────────────────────────────────────────────────────

router.get('/rdo/:branchId', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(rdo_movements).where(eq(rdo_movements.branch_id, req.params.branchId));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/rdo', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(rdo_movements).values({ id, ...req.body, created_by: req.user!.userId, created_at: now, updated_at: now });
    const created = await db.select().from(rdo_movements).where(eq(rdo_movements.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

router.put('/rdo/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(rdo_movements).where(eq(rdo_movements.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'RDO movement not found');
    await db.update(rdo_movements).set({ ...req.body, updated_at: new Date().toISOString() }).where(eq(rdo_movements.id, req.params.id));
    const updated = await db.select().from(rdo_movements).where(eq(rdo_movements.id, req.params.id)).get();
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

router.delete('/rdo/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(rdo_movements).where(eq(rdo_movements.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'RDO movement not found');
    await db.update(rdo_movements).set({ deleted_at: new Date().toISOString() }).where(eq(rdo_movements.id, req.params.id));
    res.json({ message: 'RDO movement soft-deleted' });
  } catch (err) {
    next(err);
  }
});

router.get('/rdo-categories', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(rdo_categories);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// ── Cash Registers ──────────────────────────────────────────────────────────

router.get('/cash-registers/:branchId', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(cash_registers).where(eq(cash_registers.branch_id, req.params.branchId));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/cash-registers', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    await db.insert(cash_registers).values({ id, ...req.body, created_at: new Date().toISOString() });
    const created = await db.select().from(cash_registers).where(eq(cash_registers.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

router.put('/cash-registers/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(cash_registers).where(eq(cash_registers.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Cash register not found');
    await db.update(cash_registers).set(req.body).where(eq(cash_registers.id, req.params.id));
    const updated = await db.select().from(cash_registers).where(eq(cash_registers.id, req.params.id)).get();
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// ── Cash Register Shifts ────────────────────────────────────────────────────

router.get('/cash-register-shifts/:branchId', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(cash_register_shifts).where(eq(cash_register_shifts.branch_id, req.params.branchId));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/cash-register-shifts', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    await db.insert(cash_register_shifts).values({
      id,
      ...req.body,
      status: 'open',
      opened_by: req.user!.userId,
      opened_at: new Date().toISOString(),
    });
    const created = await db.select().from(cash_register_shifts).where(eq(cash_register_shifts.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

router.put('/cash-register-shifts/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(cash_register_shifts).where(eq(cash_register_shifts.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Shift not found');
    await db.update(cash_register_shifts).set(req.body).where(eq(cash_register_shifts.id, req.params.id));
    const updated = await db.select().from(cash_register_shifts).where(eq(cash_register_shifts.id, req.params.id)).get();
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

router.post('/cash-register-movements', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    await db.insert(cash_register_movements).values({
      id,
      ...req.body,
      recorded_by: req.user!.userId,
      created_at: new Date().toISOString(),
    });
    const created = await db.select().from(cash_register_movements).where(eq(cash_register_movements.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

// ── Investments ─────────────────────────────────────────────────────────────

router.get('/investments/:branchId', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(investments).where(eq(investments.branch_id, req.params.branchId));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/investments', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(investments).values({ id, ...req.body, created_by: req.user!.userId, created_at: now, updated_at: now });
    const created = await db.select().from(investments).where(eq(investments.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

// ── Partners ────────────────────────────────────────────────────────────────

router.get('/partners', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(partners);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/partners', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(partners).values({ id, ...req.body, created_at: now, updated_at: now });
    const created = await db.select().from(partners).where(eq(partners.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

router.put('/partners/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(partners).where(eq(partners.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Partner not found');
    await db.update(partners).set({ ...req.body, updated_at: new Date().toISOString() }).where(eq(partners.id, req.params.id));
    const updated = await db.select().from(partners).where(eq(partners.id, req.params.id)).get();
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

router.post('/partner-movements', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    await db.insert(partner_movements).values({ id, ...req.body, created_by: req.user!.userId, created_at: new Date().toISOString() });
    const created = await db.select().from(partner_movements).where(eq(partner_movements.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

// ── Monthly Sales ───────────────────────────────────────────────────────────

router.get('/monthly-sales/:branchId', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(branch_monthly_sales).where(eq(branch_monthly_sales.branch_id, req.params.branchId));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/monthly-sales', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(branch_monthly_sales).values({
      id,
      ...req.body,
      loaded_by: req.user!.userId,
      loaded_at: now,
      created_at: now,
      updated_at: now,
    });
    const created = await db.select().from(branch_monthly_sales).where(eq(branch_monthly_sales.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

// ── Canon ───────────────────────────────────────────────────────────────────

router.get('/canon/:branchId', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(canon_settlements).where(eq(canon_settlements.branch_id, req.params.branchId));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/canon', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(canon_settlements).values({ id, ...req.body, created_by: req.user!.userId, created_at: now, updated_at: now });
    const created = await db.select().from(canon_settlements).where(eq(canon_settlements.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

router.put('/canon/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(canon_settlements).where(eq(canon_settlements.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Canon settlement not found');
    await db.update(canon_settlements).set({ ...req.body, updated_at: new Date().toISOString() }).where(eq(canon_settlements.id, req.params.id));
    const updated = await db.select().from(canon_settlements).where(eq(canon_settlements.id, req.params.id)).get();
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

router.post('/canon-payments', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    await db.insert(canon_payments).values({ id, ...req.body, created_by: req.user!.userId, created_at: new Date().toISOString() });
    const created = await db.select().from(canon_payments).where(eq(canon_payments.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

export { router as financialRoutes };

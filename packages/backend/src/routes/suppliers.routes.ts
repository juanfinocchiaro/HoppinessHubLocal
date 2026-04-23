import { Router } from 'express';
import { db } from '../db/connection.js';
import {
  suppliers,
  supplier_invoices,
  supplier_payments,
  supplier_branch_terms,
} from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// GET / — list suppliers
router.get('/', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(suppliers);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// POST / — create supplier
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(suppliers).values({ id, ...req.body, created_at: now, updated_at: now });
    const created = await db.select().from(suppliers).where(eq(suppliers.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

// PUT /:id — update supplier
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(suppliers).where(eq(suppliers.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Supplier not found');

    await db
      .update(suppliers)
      .set({ ...req.body, updated_at: new Date().toISOString() })
      .where(eq(suppliers.id, req.params.id));

    const updated = await db.select().from(suppliers).where(eq(suppliers.id, req.params.id)).get();
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// GET /:id/invoices — list supplier invoices
router.get('/:id/invoices', requireAuth, async (req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(supplier_invoices)
      .where(eq(supplier_invoices.supplier_id, req.params.id));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// POST /invoices — create supplier invoice
router.post('/invoices', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(supplier_invoices).values({
      id,
      ...req.body,
      created_by: req.user!.userId,
      created_at: now,
      updated_at: now,
    });
    const created = await db.select().from(supplier_invoices).where(eq(supplier_invoices.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

// PUT /invoices/:id — update supplier invoice
router.put('/invoices/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(supplier_invoices).where(eq(supplier_invoices.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Invoice not found');

    await db
      .update(supplier_invoices)
      .set({ ...req.body, updated_at: new Date().toISOString() })
      .where(eq(supplier_invoices.id, req.params.id));

    const updated = await db.select().from(supplier_invoices).where(eq(supplier_invoices.id, req.params.id)).get();
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// GET /:id/payments — list supplier payments
router.get('/:id/payments', requireAuth, async (req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(supplier_payments)
      .where(eq(supplier_payments.supplier_id, req.params.id));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// POST /payments — create supplier payment
router.post('/payments', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    await db.insert(supplier_payments).values({
      id,
      ...req.body,
      created_by: req.user!.userId,
      created_at: new Date().toISOString(),
    });
    const created = await db.select().from(supplier_payments).where(eq(supplier_payments.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

// GET /:supplierId/terms/:branchId — get branch terms
router.get('/:supplierId/terms/:branchId', requireAuth, async (req, res, next) => {
  try {
    const terms = await db
      .select()
      .from(supplier_branch_terms)
      .where(
        and(
          eq(supplier_branch_terms.supplier_id, req.params.supplierId),
          eq(supplier_branch_terms.branch_id, req.params.branchId),
        ),
      )
      .get();
    res.json({ data: terms ?? null });
  } catch (err) {
    next(err);
  }
});

// PUT /:supplierId/terms/:branchId — update branch terms
router.put('/:supplierId/terms/:branchId', requireAuth, async (req, res, next) => {
  try {
    const { supplierId, branchId } = req.params;
    const existing = await db
      .select()
      .from(supplier_branch_terms)
      .where(
        and(
          eq(supplier_branch_terms.supplier_id, supplierId),
          eq(supplier_branch_terms.branch_id, branchId),
        ),
      )
      .get();

    const now = new Date().toISOString();
    if (existing) {
      await db
        .update(supplier_branch_terms)
        .set({ ...req.body, updated_at: now })
        .where(eq(supplier_branch_terms.id, existing.id));
    } else {
      await db.insert(supplier_branch_terms).values({
        id: crypto.randomUUID(),
        supplier_id: supplierId,
        branch_id: branchId,
        ...req.body,
        created_at: now,
        updated_at: now,
      });
    }

    const result = await db
      .select()
      .from(supplier_branch_terms)
      .where(
        and(
          eq(supplier_branch_terms.supplier_id, supplierId),
          eq(supplier_branch_terms.branch_id, branchId),
        ),
      )
      .get();
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

export { router as supplierRoutes };

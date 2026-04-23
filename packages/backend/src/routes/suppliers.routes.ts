import { Router } from 'express';
import { db } from '../db/connection.js';
import * as schema from '../db/schema.js';
import { eq, and, isNull } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { parseScopeFromQuery, whereScope } from '../services/scoping.js';

const router = Router();

// ═══════════════════════════════════════════════════════════════════════
// Suppliers CRUD
// ═══════════════════════════════════════════════════════════════════════

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const scope = parseScopeFromQuery(req.query as Record<string, unknown>);
    const rows = await db.select().from(schema.suppliers).where(and(
      isNull(schema.suppliers.deleted_at),
      whereScope(scope, {
        branchIdColumn: schema.suppliers.branch_id,
        accountIdColumn: schema.suppliers.account_id,
      }),
    ));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(schema.suppliers).values({ id, ...req.body, created_at: now, updated_at: now });
    const created = await db.select().from(schema.suppliers).where(eq(schema.suppliers.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) { next(err); }
});

router.get('/terms', requireAuth, async (req, res, next) => {
  try {
    const branchId = req.query.branch_id as string;
    const rows = await db.select().from(schema.supplier_branch_terms)
      .where(eq(schema.supplier_branch_terms.branch_id, branchId));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/balances', requireAuth, async (req, res, next) => {
  try {
    const branchId = req.query.branch_id as string;

    const invoices = await db.select().from(schema.supplier_invoices)
      .where(and(
        eq(schema.supplier_invoices.branch_id, branchId),
        isNull(schema.supplier_invoices.deleted_at),
      ));
    const payments = await db.select().from(schema.supplier_payments)
      .where(and(
        eq(schema.supplier_payments.branch_id, branchId),
        isNull(schema.supplier_payments.deleted_at),
      ));

    const balanceMap: Record<string, { proveedor_id: string; total_invoiced: number; total_paid: number; balance: number }> = {};
    for (const inv of invoices) {
      const pid = inv.proveedor_id ?? '';
      if (!balanceMap[pid]) balanceMap[pid] = { proveedor_id: pid, total_invoiced: 0, total_paid: 0, balance: 0 };
      balanceMap[pid].total_invoiced += inv.total ?? 0;
    }
    for (const pmt of payments) {
      const pid = pmt.proveedor_id ?? '';
      if (!balanceMap[pid]) balanceMap[pid] = { proveedor_id: pid, total_invoiced: 0, total_paid: 0, balance: 0 };
      balanceMap[pid].total_paid += pmt.amount ?? 0;
    }
    for (const entry of Object.values(balanceMap)) {
      entry.balance = entry.total_invoiced - entry.total_paid;
    }

    res.json({ data: Object.values(balanceMap) });
  } catch (err) { next(err); }
});

router.delete('/documents/:docId', requireAuth, async (_req, res, next) => {
  try {
    res.json({ message: 'Document soft-deleted' });
  } catch (err) { next(err); }
});

router.post('/invoices/:facturaId/upload-pdf', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(schema.supplier_invoices)
      .where(eq(schema.supplier_invoices.id, req.params.facturaId)).get();
    if (!existing) throw new AppError(404, 'Invoice not found');

    res.json({ data: `upload-stub-${req.params.facturaId}` });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════════════
// Supplier by ID
// ═══════════════════════════════════════════════════════════════════════

router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(schema.suppliers).where(eq(schema.suppliers.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Supplier not found');
    await db.update(schema.suppliers)
      .set({ ...req.body, updated_at: new Date().toISOString() })
      .where(eq(schema.suppliers.id, req.params.id));
    const updated = await db.select().from(schema.suppliers).where(eq(schema.suppliers.id, req.params.id)).get();
    res.json({ data: updated });
  } catch (err) { next(err); }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(schema.suppliers).where(eq(schema.suppliers.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Supplier not found');
    await db.update(schema.suppliers)
      .set({ deleted_at: new Date().toISOString() })
      .where(eq(schema.suppliers.id, req.params.id));
    res.json({ message: 'Supplier soft-deleted' });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════════════
// Supplier Branch Terms
// ═══════════════════════════════════════════════════════════════════════

router.get('/:proveedorId/terms/:branchId', requireAuth, async (req, res, next) => {
  try {
    const terms = await db.select().from(schema.supplier_branch_terms)
      .where(and(
        eq(schema.supplier_branch_terms.proveedor_id, req.params.proveedorId),
        eq(schema.supplier_branch_terms.branch_id, req.params.branchId),
      )).get();
    res.json({ data: terms ?? null });
  } catch (err) { next(err); }
});

router.post('/:proveedorId/terms/:branchId', requireAuth, async (req, res, next) => {
  try {
    const { proveedorId, branchId } = req.params;
    const existing = await db.select().from(schema.supplier_branch_terms)
      .where(and(
        eq(schema.supplier_branch_terms.proveedor_id, proveedorId),
        eq(schema.supplier_branch_terms.branch_id, branchId),
      )).get();

    const now = new Date().toISOString();
    if (existing) {
      await db.update(schema.supplier_branch_terms)
        .set({ ...req.body, updated_at: now })
        .where(eq(schema.supplier_branch_terms.id, existing.id));
    } else {
      await db.insert(schema.supplier_branch_terms).values({
        id: crypto.randomUUID(),
        proveedor_id: proveedorId,
        branch_id: branchId,
        ...req.body,
        created_at: now, updated_at: now,
      });
    }

    const result = await db.select().from(schema.supplier_branch_terms)
      .where(and(
        eq(schema.supplier_branch_terms.proveedor_id, proveedorId),
        eq(schema.supplier_branch_terms.branch_id, branchId),
      )).get();
    res.json({ data: result });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════════════
// Supplier Documents (stub — storage needed for actual file upload)
// ═══════════════════════════════════════════════════════════════════════

router.get('/:proveedorId/documents', requireAuth, async (_req, res, next) => {
  try {
    res.json({ data: [] });
  } catch (err) { next(err); }
});

router.post('/:proveedorId/documents/upload', requireAuth, async (_req, res, next) => {
  try {
    res.status(201).json({ data: { id: crypto.randomUUID(), status: 'upload-stub' } });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════════════
// Supplier Invoices (proveedor_id column)
// ═══════════════════════════════════════════════════════════════════════

router.get('/:proveedorId/invoices', requireAuth, async (req, res, next) => {
  try {
    const branchId = req.query.branch_id as string;
    const rows = await db.select().from(schema.supplier_invoices)
      .where(and(
        eq(schema.supplier_invoices.proveedor_id, req.params.proveedorId),
        eq(schema.supplier_invoices.branch_id, branchId),
        isNull(schema.supplier_invoices.deleted_at),
      ));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════════════
// Supplier Payments (proveedor_id column)
// ═══════════════════════════════════════════════════════════════════════

router.get('/:proveedorId/payments', requireAuth, async (req, res, next) => {
  try {
    const branchId = req.query.branch_id as string;
    const rows = await db.select().from(schema.supplier_payments)
      .where(and(
        eq(schema.supplier_payments.proveedor_id, req.params.proveedorId),
        eq(schema.supplier_payments.branch_id, branchId),
        isNull(schema.supplier_payments.deleted_at),
      ));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════════════
// Supplier Balance
// ═══════════════════════════════════════════════════════════════════════

router.get('/:proveedorId/balance', requireAuth, async (req, res, next) => {
  try {
    const branchId = req.query.branch_id as string;
    const proveedorId = req.params.proveedorId;

    const invoices = await db.select().from(schema.supplier_invoices)
      .where(and(
        eq(schema.supplier_invoices.proveedor_id, proveedorId),
        eq(schema.supplier_invoices.branch_id, branchId),
        isNull(schema.supplier_invoices.deleted_at),
      ));
    const payments = await db.select().from(schema.supplier_payments)
      .where(and(
        eq(schema.supplier_payments.proveedor_id, proveedorId),
        eq(schema.supplier_payments.branch_id, branchId),
        isNull(schema.supplier_payments.deleted_at),
      ));

    const totalInvoiced = invoices.reduce((s, i) => s + (i.total ?? 0), 0);
    const totalPaid = payments.reduce((s, p) => s + (p.amount ?? 0), 0);

    res.json({ data: { proveedor_id: proveedorId, total_invoiced: totalInvoiced, total_paid: totalPaid, balance: totalInvoiced - totalPaid } });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════════════
// Supplier Movements (combined invoices + payments timeline)
// ═══════════════════════════════════════════════════════════════════════

router.get('/:proveedorId/movements', requireAuth, async (req, res, next) => {
  try {
    const branchId = req.query.branch_id as string;
    const proveedorId = req.params.proveedorId;

    const invoices = await db.select().from(schema.supplier_invoices)
      .where(and(
        eq(schema.supplier_invoices.proveedor_id, proveedorId),
        eq(schema.supplier_invoices.branch_id, branchId),
        isNull(schema.supplier_invoices.deleted_at),
      ));
    const payments = await db.select().from(schema.supplier_payments)
      .where(and(
        eq(schema.supplier_payments.proveedor_id, proveedorId),
        eq(schema.supplier_payments.branch_id, branchId),
        isNull(schema.supplier_payments.deleted_at),
      ));

    const links = await db.select().from(schema.invoice_payment_links);

    res.json({ data: { invoices, payments, links } });
  } catch (err) { next(err); }
});

export { router as supplierRoutes };

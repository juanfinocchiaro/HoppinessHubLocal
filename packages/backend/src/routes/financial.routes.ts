import { Router } from 'express';
import { db } from '../db/connection.js';
import * as schema from '../db/schema.js';
import { eq, and, inArray, isNull, desc, gte, lte, sql } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// ═══════════════════════════════════════════════════════════════════════
// Canon Liquidaciones
// ═══════════════════════════════════════════════════════════════════════

router.get('/canon-liquidaciones', requireAuth, async (req, res, next) => {
  try {
    const branchId = req.query.branchId as string | undefined;
    const conditions = [isNull(schema.canon_settlements.deleted_at)];
    if (branchId) conditions.push(eq(schema.canon_settlements.branch_id, branchId));
    const rows = await db.select().from(schema.canon_settlements).where(and(...conditions));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/canon-liquidaciones', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const { userId, ...data } = req.body;
    await db.insert(schema.canon_settlements).values({
      id, ...data,
      created_by: userId ?? req.user!.userId,
      created_at: now, updated_at: now,
    });
    const created = await db.select().from(schema.canon_settlements).where(eq(schema.canon_settlements.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) { next(err); }
});

router.get('/canon-liquidaciones/:canonId/pagos', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(schema.canon_payments)
      .where(and(
        eq(schema.canon_payments.canon_settlement_id, req.params.canonId),
        isNull(schema.canon_payments.deleted_at),
      ));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/canon-pagos-proveedores', requireAuth, async (req, res, next) => {
  try {
    const { branchId, periodo } = req.query as { branchId: string; periodo: string };
    const settlementIds = (await db.select({ id: schema.canon_settlements.id })
      .from(schema.canon_settlements)
      .where(and(
        eq(schema.canon_settlements.branch_id, branchId),
        eq(schema.canon_settlements.period, periodo),
      ))).map(r => r.id!);

    if (settlementIds.length === 0) return res.json({ data: [] });

    const rows = await db.select().from(schema.canon_payments)
      .where(and(
        inArray(schema.canon_payments.canon_settlement_id, settlementIds),
        isNull(schema.canon_payments.deleted_at),
      ));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/canon-pagos', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const { userId, ...data } = req.body;
    await db.insert(schema.canon_payments).values({
      id, ...data,
      created_by: userId ?? req.user!.userId,
      created_at: new Date().toISOString(),
    });
    const created = await db.select().from(schema.canon_payments).where(eq(schema.canon_payments.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════════════
// Periodos
// ═══════════════════════════════════════════════════════════════════════

router.get('/periodos', requireAuth, async (req, res, next) => {
  try {
    const branchId = req.query.branchId as string;
    const rows = await db.select().from(schema.periods).where(eq(schema.periods.branch_id, branchId));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/periodos', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const { branchId, periodo } = req.body;
    await db.insert(schema.periods).values({
      id, branch_id: branchId, period: periodo,
      status: 'open', created_at: now, updated_at: now,
    });
    const created = await db.select().from(schema.periods).where(eq(schema.periods.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) { next(err); }
});

router.post('/periodos/:id/cerrar', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(schema.periods).where(eq(schema.periods.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Period not found');
    const now = new Date().toISOString();
    const { userId, motivo } = req.body;
    await db.update(schema.periods).set({
      status: 'closed', closed_at: now,
      closed_by: userId ?? req.user!.userId,
      close_reason: motivo ?? null,
      updated_at: now,
    }).where(eq(schema.periods.id, req.params.id));
    const updated = await db.select().from(schema.periods).where(eq(schema.periods.id, req.params.id)).get();
    res.json({ data: updated });
  } catch (err) { next(err); }
});

router.post('/periodos/:id/reabrir', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(schema.periods).where(eq(schema.periods.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Period not found');
    const now = new Date().toISOString();
    const { userId, motivo } = req.body;
    await db.update(schema.periods).set({
      status: 'open', reopened_at: now,
      reopened_by: userId ?? req.user!.userId,
      reopen_reason: motivo ?? null,
      updated_at: now,
    }).where(eq(schema.periods.id, req.params.id));
    const updated = await db.select().from(schema.periods).where(eq(schema.periods.id, req.params.id)).get();
    res.json({ data: updated });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════════════
// Facturas (supplier_invoices + invoice_items)
// ═══════════════════════════════════════════════════════════════════════

router.get('/facturas', requireAuth, async (req, res, next) => {
  try {
    const { branchId, periodo } = req.query as { branchId: string; periodo?: string };
    const conditions = [
      eq(schema.supplier_invoices.branch_id, branchId),
      isNull(schema.supplier_invoices.deleted_at),
    ];
    if (periodo) conditions.push(eq(schema.supplier_invoices.period, periodo));
    const rows = await db.select().from(schema.supplier_invoices).where(and(...conditions));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/facturas/:facturaId', requireAuth, async (req, res, next) => {
  try {
    const invoice = await db.select().from(schema.supplier_invoices)
      .where(eq(schema.supplier_invoices.id, req.params.facturaId)).get();
    if (!invoice) throw new AppError(404, 'Invoice not found');
    const items = await db.select().from(schema.invoice_items)
      .where(eq(schema.invoice_items.invoice_id, req.params.facturaId));
    res.json({ data: { ...invoice, items } });
  } catch (err) { next(err); }
});

router.post('/facturas', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const { items, userId, ...invoiceData } = req.body;
    await db.insert(schema.supplier_invoices).values({
      id, ...invoiceData,
      created_by: userId ?? req.user!.userId,
      created_at: now, updated_at: now,
    });
    if (Array.isArray(items)) {
      for (const item of items) {
        await db.insert(schema.invoice_items).values({
          id: crypto.randomUUID(), invoice_id: id,
          ...item, created_at: now,
        });
      }
    }
    const created = await db.select().from(schema.supplier_invoices).where(eq(schema.supplier_invoices.id, id)).get();
    const createdItems = await db.select().from(schema.invoice_items).where(eq(schema.invoice_items.invoice_id, id));
    res.status(201).json({ data: { ...created, items: createdItems } });
  } catch (err) { next(err); }
});

router.delete('/facturas/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(schema.supplier_invoices).where(eq(schema.supplier_invoices.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Invoice not found');
    await db.update(schema.supplier_invoices).set({ deleted_at: new Date().toISOString() }).where(eq(schema.supplier_invoices.id, req.params.id));
    res.json({ message: 'Invoice soft-deleted' });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════════════
// Pagos Proveedor (supplier_payments)
// ═══════════════════════════════════════════════════════════════════════

router.get('/facturas/:facturaId/pagos', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(schema.supplier_payments)
      .where(and(
        eq(schema.supplier_payments.invoice_id, req.params.facturaId),
        isNull(schema.supplier_payments.deleted_at),
      ));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/pagos-proveedor', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const { userId, ...data } = req.body;
    await db.insert(schema.supplier_payments).values({
      id, ...data,
      created_by: userId ?? req.user!.userId,
      created_at: now,
    });
    const created = await db.select().from(schema.supplier_payments).where(eq(schema.supplier_payments.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) { next(err); }
});

router.put('/pagos-proveedor/:id/fecha', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(schema.supplier_payments).where(eq(schema.supplier_payments.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Payment not found');
    await db.update(schema.supplier_payments).set({ payment_date: req.body.newDate }).where(eq(schema.supplier_payments.id, req.params.id));
    const updated = await db.select().from(schema.supplier_payments).where(eq(schema.supplier_payments.id, req.params.id)).get();
    res.json({ data: updated });
  } catch (err) { next(err); }
});

router.delete('/pagos-proveedor/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(schema.supplier_payments).where(eq(schema.supplier_payments.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Payment not found');
    await db.update(schema.supplier_payments).set({ deleted_at: new Date().toISOString() }).where(eq(schema.supplier_payments.id, req.params.id));
    res.json({ message: 'Payment soft-deleted' });
  } catch (err) { next(err); }
});

router.post('/pagos-proveedor/:pagoId/approve', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(schema.supplier_payments).where(eq(schema.supplier_payments.id, req.params.pagoId)).get();
    if (!existing) throw new AppError(404, 'Payment not found');
    const now = new Date().toISOString();
    const { userId, notas } = req.body;
    await db.update(schema.supplier_payments).set({
      is_verified: true,
      verified_by: userId ?? req.user!.userId,
      verified_at: now,
      verified_notes: notas ?? null,
    }).where(eq(schema.supplier_payments.id, req.params.pagoId));
    const updated = await db.select().from(schema.supplier_payments).where(eq(schema.supplier_payments.id, req.params.pagoId)).get();
    res.json({ data: updated });
  } catch (err) { next(err); }
});

router.post('/pagos-proveedor/:pagoId/reject', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(schema.supplier_payments).where(eq(schema.supplier_payments.id, req.params.pagoId)).get();
    if (!existing) throw new AppError(404, 'Payment not found');
    await db.update(schema.supplier_payments).set({
      is_verified: false,
      verified_notes: req.body.notas ?? null,
      verified_at: new Date().toISOString(),
    }).where(eq(schema.supplier_payments.id, req.params.pagoId));
    const updated = await db.select().from(schema.supplier_payments).where(eq(schema.supplier_payments.id, req.params.pagoId)).get();
    res.json({ data: updated });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════════════
// Inversiones
// ═══════════════════════════════════════════════════════════════════════

router.get('/inversiones', requireAuth, async (req, res, next) => {
  try {
    const { branchId, periodo } = req.query as { branchId: string; periodo?: string };
    const conditions = [
      eq(schema.investments.branch_id, branchId),
      isNull(schema.investments.deleted_at),
    ];
    if (periodo) conditions.push(eq(schema.investments.period, periodo));
    const rows = await db.select().from(schema.investments).where(and(...conditions));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/inversiones', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const { userId, ...data } = req.body;
    await db.insert(schema.investments).values({
      id, ...data,
      created_by: userId ?? req.user!.userId,
      created_at: now, updated_at: now,
    });
    const created = await db.select().from(schema.investments).where(eq(schema.investments.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) { next(err); }
});

router.put('/inversiones/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(schema.investments).where(eq(schema.investments.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Investment not found');
    await db.update(schema.investments).set({ ...req.body, updated_at: new Date().toISOString() }).where(eq(schema.investments.id, req.params.id));
    const updated = await db.select().from(schema.investments).where(eq(schema.investments.id, req.params.id)).get();
    res.json({ data: updated });
  } catch (err) { next(err); }
});

router.delete('/inversiones/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(schema.investments).where(eq(schema.investments.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Investment not found');
    await db.update(schema.investments).set({ deleted_at: new Date().toISOString() }).where(eq(schema.investments.id, req.params.id));
    res.json({ message: 'Investment soft-deleted' });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════════════
// Consumos Manuales
// ═══════════════════════════════════════════════════════════════════════

router.get('/consumos-manuales', requireAuth, async (req, res, next) => {
  try {
    const { branchId, periodo } = req.query as { branchId: string; periodo?: string };
    const conditions = [
      eq(schema.manual_consumptions.branch_id, branchId),
      isNull(schema.manual_consumptions.deleted_at),
    ];
    if (periodo) conditions.push(eq(schema.manual_consumptions.period, periodo));
    const rows = await db.select().from(schema.manual_consumptions).where(and(...conditions));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/consumos-manuales', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const { userId, ...data } = req.body;
    await db.insert(schema.manual_consumptions).values({
      id, ...data,
      created_by: userId ?? req.user!.userId,
      created_at: now, updated_at: now,
    });
    const created = await db.select().from(schema.manual_consumptions).where(eq(schema.manual_consumptions.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) { next(err); }
});

router.put('/consumos-manuales/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(schema.manual_consumptions).where(eq(schema.manual_consumptions.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Manual consumption not found');
    await db.update(schema.manual_consumptions).set({ ...req.body, updated_at: new Date().toISOString() }).where(eq(schema.manual_consumptions.id, req.params.id));
    const updated = await db.select().from(schema.manual_consumptions).where(eq(schema.manual_consumptions.id, req.params.id)).get();
    res.json({ data: updated });
  } catch (err) { next(err); }
});

router.delete('/consumos-manuales/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(schema.manual_consumptions).where(eq(schema.manual_consumptions.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Manual consumption not found');
    await db.update(schema.manual_consumptions).set({ deleted_at: new Date().toISOString() }).where(eq(schema.manual_consumptions.id, req.params.id));
    res.json({ message: 'Manual consumption soft-deleted' });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════════════
// Socios (partners + partner_movements)
// ═══════════════════════════════════════════════════════════════════════

router.get('/socios', requireAuth, async (req, res, next) => {
  try {
    const branchId = req.query.branchId as string;
    const rows = await db.select().from(schema.partners)
      .where(and(eq(schema.partners.branch_id, branchId), isNull(schema.partners.deleted_at)));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/socios', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const { userId, ...data } = req.body;
    await db.insert(schema.partners).values({
      id, ...data,
      created_by: userId ?? req.user!.userId,
      created_at: now, updated_at: now,
    });
    const created = await db.select().from(schema.partners).where(eq(schema.partners.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) { next(err); }
});

router.put('/socios/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(schema.partners).where(eq(schema.partners.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Partner not found');
    await db.update(schema.partners).set({ ...req.body, updated_at: new Date().toISOString() }).where(eq(schema.partners.id, req.params.id));
    const updated = await db.select().from(schema.partners).where(eq(schema.partners.id, req.params.id)).get();
    res.json({ data: updated });
  } catch (err) { next(err); }
});

router.get('/movimientos-socio', requireAuth, async (req, res, next) => {
  try {
    const { branchId, socioId } = req.query as { branchId: string; socioId?: string };
    const conditions = [
      eq(schema.partner_movements.branch_id, branchId),
      isNull(schema.partner_movements.deleted_at),
    ];
    if (socioId) conditions.push(eq(schema.partner_movements.socio_id, socioId));
    const rows = await db.select().from(schema.partner_movements).where(and(...conditions));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/movimientos-socio', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const { userId, ...data } = req.body;
    await db.insert(schema.partner_movements).values({
      id, ...data,
      created_by: userId ?? req.user!.userId,
      created_at: new Date().toISOString(),
    });
    const created = await db.select().from(schema.partner_movements).where(eq(schema.partner_movements.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════════════
// Conceptos de Servicio
// ═══════════════════════════════════════════════════════════════════════

router.get('/conceptos-servicio', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(schema.service_concepts).where(isNull(schema.service_concepts.deleted_at));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/conceptos-servicio', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(schema.service_concepts).values({ id, ...req.body, created_at: now, updated_at: now });
    const created = await db.select().from(schema.service_concepts).where(eq(schema.service_concepts.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) { next(err); }
});

router.put('/conceptos-servicio/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(schema.service_concepts).where(eq(schema.service_concepts.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Service concept not found');
    await db.update(schema.service_concepts).set({ ...req.body, updated_at: new Date().toISOString() }).where(eq(schema.service_concepts.id, req.params.id));
    const updated = await db.select().from(schema.service_concepts).where(eq(schema.service_concepts.id, req.params.id)).get();
    res.json({ data: updated });
  } catch (err) { next(err); }
});

router.delete('/conceptos-servicio/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(schema.service_concepts).where(eq(schema.service_concepts.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Service concept not found');
    await db.update(schema.service_concepts).set({ deleted_at: new Date().toISOString() }).where(eq(schema.service_concepts.id, req.params.id));
    res.json({ message: 'Service concept soft-deleted' });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════════════
// RDO Categories
// ═══════════════════════════════════════════════════════════════════════

router.get('/rdo-categories', requireAuth, async (req, res, next) => {
  try {
    const { level, section, itemType } = req.query as { level?: string; section?: string; itemType?: string };
    let q = db.select().from(schema.rdo_categories).$dynamic();
    const conditions: ReturnType<typeof eq>[] = [];
    if (level) conditions.push(eq(schema.rdo_categories.level, Number(level)));
    if (section) conditions.push(eq(schema.rdo_categories.rdo_section, section));
    if (itemType) conditions.push(sql`${schema.rdo_categories.allowed_item_types} LIKE ${'%' + itemType + '%'}`);
    if (conditions.length > 0) q = q.where(and(...conditions)) as typeof q;
    const rows = await q;
    res.json({ data: rows });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════════════
// RDO Movements
// ═══════════════════════════════════════════════════════════════════════

router.get('/rdo/:branchId/movements', requireAuth, async (req, res, next) => {
  try {
    const { periodo, categoryCode } = req.query as { periodo?: string; categoryCode?: string };
    const conditions = [
      eq(schema.rdo_movements.branch_id, req.params.branchId),
      isNull(schema.rdo_movements.deleted_at),
    ];
    if (periodo) conditions.push(eq(schema.rdo_movements.period, periodo));
    if (categoryCode) conditions.push(eq(schema.rdo_movements.rdo_category_code, categoryCode));
    const rows = await db.select().from(schema.rdo_movements).where(and(...conditions));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/rdo/:branchId/movements', requireAuth, async (req, res, next) => {
  try {
    const { userId, id: existingId, ...data } = req.body;
    const now = new Date().toISOString();

    if (existingId) {
      await db.update(schema.rdo_movements).set({ ...data, updated_at: now })
        .where(eq(schema.rdo_movements.id, existingId));
      const updated = await db.select().from(schema.rdo_movements).where(eq(schema.rdo_movements.id, existingId)).get();
      return res.json({ data: updated });
    }

    const id = crypto.randomUUID();
    await db.insert(schema.rdo_movements).values({
      id, ...data,
      branch_id: req.params.branchId,
      created_by: userId ?? req.user!.userId,
      created_at: now, updated_at: now,
    });
    const created = await db.select().from(schema.rdo_movements).where(eq(schema.rdo_movements.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════════════
// RDO Reports
// ═══════════════════════════════════════════════════════════════════════

router.get('/rdo/:branchId/financiero', requireAuth, async (req, res, next) => {
  try {
    const periodo = req.query.periodo as string;
    const branchId = req.params.branchId;

    const movements = await db.select().from(schema.rdo_movements)
      .where(and(
        eq(schema.rdo_movements.branch_id, branchId),
        eq(schema.rdo_movements.period, periodo),
        isNull(schema.rdo_movements.deleted_at),
      ));
    const categories = await db.select().from(schema.rdo_categories);
    const gastos = await db.select().from(schema.expenses)
      .where(and(eq(schema.expenses.branch_id, branchId), eq(schema.expenses.period, periodo), isNull(schema.expenses.deleted_at)));
    const inversiones = await db.select().from(schema.investments)
      .where(and(eq(schema.investments.branch_id, branchId), eq(schema.investments.period, periodo), isNull(schema.investments.deleted_at)));

    res.json({ data: { movements, categories, gastos, inversiones, periodo, branchId } });
  } catch (err) { next(err); }
});

router.post('/rdo/:branchId/multivista', requireAuth, async (req, res, next) => {
  try {
    const branchId = req.params.branchId;
    const { fechaDesde, fechaHasta } = req.body;

    const orders = await db.select().from(schema.orders)
      .where(and(
        eq(schema.orders.branch_id, branchId),
        gte(schema.orders.created_at, fechaDesde),
        lte(schema.orders.created_at, fechaHasta),
      ));

    res.json({ data: { orders, branchId, fechaDesde, fechaHasta } });
  } catch (err) { next(err); }
});

router.post('/rdo/:branchId/unified-report', requireAuth, async (req, res, next) => {
  try {
    const branchId = req.params.branchId;
    const { periodo } = req.body;

    const movements = await db.select().from(schema.rdo_movements)
      .where(and(
        eq(schema.rdo_movements.branch_id, branchId),
        eq(schema.rdo_movements.period, periodo),
        isNull(schema.rdo_movements.deleted_at),
      ));
    const categories = await db.select().from(schema.rdo_categories);
    const sales = await db.select().from(schema.branch_monthly_sales)
      .where(and(eq(schema.branch_monthly_sales.branch_id, branchId), eq(schema.branch_monthly_sales.period, periodo)));

    res.json({ data: { movements, categories, sales, periodo, branchId } });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════════════
// Ventas Mensuales (branch_monthly_sales)
// ═══════════════════════════════════════════════════════════════════════

router.get('/branches/:branchId/monthly-sales', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(schema.branch_monthly_sales)
      .where(and(
        eq(schema.branch_monthly_sales.branch_id, req.params.branchId),
        isNull(schema.branch_monthly_sales.deleted_at),
      ));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/branches/:branchId/monthly-sales', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const { userId, ...data } = req.body;
    await db.insert(schema.branch_monthly_sales).values({
      id, ...data,
      branch_id: req.params.branchId,
      loaded_by: userId ?? req.user!.userId,
      loaded_at: now, created_at: now, updated_at: now,
    });
    const created = await db.select().from(schema.branch_monthly_sales).where(eq(schema.branch_monthly_sales.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) { next(err); }
});

router.put('/monthly-sales/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(schema.branch_monthly_sales).where(eq(schema.branch_monthly_sales.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Monthly sales record not found');
    await db.update(schema.branch_monthly_sales).set({ ...req.body, updated_at: new Date().toISOString() }).where(eq(schema.branch_monthly_sales.id, req.params.id));
    const updated = await db.select().from(schema.branch_monthly_sales).where(eq(schema.branch_monthly_sales.id, req.params.id)).get();
    res.json({ data: updated });
  } catch (err) { next(err); }
});

router.delete('/monthly-sales/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(schema.branch_monthly_sales).where(eq(schema.branch_monthly_sales.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Monthly sales record not found');
    await db.update(schema.branch_monthly_sales).set({ deleted_at: new Date().toISOString() }).where(eq(schema.branch_monthly_sales.id, req.params.id));
    res.json({ message: 'Monthly sales soft-deleted' });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════════════
// Cash Registers
// ═══════════════════════════════════════════════════════════════════════

router.get('/branches/:branchId/cash-registers', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(schema.cash_registers)
      .where(eq(schema.cash_registers.branch_id, req.params.branchId));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/cash-registers/open-shifts', requireAuth, async (req, res, next) => {
  try {
    const { registerIds } = req.body as { registerIds: string[] };
    if (!registerIds?.length) return res.json({ data: {} });

    const openShifts = await db.select().from(schema.cash_register_shifts)
      .where(and(
        inArray(schema.cash_register_shifts.cash_register_id, registerIds),
        eq(schema.cash_register_shifts.status, 'open'),
      ));

    const result: Record<string, typeof openShifts[0] | null> = {};
    for (const rid of registerIds) {
      result[rid] = openShifts.find(s => s.cash_register_id === rid) ?? null;
    }
    res.json({ data: result });
  } catch (err) { next(err); }
});

router.post('/cash-registers/transfer', requireAuth, async (req, res, next) => {
  try {
    const { sourceShiftId, destShiftId, amount, concept, userId, branchId } = req.body;
    const transferId = crypto.randomUUID();
    const now = new Date().toISOString();
    const recordedBy = userId ?? req.user!.userId;

    const withdrawalId = crypto.randomUUID();
    await db.insert(schema.cash_register_movements).values({
      id: withdrawalId, shift_id: sourceShiftId, branch_id: branchId,
      type: 'withdrawal', payment_method: 'efectivo', amount,
      concept: concept || 'Transferencia entre cajas',
      recorded_by: recordedBy, created_at: now,
    });
    const withdrawal = await db.select().from(schema.cash_register_movements).where(eq(schema.cash_register_movements.id, withdrawalId)).get();

    let deposit = null;
    if (destShiftId) {
      const depositId = crypto.randomUUID();
      await db.insert(schema.cash_register_movements).values({
        id: depositId, shift_id: destShiftId, branch_id: branchId,
        type: 'deposit', payment_method: 'efectivo', amount,
        concept: concept || 'Transferencia entre cajas',
        recorded_by: recordedBy, created_at: now,
        source_register_id: sourceShiftId,
      });
      deposit = await db.select().from(schema.cash_register_movements).where(eq(schema.cash_register_movements.id, depositId)).get();
    }

    res.status(201).json({ data: { transfer_id: transferId, withdrawal, deposit } });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════════════
// Cash Shifts
// ═══════════════════════════════════════════════════════════════════════

router.post('/cash-shifts/movements-batch', requireAuth, async (req, res, next) => {
  try {
    const { shiftIds } = req.body as { shiftIds: string[] };
    if (!shiftIds?.length) return res.json({ data: [] });
    const rows = await db.select().from(schema.cash_register_movements)
      .where(inArray(schema.cash_register_movements.shift_id, shiftIds));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/cash-shifts', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const { registerId, branchId, userId, openingAmount } = req.body;
    await db.insert(schema.cash_register_shifts).values({
      id, cash_register_id: registerId, branch_id: branchId,
      opened_by: userId ?? req.user!.userId, opened_at: now,
      opening_amount: openingAmount, status: 'open',
    });
    const created = await db.select().from(schema.cash_register_shifts).where(eq(schema.cash_register_shifts.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) { next(err); }
});

router.post('/cash-shifts/:shiftId/close', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(schema.cash_register_shifts).where(eq(schema.cash_register_shifts.id, req.params.shiftId)).get();
    if (!existing) throw new AppError(404, 'Shift not found');
    const now = new Date().toISOString();
    const { userId, closingAmount, expectedAmount, notes } = req.body;
    const difference = closingAmount - expectedAmount;

    await db.update(schema.cash_register_shifts).set({
      status: 'closed', closed_by: userId ?? req.user!.userId, closed_at: now,
      closing_amount: closingAmount, expected_amount: expectedAmount,
      difference, notes: notes ?? null,
    }).where(eq(schema.cash_register_shifts.id, req.params.shiftId));

    if (Math.abs(difference) > 0.01) {
      await db.insert(schema.cashier_discrepancy_history).values({
        id: crypto.randomUUID(),
        shift_id: req.params.shiftId,
        branch_id: existing.branch_id,
        user_id: userId ?? req.user!.userId,
        cash_register_id: existing.cash_register_id,
        expected_amount: expectedAmount,
        actual_amount: closingAmount,
        discrepancy: difference,
        shift_date: now.split('T')[0],
        notes: notes ?? null,
        created_at: now,
      });
    }

    const updated = await db.select().from(schema.cash_register_shifts).where(eq(schema.cash_register_shifts.id, req.params.shiftId)).get();
    res.json({ data: updated });
  } catch (err) { next(err); }
});

router.get('/cash-shifts/:shiftId/movements', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(schema.cash_register_movements)
      .where(eq(schema.cash_register_movements.shift_id, req.params.shiftId));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/cash-shifts/:shiftId/movements', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const { shiftId: _s, userId, ...data } = req.body;
    await db.insert(schema.cash_register_movements).values({
      id, shift_id: req.params.shiftId, ...data,
      recorded_by: userId ?? req.user!.userId, created_at: now,
    });
    const created = await db.select().from(schema.cash_register_movements).where(eq(schema.cash_register_movements.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) { next(err); }
});

router.post('/cash-shifts/:shiftId/expense', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const {
      shiftId: _s, branchId, amount, concept, paymentMethod, userId,
      categoriaGasto, rdoCategoryCode, observaciones, estadoAprobacion,
    } = req.body;
    await db.insert(schema.cash_register_movements).values({
      id, shift_id: req.params.shiftId, branch_id: branchId,
      type: 'expense', payment_method: paymentMethod, amount,
      concept, recorded_by: userId ?? req.user!.userId,
      expense_category: categoriaGasto ?? null,
      rdo_category_code: rdoCategoryCode ?? null,
      extra_notes: observaciones ?? null,
      approval_status: estadoAprobacion ?? 'pendiente',
      created_at: now,
    });
    const created = await db.select().from(schema.cash_register_movements).where(eq(schema.cash_register_movements.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════════════
// Cashier Discrepancies
// ═══════════════════════════════════════════════════════════════════════

router.get('/cashier-discrepancies/stats', requireAuth, async (req, res, next) => {
  try {
    const { userId, branchId } = req.query as { userId: string; branchId?: string };
    const conditions = [eq(schema.cashier_discrepancy_history.user_id, userId)];
    if (branchId) conditions.push(eq(schema.cashier_discrepancy_history.branch_id, branchId));

    const rows = await db.select().from(schema.cashier_discrepancy_history).where(and(...conditions));
    const totalShifts = rows.length;
    const totalDiscrepancy = rows.reduce((sum, r) => sum + (r.discrepancy ?? 0), 0);
    const avgDiscrepancy = totalShifts > 0 ? totalDiscrepancy / totalShifts : 0;
    const shiftsWithDiscrepancy = rows.filter(r => Math.abs(r.discrepancy ?? 0) > 0.01).length;

    res.json({
      data: { totalShifts, totalDiscrepancy, avgDiscrepancy, shiftsWithDiscrepancy },
    });
  } catch (err) { next(err); }
});

router.get('/cashier-discrepancies/history', requireAuth, async (req, res, next) => {
  try {
    const { userId, branchId, limit } = req.query as { userId: string; branchId?: string; limit?: string };
    const conditions = [eq(schema.cashier_discrepancy_history.user_id, userId)];
    if (branchId) conditions.push(eq(schema.cashier_discrepancy_history.branch_id, branchId));

    let q = db.select().from(schema.cashier_discrepancy_history)
      .where(and(...conditions))
      .orderBy(desc(schema.cashier_discrepancy_history.created_at))
      .$dynamic();
    if (limit) q = q.limit(Number(limit)) as typeof q;
    const rows = await q;
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/branches/:branchId/cashier-discrepancy-report', requireAuth, async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    const conditions = [eq(schema.cashier_discrepancy_history.branch_id, req.params.branchId)];
    if (startDate) conditions.push(gte(schema.cashier_discrepancy_history.shift_date, startDate));
    if (endDate) conditions.push(lte(schema.cashier_discrepancy_history.shift_date, endDate));

    const rows = await db.select().from(schema.cashier_discrepancy_history)
      .where(and(...conditions))
      .orderBy(desc(schema.cashier_discrepancy_history.created_at));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════════════
// Gastos (expenses)
// ═══════════════════════════════════════════════════════════════════════

router.get('/branches/:branchId/gastos', requireAuth, async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query as { startDate: string; endDate: string };
    const rows = await db.select().from(schema.expenses)
      .where(and(
        eq(schema.expenses.branch_id, req.params.branchId),
        isNull(schema.expenses.deleted_at),
        gte(schema.expenses.date, startDate),
        lte(schema.expenses.date, endDate),
      ));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/gastos', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(schema.expenses).values({
      id, ...req.body,
      created_by: req.body.created_by ?? req.user!.userId,
      created_at: now, updated_at: now,
    });
    const created = await db.select().from(schema.expenses).where(eq(schema.expenses.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) { next(err); }
});

router.put('/gastos/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(schema.expenses).where(eq(schema.expenses.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Expense not found');
    await db.update(schema.expenses).set({ ...req.body, updated_at: new Date().toISOString() }).where(eq(schema.expenses.id, req.params.id));
    const updated = await db.select().from(schema.expenses).where(eq(schema.expenses.id, req.params.id)).get();
    res.json({ data: updated });
  } catch (err) { next(err); }
});

router.delete('/gastos/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(schema.expenses).where(eq(schema.expenses.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Expense not found');
    await db.update(schema.expenses).set({ deleted_at: new Date().toISOString() }).where(eq(schema.expenses.id, req.params.id));
    res.json({ message: 'Expense soft-deleted' });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════════════
// Branch: POS Ventas Agregadas
// ═══════════════════════════════════════════════════════════════════════

router.get('/branches/:branchId/pos-ventas-agregadas', requireAuth, async (req, res, next) => {
  try {
    const periodo = req.query.periodo as string;
    const branchId = req.params.branchId;
    const startDate = periodo + '-01';
    const endDate = periodo + '-31';

    const rows = await db.select().from(schema.orders)
      .where(and(
        eq(schema.orders.branch_id, branchId),
        gte(schema.orders.created_at, startDate),
        lte(schema.orders.created_at, endDate + 'T23:59:59'),
      ));

    let fc = 0;
    let ft = 0;
    for (const o of rows) {
      const total = o.total ?? 0;
      if (o.requires_invoice) ft += total;
      else fc += total;
    }
    res.json({ data: { fc, ft, total: fc + ft } });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════════════
// Branch: Fiscal Data / Reports
// ═══════════════════════════════════════════════════════════════════════

router.get('/branches/:branchId/fiscal-data', requireAuth, async (req, res, next) => {
  try {
    const config = await db.select().from(schema.afip_config)
      .where(eq(schema.afip_config.branch_id, req.params.branchId)).get();
    if (!config) return res.json({ data: null });

    const branch = await db.select().from(schema.branches)
      .where(eq(schema.branches.id, req.params.branchId)).get();

    res.json({
      data: {
        ...config,
        razon_social: config.business_name ?? '',
        iibb: '',
        condicion_iva: '',
        inicio_actividades: config.activity_start_date ?? '',
        direccion_fiscal: config.fiscal_address ?? '',
        cuit: config.cuit ?? '',
        punto_venta: config.point_of_sale ?? 0,
        branch_name: branch?.name ?? '',
        branch_address: branch?.address ?? '',
      },
    });
  } catch (err) { next(err); }
});

router.post('/branches/:branchId/fiscal-x', requireAuth, async (req, res, next) => {
  try {
    const branchId = req.params.branchId;
    const date = (req.body.date as string) || new Date().toISOString().slice(0, 10);
    const dayStart = date + 'T00:00:00';
    const dayEnd = date + 'T23:59:59';

    const invoices = await db.select().from(schema.issued_invoices)
      .where(and(
        eq(schema.issued_invoices.branch_id, branchId),
        gte(schema.issued_invoices.created_at, dayStart),
        lte(schema.issued_invoices.created_at, dayEnd),
      ));

    const config = await db.select().from(schema.afip_config)
      .where(eq(schema.afip_config.branch_id, branchId)).get();

    const totalNeto = invoices.reduce((s, i) => s + (i.neto ?? 0), 0);
    const totalIva = invoices.reduce((s, i) => s + (i.iva ?? 0), 0);
    const totalAmount = invoices.reduce((s, i) => s + (i.total ?? 0), 0);

    res.json({
      data: {
        date, branch_id: branchId,
        punto_venta: config?.point_of_sale ?? 0,
        invoices_count: invoices.length,
        total_neto: totalNeto,
        total_iva: totalIva,
        total: totalAmount,
        invoices,
      },
    });
  } catch (err) { next(err); }
});

router.get('/branches/:branchId/fiscal-z/last', requireAuth, async (req, res, next) => {
  try {
    const row = await db.select().from(schema.fiscal_z_closings)
      .where(eq(schema.fiscal_z_closings.branch_id, req.params.branchId))
      .orderBy(desc(schema.fiscal_z_closings.created_at))
      .limit(1)
      .get();
    res.json({ data: row ?? null });
  } catch (err) { next(err); }
});

router.get('/branches/:branchId/fiscal-z', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(schema.fiscal_z_closings)
      .where(eq(schema.fiscal_z_closings.branch_id, req.params.branchId))
      .orderBy(desc(schema.fiscal_z_closings.created_at));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/branches/:branchId/fiscal-z', requireAuth, async (req, res, next) => {
  try {
    const branchId = req.params.branchId;
    const date = (req.body.date as string) || new Date().toISOString().slice(0, 10);
    const dayStart = date + 'T00:00:00';
    const dayEnd = date + 'T23:59:59';

    const invoices = await db.select().from(schema.issued_invoices)
      .where(and(
        eq(schema.issued_invoices.branch_id, branchId),
        gte(schema.issued_invoices.created_at, dayStart),
        lte(schema.issued_invoices.created_at, dayEnd),
      ));

    const lastZ = await db.select().from(schema.fiscal_z_closings)
      .where(eq(schema.fiscal_z_closings.branch_id, branchId))
      .orderBy(desc(schema.fiscal_z_closings.z_number))
      .limit(1).get();

    const zNumber = (lastZ?.z_number ?? 0) + 1;
    const totalSales = invoices.reduce((s, i) => s + (i.total ?? 0), 0);
    const totalNeto = invoices.reduce((s, i) => s + (i.neto ?? 0), 0);
    const totalIva = invoices.reduce((s, i) => s + (i.iva ?? 0), 0);

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(schema.fiscal_z_closings).values({
      id, branch_id: branchId, z_number: zNumber, date,
      period_from: dayStart, period_to: dayEnd,
      total_sales: String(totalSales),
      subtotal_net: String(totalNeto),
      total_vat: String(totalIva),
      net_total: String(totalSales),
      generated_by: req.user!.userId,
      generated_at: now, created_at: now,
    });

    const created = await db.select().from(schema.fiscal_z_closings).where(eq(schema.fiscal_z_closings.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════════════
// Branch: Shift Closure Report
// ═══════════════════════════════════════════════════════════════════════

router.get('/branches/:branchId/shift-closure-report', requireAuth, async (req, res, next) => {
  try {
    const { startIso, endIso } = req.query as { startIso: string; endIso: string };
    const branchId = req.params.branchId;

    const shifts = await db.select().from(schema.cash_register_shifts)
      .where(and(
        eq(schema.cash_register_shifts.branch_id, branchId),
        gte(schema.cash_register_shifts.opened_at, startIso),
        lte(schema.cash_register_shifts.opened_at, endIso),
      ))
      .orderBy(desc(schema.cash_register_shifts.opened_at));

    const shiftIds = shifts.map(s => s.id);
    const movements = shiftIds.length > 0
      ? await db.select().from(schema.cash_register_movements)
          .where(inArray(schema.cash_register_movements.shift_id, shiftIds))
      : [];

    res.json({ data: { shifts, movements } });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════════════
// Branch: Fiscal Audit Report
// ═══════════════════════════════════════════════════════════════════════

router.post('/branches/:branchId/fiscal-audit', requireAuth, async (req, res, next) => {
  try {
    const branchId = req.params.branchId;
    const { mode, fromDate, toDate, fromZ, toZ } = req.body;

    if (mode === 'z') {
      const conditions = [eq(schema.fiscal_z_closings.branch_id, branchId)];
      if (fromZ != null) conditions.push(gte(schema.fiscal_z_closings.z_number, fromZ));
      if (toZ != null) conditions.push(lte(schema.fiscal_z_closings.z_number, toZ));
      const closings = await db.select().from(schema.fiscal_z_closings).where(and(...conditions))
        .orderBy(schema.fiscal_z_closings.z_number);
      return res.json({ data: { mode, closings, invoices: [] } });
    }

    const conditions = [eq(schema.issued_invoices.branch_id, branchId)];
    if (fromDate) conditions.push(gte(schema.issued_invoices.issue_date, fromDate));
    if (toDate) conditions.push(lte(schema.issued_invoices.issue_date, toDate));
    const invoices = await db.select().from(schema.issued_invoices).where(and(...conditions))
      .orderBy(schema.issued_invoices.created_at);

    res.json({ data: { mode, closings: [], invoices } });
  } catch (err) { next(err); }
});

export { router as financialRoutes };

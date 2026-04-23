import { Router } from 'express';
import { db } from '../db/connection.js';
import {
  afip_config,
  issued_invoices,
  invoice_items,
  fiscal_z_closings,
} from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// GET /config/:branchId — get AFIP config
router.get('/config/:branchId', requireAuth, async (req, res, next) => {
  try {
    const config = await db
      .select()
      .from(afip_config)
      .where(eq(afip_config.branch_id, req.params.branchId))
      .get();
    res.json({ data: config ?? null });
  } catch (err) {
    next(err);
  }
});

// PUT /config/:branchId — save AFIP config
router.put('/config/:branchId', requireAuth, async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const existing = await db
      .select()
      .from(afip_config)
      .where(eq(afip_config.branch_id, branchId))
      .get();

    const now = new Date().toISOString();
    if (existing) {
      await db
        .update(afip_config)
        .set({ ...req.body, updated_at: now })
        .where(eq(afip_config.branch_id, branchId));
    } else {
      await db.insert(afip_config).values({
        branch_id: branchId,
        ...req.body,
        created_at: now,
        updated_at: now,
      });
    }

    const result = await db.select().from(afip_config).where(eq(afip_config.branch_id, branchId)).get();
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// POST /test-connection — test AFIP connection (stub)
router.post('/test-connection', requireAuth, async (_req, res, next) => {
  try {
    res.json({
      data: {
        success: true,
        message: 'AFIP connection test — stub (will connect when online)',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /emit-invoice — emit invoice (stub)
router.post('/emit-invoice', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(issued_invoices).values({
      id,
      branch_id: req.body.branch_id,
      invoice_type: req.body.invoice_type ?? 'B',
      receipt_type: req.body.receipt_type ?? 'factura',
      point_of_sale: req.body.point_of_sale ?? 1,
      invoice_number: req.body.invoice_number ?? 0,
      issue_date: now.split('T')[0],
      customer_name: req.body.customer_name,
      total_amount: req.body.total_amount,
      net_amount: req.body.net_amount,
      iva_amount: req.body.iva_amount,
      cae: 'STUB_CAE_PENDING',
      afip_result: 'stub',
      created_by: req.user!.userId,
      created_at: now,
    });

    const created = await db.select().from(issued_invoices).where(eq(issued_invoices.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

// POST /emit-credit-note — emit credit note (stub)
router.post('/emit-credit-note', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(issued_invoices).values({
      id,
      branch_id: req.body.branch_id,
      invoice_type: req.body.invoice_type ?? 'B',
      receipt_type: 'nota_credito',
      point_of_sale: req.body.point_of_sale ?? 1,
      invoice_number: req.body.invoice_number ?? 0,
      issue_date: now.split('T')[0],
      original_invoice_id: req.body.original_invoice_id,
      total_amount: req.body.total_amount,
      net_amount: req.body.net_amount,
      iva_amount: req.body.iva_amount,
      cae: 'STUB_CAE_PENDING',
      afip_result: 'stub',
      created_by: req.user!.userId,
      created_at: now,
    });

    const created = await db.select().from(issued_invoices).where(eq(issued_invoices.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

// GET /invoices/:branchId — list issued invoices
router.get('/invoices/:branchId', requireAuth, async (req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(issued_invoices)
      .where(eq(issued_invoices.branch_id, req.params.branchId));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// GET /z-closings/:branchId — list Z closings
router.get('/z-closings/:branchId', requireAuth, async (req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(fiscal_z_closings)
      .where(eq(fiscal_z_closings.branch_id, req.params.branchId));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// POST /z-closings — generate Z closing
router.post('/z-closings', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(fiscal_z_closings).values({
      id,
      ...req.body,
      generated_by: req.user!.userId,
      created_at: now,
    });

    const created = await db.select().from(fiscal_z_closings).where(eq(fiscal_z_closings.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

export { router as fiscalRoutes };

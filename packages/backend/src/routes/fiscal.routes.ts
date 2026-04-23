import { Router } from 'express';
import { db } from '../db/connection.js';
import * as schema from '../db/schema.js';
import { eq, and, desc, like } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// ═══════════════════════════════════════════════════════════════════════
// AFIP Config
// ═══════════════════════════════════════════════════════════════════════

router.get('/config', requireAuth, async (req, res, next) => {
  try {
    const branchId = req.query.branch_id as string;
    const config = await db.select().from(schema.afip_config)
      .where(eq(schema.afip_config.branch_id, branchId)).get();
    res.json({ data: config ?? null });
  } catch (err) { next(err); }
});

router.post('/config', requireAuth, async (req, res, next) => {
  try {
    const { branch_id, ...fields } = req.body;
    const now = new Date().toISOString();
    const existing = await db.select().from(schema.afip_config)
      .where(eq(schema.afip_config.branch_id, branch_id)).get();

    if (existing) {
      await db.update(schema.afip_config)
        .set({ ...fields, updated_at: now })
        .where(eq(schema.afip_config.branch_id, branch_id));
    } else {
      await db.insert(schema.afip_config).values({
        id: crypto.randomUUID(),
        branch_id, ...fields,
        created_at: now, updated_at: now,
      });
    }

    const result = await db.select().from(schema.afip_config)
      .where(eq(schema.afip_config.branch_id, branch_id)).get();
    res.json({ data: result });
  } catch (err) { next(err); }
});

router.post('/config/key-csr', requireAuth, async (req, res, next) => {
  try {
    const { branch_id, clave_privada_enc, csr_pem, estado_certificado } = req.body;
    const now = new Date().toISOString();
    const existing = await db.select().from(schema.afip_config)
      .where(eq(schema.afip_config.branch_id, branch_id)).get();

    if (existing) {
      await db.update(schema.afip_config)
        .set({ private_key_enc: clave_privada_enc, csr_pem, certificate_status: estado_certificado, updated_at: now })
        .where(eq(schema.afip_config.branch_id, branch_id));
    } else {
      await db.insert(schema.afip_config).values({
        id: crypto.randomUUID(), branch_id,
        private_key_enc: clave_privada_enc, csr_pem,
        certificate_status: estado_certificado,
        created_at: now, updated_at: now,
      });
    }

    const result = await db.select().from(schema.afip_config)
      .where(eq(schema.afip_config.branch_id, branch_id)).get();
    res.json({ data: result });
  } catch (err) { next(err); }
});

router.put('/config/certificate', requireAuth, async (req, res, next) => {
  try {
    const { branch_id, certificado_crt } = req.body;
    const existing = await db.select().from(schema.afip_config)
      .where(eq(schema.afip_config.branch_id, branch_id)).get();
    if (!existing) throw new AppError(404, 'AFIP config not found for branch');

    const now = new Date().toISOString();
    await db.update(schema.afip_config)
      .set({ certificado_crt, certificate_status: 'certificado_instalado', updated_at: now })
      .where(eq(schema.afip_config.branch_id, branch_id));

    const result = await db.select().from(schema.afip_config)
      .where(eq(schema.afip_config.branch_id, branch_id)).get();
    res.json({ data: result });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════════════
// Test Connection (stub — real AFIP only online)
// ═══════════════════════════════════════════════════════════════════════

router.post('/test-connection', requireAuth, async (_req, res, next) => {
  try {
    res.json({
      data: {
        success: true,
        message: 'AFIP connection test — stub (will connect when online)',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════════════
// Orders Details (for invoice emission)
// ═══════════════════════════════════════════════════════════════════════

router.get('/orders/:pedidoId/details', requireAuth, async (req, res, next) => {
  try {
    const order = await db.select().from(schema.orders)
      .where(eq(schema.orders.id, req.params.pedidoId)).get();
    if (!order) throw new AppError(404, 'Order not found');

    const items = await db.select().from(schema.order_items)
      .where(eq(schema.order_items.pedido_id, req.params.pedidoId));
    const payments = await db.select().from(schema.order_payments)
      .where(eq(schema.order_payments.pedido_id, req.params.pedidoId));

    res.json({ data: { ...order, items, payments } });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════════════
// Issued Invoices
// ═══════════════════════════════════════════════════════════════════════

router.get('/invoices', requireAuth, async (req, res, next) => {
  try {
    const { branch_id, mode, search_number, search_date } = req.query as {
      branch_id: string; mode: string; search_number?: string; search_date?: string;
    };

    const conditions = [eq(schema.issued_invoices.branch_id, branch_id)];

    if (mode === 'number' && search_number) {
      conditions.push(eq(schema.issued_invoices.receipt_number, Number(search_number)));
    } else if (mode === 'date' && search_date) {
      conditions.push(eq(schema.issued_invoices.issue_date, search_date));
    }

    let q = db.select().from(schema.issued_invoices)
      .where(and(...conditions))
      .orderBy(desc(schema.issued_invoices.created_at))
      .$dynamic();

    if (mode === 'recent') q = q.limit(20) as typeof q;

    const rows = await q;
    res.json({ data: rows });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════════════
// Emit Invoice (stub — CAE from AFIP only online)
// ═══════════════════════════════════════════════════════════════════════

router.post('/emit-invoice', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const {
      branch_id, pedido_id, tipo_factura, receptor_cuit,
      receptor_razon_social, receptor_condicion_iva, items, total,
    } = req.body;

    const config = await db.select().from(schema.afip_config)
      .where(eq(schema.afip_config.branch_id, branch_id)).get();

    const lastInvoiceField = tipo_factura === 'A'
      ? 'last_invoice_number_a'
      : tipo_factura === 'C' ? 'last_invoice_number_c' : 'last_invoice_number_b';
    const lastNum = Number(config?.[lastInvoiceField] ?? 0);
    const receiptNumber = lastNum + 1;

    await db.insert(schema.issued_invoices).values({
      id, branch_id, pedido_id: pedido_id ?? null,
      receipt_type: tipo_factura === 'A' ? 'factura_a' : tipo_factura === 'C' ? 'factura_c' : 'factura_b',
      point_of_sale: config?.point_of_sale ?? 1,
      receipt_number: receiptNumber,
      issue_date: now.split('T')[0],
      receptor_cuit: receptor_cuit ?? null,
      receptor_razon_social: receptor_razon_social ?? null,
      receptor_condicion_iva: receptor_condicion_iva ?? null,
      total, neto: total, iva: 0,
      cae: 'STUB_CAE_PENDING',
      cae_vencimiento: null,
      afip_request: JSON.stringify({ items }),
      emitido_por: req.user!.userId,
      created_at: now,
    });

    if (config) {
      await db.update(schema.afip_config)
        .set({ [lastInvoiceField]: String(receiptNumber), updated_at: now })
        .where(eq(schema.afip_config.id, config.id));
    }

    const created = await db.select().from(schema.issued_invoices)
      .where(eq(schema.issued_invoices.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════════════
// Emit Credit Note (stub)
// ═══════════════════════════════════════════════════════════════════════

router.post('/emit-credit-note', requireAuth, async (req, res, next) => {
  try {
    const { factura_id, branch_id } = req.body;
    const original = await db.select().from(schema.issued_invoices)
      .where(eq(schema.issued_invoices.id, factura_id)).get();
    if (!original) throw new AppError(404, 'Original invoice not found');

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(schema.issued_invoices).values({
      id, branch_id,
      receipt_type: 'nota_credito',
      point_of_sale: original.point_of_sale,
      receipt_number: 0,
      issue_date: now.split('T')[0],
      receptor_cuit: original.receptor_cuit,
      receptor_razon_social: original.receptor_razon_social,
      receptor_condicion_iva: original.receptor_condicion_iva,
      total: original.total ? -original.total : 0,
      neto: original.neto ? -original.neto : 0,
      iva: original.iva ? -original.iva : 0,
      cae: 'STUB_CAE_PENDING',
      linked_invoice_id: factura_id,
      emitido_por: req.user!.userId,
      created_at: now,
    });

    const created = await db.select().from(schema.issued_invoices)
      .where(eq(schema.issued_invoices.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) { next(err); }
});

export { router as fiscalRoutes };

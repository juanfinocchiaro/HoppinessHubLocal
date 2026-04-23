import { Router } from 'express';
import { db } from '../db/connection.js';
import {
  stock_actual,
  stock_movements,
  stock_conteos,
  stock_conteo_items,
  stock_cierre_mensual,
} from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// GET /:branchId/actual — current stock
router.get('/:branchId/actual', requireAuth, async (req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(stock_actual)
      .where(eq(stock_actual.branch_id, req.params.branchId));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// GET /:branchId/movements — stock movements
router.get('/:branchId/movements', requireAuth, async (req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(stock_movements)
      .where(eq(stock_movements.branch_id, req.params.branchId));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// POST /movements — create movement
router.post('/movements', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    await db.insert(stock_movements).values({
      id,
      ...req.body,
      created_by: req.user!.userId,
      created_at: new Date().toISOString(),
    });
    const created = await db.select().from(stock_movements).where(eq(stock_movements.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

// GET /:branchId/conteos — list stock counts
router.get('/:branchId/conteos', requireAuth, async (req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(stock_conteos)
      .where(eq(stock_conteos.branch_id, req.params.branchId));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// POST /conteos — create stock count
router.post('/conteos', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(stock_conteos).values({
      id,
      ...req.body,
      status: 'draft',
      created_by: req.user!.userId,
      created_at: now,
      updated_at: now,
    });
    const created = await db.select().from(stock_conteos).where(eq(stock_conteos.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

// PUT /conteos/:id — update stock count
router.put('/conteos/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(stock_conteos).where(eq(stock_conteos.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Stock count not found');

    await db
      .update(stock_conteos)
      .set({ ...req.body, updated_at: new Date().toISOString() })
      .where(eq(stock_conteos.id, req.params.id));

    const updated = await db.select().from(stock_conteos).where(eq(stock_conteos.id, req.params.id)).get();
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// POST /conteos/:id/items — set count items
router.post('/conteos/:id/items', requireAuth, async (req, res, next) => {
  try {
    const conteoId = req.params.id;
    const existing = await db.select().from(stock_conteos).where(eq(stock_conteos.id, conteoId)).get();
    if (!existing) throw new AppError(404, 'Stock count not found');

    await db.delete(stock_conteo_items).where(eq(stock_conteo_items.conteo_id, conteoId));

    const { items } = req.body;
    const now = new Date().toISOString();
    if (Array.isArray(items)) {
      for (const item of items) {
        await db.insert(stock_conteo_items).values({
          id: crypto.randomUUID(),
          conteo_id: conteoId,
          ...item,
          created_at: now,
        });
      }
    }

    const rows = await db.select().from(stock_conteo_items).where(eq(stock_conteo_items.conteo_id, conteoId));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// PUT /conteos/:id/approve — approve stock count
router.put('/conteos/:id/approve', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(stock_conteos).where(eq(stock_conteos.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Stock count not found');

    const now = new Date().toISOString();
    await db
      .update(stock_conteos)
      .set({
        status: 'approved',
        approved_by: req.user!.userId,
        approved_at: now,
        updated_at: now,
      })
      .where(eq(stock_conteos.id, req.params.id));

    const updated = await db.select().from(stock_conteos).where(eq(stock_conteos.id, req.params.id)).get();
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// POST /cierre — monthly closing
router.post('/cierre', requireAuth, async (req, res, next) => {
  try {
    const { branch_id, period, items } = req.body;
    const now = new Date().toISOString();
    const results: unknown[] = [];

    if (Array.isArray(items)) {
      for (const item of items) {
        const id = crypto.randomUUID();
        await db.insert(stock_cierre_mensual).values({
          id,
          branch_id,
          period,
          ...item,
          closed_by: req.user!.userId,
          created_at: now,
        });
        const row = await db.select().from(stock_cierre_mensual).where(eq(stock_cierre_mensual.id, id)).get();
        results.push(row);
      }
    }

    res.status(201).json({ data: results });
  } catch (err) {
    next(err);
  }
});

export { router as stockRoutes };

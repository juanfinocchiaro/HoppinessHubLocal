import { Router } from 'express';
import { db } from '../db/connection.js';
import * as schema from '../db/schema.js';
import { eq, and, inArray, desc, gte, lte } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// ═══════════════════════════════════════════════════════════════════════
// Combined Stock Data (insumos + stock actual + movements)
// ═══════════════════════════════════════════════════════════════════════

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const branchId = req.query.branchId as string;
    const insumos = await db.select().from(schema.supplies);
    const stockActual = await db.select().from(schema.stock_actual)
      .where(eq(schema.stock_actual.branch_id, branchId));
    const movimientos = await db.select().from(schema.stock_movements)
      .where(eq(schema.stock_movements.branch_id, branchId))
      .orderBy(desc(schema.stock_movements.created_at));
    res.json({ data: { insumos, stockActual, movimientos } });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════════════
// Insumo Info
// ═══════════════════════════════════════════════════════════════════════

router.get('/insumo-unit/:insumoId', requireAuth, async (req, res, next) => {
  try {
    const supply = await db.select({ base_unit: schema.supplies.base_unit })
      .from(schema.supplies)
      .where(eq(schema.supplies.id, req.params.insumoId)).get();
    res.json({ data: { base_unit: supply?.base_unit ?? 'un' } });
  } catch (err) { next(err); }
});

router.get('/insumo-cost/:insumoId', requireAuth, async (req, res, next) => {
  try {
    const supply = await db.select({
      id: schema.supplies.id,
      name: schema.supplies.name,
      base_unit_cost: schema.supplies.base_unit_cost,
      reference_price: schema.supplies.reference_price,
      purchase_unit_price: schema.supplies.purchase_unit_price,
    }).from(schema.supplies).where(eq(schema.supplies.id, req.params.insumoId)).get();
    res.json({ data: supply ?? null });
  } catch (err) { next(err); }
});

router.post('/insumos-by-ids', requireAuth, async (req, res, next) => {
  try {
    const { ids } = req.body as { ids: string[] };
    if (!ids?.length) return res.json({ data: [] });
    const rows = await db.select().from(schema.supplies).where(inArray(schema.supplies.id, ids));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════════════
// Stock Actual
// ═══════════════════════════════════════════════════════════════════════

router.get('/actual-item', requireAuth, async (req, res, next) => {
  try {
    const { branchId, insumoId } = req.query as { branchId: string; insumoId: string };
    const row = await db.select().from(schema.stock_actual)
      .where(and(
        eq(schema.stock_actual.branch_id, branchId),
        eq(schema.stock_actual.insumo_id, insumoId),
      )).get();
    res.json({ data: row ?? null });
  } catch (err) { next(err); }
});

router.get('/actual-row', requireAuth, async (req, res, next) => {
  try {
    const { branchId, insumoId } = req.query as { branchId: string; insumoId: string };
    const row = await db.select().from(schema.stock_actual)
      .where(and(
        eq(schema.stock_actual.branch_id, branchId),
        eq(schema.stock_actual.insumo_id, insumoId),
      )).get();
    res.json({ data: row ?? null });
  } catch (err) { next(err); }
});

router.get('/actual-with-names', requireAuth, async (req, res, next) => {
  try {
    const branchId = req.query.branchId as string;
    const stockRows = await db.select().from(schema.stock_actual)
      .where(eq(schema.stock_actual.branch_id, branchId));

    const insumoIds = stockRows.map(r => r.insumo_id).filter(Boolean) as string[];
    const supplies = insumoIds.length > 0
      ? await db.select().from(schema.supplies).where(inArray(schema.supplies.id, insumoIds))
      : [];
    const supplyMap = new Map(supplies.map(s => [s.id, s]));

    const result = stockRows.map(r => ({
      ...r,
      insumo_name: supplyMap.get(r.insumo_id ?? '')?.name ?? '',
      base_unit: supplyMap.get(r.insumo_id ?? '')?.base_unit ?? 'un',
    }));
    res.json({ data: result });
  } catch (err) { next(err); }
});

router.post('/upsert', requireAuth, async (req, res, next) => {
  try {
    const { branch_id, insumo_id, quantity, unit } = req.body;
    const existing = await db.select().from(schema.stock_actual)
      .where(and(
        eq(schema.stock_actual.branch_id, branch_id),
        eq(schema.stock_actual.insumo_id, insumo_id),
      )).get();

    const now = new Date().toISOString();
    if (existing) {
      await db.update(schema.stock_actual)
        .set({ quantity, unit, updated_at: now })
        .where(eq(schema.stock_actual.id, existing.id));
    } else {
      await db.insert(schema.stock_actual).values({
        id: crypto.randomUUID(), branch_id, insumo_id, quantity, unit, updated_at: now,
      });
    }

    const result = await db.select().from(schema.stock_actual)
      .where(and(
        eq(schema.stock_actual.branch_id, branch_id),
        eq(schema.stock_actual.insumo_id, insumo_id),
      )).get();
    res.json({ data: result });
  } catch (err) { next(err); }
});

router.put('/actual-fields', requireAuth, async (req, res, next) => {
  try {
    const { branchId, insumoId, ...fields } = req.body;
    const existing = await db.select().from(schema.stock_actual)
      .where(and(
        eq(schema.stock_actual.branch_id, branchId),
        eq(schema.stock_actual.insumo_id, insumoId),
      )).get();
    if (!existing) throw new AppError(404, 'Stock record not found');

    await db.update(schema.stock_actual)
      .set({ ...fields, updated_at: new Date().toISOString() })
      .where(eq(schema.stock_actual.id, existing.id));

    const updated = await db.select().from(schema.stock_actual).where(eq(schema.stock_actual.id, existing.id)).get();
    res.json({ data: updated });
  } catch (err) { next(err); }
});

router.post('/actual-record', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    await db.insert(schema.stock_actual).values({
      id, ...req.body, updated_at: new Date().toISOString(),
    });
    const created = await db.select().from(schema.stock_actual).where(eq(schema.stock_actual.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════════════
// Stock Movements
// ═══════════════════════════════════════════════════════════════════════

router.post('/movement', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    await db.insert(schema.stock_movements).values({
      id, ...req.body,
      created_by: req.body.created_by ?? req.user!.userId,
      created_at: new Date().toISOString(),
    });
    const created = await db.select().from(schema.stock_movements).where(eq(schema.stock_movements.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) { next(err); }
});

router.get('/movements-period', requireAuth, async (req, res, next) => {
  try {
    const { branchId, start, end } = req.query as { branchId: string; start: string; end: string };
    const rows = await db.select().from(schema.stock_movements)
      .where(and(
        eq(schema.stock_movements.branch_id, branchId),
        gte(schema.stock_movements.created_at, start),
        lte(schema.stock_movements.created_at, end),
      ))
      .orderBy(desc(schema.stock_movements.created_at));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/movements-for-insumo', requireAuth, async (req, res, next) => {
  try {
    const { branchId, insumoId, from, to } = req.query as {
      branchId: string; insumoId: string; from: string; to: string;
    };
    const rows = await db.select().from(schema.stock_movements)
      .where(and(
        eq(schema.stock_movements.branch_id, branchId),
        eq(schema.stock_movements.insumo_id, insumoId),
        gte(schema.stock_movements.created_at, from),
        lte(schema.stock_movements.created_at, to),
      ))
      .orderBy(desc(schema.stock_movements.created_at));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/movements-history', requireAuth, async (req, res, next) => {
  try {
    const { branchId, insumoId, limit } = req.query as { branchId: string; insumoId: string; limit?: string };
    let q = db.select().from(schema.stock_movements)
      .where(and(
        eq(schema.stock_movements.branch_id, branchId),
        eq(schema.stock_movements.insumo_id, insumoId),
      ))
      .orderBy(desc(schema.stock_movements.created_at))
      .$dynamic();
    if (limit) q = q.limit(Number(limit)) as typeof q;
    const rows = await q;
    res.json({ data: rows });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════════════
// Stock Conteos (counts)
// ═══════════════════════════════════════════════════════════════════════

router.post('/conteo', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(schema.stock_conteos).values({
      id, ...req.body,
      created_by: req.body.created_by ?? req.user!.userId,
      created_at: now,
    });
    const created = await db.select().from(schema.stock_conteos).where(eq(schema.stock_conteos.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) { next(err); }
});

router.post('/conteo-items', requireAuth, async (req, res, next) => {
  try {
    const { items } = req.body as { items: Array<Record<string, unknown>> };
    const inserted: unknown[] = [];
    for (const item of items) {
      const id = crypto.randomUUID();
      await db.insert(schema.stock_conteo_items).values({ id, ...item });
      const row = await db.select().from(schema.stock_conteo_items).where(eq(schema.stock_conteo_items.id, id)).get();
      inserted.push(row);
    }
    res.status(201).json({ data: inserted });
  } catch (err) { next(err); }
});

router.delete('/conteo/:conteoId/items', requireAuth, async (req, res, next) => {
  try {
    await db.delete(schema.stock_conteo_items)
      .where(eq(schema.stock_conteo_items.conteo_id, req.params.conteoId));
    res.json({ message: 'Conteo items deleted' });
  } catch (err) { next(err); }
});

router.put('/conteo/:conteoId', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(schema.stock_conteos)
      .where(eq(schema.stock_conteos.id, req.params.conteoId)).get();
    if (!existing) throw new AppError(404, 'Stock count not found');
    await db.update(schema.stock_conteos).set(req.body)
      .where(eq(schema.stock_conteos.id, req.params.conteoId));
    const updated = await db.select().from(schema.stock_conteos)
      .where(eq(schema.stock_conteos.id, req.params.conteoId)).get();
    res.json({ data: updated });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════════════
// Stock Cierre Mensual
// ═══════════════════════════════════════════════════════════════════════

router.get('/cierre-anterior', requireAuth, async (req, res, next) => {
  try {
    const { branchId, periodo } = req.query as { branchId: string; periodo: string };
    const rows = await db.select().from(schema.stock_cierre_mensual)
      .where(and(
        eq(schema.stock_cierre_mensual.branch_id, branchId),
        eq(schema.stock_cierre_mensual.period, periodo),
      ));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/prev-cierre-insumo', requireAuth, async (req, res, next) => {
  try {
    const { branchId, insumoId, periodo } = req.query as { branchId: string; insumoId: string; periodo: string };
    const row = await db.select().from(schema.stock_cierre_mensual)
      .where(and(
        eq(schema.stock_cierre_mensual.branch_id, branchId),
        eq(schema.stock_cierre_mensual.insumo_id, insumoId),
        eq(schema.stock_cierre_mensual.period, periodo),
      )).get();
    res.json({ data: row ?? null });
  } catch (err) { next(err); }
});

router.post('/upsert-cierre-mensual', requireAuth, async (req, res, next) => {
  try {
    const { branch_id, insumo_id, period, ...rest } = req.body;
    const existing = await db.select().from(schema.stock_cierre_mensual)
      .where(and(
        eq(schema.stock_cierre_mensual.branch_id, branch_id),
        eq(schema.stock_cierre_mensual.insumo_id, insumo_id),
        eq(schema.stock_cierre_mensual.period, period),
      )).get();

    if (existing) {
      await db.update(schema.stock_cierre_mensual).set(rest)
        .where(eq(schema.stock_cierre_mensual.id, existing.id));
      const updated = await db.select().from(schema.stock_cierre_mensual)
        .where(eq(schema.stock_cierre_mensual.id, existing.id)).get();
      return res.json({ data: updated });
    }

    const id = crypto.randomUUID();
    await db.insert(schema.stock_cierre_mensual).values({
      id, branch_id, insumo_id, period, ...rest,
      created_by: req.body.created_by ?? req.user!.userId,
      created_at: new Date().toISOString(),
    });
    const created = await db.select().from(schema.stock_cierre_mensual)
      .where(eq(schema.stock_cierre_mensual.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════════════
// Consumo Manual (from POS stock context)
// ═══════════════════════════════════════════════════════════════════════

router.post('/consumo-manual', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    await db.insert(schema.manual_consumptions).values({
      id, ...req.body,
      created_by: req.body.created_by ?? req.user!.userId,
      created_at: new Date().toISOString(),
    });
    const created = await db.select().from(schema.manual_consumptions)
      .where(eq(schema.manual_consumptions.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) { next(err); }
});

export { router as stockRoutes };

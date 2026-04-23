import { Router } from 'express';
import { db } from '../db/connection.js';
import {
  delivery_pricing_config,
  branch_delivery_config,
  branch_delivery_neighborhoods,
  delivery_zones,
} from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// GET /config — get delivery pricing config (brand-level)
router.get('/config', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(delivery_pricing_config);
    res.json({ data: rows[0] ?? null });
  } catch (err) {
    next(err);
  }
});

// PUT /config — update delivery pricing config
router.put('/config', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(delivery_pricing_config).get();

    const now = new Date().toISOString();
    if (existing) {
      await db
        .update(delivery_pricing_config)
        .set({ ...req.body, updated_at: now })
        .where(eq(delivery_pricing_config.id, existing.id));
    } else {
      await db.insert(delivery_pricing_config).values({
        id: crypto.randomUUID(),
        ...req.body,
        created_at: now,
        updated_at: now,
      });
    }

    const result = await db.select().from(delivery_pricing_config).get();
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// GET /branches/:branchId/config — get branch delivery config
router.get('/branches/:branchId/config', requireAuth, async (req, res, next) => {
  try {
    const config = await db
      .select()
      .from(branch_delivery_config)
      .where(eq(branch_delivery_config.branch_id, req.params.branchId))
      .get();
    res.json({ data: config ?? null });
  } catch (err) {
    next(err);
  }
});

// PUT /branches/:branchId/config — update branch delivery config
router.put('/branches/:branchId/config', requireAuth, async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const existing = await db
      .select()
      .from(branch_delivery_config)
      .where(eq(branch_delivery_config.branch_id, branchId))
      .get();

    const now = new Date().toISOString();
    if (existing) {
      await db
        .update(branch_delivery_config)
        .set({ ...req.body, updated_at: now })
        .where(eq(branch_delivery_config.branch_id, branchId));
    } else {
      await db.insert(branch_delivery_config).values({
        id: crypto.randomUUID(),
        branch_id: branchId,
        ...req.body,
        created_at: now,
        updated_at: now,
      });
    }

    const result = await db
      .select()
      .from(branch_delivery_config)
      .where(eq(branch_delivery_config.branch_id, branchId))
      .get();
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// GET /branches/:branchId/neighborhoods — list neighborhoods
router.get('/branches/:branchId/neighborhoods', requireAuth, async (req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(branch_delivery_neighborhoods)
      .where(eq(branch_delivery_neighborhoods.branch_id, req.params.branchId));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// PUT /branches/:branchId/neighborhoods — update (bulk)
router.put('/branches/:branchId/neighborhoods', requireAuth, async (req, res, next) => {
  try {
    const { branchId } = req.params;
    await db
      .delete(branch_delivery_neighborhoods)
      .where(eq(branch_delivery_neighborhoods.branch_id, branchId));

    const { neighborhoods } = req.body;
    const now = new Date().toISOString();
    if (Array.isArray(neighborhoods)) {
      for (const n of neighborhoods) {
        await db.insert(branch_delivery_neighborhoods).values({
          id: crypto.randomUUID(),
          branch_id: branchId,
          ...n,
          created_at: now,
          updated_at: now,
        });
      }
    }

    const rows = await db
      .select()
      .from(branch_delivery_neighborhoods)
      .where(eq(branch_delivery_neighborhoods.branch_id, branchId));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// GET /zones/:branchId — list zones
router.get('/zones/:branchId', requireAuth, async (req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(delivery_zones)
      .where(eq(delivery_zones.branch_id, req.params.branchId));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// POST /zones — create zone
router.post('/zones', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(delivery_zones).values({ id, ...req.body, created_at: now, updated_at: now });
    const created = await db.select().from(delivery_zones).where(eq(delivery_zones.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

// PUT /zones/:id — update zone
router.put('/zones/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(delivery_zones).where(eq(delivery_zones.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Zone not found');

    await db
      .update(delivery_zones)
      .set({ ...req.body, updated_at: new Date().toISOString() })
      .where(eq(delivery_zones.id, req.params.id));

    const updated = await db.select().from(delivery_zones).where(eq(delivery_zones.id, req.params.id)).get();
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /zones/:id — delete zone
router.delete('/zones/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(delivery_zones).where(eq(delivery_zones.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Zone not found');

    await db.delete(delivery_zones).where(eq(delivery_zones.id, req.params.id));
    res.json({ message: 'Zone deleted' });
  } catch (err) {
    next(err);
  }
});

// POST /calculate — calculate delivery cost (stub)
router.post('/calculate', async (req, res, next) => {
  try {
    const { branch_id, latitude, longitude } = req.body;
    res.json({
      data: {
        branch_id,
        latitude,
        longitude,
        delivery_cost: 0,
        estimated_time_min: 30,
        message: 'Delivery cost calculation — stub (Google API not configured)',
      },
    });
  } catch (err) {
    next(err);
  }
});

export { router as deliveryRoutes };

import { Router } from 'express';
import { db } from '../db/connection.js';
import {
  branches,
  pos_config,
  webapp_config,
  branch_printers,
  kitchen_stations,
  branch_shifts,
} from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { requireSuperadmin, requireBranchAccess, requireBranchRole } from '../middleware/permissions.js';
import { AppError } from '../middleware/errorHandler.js';
import { emitToRoom } from '../realtime/socketServer.js';

const router = Router();

// GET / — list all active branches (auth required)
router.get('/', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(branches).where(eq(branches.is_active, true));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// GET /public — list public branches (no auth)
router.get('/public', async (_req, res, next) => {
  try {
    const rows = await db
      .select({
        id: branches.id,
        name: branches.name,
        slug: branches.slug,
        address: branches.address,
        city: branches.city,
        phone: branches.phone,
        latitude: branches.latitude,
        longitude: branches.longitude,
        is_open: branches.is_open,
        public_hours: branches.public_hours,
        public_status: branches.public_status,
        cover_image_url: branches.cover_image_url,
      })
      .from(branches)
      .where(eq(branches.is_active, true));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// GET /:id — get single branch
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const branch = await db.select().from(branches).where(eq(branches.id, req.params.id)).get();
    if (!branch) throw new AppError(404, 'Branch not found');
    res.json({ data: branch });
  } catch (err) {
    next(err);
  }
});

// POST / — create branch (superadmin)
router.post('/', requireAuth, requireSuperadmin, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(branches).values({
      id,
      ...req.body,
      is_active: true,
      created_at: now,
      updated_at: now,
    });
    const created = await db.select().from(branches).where(eq(branches.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

// PUT /:id — update branch (superadmin or branch manager)
router.put('/:id', requireAuth, requireBranchRole('encargado', 'administrador'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await db.select().from(branches).where(eq(branches.id, id)).get();
    if (!existing) throw new AppError(404, 'Branch not found');

    await db
      .update(branches)
      .set({ ...req.body, updated_at: new Date().toISOString() })
      .where(eq(branches.id, id));

    const updated = await db.select().from(branches).where(eq(branches.id, id)).get();

    emitToRoom(`branch:${id}`, 'branch:updated', updated);

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// ── POS Config ──────────────────────────────────────────────────────────────

// GET /:branchId/config/pos
router.get('/:branchId/config/pos', requireAuth, requireBranchAccess, async (req, res, next) => {
  try {
    const config = await db
      .select()
      .from(pos_config)
      .where(eq(pos_config.branch_id, req.params.branchId))
      .get();
    res.json({ data: config ?? null });
  } catch (err) {
    next(err);
  }
});

// PUT /:branchId/config/pos
router.put('/:branchId/config/pos', requireAuth, requireBranchRole('encargado', 'administrador'), async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const existing = await db
      .select()
      .from(pos_config)
      .where(eq(pos_config.branch_id, branchId))
      .get();

    const now = new Date().toISOString();
    if (existing) {
      await db
        .update(pos_config)
        .set({ ...req.body, updated_at: now })
        .where(eq(pos_config.branch_id, branchId));
    } else {
      await db.insert(pos_config).values({
        branch_id: branchId,
        ...req.body,
        created_at: now,
        updated_at: now,
      });
    }

    const result = await db.select().from(pos_config).where(eq(pos_config.branch_id, branchId)).get();
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// ── Webapp Config ───────────────────────────────────────────────────────────

// GET /:branchId/config/webapp
router.get('/:branchId/config/webapp', requireAuth, requireBranchAccess, async (req, res, next) => {
  try {
    const config = await db
      .select()
      .from(webapp_config)
      .where(eq(webapp_config.branch_id, req.params.branchId))
      .get();
    res.json({ data: config ?? null });
  } catch (err) {
    next(err);
  }
});

// PUT /:branchId/config/webapp
router.put('/:branchId/config/webapp', requireAuth, requireBranchRole('encargado', 'administrador'), async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const existing = await db
      .select()
      .from(webapp_config)
      .where(eq(webapp_config.branch_id, branchId))
      .get();

    const now = new Date().toISOString();
    if (existing) {
      await db
        .update(webapp_config)
        .set({ ...req.body, updated_at: now })
        .where(eq(webapp_config.branch_id, branchId));
    } else {
      await db.insert(webapp_config).values({
        branch_id: branchId,
        ...req.body,
        created_at: now,
        updated_at: now,
      });
    }

    const result = await db.select().from(webapp_config).where(eq(webapp_config.branch_id, branchId)).get();
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// ── Printers ────────────────────────────────────────────────────────────────

// GET /:branchId/printers
router.get('/:branchId/printers', requireAuth, requireBranchAccess, async (req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(branch_printers)
      .where(eq(branch_printers.branch_id, req.params.branchId));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// POST /:branchId/printers
router.post('/:branchId/printers', requireAuth, requireBranchRole('encargado', 'administrador'), async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    await db.insert(branch_printers).values({
      id,
      branch_id: req.params.branchId,
      ...req.body,
      created_at: new Date().toISOString(),
    });
    const created = await db.select().from(branch_printers).where(eq(branch_printers.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

// PUT /:branchId/printers/:id
router.put('/:branchId/printers/:id', requireAuth, requireBranchRole('encargado', 'administrador'), async (req, res, next) => {
  try {
    const existing = await db.select().from(branch_printers).where(eq(branch_printers.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Printer not found');

    await db.update(branch_printers).set(req.body).where(eq(branch_printers.id, req.params.id));

    const updated = await db.select().from(branch_printers).where(eq(branch_printers.id, req.params.id)).get();
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /:branchId/printers/:id
router.delete('/:branchId/printers/:id', requireAuth, requireBranchRole('encargado', 'administrador'), async (req, res, next) => {
  try {
    const existing = await db.select().from(branch_printers).where(eq(branch_printers.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Printer not found');

    await db.delete(branch_printers).where(eq(branch_printers.id, req.params.id));
    res.json({ message: 'Printer deleted' });
  } catch (err) {
    next(err);
  }
});

// ── Kitchen Stations ────────────────────────────────────────────────────────

// GET /:branchId/kitchen-stations
router.get('/:branchId/kitchen-stations', requireAuth, requireBranchAccess, async (req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(kitchen_stations)
      .where(eq(kitchen_stations.branch_id, req.params.branchId));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// POST /:branchId/kitchen-stations
router.post('/:branchId/kitchen-stations', requireAuth, requireBranchRole('encargado', 'administrador'), async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    await db.insert(kitchen_stations).values({
      id,
      branch_id: req.params.branchId,
      ...req.body,
      created_at: new Date().toISOString(),
    });
    const created = await db.select().from(kitchen_stations).where(eq(kitchen_stations.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

// PUT /:branchId/kitchen-stations/:id
router.put('/:branchId/kitchen-stations/:id', requireAuth, requireBranchRole('encargado', 'administrador'), async (req, res, next) => {
  try {
    const existing = await db.select().from(kitchen_stations).where(eq(kitchen_stations.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Kitchen station not found');

    await db.update(kitchen_stations).set(req.body).where(eq(kitchen_stations.id, req.params.id));

    const updated = await db.select().from(kitchen_stations).where(eq(kitchen_stations.id, req.params.id)).get();
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// ── Shifts ──────────────────────────────────────────────────────────────────

// GET /:branchId/shifts
router.get('/:branchId/shifts', requireAuth, requireBranchAccess, async (req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(branch_shifts)
      .where(eq(branch_shifts.branch_id, req.params.branchId));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// POST /:branchId/shifts
router.post('/:branchId/shifts', requireAuth, requireBranchRole('encargado', 'administrador'), async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(branch_shifts).values({
      id,
      branch_id: req.params.branchId,
      ...req.body,
      created_at: now,
      updated_at: now,
    });
    const created = await db.select().from(branch_shifts).where(eq(branch_shifts.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

// PUT /:branchId/shifts/:id
router.put('/:branchId/shifts/:id', requireAuth, requireBranchRole('encargado', 'administrador'), async (req, res, next) => {
  try {
    const existing = await db.select().from(branch_shifts).where(eq(branch_shifts.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Shift not found');

    await db
      .update(branch_shifts)
      .set({ ...req.body, updated_at: new Date().toISOString() })
      .where(eq(branch_shifts.id, req.params.id));

    const updated = await db.select().from(branch_shifts).where(eq(branch_shifts.id, req.params.id)).get();
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

export { router as branchRoutes };

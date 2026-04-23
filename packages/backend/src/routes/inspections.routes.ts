import { Router } from 'express';
import { db } from '../db/connection.js';
import {
  inspection_templates,
  branch_inspections,
  inspection_items,
} from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// GET /templates — list templates
router.get('/templates', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(inspection_templates);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// POST /templates — create template
router.post('/templates', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(inspection_templates).values({
      id,
      ...req.body,
      created_by: req.user!.userId,
      created_at: now,
      updated_at: now,
    });
    const created = await db.select().from(inspection_templates).where(eq(inspection_templates.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

// PUT /templates/:id — update template
router.put('/templates/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(inspection_templates).where(eq(inspection_templates.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Template not found');

    await db
      .update(inspection_templates)
      .set({ ...req.body, updated_at: new Date().toISOString() })
      .where(eq(inspection_templates.id, req.params.id));

    const updated = await db.select().from(inspection_templates).where(eq(inspection_templates.id, req.params.id)).get();
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// GET /:branchId — list inspections
router.get('/:branchId', requireAuth, async (req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(branch_inspections)
      .where(eq(branch_inspections.branch_id, req.params.branchId));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// GET /detail/:id — get inspection + items
router.get('/detail/:id', requireAuth, async (req, res, next) => {
  try {
    const inspection = await db
      .select()
      .from(branch_inspections)
      .where(eq(branch_inspections.id, req.params.id))
      .get();
    if (!inspection) throw new AppError(404, 'Inspection not found');

    const items = await db
      .select()
      .from(inspection_items)
      .where(eq(inspection_items.inspection_id, inspection.id));

    res.json({ data: { ...inspection, items } });
  } catch (err) {
    next(err);
  }
});

// POST / — create inspection with items
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const { items, ...inspectionData } = req.body;

    await db.insert(branch_inspections).values({
      id,
      ...inspectionData,
      inspector_id: req.user!.userId,
      status: 'in_progress',
      started_at: now,
      created_at: now,
      updated_at: now,
    });

    if (Array.isArray(items)) {
      for (const item of items) {
        await db.insert(inspection_items).values({
          id: crypto.randomUUID(),
          inspection_id: id,
          ...item,
          created_at: now,
        });
      }
    }

    const created = await db.select().from(branch_inspections).where(eq(branch_inspections.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

// PUT /:id — update inspection
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(branch_inspections).where(eq(branch_inspections.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Inspection not found');

    await db
      .update(branch_inspections)
      .set({ ...req.body, updated_at: new Date().toISOString() })
      .where(eq(branch_inspections.id, req.params.id));

    const updated = await db.select().from(branch_inspections).where(eq(branch_inspections.id, req.params.id)).get();
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

export { router as inspectionRoutes };

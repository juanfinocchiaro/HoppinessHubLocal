import { Router } from 'express';
import { db } from '../db/connection.js';
import * as schema from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════════
// Templates (literal prefix — must be before /:inspectionId)
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/templates', requireAuth, async (req, res, next) => {
  try {
    const type = req.query.type as string | undefined;
    const conditions = [eq(schema.inspection_templates.is_active, true)];
    if (type) conditions.push(eq(schema.inspection_templates.inspection_type, type));

    const rows = await db
      .select()
      .from(schema.inspection_templates)
      .where(and(...conditions));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Staff Members (literal prefix — must be before /:inspectionId)
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/staff-members/:branchId', requireAuth, async (req, res, next) => {
  try {
    const rows = await db
      .select({
        id: schema.profiles.id,
        full_name: schema.profiles.full_name,
        local_role: schema.roles.display_name,
      })
      .from(schema.user_role_assignments)
      .innerJoin(schema.profiles, eq(schema.profiles.id, schema.user_role_assignments.user_id))
      .innerJoin(schema.roles, eq(schema.roles.id, schema.user_role_assignments.role_id))
      .where(
        and(
          eq(schema.user_role_assignments.branch_id, req.params.branchId),
          eq(schema.user_role_assignments.is_active, true),
        ),
      );
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Inspection Items (literal prefix — must be before /:inspectionId)
// ═══════════════════════════════════════════════════════════════════════════════

router.put('/items/:itemId', requireAuth, async (req, res, next) => {
  try {
    const { complies, observations, photo_urls } = req.body;
    const updateData: Record<string, unknown> = {
      complies,
      observations: observations ?? null,
    };
    if (photo_urls !== undefined) {
      updateData.photo_urls = Array.isArray(photo_urls) ? JSON.stringify(photo_urls) : photo_urls;
    }

    await db
      .update(schema.inspection_items)
      .set(updateData)
      .where(eq(schema.inspection_items.id, req.params.itemId));

    const updated = await db
      .select()
      .from(schema.inspection_items)
      .where(eq(schema.inspection_items.id, req.params.itemId))
      .get();
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Staff Present (literal prefix — must be before /:inspectionId)
// ═══════════════════════════════════════════════════════════════════════════════

router.delete('/staff-present/:recordId', requireAuth, async (req, res, next) => {
  try {
    await db
      .delete(schema.inspection_staff_present)
      .where(eq(schema.inspection_staff_present.id, req.params.recordId));
    res.json({ data: { message: 'Removed' } });
  } catch (err) {
    next(err);
  }
});

router.put('/staff-present/:recordId/evaluation', requireAuth, async (req, res, next) => {
  try {
    const { field, value } = req.body;
    if (field !== 'uniform_ok' && field !== 'station_clean') {
      throw new AppError(400, 'Invalid field');
    }

    await db
      .update(schema.inspection_staff_present)
      .set({ [field]: value })
      .where(eq(schema.inspection_staff_present.id, req.params.recordId));

    const updated = await db
      .select()
      .from(schema.inspection_staff_present)
      .where(eq(schema.inspection_staff_present.id, req.params.recordId))
      .get();
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

router.put('/staff-present/:recordId/observation', requireAuth, async (req, res, next) => {
  try {
    const { observations } = req.body;
    await db
      .update(schema.inspection_staff_present)
      .set({ observations: observations || null })
      .where(eq(schema.inspection_staff_present.id, req.params.recordId));

    const updated = await db
      .select()
      .from(schema.inspection_staff_present)
      .where(eq(schema.inspection_staff_present.id, req.params.recordId))
      .get();
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Inspections List & Create
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { branch_id, status, inspector_id, limit } = req.query;
    const conditions = [];
    if (branch_id) conditions.push(eq(schema.branch_inspections.branch_id, branch_id as string));
    if (status) conditions.push(eq(schema.branch_inspections.status, status as string));
    if (inspector_id) conditions.push(eq(schema.branch_inspections.inspector_id, inspector_id as string));

    let query = db
      .select()
      .from(schema.branch_inspections)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(schema.branch_inspections.created_at));

    if (limit) query = query.limit(Number(limit));

    const rows = await query;
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const { branch_id, inspection_type, present_manager_id } = req.body;

    await db.insert(schema.branch_inspections).values({
      id,
      branch_id,
      inspection_type,
      inspector_id: req.user!.userId,
      present_manager_id: present_manager_id || null,
      status: 'in_progress',
      started_at: now,
      created_at: now,
      updated_at: now,
    });

    const templateItems = await db
      .select()
      .from(schema.inspection_templates)
      .where(
        and(
          eq(schema.inspection_templates.inspection_type, inspection_type),
          eq(schema.inspection_templates.is_active, true),
        ),
      );

    for (const tmpl of templateItems) {
      await db.insert(schema.inspection_items).values({
        id: crypto.randomUUID(),
        inspection_id: id,
        category: tmpl.category,
        item_key: tmpl.item_key,
        item_label: tmpl.item_label,
        sort_order: tmpl.sort_order,
        created_at: now,
      });
    }

    res.status(201).json({ data: { id } });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Single Inspection (parameterized — MUST come after literal routes)
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/:inspectionId', requireAuth, async (req, res, next) => {
  try {
    const inspection = await db
      .select()
      .from(schema.branch_inspections)
      .where(eq(schema.branch_inspections.id, req.params.inspectionId))
      .get();
    if (!inspection) throw new AppError(404, 'Inspection not found');

    const items = await db
      .select()
      .from(schema.inspection_items)
      .where(eq(schema.inspection_items.inspection_id, inspection.id));

    const staffPresent = await db
      .select()
      .from(schema.inspection_staff_present)
      .where(eq(schema.inspection_staff_present.inspection_id, inspection.id));

    res.json({ data: { ...inspection, items, staff_present: staffPresent } });
  } catch (err) {
    next(err);
  }
});

router.put('/:inspectionId', requireAuth, async (req, res, next) => {
  try {
    const existing = await db
      .select()
      .from(schema.branch_inspections)
      .where(eq(schema.branch_inspections.id, req.params.inspectionId))
      .get();
    if (!existing) throw new AppError(404, 'Inspection not found');

    await db
      .update(schema.branch_inspections)
      .set({ ...req.body, updated_at: new Date().toISOString() })
      .where(eq(schema.branch_inspections.id, req.params.inspectionId));

    const updated = await db
      .select()
      .from(schema.branch_inspections)
      .where(eq(schema.branch_inspections.id, req.params.inspectionId))
      .get();
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

router.post('/:inspectionId/complete', requireAuth, async (req, res, next) => {
  try {
    const { inspectionId } = req.params;
    const { general_notes, critical_findings, action_items } = req.body;
    const now = new Date().toISOString();

    const items = await db
      .select()
      .from(schema.inspection_items)
      .where(eq(schema.inspection_items.inspection_id, inspectionId));

    const total = items.length;
    const compliant = items.filter((i) => i.complies === true).length;
    const score = total > 0 ? Math.round((compliant / total) * 100) : 0;

    await db
      .update(schema.branch_inspections)
      .set({
        status: 'completed',
        completed_at: now,
        score_total: score,
        general_notes: general_notes ?? null,
        critical_findings: critical_findings ?? null,
        action_items: action_items ? JSON.stringify(action_items) : null,
        updated_at: now,
      })
      .where(eq(schema.branch_inspections.id, inspectionId));

    res.json({ data: { inspectionId, score } });
  } catch (err) {
    next(err);
  }
});

router.post('/:inspectionId/cancel', requireAuth, async (req, res, next) => {
  try {
    await db
      .update(schema.branch_inspections)
      .set({ status: 'cancelled', updated_at: new Date().toISOString() })
      .where(eq(schema.branch_inspections.id, req.params.inspectionId));
    res.json({ data: { success: true } });
  } catch (err) {
    next(err);
  }
});

router.delete('/:inspectionId', requireAuth, async (req, res, next) => {
  try {
    const { inspectionId } = req.params;
    await db.delete(schema.inspection_items).where(eq(schema.inspection_items.inspection_id, inspectionId));
    await db.delete(schema.inspection_staff_present).where(eq(schema.inspection_staff_present.inspection_id, inspectionId));
    await db.delete(schema.branch_inspections).where(eq(schema.branch_inspections.id, inspectionId));
    res.json({ data: { message: 'Inspection deleted' } });
  } catch (err) {
    next(err);
  }
});

router.get('/:inspectionId/staff-present', requireAuth, async (req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(schema.inspection_staff_present)
      .where(eq(schema.inspection_staff_present.inspection_id, req.params.inspectionId));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/:inspectionId/staff-present', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    await db.insert(schema.inspection_staff_present).values({
      id,
      inspection_id: req.params.inspectionId,
      user_id: req.body.user_id,
      created_at: new Date().toISOString(),
    });

    const created = await db
      .select()
      .from(schema.inspection_staff_present)
      .where(eq(schema.inspection_staff_present.id, id))
      .get();
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

export { router as inspectionRoutes };

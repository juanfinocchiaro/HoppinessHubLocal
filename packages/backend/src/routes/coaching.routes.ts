import { Router } from 'express';
import { db } from '../db/connection.js';
import {
  coachings,
  coaching_competency_scores,
  coaching_station_scores,
  general_competencies,
  manager_competencies,
  work_stations,
  employee_certifications,
} from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// GET /:branchId — list coachings
router.get('/:branchId', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(coachings).where(eq(coachings.branch_id, req.params.branchId));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// GET /detail/:id — get coaching + scores
router.get('/detail/:id', requireAuth, async (req, res, next) => {
  try {
    const coaching = await db.select().from(coachings).where(eq(coachings.id, req.params.id)).get();
    if (!coaching) throw new AppError(404, 'Coaching not found');

    const competencyScores = await db
      .select()
      .from(coaching_competency_scores)
      .where(eq(coaching_competency_scores.coaching_id, coaching.id));

    const stationScores = await db
      .select()
      .from(coaching_station_scores)
      .where(eq(coaching_station_scores.coaching_id, coaching.id));

    res.json({ data: { ...coaching, competencyScores, stationScores } });
  } catch (err) {
    next(err);
  }
});

// POST / — create coaching with scores
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const { competencyScores, stationScores, ...coachingData } = req.body;

    await db.insert(coachings).values({
      id,
      ...coachingData,
      evaluated_by: req.user!.userId,
      created_at: now,
      updated_at: now,
    });

    if (Array.isArray(competencyScores)) {
      for (const score of competencyScores) {
        await db.insert(coaching_competency_scores).values({
          id: crypto.randomUUID(),
          coaching_id: id,
          ...score,
          created_at: now,
        });
      }
    }

    if (Array.isArray(stationScores)) {
      for (const score of stationScores) {
        await db.insert(coaching_station_scores).values({
          id: crypto.randomUUID(),
          coaching_id: id,
          ...score,
          created_at: now,
        });
      }
    }

    const created = await db.select().from(coachings).where(eq(coachings.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

// PUT /:id — update coaching
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(coachings).where(eq(coachings.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Coaching not found');

    await db
      .update(coachings)
      .set({ ...req.body, updated_at: new Date().toISOString() })
      .where(eq(coachings.id, req.params.id));

    const updated = await db.select().from(coachings).where(eq(coachings.id, req.params.id)).get();
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// PUT /:id/acknowledge — acknowledge coaching
router.put('/:id/acknowledge', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(coachings).where(eq(coachings.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Coaching not found');

    await db
      .update(coachings)
      .set({
        acknowledged_at: new Date().toISOString(),
        acknowledged_notes: req.body.notes,
        updated_at: new Date().toISOString(),
      })
      .where(eq(coachings.id, req.params.id));

    const updated = await db.select().from(coachings).where(eq(coachings.id, req.params.id)).get();
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// GET /competencies/general — list general competencies
router.get('/competencies/general', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(general_competencies);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// GET /competencies/manager — list manager competencies
router.get('/competencies/manager', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(manager_competencies);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// GET /stations — list work stations
router.get('/stations', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(work_stations);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// GET /certifications/:branchId — list certifications
router.get('/certifications/:branchId', requireAuth, async (req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(employee_certifications)
      .where(eq(employee_certifications.branch_id, req.params.branchId));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// POST /certifications — upsert certifications
router.post('/certifications', requireAuth, async (req, res, next) => {
  try {
    const { certifications } = req.body;
    const now = new Date().toISOString();
    const results: unknown[] = [];

    if (Array.isArray(certifications)) {
      for (const cert of certifications) {
        const id = cert.id ?? crypto.randomUUID();
        if (cert.id) {
          await db
            .update(employee_certifications)
            .set({ ...cert, certified_by: req.user!.userId, updated_at: now })
            .where(eq(employee_certifications.id, cert.id));
        } else {
          await db.insert(employee_certifications).values({
            id,
            ...cert,
            certified_by: req.user!.userId,
            certified_at: now,
            created_at: now,
            updated_at: now,
          });
        }
        const row = await db.select().from(employee_certifications).where(eq(employee_certifications.id, id)).get();
        results.push(row);
      }
    }

    res.json({ data: results });
  } catch (err) {
    next(err);
  }
});

export { router as coachingRoutes };

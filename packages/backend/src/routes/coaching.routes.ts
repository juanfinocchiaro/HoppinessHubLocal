import { Router } from 'express';
import { db } from '../db/connection.js';
import * as schema from '../db/schema.js';
import { eq, and, gte, lte, inArray, desc, asc } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// ============================================================================
// COACHING QUERIES
// ============================================================================

router.get('/coachings', requireAuth, async (req, res, next) => {
  try {
    const { branchId, userId, month, year } = req.query as Record<string, string>;
    const conditions: ReturnType<typeof eq>[] = [];
    if (branchId) conditions.push(eq(schema.coachings.branch_id, branchId));
    if (userId) conditions.push(eq(schema.coachings.user_id, userId));
    if (month) conditions.push(eq(schema.coachings.coaching_month, Number(month)));
    if (year) conditions.push(eq(schema.coachings.coaching_year, Number(year)));

    const rows = conditions.length > 0
      ? await db.select().from(schema.coachings).where(and(...conditions)).orderBy(desc(schema.coachings.coaching_date))
      : await db.select().from(schema.coachings).orderBy(desc(schema.coachings.coaching_date));

    const coachingIds = rows.map(r => r.id);
    let compScores: typeof schema.coaching_competency_scores.$inferSelect[] = [];
    let stScores: typeof schema.coaching_station_scores.$inferSelect[] = [];

    if (coachingIds.length > 0) {
      compScores = await db.select().from(schema.coaching_competency_scores)
        .where(inArray(schema.coaching_competency_scores.coaching_id, coachingIds));
      stScores = await db.select().from(schema.coaching_station_scores)
        .where(inArray(schema.coaching_station_scores.coaching_id, coachingIds));
    }

    const userIds = [...new Set(rows.map(r => r.user_id).filter(Boolean))] as string[];
    const evaluatorIds = [...new Set(rows.map(r => r.evaluated_by).filter(Boolean))] as string[];
    const allIds = [...new Set([...userIds, ...evaluatorIds])];
    let profileMap: Record<string, string> = {};
    if (allIds.length > 0) {
      const profiles = await db.select({ id: schema.profiles.id, full_name: schema.profiles.full_name })
        .from(schema.profiles).where(inArray(schema.profiles.id, allIds));
      profileMap = Object.fromEntries(profiles.map(p => [p.id, p.full_name ?? '']));
    }

    const enriched = rows.map(r => ({
      ...r,
      employee_name: profileMap[r.user_id!] ?? null,
      evaluator_name: profileMap[r.evaluated_by!] ?? null,
      competencyScores: compScores.filter(s => s.coaching_id === r.id),
      stationScores: stScores.filter(s => s.coaching_id === r.id),
    }));

    res.json({ data: enriched });
  } catch (err) { next(err); }
});

router.get('/employee-coachings', requireAuth, async (req, res, next) => {
  try {
    const { userId, branchId } = req.query as Record<string, string>;
    if (!userId) return res.json({ data: [] });

    const conditions = [eq(schema.coachings.user_id, userId)];
    if (branchId) conditions.push(eq(schema.coachings.branch_id, branchId));

    const rows = await db.select().from(schema.coachings)
      .where(and(...conditions))
      .orderBy(desc(schema.coachings.coaching_date));

    const coachingIds = rows.map(r => r.id);
    let compScores: typeof schema.coaching_competency_scores.$inferSelect[] = [];
    let stScores: typeof schema.coaching_station_scores.$inferSelect[] = [];
    if (coachingIds.length > 0) {
      compScores = await db.select().from(schema.coaching_competency_scores)
        .where(inArray(schema.coaching_competency_scores.coaching_id, coachingIds));
      stScores = await db.select().from(schema.coaching_station_scores)
        .where(inArray(schema.coaching_station_scores.coaching_id, coachingIds));
    }

    const evaluatorIds = [...new Set(rows.map(r => r.evaluated_by).filter(Boolean))] as string[];
    let profileMap: Record<string, string> = {};
    if (evaluatorIds.length > 0) {
      const profiles = await db.select({ id: schema.profiles.id, full_name: schema.profiles.full_name })
        .from(schema.profiles).where(inArray(schema.profiles.id, evaluatorIds));
      profileMap = Object.fromEntries(profiles.map(p => [p.id, p.full_name ?? '']));
    }

    const enriched = rows.map(r => ({
      ...r,
      evaluator_name: profileMap[r.evaluated_by!] ?? null,
      competencyScores: compScores.filter(s => s.coaching_id === r.id),
      stationScores: stScores.filter(s => s.coaching_id === r.id),
    }));

    res.json({ data: enriched });
  } catch (err) { next(err); }
});

router.get('/my-pending', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const rows = await db.select().from(schema.coachings)
      .where(and(
        eq(schema.coachings.user_id, userId),
        eq(schema.coachings.acknowledged_at, ''),
      ))
      .orderBy(desc(schema.coachings.coaching_date));

    const withNull = await db.select().from(schema.coachings)
      .where(eq(schema.coachings.user_id, userId))
      .orderBy(desc(schema.coachings.coaching_date));

    const pending = withNull.filter(r => !r.acknowledged_at);
    res.json({ data: pending });
  } catch (err) { next(err); }
});

router.get('/has-coaching', requireAuth, async (req, res, next) => {
  try {
    const { userId, branchId, month, year } = req.query as Record<string, string>;
    if (!userId || !branchId || !month || !year) return res.json({ data: false });

    const row = await db.select().from(schema.coachings)
      .where(and(
        eq(schema.coachings.user_id, userId),
        eq(schema.coachings.branch_id, branchId),
        eq(schema.coachings.coaching_month, Number(month)),
        eq(schema.coachings.coaching_year, Number(year)),
      )).limit(1).get();
    res.json({ data: !!row });
  } catch (err) { next(err); }
});

router.get('/stats', requireAuth, async (req, res, next) => {
  try {
    const { branchId, month, year } = req.query as Record<string, string>;
    if (!branchId) return res.json({ data: { totalEmployees: 0, coachingsThisMonth: 0, pendingCoachings: 0, pendingAcknowledgments: 0, completionRate: 0, averageScore: null, employeesWithoutCoaching: [], totalManagers: 0, managersWithCoaching: 0, pendingManagerCoachings: 0, managersWithoutCoaching: [] } });

    const assignments = await db.select().from(schema.user_role_assignments)
      .where(and(eq(schema.user_role_assignments.branch_id, branchId), eq(schema.user_role_assignments.is_active, true)));

    const allRoles = await db.select().from(schema.roles);
    const roleMap = Object.fromEntries(allRoles.map(r => [r.id, r.key]));
    const managerKeys = new Set(['encargado', 'administrador', 'franquiciado']);

    const employees = assignments.filter(a => !managerKeys.has(roleMap[a.role_id!] ?? ''));
    const managers = assignments.filter(a => managerKeys.has(roleMap[a.role_id!] ?? ''));

    const conditions = [eq(schema.coachings.branch_id, branchId)];
    if (month) conditions.push(eq(schema.coachings.coaching_month, Number(month)));
    if (year) conditions.push(eq(schema.coachings.coaching_year, Number(year)));

    const coachingsMonth = await db.select().from(schema.coachings).where(and(...conditions));

    const coachedUserIds = new Set(coachingsMonth.map(c => c.user_id));
    const empIds = employees.map(e => e.user_id!);
    const mgrIds = managers.map(m => m.user_id!);

    const employeesWithoutCoaching = empIds.filter(id => !coachedUserIds.has(id));
    const managersWithoutCoaching = mgrIds.filter(id => !coachedUserIds.has(id));
    const pendingAck = coachingsMonth.filter(c => !c.acknowledged_at);

    const scores = coachingsMonth.map(c => c.overall_score).filter(s => s != null) as number[];
    const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

    const managersWithCoaching = mgrIds.filter(id => coachedUserIds.has(id)).length;

    res.json({
      data: {
        totalEmployees: empIds.length,
        coachingsThisMonth: coachingsMonth.length,
        pendingCoachings: employeesWithoutCoaching.length,
        pendingAcknowledgments: pendingAck.length,
        completionRate: empIds.length > 0 ? (empIds.filter(id => coachedUserIds.has(id)).length / empIds.length) * 100 : 0,
        averageScore,
        employeesWithoutCoaching,
        totalManagers: mgrIds.length,
        managersWithCoaching,
        pendingManagerCoachings: managersWithoutCoaching.length,
        managersWithoutCoaching,
      },
    });
  } catch (err) { next(err); }
});

router.get('/score-history', requireAuth, async (req, res, next) => {
  try {
    const { userId, branchId, months } = req.query as Record<string, string>;
    if (!userId || !branchId) return res.json({ data: [] });

    const monthsBack = Number(months) || 6;
    const now = new Date();
    const fromDate = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);

    const rows = await db.select().from(schema.coachings)
      .where(and(
        eq(schema.coachings.user_id, userId),
        eq(schema.coachings.branch_id, branchId),
        gte(schema.coachings.coaching_date, fromDate.toISOString()),
      ))
      .orderBy(asc(schema.coachings.coaching_date));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

// ============================================================================
// COACHING MUTATIONS
// ============================================================================

router.post('/coachings', requireAuth, async (req, res, next) => {
  try {
    const {
      userId, branchId, coachingDate, stationScores, generalScores,
      strengths, areasToImprove, actionPlan, managerNotes,
      previousActionReview, certificationChanges,
    } = req.body;

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const date = new Date(coachingDate);

    let stationAvg: number | null = null;
    let generalAvg: number | null = null;
    if (Array.isArray(stationScores) && stationScores.length > 0) {
      stationAvg = stationScores.reduce((sum: number, s: { score: number }) => sum + s.score, 0) / stationScores.length;
    }
    if (Array.isArray(generalScores) && generalScores.length > 0) {
      generalAvg = generalScores.reduce((sum: number, s: { score: number }) => sum + s.score, 0) / generalScores.length;
    }
    const overallScore = stationAvg != null && generalAvg != null
      ? (stationAvg + generalAvg) / 2
      : stationAvg ?? generalAvg;

    await db.insert(schema.coachings).values({
      id,
      user_id: userId,
      branch_id: branchId,
      evaluated_by: req.user!.userId,
      coaching_date: coachingDate,
      coaching_month: date.getMonth() + 1,
      coaching_year: date.getFullYear(),
      station_score: stationAvg,
      general_score: generalAvg,
      overall_score: overallScore,
      strengths: strengths ?? null,
      areas_to_improve: areasToImprove ?? null,
      action_plan: actionPlan ?? null,
      manager_notes: managerNotes ?? null,
      previous_action_review: previousActionReview ?? null,
      created_at: now,
      updated_at: now,
    });

    if (Array.isArray(stationScores)) {
      for (const s of stationScores) {
        await db.insert(schema.coaching_station_scores).values({
          id: crypto.randomUUID(),
          coaching_id: id,
          station_id: s.stationId ?? s.station_id,
          score: s.score,
          notes: s.notes ?? null,
          created_at: now,
        });
      }
    }

    if (Array.isArray(generalScores)) {
      for (const s of generalScores) {
        await db.insert(schema.coaching_competency_scores).values({
          id: crypto.randomUUID(),
          coaching_id: id,
          competency_type: s.competencyType ?? s.competency_type ?? 'general',
          competency_id: s.competencyId ?? s.competency_id,
          score: s.score,
          notes: s.notes ?? null,
          created_at: now,
        });
      }
    }

    if (Array.isArray(certificationChanges)) {
      for (const c of certificationChanges) {
        const existing = await db.select().from(schema.employee_certifications)
          .where(and(
            eq(schema.employee_certifications.user_id, userId),
            eq(schema.employee_certifications.branch_id, branchId),
            eq(schema.employee_certifications.station_id, c.stationId ?? c.station_id),
          )).get();

        if (existing) {
          await db.update(schema.employee_certifications).set({
            level: c.level, certified_by: req.user!.userId, updated_at: now,
          }).where(eq(schema.employee_certifications.id, existing.id));
        } else {
          await db.insert(schema.employee_certifications).values({
            id: crypto.randomUUID(),
            user_id: userId, branch_id: branchId,
            station_id: c.stationId ?? c.station_id,
            level: c.level, certified_by: req.user!.userId,
            certified_at: now, created_at: now, updated_at: now,
          });
        }
      }
    }

    const created = await db.select().from(schema.coachings).where(eq(schema.coachings.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) { next(err); }
});

router.post('/coachings/:coachingId/acknowledge', requireAuth, async (req, res, next) => {
  try {
    const { coachingId } = req.params;
    const { notes } = req.body;
    const now = new Date().toISOString();

    await db.update(schema.coachings).set({
      acknowledged_at: now,
      acknowledged_notes: notes ?? null,
      updated_at: now,
    }).where(eq(schema.coachings.id, coachingId));

    const row = await db.select().from(schema.coachings).where(eq(schema.coachings.id, coachingId)).get();
    if (!row) throw new AppError(404, 'Coaching not found');
    res.json({ data: row });
  } catch (err) { next(err); }
});

router.get('/coachings/:coachingId', requireAuth, async (req, res, next) => {
  try {
    const { coachingId } = req.params;
    const coaching = await db.select().from(schema.coachings)
      .where(eq(schema.coachings.id, coachingId)).get();
    if (!coaching) return res.json({ data: null });

    const compScores = await db.select().from(schema.coaching_competency_scores)
      .where(eq(schema.coaching_competency_scores.coaching_id, coachingId));
    const stScores = await db.select().from(schema.coaching_station_scores)
      .where(eq(schema.coaching_station_scores.coaching_id, coachingId));

    const ids = [coaching.user_id, coaching.evaluated_by].filter(Boolean) as string[];
    let profileMap: Record<string, string> = {};
    if (ids.length > 0) {
      const profiles = await db.select({ id: schema.profiles.id, full_name: schema.profiles.full_name })
        .from(schema.profiles).where(inArray(schema.profiles.id, ids));
      profileMap = Object.fromEntries(profiles.map(p => [p.id, p.full_name ?? '']));
    }

    res.json({
      data: {
        ...coaching,
        employee_name: profileMap[coaching.user_id!] ?? null,
        evaluator_name: profileMap[coaching.evaluated_by!] ?? null,
        competencyScores: compScores,
        stationScores: stScores,
      },
    });
  } catch (err) { next(err); }
});

// ============================================================================
// CERTIFICATIONS
// ============================================================================

router.get('/certifications/employee', requireAuth, async (req, res, next) => {
  try {
    const { userId, branchId } = req.query as Record<string, string>;
    if (!userId || !branchId) return res.json({ data: [] });

    const rows = await db.select().from(schema.employee_certifications)
      .where(and(
        eq(schema.employee_certifications.user_id, userId),
        eq(schema.employee_certifications.branch_id, branchId),
      ));

    const stationIds = [...new Set(rows.map(r => r.station_id).filter(Boolean))] as string[];
    let stationMap: Record<string, { name: string | null; key: string | null }> = {};
    if (stationIds.length > 0) {
      const stations = await db.select().from(schema.work_stations)
        .where(inArray(schema.work_stations.id, stationIds));
      stationMap = Object.fromEntries(stations.map(s => [s.id, { name: s.name, key: s.key }]));
    }

    const enriched = rows.map(r => ({
      ...r,
      station_name: stationMap[r.station_id!]?.name ?? null,
      station_key: stationMap[r.station_id!]?.key ?? null,
    }));
    res.json({ data: enriched });
  } catch (err) { next(err); }
});

router.get('/certifications/team', requireAuth, async (req, res, next) => {
  try {
    const { branchId } = req.query as Record<string, string>;
    if (!branchId) return res.json({ data: { certifications: [], byUser: {} } });

    const rows = await db.select().from(schema.employee_certifications)
      .where(eq(schema.employee_certifications.branch_id, branchId));

    const stationIds = [...new Set(rows.map(r => r.station_id).filter(Boolean))] as string[];
    let stationMap: Record<string, { name: string | null; key: string | null }> = {};
    if (stationIds.length > 0) {
      const stations = await db.select().from(schema.work_stations)
        .where(inArray(schema.work_stations.id, stationIds));
      stationMap = Object.fromEntries(stations.map(s => [s.id, { name: s.name, key: s.key }]));
    }

    const enriched = rows.map(r => ({
      ...r,
      station_name: stationMap[r.station_id!]?.name ?? null,
      station_key: stationMap[r.station_id!]?.key ?? null,
    }));

    const byUser: Record<string, typeof enriched> = {};
    for (const r of enriched) {
      if (!r.user_id) continue;
      if (!byUser[r.user_id]) byUser[r.user_id] = [];
      byUser[r.user_id].push(r);
    }

    res.json({ data: { certifications: enriched, byUser } });
  } catch (err) { next(err); }
});

router.get('/certifications', requireAuth, async (req, res, next) => {
  try {
    const { branchId, userId, stationId } = req.query as Record<string, string>;
    const conditions: ReturnType<typeof eq>[] = [];
    if (branchId) conditions.push(eq(schema.employee_certifications.branch_id, branchId));
    if (userId) conditions.push(eq(schema.employee_certifications.user_id, userId));
    if (stationId) conditions.push(eq(schema.employee_certifications.station_id, stationId));

    const rows = conditions.length > 0
      ? await db.select().from(schema.employee_certifications).where(and(...conditions))
      : await db.select().from(schema.employee_certifications);

    const stationIds = [...new Set(rows.map(r => r.station_id).filter(Boolean))] as string[];
    let stationMap: Record<string, { name: string | null; key: string | null }> = {};
    if (stationIds.length > 0) {
      const stations = await db.select().from(schema.work_stations)
        .where(inArray(schema.work_stations.id, stationIds));
      stationMap = Object.fromEntries(stations.map(s => [s.id, { name: s.name, key: s.key }]));
    }

    const enriched = rows.map(r => ({
      ...r,
      station_name: stationMap[r.station_id!]?.name ?? null,
      station_key: stationMap[r.station_id!]?.key ?? null,
    }));
    res.json({ data: enriched });
  } catch (err) { next(err); }
});

router.post('/certifications/batch', requireAuth, async (req, res, next) => {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates)) throw new AppError(400, 'updates must be an array');

    const now = new Date().toISOString();
    for (const u of updates) {
      const existing = await db.select().from(schema.employee_certifications)
        .where(and(
          eq(schema.employee_certifications.user_id, u.userId),
          eq(schema.employee_certifications.branch_id, u.branchId),
          eq(schema.employee_certifications.station_id, u.stationId),
        )).get();

      if (existing) {
        await db.update(schema.employee_certifications).set({
          level: u.level, notes: u.notes ?? existing.notes,
          certified_by: req.user!.userId, updated_at: now,
        }).where(eq(schema.employee_certifications.id, existing.id));
      } else {
        await db.insert(schema.employee_certifications).values({
          id: crypto.randomUUID(),
          user_id: u.userId, branch_id: u.branchId, station_id: u.stationId,
          level: u.level, notes: u.notes ?? null,
          certified_by: req.user!.userId, certified_at: now,
          created_at: now, updated_at: now,
        });
      }
    }
    res.json({ data: { success: true } });
  } catch (err) { next(err); }
});

router.post('/certifications', requireAuth, async (req, res, next) => {
  try {
    const { userId, branchId, stationId, level, notes } = req.body;
    if (!userId || !branchId || !stationId) {
      throw new AppError(400, 'userId, branchId, and stationId are required');
    }

    const now = new Date().toISOString();
    const existing = await db.select().from(schema.employee_certifications)
      .where(and(
        eq(schema.employee_certifications.user_id, userId),
        eq(schema.employee_certifications.branch_id, branchId),
        eq(schema.employee_certifications.station_id, stationId),
      )).get();

    if (existing) {
      await db.update(schema.employee_certifications).set({
        level, notes: notes ?? existing.notes,
        certified_by: req.user!.userId, updated_at: now,
      }).where(eq(schema.employee_certifications.id, existing.id));
      const row = await db.select().from(schema.employee_certifications)
        .where(eq(schema.employee_certifications.id, existing.id)).get();
      return res.json({ data: row });
    }

    const id = crypto.randomUUID();
    await db.insert(schema.employee_certifications).values({
      id, user_id: userId, branch_id: branchId, station_id: stationId,
      level, notes: notes ?? null, certified_by: req.user!.userId,
      certified_at: now, created_at: now, updated_at: now,
    });
    const row = await db.select().from(schema.employee_certifications)
      .where(eq(schema.employee_certifications.id, id)).get();
    res.status(201).json({ data: row });
  } catch (err) { next(err); }
});

// ============================================================================
// WORK STATIONS & COMPETENCIES CONFIG
// ============================================================================

router.get('/work-stations/active', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(schema.work_stations)
      .where(eq(schema.work_stations.is_active, true))
      .orderBy(asc(schema.work_stations.sort_order));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/work-stations', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(schema.work_stations)
      .orderBy(asc(schema.work_stations.sort_order));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/station-competencies/all', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(schema.station_competencies)
      .orderBy(asc(schema.station_competencies.sort_order));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/station-competencies', requireAuth, async (req, res, next) => {
  try {
    const { stationId } = req.query as Record<string, string>;
    if (!stationId) {
      const rows = await db.select().from(schema.station_competencies)
        .orderBy(asc(schema.station_competencies.sort_order));
      return res.json({ data: rows });
    }

    const rows = await db.select().from(schema.station_competencies)
      .where(eq(schema.station_competencies.station_id, stationId))
      .orderBy(asc(schema.station_competencies.sort_order));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/general-competencies/active', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(schema.general_competencies)
      .where(eq(schema.general_competencies.is_active, true))
      .orderBy(asc(schema.general_competencies.sort_order));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/general-competencies', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(schema.general_competencies)
      .orderBy(asc(schema.general_competencies.sort_order));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/manager-competencies', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(schema.manager_competencies)
      .orderBy(asc(schema.manager_competencies.sort_order));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

// ============================================================================
// NETWORK / BRANCH ANALYSIS
// ============================================================================

router.get('/branches/active', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select({ id: schema.branches.id, name: schema.branches.name, slug: schema.branches.slug })
      .from(schema.branches).where(eq(schema.branches.is_active, true));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/branches/:branchId/name', requireAuth, async (req, res, next) => {
  try {
    const row = await db.select({ name: schema.branches.name })
      .from(schema.branches).where(eq(schema.branches.id, req.params.branchId)).get();
    res.json({ data: row ?? null });
  } catch (err) { next(err); }
});

router.get('/branches/:branchId/manager', requireAuth, async (req, res, next) => {
  try {
    const managerRoles = await db.select({ id: schema.roles.id }).from(schema.roles)
      .where(inArray(schema.roles.key, ['encargado', 'administrador']));
    const managerRoleIds = managerRoles.map(r => r.id);
    if (managerRoleIds.length === 0) return res.json({ data: null });

    const assignment = await db.select().from(schema.user_role_assignments)
      .where(and(
        eq(schema.user_role_assignments.branch_id, req.params.branchId),
        eq(schema.user_role_assignments.is_active, true),
        inArray(schema.user_role_assignments.role_id, managerRoleIds),
      )).get();

    if (!assignment) return res.json({ data: null });

    const profile = await db.select({ id: schema.profiles.id, full_name: schema.profiles.full_name })
      .from(schema.profiles).where(eq(schema.profiles.id, assignment.user_id!)).get();
    res.json({ data: profile ?? null });
  } catch (err) { next(err); }
});

router.post('/staff-roles', requireAuth, async (req, res, next) => {
  try {
    const { branchIds } = req.body;
    if (!Array.isArray(branchIds) || branchIds.length === 0) return res.json({ data: [] });

    const rows = await db.select().from(schema.user_role_assignments)
      .where(and(
        inArray(schema.user_role_assignments.branch_id, branchIds),
        eq(schema.user_role_assignments.is_active, true),
      ));

    const allRoles = await db.select().from(schema.roles);
    const roleMap = Object.fromEntries(allRoles.map(r => [r.id, r.key]));

    const enriched = rows.map(r => ({
      ...r,
      local_role: roleMap[r.role_id!] ?? 'empleado',
    }));
    res.json({ data: enriched });
  } catch (err) { next(err); }
});

router.post('/by-branches-month', requireAuth, async (req, res, next) => {
  try {
    const { branchIds, month, year } = req.body;
    if (!Array.isArray(branchIds) || branchIds.length === 0) return res.json({ data: [] });

    const rows = await db.select().from(schema.coachings)
      .where(and(
        inArray(schema.coachings.branch_id, branchIds),
        eq(schema.coachings.coaching_month, Number(month)),
        eq(schema.coachings.coaching_year, Number(year)),
      ));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/scores-by-branches-month', requireAuth, async (req, res, next) => {
  try {
    const { branchIds, month, year } = req.body;
    if (!Array.isArray(branchIds) || branchIds.length === 0) return res.json({ data: [] });

    const coachings = await db.select().from(schema.coachings)
      .where(and(
        inArray(schema.coachings.branch_id, branchIds),
        eq(schema.coachings.coaching_month, Number(month)),
        eq(schema.coachings.coaching_year, Number(year)),
      ));

    const coachingIds = coachings.map(c => c.id);
    if (coachingIds.length === 0) return res.json({ data: [] });

    const compScores = await db.select().from(schema.coaching_competency_scores)
      .where(inArray(schema.coaching_competency_scores.coaching_id, coachingIds));
    const stScores = await db.select().from(schema.coaching_station_scores)
      .where(inArray(schema.coaching_station_scores.coaching_id, coachingIds));

    res.json({ data: { coachings, competencyScores: compScores, stationScores: stScores } });
  } catch (err) { next(err); }
});

router.post('/profiles', requireAuth, async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.json({ data: [] });

    const rows = await db.select().from(schema.profiles).where(inArray(schema.profiles.id, ids));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/branches-by-ids', requireAuth, async (req, res, next) => {
  try {
    const { branchIds } = req.body;
    if (!Array.isArray(branchIds) || branchIds.length === 0) return res.json({ data: [] });

    const rows = await db.select({ id: schema.branches.id, name: schema.branches.name, slug: schema.branches.slug })
      .from(schema.branches).where(inArray(schema.branches.id, branchIds));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/by-users-month', requireAuth, async (req, res, next) => {
  try {
    const { userIds, month, year } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0) return res.json({ data: [] });

    const rows = await db.select().from(schema.coachings)
      .where(and(
        inArray(schema.coachings.user_id, userIds),
        eq(schema.coachings.coaching_month, Number(month)),
        eq(schema.coachings.coaching_year, Number(year)),
      ));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/scores-by-users-month', requireAuth, async (req, res, next) => {
  try {
    const { userIds, month, year } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0) return res.json({ data: [] });

    const coachings = await db.select().from(schema.coachings)
      .where(and(
        inArray(schema.coachings.user_id, userIds),
        eq(schema.coachings.coaching_month, Number(month)),
        eq(schema.coachings.coaching_year, Number(year)),
      ));

    const coachingIds = coachings.map(c => c.id);
    if (coachingIds.length === 0) return res.json({ data: [] });

    const compScores = await db.select().from(schema.coaching_competency_scores)
      .where(inArray(schema.coaching_competency_scores.coaching_id, coachingIds));
    const stScores = await db.select().from(schema.coaching_station_scores)
      .where(inArray(schema.coaching_station_scores.coaching_id, coachingIds));

    res.json({ data: { coachings, competencyScores: compScores, stationScores: stScores } });
  } catch (err) { next(err); }
});

// ============================================================================
// TEAM ANALYSIS
// ============================================================================

router.get('/branch-last-6-months', requireAuth, async (req, res, next) => {
  try {
    const { branchId } = req.query as Record<string, string>;
    if (!branchId) return res.json({ data: [] });

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const rows = await db.select().from(schema.coachings)
      .where(and(
        eq(schema.coachings.branch_id, branchId),
        gte(schema.coachings.coaching_date, sixMonthsAgo.toISOString()),
      ))
      .orderBy(asc(schema.coachings.coaching_date));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/station-scores', requireAuth, async (req, res, next) => {
  try {
    const { branchId } = req.query as Record<string, string>;
    if (!branchId) return res.json({ data: [] });

    const coachings = await db.select({ id: schema.coachings.id }).from(schema.coachings)
      .where(eq(schema.coachings.branch_id, branchId));
    const coachingIds = coachings.map(c => c.id);
    if (coachingIds.length === 0) return res.json({ data: [] });

    const scores = await db.select().from(schema.coaching_station_scores)
      .where(inArray(schema.coaching_station_scores.coaching_id, coachingIds));
    res.json({ data: scores });
  } catch (err) { next(err); }
});

router.get('/competency-scores', requireAuth, async (req, res, next) => {
  try {
    const { branchId } = req.query as Record<string, string>;
    if (!branchId) return res.json({ data: [] });

    const coachings = await db.select({ id: schema.coachings.id }).from(schema.coachings)
      .where(eq(schema.coachings.branch_id, branchId));
    const coachingIds = coachings.map(c => c.id);
    if (coachingIds.length === 0) return res.json({ data: [] });

    const scores = await db.select().from(schema.coaching_competency_scores)
      .where(inArray(schema.coaching_competency_scores.coaching_id, coachingIds));
    res.json({ data: scores });
  } catch (err) { next(err); }
});

router.get('/employee-comparison', requireAuth, async (req, res, next) => {
  try {
    const { userId, branchId } = req.query as Record<string, string>;
    if (!userId || !branchId) return res.json({ data: { employee: [], branch: [] } });

    const empCoachings = await db.select().from(schema.coachings)
      .where(and(eq(schema.coachings.user_id, userId), eq(schema.coachings.branch_id, branchId)))
      .orderBy(asc(schema.coachings.coaching_date));

    const branchCoachings = await db.select().from(schema.coachings)
      .where(eq(schema.coachings.branch_id, branchId))
      .orderBy(asc(schema.coachings.coaching_date));

    res.json({ data: { employee: empCoachings, branch: branchCoachings } });
  } catch (err) { next(err); }
});

// ============================================================================
// TEAM MEMBERS & MANAGER LISTS
// ============================================================================

router.get('/team-members', requireAuth, async (req, res, next) => {
  try {
    const { branchId, excludeUserId } = req.query as Record<string, string>;
    if (!branchId) return res.json({ data: [] });

    const assignments = await db.select().from(schema.user_role_assignments)
      .where(and(
        eq(schema.user_role_assignments.branch_id, branchId),
        eq(schema.user_role_assignments.is_active, true),
      ));

    let userIds = assignments.map(a => a.user_id).filter(Boolean) as string[];
    if (excludeUserId) userIds = userIds.filter(id => id !== excludeUserId);
    if (userIds.length === 0) return res.json({ data: [] });

    const profiles = await db.select({
      id: schema.profiles.id,
      full_name: schema.profiles.full_name,
      avatar_url: schema.profiles.avatar_url,
    }).from(schema.profiles).where(inArray(schema.profiles.id, userIds));

    const allRoles = await db.select().from(schema.roles);
    const roleMap = Object.fromEntries(allRoles.map(r => [r.id, r.key]));

    const result = assignments
      .filter(a => userIds.includes(a.user_id!))
      .map(a => {
        const profile = profiles.find(p => p.id === a.user_id);
        return {
          id: a.user_id,
          full_name: profile?.full_name ?? null,
          avatar_url: profile?.avatar_url ?? null,
          local_role: roleMap[a.role_id!] ?? 'empleado',
        };
      });

    res.json({ data: result });
  } catch (err) { next(err); }
});

router.get('/employees-with-counts', requireAuth, async (req, res, next) => {
  try {
    const { branchId } = req.query as Record<string, string>;
    if (!branchId) return res.json({ data: [] });

    const assignments = await db.select().from(schema.user_role_assignments)
      .where(and(
        eq(schema.user_role_assignments.branch_id, branchId),
        eq(schema.user_role_assignments.is_active, true),
      ));

    const userIds = assignments.map(a => a.user_id).filter(Boolean) as string[];
    if (userIds.length === 0) return res.json({ data: [] });

    const profiles = await db.select({ id: schema.profiles.id, full_name: schema.profiles.full_name })
      .from(schema.profiles).where(inArray(schema.profiles.id, userIds));

    const coachings = await db.select().from(schema.coachings)
      .where(eq(schema.coachings.branch_id, branchId));

    const countMap: Record<string, number> = {};
    for (const c of coachings) {
      if (c.user_id) countMap[c.user_id] = (countMap[c.user_id] ?? 0) + 1;
    }

    const result = profiles.map(p => ({
      id: p.id,
      full_name: p.full_name,
      coaching_count: countMap[p.id] ?? 0,
    }));

    res.json({ data: result });
  } catch (err) { next(err); }
});

router.get('/own', requireAuth, async (req, res, next) => {
  try {
    const { userId, branchId } = req.query as Record<string, string>;
    if (!userId) return res.json({ data: [] });

    const conditions = [eq(schema.coachings.user_id, userId)];
    if (branchId) conditions.push(eq(schema.coachings.branch_id, branchId));

    const rows = await db.select().from(schema.coachings)
      .where(and(...conditions))
      .orderBy(desc(schema.coachings.coaching_date));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/manager-roles', requireAuth, async (req, res, next) => {
  try {
    const { branchId } = req.query as Record<string, string>;
    const managerRoles = await db.select({ id: schema.roles.id }).from(schema.roles)
      .where(inArray(schema.roles.key, ['encargado', 'administrador']));
    const managerRoleIds = managerRoles.map(r => r.id);
    if (managerRoleIds.length === 0) return res.json({ data: [] });

    const conditions = [
      eq(schema.user_role_assignments.is_active, true),
      inArray(schema.user_role_assignments.role_id, managerRoleIds),
    ];
    if (branchId) conditions.push(eq(schema.user_role_assignments.branch_id, branchId));

    const rows = await db.select().from(schema.user_role_assignments).where(and(...conditions));

    const allRolesDb = await db.select().from(schema.roles);
    const roleMap = Object.fromEntries(allRolesDb.map(r => [r.id, r.key]));

    const enriched = rows.map(r => ({ ...r, local_role: roleMap[r.role_id!] ?? 'encargado' }));
    res.json({ data: enriched });
  } catch (err) { next(err); }
});

router.get('/manager-coachings', requireAuth, async (req, res, next) => {
  try {
    const { managerId, branchId } = req.query as Record<string, string>;
    if (!managerId) return res.json({ data: [] });

    const conditions = [eq(schema.coachings.user_id, managerId)];
    if (branchId) conditions.push(eq(schema.coachings.branch_id, branchId));

    const rows = await db.select().from(schema.coachings)
      .where(and(...conditions))
      .orderBy(desc(schema.coachings.coaching_date));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

export { router as coachingRoutes };

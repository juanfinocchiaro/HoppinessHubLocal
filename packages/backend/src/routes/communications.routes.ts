import { Router } from 'express';
import { db } from '../db/connection.js';
import * as schema from '../db/schema.js';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// ============================================================================
// QUERIES
// ============================================================================

router.get('/user/:userId/urgent-unread', requireAuth, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { roles } = req.query as Record<string, string>;
    const userRoles = roles ? roles.split(',') : [];

    const comms = await db.select().from(schema.communications)
      .where(and(
        eq(schema.communications.is_published, true),
        eq(schema.communications.type, 'urgente'),
      ))
      .orderBy(desc(schema.communications.published_at));

    const commIds = comms.map(c => c.id);
    let readSet = new Set<string>();
    if (commIds.length > 0) {
      const reads = await db.select({ communication_id: schema.communication_reads.communication_id })
        .from(schema.communication_reads)
        .where(and(
          inArray(schema.communication_reads.communication_id, commIds),
          eq(schema.communication_reads.user_id, userId),
        ));
      readSet = new Set(reads.map(r => r.communication_id!));
    }

    const unread = comms.filter(c => {
      if (readSet.has(c.id)) return false;
      if (c.target_roles) {
        try {
          const targetRoles = JSON.parse(c.target_roles) as string[];
          if (targetRoles.length > 0 && !targetRoles.some(r => userRoles.includes(r))) return false;
        } catch { /* no role filter */ }
      }
      if (c.expires_at && new Date(c.expires_at) < new Date()) return false;
      return true;
    }).map(c => ({ id: c.id, title: c.title }));

    res.json({ data: unread });
  } catch (err) { next(err); }
});

router.get('/user/:userId', requireAuth, async (req, res, next) => {
  try {
    const { userId } = req.params;

    const assignments = await db.select().from(schema.user_role_assignments)
      .where(and(
        eq(schema.user_role_assignments.user_id, userId),
        eq(schema.user_role_assignments.is_active, true),
      ));

    const branchIds = assignments.map(a => a.branch_id).filter(Boolean) as string[];
    const allRoles = await db.select().from(schema.roles);
    const roleMap = Object.fromEntries(allRoles.map(r => [r.id, r.key]));
    const userRoles = assignments.map(a => roleMap[a.role_id!]).filter(Boolean);

    const allComms = await db.select().from(schema.communications)
      .where(eq(schema.communications.is_published, true))
      .orderBy(desc(schema.communications.published_at));

    const commIds = allComms.map(c => c.id);
    let readMap: Record<string, typeof schema.communication_reads.$inferSelect> = {};
    if (commIds.length > 0) {
      const reads = await db.select().from(schema.communication_reads)
        .where(and(
          inArray(schema.communication_reads.communication_id, commIds),
          eq(schema.communication_reads.user_id, userId),
        ));
      readMap = Object.fromEntries(reads.map(r => [r.communication_id!, r]));
    }

    const brand: (typeof allComms[number] & { read_at?: string | null; confirmed_at?: string | null; source_type?: string | null })[] = [];
    const local: (typeof allComms[number] & { read_at?: string | null; confirmed_at?: string | null; source_type?: string | null })[] = [];

    for (const c of allComms) {
      if (c.expires_at && new Date(c.expires_at) < new Date()) continue;

      if (c.target_roles) {
        try {
          const targetRoles = JSON.parse(c.target_roles) as string[];
          if (targetRoles.length > 0 && !targetRoles.some(r => userRoles.includes(r))) continue;
        } catch { /* skip filter */ }
      }

      const readInfo = readMap[c.id];
      const enriched = {
        ...c,
        read_at: readInfo?.read_at ?? null,
        confirmed_at: readInfo?.confirmed_at ?? null,
      };

      if (c.source_type === 'local') {
        if (c.source_branch_id && branchIds.includes(c.source_branch_id)) {
          local.push(enriched);
        }
      } else {
        if (c.target_branch_ids) {
          try {
            const targetBranches = JSON.parse(c.target_branch_ids) as string[];
            if (targetBranches.length > 0 && !targetBranches.some(b => branchIds.includes(b))) continue;
          } catch { /* no branch filter */ }
        }
        brand.push(enriched);
      }
    }

    res.json({ data: { brand, local } });
  } catch (err) { next(err); }
});

router.get('/local/:branchId', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(schema.communications)
      .where(and(
        eq(schema.communications.source_type, 'local'),
        eq(schema.communications.source_branch_id, req.params.branchId),
        eq(schema.communications.is_published, true),
      ))
      .orderBy(desc(schema.communications.published_at));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/branches/:branchId/team', requireAuth, async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const assignments = await db.select({ user_id: schema.user_role_assignments.user_id })
      .from(schema.user_role_assignments)
      .where(and(
        eq(schema.user_role_assignments.branch_id, branchId),
        eq(schema.user_role_assignments.is_active, true),
      ));

    const userIds = assignments.map(a => a.user_id).filter(Boolean) as string[];
    if (userIds.length === 0) return res.json({ data: [] });

    const profiles = await db.select({ id: schema.profiles.id, full_name: schema.profiles.full_name })
      .from(schema.profiles).where(inArray(schema.profiles.id, userIds));

    const result = profiles.map(p => ({ user_id: p.id, full_name: p.full_name }));
    res.json({ data: result });
  } catch (err) { next(err); }
});

router.get('/branches/:branchId', requireAuth, async (req, res, next) => {
  try {
    const branch = await db.select().from(schema.branches)
      .where(eq(schema.branches.id, req.params.branchId)).get();
    res.json({ data: branch ?? null });
  } catch (err) { next(err); }
});

router.get('/:communicationId/readers', requireAuth, async (req, res, next) => {
  try {
    const { communicationId } = req.params;
    const reads = await db.select().from(schema.communication_reads)
      .where(eq(schema.communication_reads.communication_id, communicationId));

    const userIds = reads.map(r => r.user_id).filter(Boolean) as string[];
    let profileMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const profiles = await db.select({ id: schema.profiles.id, full_name: schema.profiles.full_name })
        .from(schema.profiles).where(inArray(schema.profiles.id, userIds));
      profileMap = Object.fromEntries(profiles.map(p => [p.id, p.full_name ?? '']));
    }

    const readers = reads.map(r => ({
      ...r,
      full_name: profileMap[r.user_id!] ?? null,
    }));

    const comm = await db.select().from(schema.communications)
      .where(eq(schema.communications.id, communicationId)).get();

    let totalTargeted = 0;
    if (comm?.target_branch_ids) {
      try {
        const branchIds = JSON.parse(comm.target_branch_ids) as string[];
        if (branchIds.length > 0) {
          const assignments = await db.select({ user_id: schema.user_role_assignments.user_id })
            .from(schema.user_role_assignments)
            .where(and(
              inArray(schema.user_role_assignments.branch_id, branchIds),
              eq(schema.user_role_assignments.is_active, true),
            ));
          totalTargeted = new Set(assignments.map(a => a.user_id)).size;
        }
      } catch { /* ignore */ }
    }

    res.json({ data: { readers, totalTargeted } });
  } catch (err) { next(err); }
});

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { limit } = req.query as Record<string, string>;
    const maxRows = Number(limit) || 100;

    const rows = await db.select().from(schema.communications)
      .where(eq(schema.communications.is_published, true))
      .orderBy(desc(schema.communications.published_at))
      .limit(maxRows);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

// ============================================================================
// MUTATIONS
// ============================================================================

router.post('/local', requireAuth, async (req, res, next) => {
  try {
    const { title, body, type, branchId, createdBy, targetRoles } = req.body;
    if (!title || !branchId) throw new AppError(400, 'title and branchId are required');

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(schema.communications).values({
      id,
      title,
      body: body ?? null,
      type: type ?? 'info',
      source_type: 'local',
      source_branch_id: branchId,
      target_branch_ids: JSON.stringify([branchId]),
      target_roles: targetRoles ? JSON.stringify(targetRoles) : null,
      created_by: createdBy ?? req.user!.userId,
      is_published: true,
      published_at: now,
      created_at: now,
      updated_at: now,
    });

    const row = await db.select().from(schema.communications).where(eq(schema.communications.id, id)).get();
    res.status(201).json({ data: row });
  } catch (err) { next(err); }
});

router.post('/:communicationId/read', requireAuth, async (req, res, next) => {
  try {
    const { communicationId } = req.params;
    const { user_id } = req.body;
    const userId = user_id ?? req.user!.userId;

    const existing = await db.select().from(schema.communication_reads)
      .where(and(
        eq(schema.communication_reads.communication_id, communicationId),
        eq(schema.communication_reads.user_id, userId),
      )).get();

    if (!existing) {
      await db.insert(schema.communication_reads).values({
        id: crypto.randomUUID(),
        communication_id: communicationId,
        user_id: userId,
        read_at: new Date().toISOString(),
      });
    }

    res.json({ data: { success: true } });
  } catch (err) { next(err); }
});

router.put('/:communicationId/confirm', requireAuth, async (req, res, next) => {
  try {
    const { communicationId } = req.params;
    const { user_id } = req.body;
    const userId = user_id ?? req.user!.userId;
    const now = new Date().toISOString();

    const existing = await db.select().from(schema.communication_reads)
      .where(and(
        eq(schema.communication_reads.communication_id, communicationId),
        eq(schema.communication_reads.user_id, userId),
      )).get();

    if (existing) {
      await db.update(schema.communication_reads)
        .set({ confirmed_at: now })
        .where(eq(schema.communication_reads.id, existing.id));
    } else {
      await db.insert(schema.communication_reads).values({
        id: crypto.randomUUID(),
        communication_id: communicationId,
        user_id: userId,
        read_at: now,
        confirmed_at: now,
      });
    }

    res.json({ data: { success: true } });
  } catch (err) { next(err); }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { title, body, type, target_branch_ids, target_roles, expires_at, created_by } = req.body;
    if (!title) throw new AppError(400, 'title is required');

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.insert(schema.communications).values({
      id,
      title,
      body: body ?? null,
      type: type ?? 'info',
      target_branch_ids: Array.isArray(target_branch_ids) ? JSON.stringify(target_branch_ids) : (target_branch_ids ?? null),
      target_roles: Array.isArray(target_roles) ? JSON.stringify(target_roles) : (target_roles ?? null),
      expires_at: expires_at ?? null,
      created_by: created_by ?? req.user!.userId,
      is_published: true,
      published_at: now,
      source_type: 'brand',
      created_at: now,
      updated_at: now,
    });

    const row = await db.select().from(schema.communications).where(eq(schema.communications.id, id)).get();
    res.status(201).json({ data: row });
  } catch (err) { next(err); }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.delete(schema.communication_reads).where(eq(schema.communication_reads.communication_id, id));
    await db.delete(schema.communications).where(eq(schema.communications.id, id));
    res.json({ message: 'Communication deleted' });
  } catch (err) { next(err); }
});

// ============================================================================
// DETAIL (must come after specific param routes)
// ============================================================================

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const comm = await db.select().from(schema.communications)
      .where(eq(schema.communications.id, req.params.id)).get();
    if (!comm) throw new AppError(404, 'Communication not found');

    const readStatus = await db.select().from(schema.communication_reads)
      .where(and(
        eq(schema.communication_reads.communication_id, comm.id),
        eq(schema.communication_reads.user_id, req.user!.userId),
      )).get();

    res.json({ data: { ...comm, readStatus: readStatus ?? null } });
  } catch (err) { next(err); }
});

export { router as communicationRoutes };

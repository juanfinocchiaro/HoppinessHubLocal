import { Router } from 'express';
import { db } from '../db/connection.js';
import { communications, communication_reads } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// GET / — list communications
router.get('/', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(communications);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// GET /:id — get communication + read status
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const comm = await db.select().from(communications).where(eq(communications.id, req.params.id)).get();
    if (!comm) throw new AppError(404, 'Communication not found');

    const readStatus = await db
      .select()
      .from(communication_reads)
      .where(
        and(
          eq(communication_reads.communication_id, comm.id),
          eq(communication_reads.user_id, req.user!.userId),
        ),
      )
      .get();

    res.json({ data: { ...comm, readStatus: readStatus ?? null } });
  } catch (err) {
    next(err);
  }
});

// POST / — create communication
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(communications).values({
      id,
      ...req.body,
      created_by: req.user!.userId,
      created_at: now,
      updated_at: now,
    });
    const created = await db.select().from(communications).where(eq(communications.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

// PUT /:id — update communication
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(communications).where(eq(communications.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Communication not found');

    await db
      .update(communications)
      .set({ ...req.body, updated_at: new Date().toISOString() })
      .where(eq(communications.id, req.params.id));

    const updated = await db.select().from(communications).where(eq(communications.id, req.params.id)).get();
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /:id — delete communication
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(communications).where(eq(communications.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Communication not found');

    await db.delete(communications).where(eq(communications.id, req.params.id));
    res.json({ message: 'Communication deleted' });
  } catch (err) {
    next(err);
  }
});

// POST /:id/read — mark as read
router.post('/:id/read', requireAuth, async (req, res, next) => {
  try {
    const commId = req.params.id;
    const userId = req.user!.userId;

    const existing = await db
      .select()
      .from(communication_reads)
      .where(and(eq(communication_reads.communication_id, commId), eq(communication_reads.user_id, userId)))
      .get();

    if (!existing) {
      await db.insert(communication_reads).values({
        id: crypto.randomUUID(),
        communication_id: commId,
        user_id: userId,
        read_at: new Date().toISOString(),
      });
    }

    res.json({ message: 'Marked as read' });
  } catch (err) {
    next(err);
  }
});

// POST /:id/confirm — confirm communication
router.post('/:id/confirm', requireAuth, async (req, res, next) => {
  try {
    const commId = req.params.id;
    const userId = req.user!.userId;

    const existing = await db
      .select()
      .from(communication_reads)
      .where(and(eq(communication_reads.communication_id, commId), eq(communication_reads.user_id, userId)))
      .get();

    const now = new Date().toISOString();
    if (existing) {
      await db
        .update(communication_reads)
        .set({ confirmed_at: now })
        .where(eq(communication_reads.id, existing.id));
    } else {
      await db.insert(communication_reads).values({
        id: crypto.randomUUID(),
        communication_id: commId,
        user_id: userId,
        read_at: now,
        confirmed_at: now,
      });
    }

    res.json({ message: 'Confirmed' });
  } catch (err) {
    next(err);
  }
});

// GET /:id/readers — list who read/confirmed
router.get('/:id/readers', requireAuth, async (req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(communication_reads)
      .where(eq(communication_reads.communication_id, req.params.id));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

export { router as communicationRoutes };

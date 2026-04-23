import { Router } from 'express';
import { db } from '../db/connection.js';
import {
  meetings,
  meeting_participants,
  meeting_agreements,
} from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// GET /:branchId — list meetings
router.get('/:branchId', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(meetings).where(eq(meetings.branch_id, req.params.branchId));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// GET /detail/:id — get meeting + participants + agreements
router.get('/detail/:id', requireAuth, async (req, res, next) => {
  try {
    const meeting = await db.select().from(meetings).where(eq(meetings.id, req.params.id)).get();
    if (!meeting) throw new AppError(404, 'Meeting not found');

    const participants = await db
      .select()
      .from(meeting_participants)
      .where(eq(meeting_participants.meeting_id, meeting.id));

    const agreements = await db
      .select()
      .from(meeting_agreements)
      .where(eq(meeting_agreements.meeting_id, meeting.id));

    res.json({ data: { ...meeting, participants, agreements } });
  } catch (err) {
    next(err);
  }
});

// POST / — create meeting
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(meetings).values({
      id,
      ...req.body,
      status: 'scheduled',
      created_by: req.user!.userId,
      created_at: now,
      updated_at: now,
    });
    const created = await db.select().from(meetings).where(eq(meetings.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

// PUT /:id — update meeting
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(meetings).where(eq(meetings.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Meeting not found');

    await db
      .update(meetings)
      .set({ ...req.body, updated_at: new Date().toISOString() })
      .where(eq(meetings.id, req.params.id));

    const updated = await db.select().from(meetings).where(eq(meetings.id, req.params.id)).get();
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// POST /:id/participants — set participants
router.post('/:id/participants', requireAuth, async (req, res, next) => {
  try {
    const meetingId = req.params.id;
    const existing = await db.select().from(meetings).where(eq(meetings.id, meetingId)).get();
    if (!existing) throw new AppError(404, 'Meeting not found');

    await db.delete(meeting_participants).where(eq(meeting_participants.meeting_id, meetingId));

    const { participants } = req.body;
    const now = new Date().toISOString();
    if (Array.isArray(participants)) {
      for (const p of participants) {
        await db.insert(meeting_participants).values({
          id: crypto.randomUUID(),
          meeting_id: meetingId,
          user_id: p.user_id,
          attendance: p.attendance ?? 'pending',
          notes: p.notes,
          created_at: now,
        });
      }
    }

    const rows = await db.select().from(meeting_participants).where(eq(meeting_participants.meeting_id, meetingId));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// POST /:id/agreements — create agreement
router.post('/:id/agreements', requireAuth, async (req, res, next) => {
  try {
    const meetingId = req.params.id;
    const existing = await db.select().from(meetings).where(eq(meetings.id, meetingId)).get();
    if (!existing) throw new AppError(404, 'Meeting not found');

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(meeting_agreements).values({
      id,
      meeting_id: meetingId,
      ...req.body,
      created_at: now,
      updated_at: now,
    });

    const created = await db.select().from(meeting_agreements).where(eq(meeting_agreements.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

// PUT /agreements/:id — update agreement
router.put('/agreements/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(meeting_agreements).where(eq(meeting_agreements.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Agreement not found');

    await db
      .update(meeting_agreements)
      .set({ ...req.body, updated_at: new Date().toISOString() })
      .where(eq(meeting_agreements.id, req.params.id));

    const updated = await db.select().from(meeting_agreements).where(eq(meeting_agreements.id, req.params.id)).get();
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// PUT /:id/close — close meeting
router.put('/:id/close', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(meetings).where(eq(meetings.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Meeting not found');

    const now = new Date().toISOString();
    await db
      .update(meetings)
      .set({
        status: 'closed',
        minutes: req.body.minutes,
        closed_at: now,
        closed_by: req.user!.userId,
        updated_at: now,
      })
      .where(eq(meetings.id, req.params.id));

    const updated = await db.select().from(meetings).where(eq(meetings.id, req.params.id)).get();
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

export { router as meetingRoutes };

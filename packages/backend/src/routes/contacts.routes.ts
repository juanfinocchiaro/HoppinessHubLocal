import { Router } from 'express';
import { db } from '../db/connection.js';
import { contact_messages } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// GET / — list messages
router.get('/', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(contact_messages);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// GET /:id — get message
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const msg = await db
      .select()
      .from(contact_messages)
      .where(eq(contact_messages.id, req.params.id))
      .get();
    if (!msg) throw new AppError(404, 'Contact message not found');
    res.json({ data: msg });
  } catch (err) {
    next(err);
  }
});

// POST / — submit contact form (public, no auth)
router.post('/', async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(contact_messages).values({
      id,
      ...req.body,
      status: 'new',
      created_at: now,
      updated_at: now,
    });
    const created = await db.select().from(contact_messages).where(eq(contact_messages.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

// PUT /:id — update status/notes
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(contact_messages).where(eq(contact_messages.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Contact message not found');

    await db
      .update(contact_messages)
      .set({ ...req.body, updated_at: new Date().toISOString() })
      .where(eq(contact_messages.id, req.params.id));

    const updated = await db.select().from(contact_messages).where(eq(contact_messages.id, req.params.id)).get();
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// PUT /:id/reply — mark as replied
router.put('/:id/reply', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(contact_messages).where(eq(contact_messages.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Contact message not found');

    const now = new Date().toISOString();
    await db
      .update(contact_messages)
      .set({
        status: 'replied',
        replied_at: now,
        replied_by: req.user!.userId,
        updated_at: now,
      })
      .where(eq(contact_messages.id, req.params.id));

    const updated = await db.select().from(contact_messages).where(eq(contact_messages.id, req.params.id)).get();
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

export { router as contactRoutes };

import { Router } from 'express';
import { db } from '../db/connection.js';
import * as schema from '../db/schema.js';
import { eq, and, isNull, sql, desc, ne } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════════
// Public endpoints (before auth-only routes)
// ═══════════════════════════════════════════════════════════════════════════════

router.post('/', async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(schema.contact_messages).values({
      id,
      ...req.body,
      status: 'new',
      created_at: now,
      updated_at: now,
    });
    const created = await db
      .select()
      .from(schema.contact_messages)
      .where(eq(schema.contact_messages.id, id))
      .get();
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

router.post('/notify', async (req, res, next) => {
  try {
    console.log('[Contact Notification] stub:', JSON.stringify(req.body).slice(0, 200));
    res.json({ data: { sent: true } });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Counts & Unread (literal routes before /:messageId)
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/unread-count', requireAuth, async (_req, res, next) => {
  try {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.contact_messages)
      .where(
        and(
          isNull(schema.contact_messages.read_at),
          ne(schema.contact_messages.status, 'archived'),
        ),
      )
      .get();
    res.json({ data: { count: result?.count ?? 0 } });
  } catch (err) {
    next(err);
  }
});

router.get('/counts', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db
      .select({
        subject: schema.contact_messages.subject,
        count: sql<number>`count(*)`,
      })
      .from(schema.contact_messages)
      .where(ne(schema.contact_messages.status, 'archived'))
      .groupBy(schema.contact_messages.subject);

    const counts: Record<string, number> = {};
    let total = 0;
    for (const row of rows) {
      const key = row.subject ?? 'otro';
      counts[key] = row.count;
      total += row.count;
    }
    counts.total = total;

    res.json({ data: counts });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// List Messages (with optional filters)
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const typeFilter = req.query.type as string | undefined;
    const unreadOnly = req.query.unread_only === 'true';

    const conditions = [];
    if (typeFilter) conditions.push(eq(schema.contact_messages.subject, typeFilter));
    if (unreadOnly) conditions.push(isNull(schema.contact_messages.read_at));

    const rows = await db
      .select()
      .from(schema.contact_messages)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(schema.contact_messages.created_at));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Single Message Actions
// ═══════════════════════════════════════════════════════════════════════════════

router.patch('/:messageId/read', requireAuth, async (req, res, next) => {
  try {
    const now = new Date().toISOString();
    await db
      .update(schema.contact_messages)
      .set({ read_at: now, updated_at: now })
      .where(eq(schema.contact_messages.id, req.params.messageId));
    res.json({ data: { success: true } });
  } catch (err) {
    next(err);
  }
});

router.patch('/:messageId/archive', requireAuth, async (req, res, next) => {
  try {
    const now = new Date().toISOString();
    await db
      .update(schema.contact_messages)
      .set({ status: 'archived', updated_at: now })
      .where(eq(schema.contact_messages.id, req.params.messageId));
    res.json({ data: { success: true } });
  } catch (err) {
    next(err);
  }
});

export { router as contactRoutes };

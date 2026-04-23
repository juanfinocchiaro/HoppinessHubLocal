import { Router } from 'express';
import { db } from '../db/connection.js';
import {
  promotions,
  promotion_items,
  discount_codes,
} from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// GET / — list promotions
router.get('/', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(promotions);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// POST / — create promotion
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(promotions).values({
      id,
      ...req.body,
      created_by: req.user!.userId,
      created_at: now,
      updated_at: now,
    });
    const created = await db.select().from(promotions).where(eq(promotions.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

// PUT /:id — update promotion
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(promotions).where(eq(promotions.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Promotion not found');

    await db
      .update(promotions)
      .set({ ...req.body, updated_at: new Date().toISOString() })
      .where(eq(promotions.id, req.params.id));

    const updated = await db.select().from(promotions).where(eq(promotions.id, req.params.id)).get();
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /:id — soft delete promotion
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(promotions).where(eq(promotions.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Promotion not found');

    await db
      .update(promotions)
      .set({ deleted_at: new Date().toISOString() })
      .where(eq(promotions.id, req.params.id));

    res.json({ message: 'Promotion soft-deleted' });
  } catch (err) {
    next(err);
  }
});

// GET /:id/items — list promo items
router.get('/:id/items', requireAuth, async (req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(promotion_items)
      .where(eq(promotion_items.promotion_id, req.params.id));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// POST /:id/items — set promo items (replace all)
router.post('/:id/items', requireAuth, async (req, res, next) => {
  try {
    const promoId = req.params.id;
    const existing = await db.select().from(promotions).where(eq(promotions.id, promoId)).get();
    if (!existing) throw new AppError(404, 'Promotion not found');

    await db.delete(promotion_items).where(eq(promotion_items.promotion_id, promoId));

    const { items } = req.body;
    const now = new Date().toISOString();
    if (Array.isArray(items)) {
      for (const item of items) {
        await db.insert(promotion_items).values({
          id: crypto.randomUUID(),
          promotion_id: promoId,
          ...item,
          created_at: now,
        });
      }
    }

    const rows = await db.select().from(promotion_items).where(eq(promotion_items.promotion_id, promoId));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// GET /discount-codes — list discount codes
router.get('/discount-codes', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(discount_codes);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// POST /discount-codes — create discount code
router.post('/discount-codes', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(discount_codes).values({
      id,
      ...req.body,
      current_uses: 0,
      created_by: req.user!.userId,
      created_at: now,
      updated_at: now,
    });
    const created = await db.select().from(discount_codes).where(eq(discount_codes.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

// PUT /discount-codes/:id — update discount code
router.put('/discount-codes/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(discount_codes).where(eq(discount_codes.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Discount code not found');

    await db
      .update(discount_codes)
      .set({ ...req.body, updated_at: new Date().toISOString() })
      .where(eq(discount_codes.id, req.params.id));

    const updated = await db.select().from(discount_codes).where(eq(discount_codes.id, req.params.id)).get();
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// GET /discount-codes/validate/:code — validate discount code
router.get('/discount-codes/validate/:code', async (req, res, next) => {
  try {
    const code = await db
      .select()
      .from(discount_codes)
      .where(and(eq(discount_codes.code, req.params.code), eq(discount_codes.is_active, true)))
      .get();

    if (!code) {
      return res.json({ data: { valid: false, reason: 'Code not found or inactive' } });
    }

    const now = new Date().toISOString();
    if (code.end_date && code.end_date < now) {
      return res.json({ data: { valid: false, reason: 'Code expired' } });
    }

    if (code.max_uses && code.current_uses !== null && code.current_uses >= code.max_uses) {
      return res.json({ data: { valid: false, reason: 'Code usage limit reached' } });
    }

    res.json({ data: { valid: true, code } });
  } catch (err) {
    next(err);
  }
});

export { router as promotionRoutes };

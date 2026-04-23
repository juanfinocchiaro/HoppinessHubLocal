import { Router } from 'express';
import { db } from '../db/connection.js';
import * as schema from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

router.get('/templates', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(schema.whatsapp_templates);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.put('/templates/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db
      .select()
      .from(schema.whatsapp_templates)
      .where(eq(schema.whatsapp_templates.id, req.params.id))
      .get();
    if (!existing) throw new AppError(404, 'Template not found');

    const { template_text } = req.body;
    await db
      .update(schema.whatsapp_templates)
      .set({
        template_text,
        updated_by: req.user!.userId,
        updated_at: new Date().toISOString(),
      })
      .where(eq(schema.whatsapp_templates.id, req.params.id));

    const updated = await db
      .select()
      .from(schema.whatsapp_templates)
      .where(eq(schema.whatsapp_templates.id, req.params.id))
      .get();
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

export { router as whatsappRoutes };

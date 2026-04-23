/**
 * Rutas de canales externos (Rappi / PedidosYa / MP Delivery):
 *  - Cambios pendientes de cargar manualmente por el encargado.
 *  - Histórico de PDFs generados + confirmación de carga.
 */
import { Router } from 'express';
import { db } from '../db/connection.js';
import * as schema from '../db/schema.js';
import { eq, and, desc, isNull, inArray } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { APP_CHANNEL_CODES, isAppChannel } from '../services/channelChanges.js';

const router = Router();

router.get('/pending-changes', requireAuth, async (req, res, next) => {
  try {
    const channel = (req.query.channel_code as string | undefined) ?? undefined;
    const where = channel
      ? and(
          eq(schema.channel_pending_changes.channel_code, channel),
          isNull(schema.channel_pending_changes.included_in_pdf_id),
        )
      : isNull(schema.channel_pending_changes.included_in_pdf_id);
    const rows = await db.select().from(schema.channel_pending_changes)
      .where(where)
      .orderBy(desc(schema.channel_pending_changes.created_at));
    // Parsear `payload` JSON para que el frontend no tenga que hacerlo.
    const enriched = rows.map((r) => ({
      ...r,
      payload: safeJsonParse(r.payload),
    }));
    res.json({ data: enriched });
  } catch (err) { next(err); }
});

router.get('/pending-counts', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(schema.channel_pending_changes)
      .where(isNull(schema.channel_pending_changes.included_in_pdf_id));
    const counts: Record<string, number> = {};
    for (const code of APP_CHANNEL_CODES) counts[code] = 0;
    for (const row of rows) {
      counts[row.channel_code] = (counts[row.channel_code] ?? 0) + 1;
    }
    res.json({ data: counts });
  } catch (err) { next(err); }
});

/**
 * Marca las filas pendientes del canal como "incluidas en este export" y
 * devuelve el snapshot completo para que el frontend genere el PDF con
 * jsPDF. También registra el export en `channel_pdf_exports`.
 */
router.post('/:channelCode/export', requireAuth, async (req, res, next) => {
  try {
    const channelCode = req.params.channelCode;
    if (!isAppChannel(channelCode)) {
      throw new AppError(400, `Channel "${channelCode}" is not an app channel (no PDF needed)`);
    }

    const deliveredTo = (req.body.delivered_to as string | undefined) ?? null;
    const now = new Date().toISOString();

    const pending = await db.select().from(schema.channel_pending_changes)
      .where(and(
        eq(schema.channel_pending_changes.channel_code, channelCode),
        isNull(schema.channel_pending_changes.included_in_pdf_id),
      ))
      .orderBy(desc(schema.channel_pending_changes.created_at));

    if (!pending.length) {
      throw new AppError(400, 'No hay cambios pendientes para este canal');
    }

    const exportId = crypto.randomUUID();
    await db.insert(schema.channel_pdf_exports).values({
      id: exportId,
      channel_code: channelCode,
      generated_at: now,
      generated_by: req.user!.userId,
      delivered_to: deliveredTo,
      change_count: pending.length,
    });

    await db.update(schema.channel_pending_changes)
      .set({ included_in_pdf_id: exportId })
      .where(inArray(schema.channel_pending_changes.id, pending.map((p) => p.id)));

    const enriched = pending.map((r) => ({ ...r, payload: safeJsonParse(r.payload) }));
    res.status(201).json({
      data: {
        export_id: exportId,
        channel_code: channelCode,
        generated_at: now,
        change_count: pending.length,
        changes: enriched,
      },
    });
  } catch (err) { next(err); }
});

router.get('/exports', requireAuth, async (req, res, next) => {
  try {
    const channel = req.query.channel_code as string | undefined;
    const rows = channel
      ? await db.select().from(schema.channel_pdf_exports)
          .where(eq(schema.channel_pdf_exports.channel_code, channel))
          .orderBy(desc(schema.channel_pdf_exports.generated_at))
      : await db.select().from(schema.channel_pdf_exports)
          .orderBy(desc(schema.channel_pdf_exports.generated_at));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.put('/exports/:exportId/confirm', requireAuth, async (req, res, next) => {
  try {
    const now = new Date().toISOString();
    await db.update(schema.channel_pdf_exports)
      .set({ confirmed_loaded_at: now })
      .where(eq(schema.channel_pdf_exports.id, req.params.exportId));
    const row = await db.select().from(schema.channel_pdf_exports)
      .where(eq(schema.channel_pdf_exports.id, req.params.exportId))
      .get();
    res.json({ data: row });
  } catch (err) { next(err); }
});

function safeJsonParse(raw: string | null | undefined): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export { router as channelRoutes };

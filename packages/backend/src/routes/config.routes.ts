import { Router } from 'express';
import { db } from '../db/connection.js';
import { branch_closure_config, print_config, labor_config } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { requireBranchAccess, requireBranchRole } from '../middleware/permissions.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// ── Branch Closure Config ───────────────────────────────────────────────────

// GET /:branchId/closure
router.get('/:branchId/closure', requireAuth, requireBranchAccess, async (req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(branch_closure_config)
      .where(eq(branch_closure_config.branch_id, req.params.branchId));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// PUT /:branchId/closure
router.put('/:branchId/closure', requireAuth, requireBranchRole('encargado', 'administrador'), async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const { items } = req.body;
    if (!Array.isArray(items)) {
      throw new AppError(400, 'items array is required');
    }

    for (const item of items) {
      if (item.id) {
        await db
          .update(branch_closure_config)
          .set({ enabled: item.enabled })
          .where(eq(branch_closure_config.id, item.id));
      } else {
        await db.insert(branch_closure_config).values({
          branch_id: branchId,
          config_id: item.config_id,
          enabled: item.enabled,
        });
      }
    }

    const rows = await db
      .select()
      .from(branch_closure_config)
      .where(eq(branch_closure_config.branch_id, branchId));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// ── Print Config ────────────────────────────────────────────────────────────

// GET /:branchId/print-config
router.get('/:branchId/print-config', requireAuth, requireBranchAccess, async (req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(print_config)
      .where(eq(print_config.branch_id, req.params.branchId));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// PUT /:branchId/print-config
router.put('/:branchId/print-config', requireAuth, requireBranchRole('encargado', 'administrador'), async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const { items } = req.body;
    if (!Array.isArray(items)) {
      throw new AppError(400, 'items array is required');
    }

    for (const item of items) {
      const now = new Date().toISOString();
      if (item.id) {
        await db
          .update(print_config)
          .set({
            trigger_type: item.trigger_type,
            target_printer_id: item.target_printer_id,
            is_active: item.is_active,
            copies: item.copies,
            updated_at: now,
          })
          .where(eq(print_config.id, item.id));
      } else {
        await db.insert(print_config).values({
          branch_id: branchId,
          trigger_type: item.trigger_type,
          target_printer_id: item.target_printer_id,
          is_active: item.is_active ?? true,
          copies: item.copies ?? 1,
          created_at: now,
          updated_at: now,
        });
      }
    }

    const rows = await db
      .select()
      .from(print_config)
      .where(eq(print_config.branch_id, branchId));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// ── Labor Config ────────────────────────────────────────────────────────────

// GET /:branchId/labor-config
router.get('/:branchId/labor-config', requireAuth, requireBranchAccess, async (req, res, next) => {
  try {
    const config = await db
      .select()
      .from(labor_config)
      .where(eq(labor_config.branch_id, req.params.branchId))
      .get();
    res.json({ data: config ?? null });
  } catch (err) {
    next(err);
  }
});

// PUT /:branchId/labor-config
router.put('/:branchId/labor-config', requireAuth, requireBranchRole('encargado', 'administrador'), async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const existing = await db
      .select()
      .from(labor_config)
      .where(eq(labor_config.branch_id, branchId))
      .get();

    const now = new Date().toISOString();
    if (existing) {
      await db
        .update(labor_config)
        .set({ ...req.body, updated_at: now })
        .where(eq(labor_config.branch_id, branchId));
    } else {
      await db.insert(labor_config).values({
        branch_id: branchId,
        ...req.body,
        created_at: now,
        updated_at: now,
      });
    }

    const result = await db
      .select()
      .from(labor_config)
      .where(eq(labor_config.branch_id, branchId))
      .get();
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

export { router as configRoutes };

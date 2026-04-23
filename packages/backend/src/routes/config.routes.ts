import { Router } from 'express';
import { db } from '../db/connection.js';
import * as schema from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════════
// Shift Config (reads from branches table)
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/branches/:branchId/shift-config', requireAuth, async (req, res, next) => {
  try {
    const row = await db
      .select({
        shifts_morning_enabled: schema.branches.shifts_morning_enabled,
        shifts_overnight_enabled: schema.branches.shifts_overnight_enabled,
      })
      .from(schema.branches)
      .where(eq(schema.branches.id, req.params.branchId))
      .get();

    res.json({
      data: row
        ? {
            shifts_morning_enabled: row.shifts_morning_enabled === 'true',
            shifts_overnight_enabled: row.shifts_overnight_enabled === 'true',
          }
        : { shifts_morning_enabled: false, shifts_overnight_enabled: false },
    });
  } catch (err) {
    next(err);
  }
});

router.put('/branches/:branchId/shift-config', requireAuth, async (req, res, next) => {
  try {
    const { shifts_morning_enabled, shifts_overnight_enabled } = req.body;
    await db
      .update(schema.branches)
      .set({
        shifts_morning_enabled: shifts_morning_enabled != null ? String(shifts_morning_enabled) : undefined,
        shifts_overnight_enabled: shifts_overnight_enabled != null ? String(shifts_overnight_enabled) : undefined,
        updated_at: new Date().toISOString(),
      })
      .where(eq(schema.branches.id, req.params.branchId));

    res.json({ data: { success: true } });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Brand Closure Config
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/brand-closure-config', requireAuth, async (_req, res, next) => {
  try {
    const all = await db.select().from(schema.brand_closure_config);
    const categorias = all.filter((r) => r.type === 'categoria');
    const tipos = all.filter((r) => r.type === 'tipo');
    const extras = all.filter((r) => r.type === 'extra');
    const apps = all.filter((r) => r.type === 'app');
    res.json({ data: { categorias, tipos, extras, apps, all } });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Branch Closure Config
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/branches/:branchId/closure-config', requireAuth, async (req, res, next) => {
  try {
    const { branchId } = req.params;

    const rawRows = await db
      .select()
      .from(schema.branch_closure_config)
      .leftJoin(
        schema.brand_closure_config,
        eq(schema.branch_closure_config.config_id, schema.brand_closure_config.id),
      )
      .where(eq(schema.branch_closure_config.branch_id, branchId));

    const branchConfig = rawRows.map((row) => ({
      ...row.branch_closure_config,
      brand_closure_config: row.brand_closure_config,
    }));

    const brandApps = await db
      .select()
      .from(schema.brand_closure_config)
      .where(eq(schema.brand_closure_config.type, 'app'));

    const enabledApps: Record<string, boolean> = {};
    for (const app of brandApps) {
      const match = branchConfig.find((bc) => bc.config_id === app.id);
      enabledApps[app.id] = match?.enabled ?? false;
    }

    res.json({ data: { branchConfig, brandApps, enabledApps } });
  } catch (err) {
    next(err);
  }
});

router.post('/branches/:branchId/closure-config', requireAuth, async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const { configId, habilitado } = req.body;

    const existing = await db
      .select()
      .from(schema.branch_closure_config)
      .where(
        and(
          eq(schema.branch_closure_config.branch_id, branchId),
          eq(schema.branch_closure_config.config_id, configId),
        ),
      )
      .get();

    if (existing) {
      await db
        .update(schema.branch_closure_config)
        .set({ enabled: habilitado })
        .where(eq(schema.branch_closure_config.id, existing.id));
    } else {
      await db.insert(schema.branch_closure_config).values({
        id: crypto.randomUUID(),
        branch_id: branchId,
        config_id: configId,
        enabled: habilitado,
      });
    }

    res.json({ data: { success: true } });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Print Config
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/branches/:branchId/print-config', requireAuth, async (req, res, next) => {
  try {
    const config = await db
      .select()
      .from(schema.print_config)
      .where(eq(schema.print_config.branch_id, req.params.branchId))
      .get();
    res.json({ data: config ?? null });
  } catch (err) {
    next(err);
  }
});

router.post('/branches/:branchId/print-config', requireAuth, async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const existing = await db
      .select()
      .from(schema.print_config)
      .where(eq(schema.print_config.branch_id, branchId))
      .get();

    const now = new Date().toISOString();
    if (existing) {
      await db
        .update(schema.print_config)
        .set({ ...req.body, updated_at: now })
        .where(eq(schema.print_config.id, existing.id));
    } else {
      await db.insert(schema.print_config).values({
        id: crypto.randomUUID(),
        branch_id: branchId,
        ...req.body,
        updated_at: now,
      });
    }

    const result = await db
      .select()
      .from(schema.print_config)
      .where(eq(schema.print_config.branch_id, branchId))
      .get();
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Labor Config
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/branches/:branchId/labor-config', requireAuth, async (req, res, next) => {
  try {
    const config = await db
      .select()
      .from(schema.labor_config)
      .where(eq(schema.labor_config.branch_id, req.params.branchId))
      .get();
    res.json({ data: config ?? null });
  } catch (err) {
    next(err);
  }
});

router.put('/branches/:branchId/labor-config', requireAuth, async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const existing = await db
      .select()
      .from(schema.labor_config)
      .where(eq(schema.labor_config.branch_id, branchId))
      .get();

    const now = new Date().toISOString();
    if (existing) {
      await db
        .update(schema.labor_config)
        .set({ ...req.body, updated_at: now })
        .where(eq(schema.labor_config.branch_id, branchId));
    } else {
      await db.insert(schema.labor_config).values({
        id: crypto.randomUUID(),
        branch_id: branchId,
        ...req.body,
        created_at: now,
        updated_at: now,
      });
    }

    const result = await db
      .select()
      .from(schema.labor_config)
      .where(eq(schema.labor_config.branch_id, branchId))
      .get();
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Sidebar Order
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/sidebar-order', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(schema.brand_sidebar_order);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/sidebar-order', requireAuth, async (req, res, next) => {
  try {
    const { section_id, sort_order, updated_at } = req.body;

    const existing = await db
      .select()
      .from(schema.brand_sidebar_order)
      .where(eq(schema.brand_sidebar_order.section_id, section_id))
      .get();

    if (existing) {
      await db
        .update(schema.brand_sidebar_order)
        .set({ sort_order, updated_at, updated_by: req.user!.userId })
        .where(eq(schema.brand_sidebar_order.id, existing.id));
    } else {
      await db.insert(schema.brand_sidebar_order).values({
        id: crypto.randomUUID(),
        section_id,
        sort_order,
        updated_at,
        updated_by: req.user!.userId,
      });
    }

    res.json({ data: { success: true } });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Help Preferences (stored in profiles table)
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/users/:userId/help-preferences', requireAuth, async (req, res, next) => {
  try {
    const row = await db
      .select({
        help_dismissed_pages: schema.profiles.help_dismissed_pages,
        show_floating_help: schema.profiles.show_floating_help,
      })
      .from(schema.profiles)
      .where(eq(schema.profiles.id, req.params.userId))
      .get();

    if (!row) return res.json({ data: null });

    let parsedPages: string[] | null = null;
    if (row.help_dismissed_pages) {
      try {
        parsedPages = JSON.parse(row.help_dismissed_pages);
      } catch {
        parsedPages = null;
      }
    }

    res.json({
      data: {
        help_dismissed_pages: parsedPages,
        show_floating_help: row.show_floating_help,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.put('/users/:userId/help-preferences/dismissed-pages', requireAuth, async (req, res, next) => {
  try {
    const { pages } = req.body;
    await db
      .update(schema.profiles)
      .set({
        help_dismissed_pages: JSON.stringify(pages),
        updated_at: new Date().toISOString(),
      })
      .where(eq(schema.profiles.id, req.params.userId));
    res.json({ data: { success: true } });
  } catch (err) {
    next(err);
  }
});

router.put('/users/:userId/help-preferences/floating-help', requireAuth, async (req, res, next) => {
  try {
    const { show } = req.body;
    await db
      .update(schema.profiles)
      .set({
        show_floating_help: show,
        updated_at: new Date().toISOString(),
      })
      .where(eq(schema.profiles.id, req.params.userId));
    res.json({ data: { success: true } });
  } catch (err) {
    next(err);
  }
});

export { router as configRoutes };

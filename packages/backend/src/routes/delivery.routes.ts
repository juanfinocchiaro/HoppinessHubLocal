import { Router } from 'express';
import { db } from '../db/connection.js';
import * as schema from '../db/schema.js';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ═══════════════════════════════════════════════════════════════════════════════
// Pricing Config (brand-level, single row)
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/pricing-config', requireAuth, async (_req, res, next) => {
  try {
    const row = await db.select().from(schema.delivery_pricing_config).get();
    res.json({ data: row ?? null });
  } catch (err) {
    next(err);
  }
});

router.put('/pricing-config', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(schema.delivery_pricing_config).get();
    const now = new Date().toISOString();

    if (existing) {
      await db
        .update(schema.delivery_pricing_config)
        .set({ ...req.body, updated_at: now })
        .where(eq(schema.delivery_pricing_config.id, existing.id));
    } else {
      await db.insert(schema.delivery_pricing_config).values({
        id: crypto.randomUUID(),
        ...req.body,
        created_at: now,
        updated_at: now,
      });
    }

    const result = await db.select().from(schema.delivery_pricing_config).get();
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Branch Delivery Config
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/branch-config/:branchId', requireAuth, async (req, res, next) => {
  try {
    const config = await db
      .select()
      .from(schema.branch_delivery_config)
      .where(eq(schema.branch_delivery_config.branch_id, req.params.branchId))
      .get();
    res.json({ data: config ?? null });
  } catch (err) {
    next(err);
  }
});

router.get('/branch-configs', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(schema.branch_delivery_config);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.put('/branch-config/:branchId', requireAuth, async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const { delivery_hours, ...validData } = req.body;
    const existing = await db
      .select()
      .from(schema.branch_delivery_config)
      .where(eq(schema.branch_delivery_config.branch_id, branchId))
      .get();

    const now = new Date().toISOString();
    if (existing) {
      await db
        .update(schema.branch_delivery_config)
        .set({ ...validData, updated_at: now })
        .where(eq(schema.branch_delivery_config.branch_id, branchId));
    } else {
      await db.insert(schema.branch_delivery_config).values({
        id: crypto.randomUUID(),
        branch_id: branchId,
        ...validData,
        created_at: now,
        updated_at: now,
      });
    }

    const result = await db
      .select()
      .from(schema.branch_delivery_config)
      .where(eq(schema.branch_delivery_config.branch_id, branchId))
      .get();
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Neighborhoods
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/neighborhoods', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select().from(schema.city_neighborhoods);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/branch-neighborhoods/:branchId', requireAuth, async (req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(schema.branch_delivery_neighborhoods)
      .where(eq(schema.branch_delivery_neighborhoods.branch_id, req.params.branchId));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.put('/neighborhoods/:id/status', requireAuth, async (req, res, next) => {
  try {
    const { status, block_reason } = req.body;
    await db
      .update(schema.branch_delivery_neighborhoods)
      .set({ status, block_reason: block_reason ?? null, updated_at: new Date().toISOString() })
      .where(eq(schema.branch_delivery_neighborhoods.id, req.params.id));

    const updated = await db
      .select()
      .from(schema.branch_delivery_neighborhoods)
      .where(eq(schema.branch_delivery_neighborhoods.id, req.params.id))
      .get();
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

router.post('/branch-neighborhoods/regenerate', requireAuth, async (req, res, next) => {
  try {
    const { branchId, branchLat, branchLng, radiusKm } = req.body;

    const allNeighborhoods = await db.select().from(schema.city_neighborhoods);
    const existing = await db
      .select()
      .from(schema.branch_delivery_neighborhoods)
      .where(eq(schema.branch_delivery_neighborhoods.branch_id, branchId));

    const existingMap = new Map(existing.map((e) => [e.neighborhood_id, e]));
    let added = 0;
    let updated = 0;
    const now = new Date().toISOString();

    for (const n of allNeighborhoods) {
      if (n.centroid_lat == null || n.centroid_lng == null) continue;
      const distance = haversineKm(branchLat, branchLng, n.centroid_lat, n.centroid_lng);

      if (distance <= radiusKm) {
        const roundedDist = Math.round(distance * 100) / 100;
        const ex = existingMap.get(n.id);
        if (ex) {
          await db
            .update(schema.branch_delivery_neighborhoods)
            .set({ distance_km: roundedDist, updated_at: now })
            .where(eq(schema.branch_delivery_neighborhoods.id, ex.id));
          updated++;
        } else {
          await db.insert(schema.branch_delivery_neighborhoods).values({
            id: crypto.randomUUID(),
            branch_id: branchId,
            neighborhood_id: n.id,
            status: 'enabled',
            distance_km: roundedDist,
            created_at: now,
            updated_at: now,
          });
          added++;
        }
      }
    }

    res.json({ data: { added, updated } });
  } catch (err) {
    next(err);
  }
});

router.post('/neighborhood-assignments', requireAuth, async (req, res, next) => {
  try {
    const { neighborhood_ids } = req.body;
    if (!Array.isArray(neighborhood_ids) || neighborhood_ids.length === 0) {
      return res.json({ data: [] });
    }

    const rows = await db
      .select()
      .from(schema.branch_delivery_neighborhoods)
      .where(inArray(schema.branch_delivery_neighborhoods.neighborhood_id, neighborhood_ids));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Radius Override Log
// ═══════════════════════════════════════════════════════════════════════════════

router.post('/radius-override-log', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    await db.insert(schema.delivery_radius_overrides_log).values({
      id,
      branch_id: req.body.branch_id,
      previous_km: req.body.previous_km,
      new_km: req.body.new_km,
      action: req.body.action,
      performed_by: req.body.performed_by ?? req.user!.userId,
      created_at: new Date().toISOString(),
    });
    res.status(201).json({ data: { id } });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Dynamic Prep Time
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/dynamic-prep-time', optionalAuth, async (req, res, next) => {
  try {
    const branchId = req.query.branch_id as string;
    const tipoServicio = req.query.tipo_servicio as string;
    const basePrepTime = tipoServicio === 'delivery' ? 40 : 15;

    const activeStates = ['pendiente', 'confirmado', 'en_preparacion', 'listo_envio', 'en_camino'];
    const activeOrders = await db
      .select({ id: schema.orders.id })
      .from(schema.orders)
      .where(
        and(
          eq(schema.orders.branch_id, branchId),
          inArray(schema.orders.status, activeStates),
        ),
      );

    const extraMinPerOrder = 5;
    const prepTimeMin = basePrepTime + activeOrders.length * extraMinPerOrder;

    res.json({
      data: {
        prep_time_min: prepTimeMin,
        active_orders: activeOrders.length,
        base_prep_time: basePrepTime,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Calculate Delivery
// ═══════════════════════════════════════════════════════════════════════════════

router.post('/calculate', async (req, res, next) => {
  try {
    const { branch_id, customer_lat, customer_lng, neighborhood_name } = req.body;

    const branchConfig = await db
      .select()
      .from(schema.branch_delivery_config)
      .where(eq(schema.branch_delivery_config.branch_id, branch_id))
      .get();

    if (!branchConfig || branchConfig.delivery_enabled === false) {
      return res.json({
        data: { available: false, cost: null, distance_km: null, duration_min: null, estimated_delivery_min: null, disclaimer: null, reason: 'delivery_disabled' },
      });
    }

    const branch = await db
      .select()
      .from(schema.branches)
      .where(eq(schema.branches.id, branch_id))
      .get();

    if (!branch?.latitude || !branch?.longitude) {
      return res.json({
        data: { available: false, cost: null, distance_km: null, duration_min: null, estimated_delivery_min: null, disclaimer: null, reason: 'delivery_disabled' },
      });
    }

    const pricing = await db.select().from(schema.delivery_pricing_config).get();
    const effectiveRadius = branchConfig.radius_override_km ?? branchConfig.default_radius_km ?? 5;
    const distance = haversineKm(branch.latitude, branch.longitude, customer_lat, customer_lng);

    if (distance > effectiveRadius) {
      return res.json({
        data: { available: false, cost: null, distance_km: Math.round(distance * 100) / 100, duration_min: null, estimated_delivery_min: null, disclaimer: null, reason: 'out_of_radius' },
      });
    }

    if (neighborhood_name) {
      const blocked = await db
        .select()
        .from(schema.branch_delivery_neighborhoods)
        .innerJoin(schema.city_neighborhoods, eq(schema.city_neighborhoods.id, schema.branch_delivery_neighborhoods.neighborhood_id))
        .where(
          and(
            eq(schema.branch_delivery_neighborhoods.branch_id, branch_id),
            eq(schema.city_neighborhoods.name, neighborhood_name),
            eq(schema.branch_delivery_neighborhoods.status, 'blocked_security'),
          ),
        )
        .get();

      if (blocked) {
        return res.json({
          data: { available: false, cost: null, distance_km: Math.round(distance * 100) / 100, duration_min: null, estimated_delivery_min: null, disclaimer: null, reason: 'blocked_zone' },
        });
      }
    }

    const baseDistanceKm = pricing?.base_distance_km ?? 2;
    const basePrice = pricing?.base_price ?? 500;
    const pricePerExtraKm = pricing?.price_per_extra_km ?? 200;
    const speedKmh = Number(pricing?.estimated_speed_kmh) || 30;
    const prepTimeMin = pricing?.prep_time_minutes ?? 30;

    const extraKm = Math.max(0, distance - baseDistanceKm);
    const cost = Math.round(basePrice + extraKm * pricePerExtraKm);
    const durationMin = Math.round((distance / speedKmh) * 60);
    const estimatedDeliveryMin = prepTimeMin + durationMin;

    res.json({
      data: {
        available: true,
        cost,
        distance_km: Math.round(distance * 100) / 100,
        duration_min: durationMin,
        estimated_delivery_min: estimatedDeliveryMin,
        disclaimer: pricing?.time_disclaimer ?? null,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Active Delivery Stats
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/active-stats/:branchId', requireAuth, async (req, res, next) => {
  try {
    const activeStates = ['en_preparacion', 'listo_envio', 'en_camino'];
    const activeOrders = await db
      .select({ created_at: schema.orders.created_at })
      .from(schema.orders)
      .where(
        and(
          eq(schema.orders.branch_id, req.params.branchId),
          inArray(schema.orders.status, activeStates),
        ),
      );

    let avgMinutes: number | null = null;
    if (activeOrders.length > 0) {
      const now = Date.now();
      const totalMin = activeOrders.reduce((sum, o) => {
        const created = o.created_at ? new Date(o.created_at).getTime() : now;
        return sum + (now - created) / 60000;
      }, 0);
      avgMinutes = Math.round(totalMin / activeOrders.length);
    }

    res.json({ data: { activeCount: activeOrders.length, avgMinutes } });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Delivery Zones
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/zones/:branchId', requireAuth, async (req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(schema.delivery_zones)
      .where(eq(schema.delivery_zones.branch_id, req.params.branchId));
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/zones', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(schema.delivery_zones).values({
      id,
      ...req.body,
      created_at: now,
      updated_at: now,
    });
    const created = await db.select().from(schema.delivery_zones).where(eq(schema.delivery_zones.id, id)).get();
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
});

router.put('/zones/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(schema.delivery_zones).where(eq(schema.delivery_zones.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Zone not found');

    await db
      .update(schema.delivery_zones)
      .set({ ...req.body, updated_at: new Date().toISOString() })
      .where(eq(schema.delivery_zones.id, req.params.id));

    const updated = await db.select().from(schema.delivery_zones).where(eq(schema.delivery_zones.id, req.params.id)).get();
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

router.delete('/zones/:id', requireAuth, async (req, res, next) => {
  try {
    const existing = await db.select().from(schema.delivery_zones).where(eq(schema.delivery_zones.id, req.params.id)).get();
    if (!existing) throw new AppError(404, 'Zone not found');

    await db.delete(schema.delivery_zones).where(eq(schema.delivery_zones.id, req.params.id));
    res.json({ data: { message: 'Zone deleted' } });
  } catch (err) {
    next(err);
  }
});

router.patch('/zones/:id/active', requireAuth, async (req, res, next) => {
  try {
    const { is_active } = req.body;
    await db
      .update(schema.delivery_zones)
      .set({ is_active, updated_at: new Date().toISOString() })
      .where(eq(schema.delivery_zones.id, req.params.id));

    const updated = await db.select().from(schema.delivery_zones).where(eq(schema.delivery_zones.id, req.params.id)).get();
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

export { router as deliveryRoutes };

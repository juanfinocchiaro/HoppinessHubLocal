import { Router } from 'express';
import { db } from '../db/connection.js';
import {
  orders, order_items, order_item_modifiers, order_payments, order_payment_edits,
  cash_registers, cash_register_shifts, cash_register_movements,
  stock_actual, stock_movements, stock_cierre_mensual,
  stock_conteos, stock_conteo_items,
  supplies, manual_consumptions,
  menu_categories, menu_items,
  extra_assignments, removable_items,
  operator_session_logs,
  profiles, user_role_assignments, roles,
  customer_addresses,
  delivery_drivers,
  webapp_order_messages,
} from '../db/schema.js';
import { eq, and, desc, gte, lte, sql, inArray, isNull } from 'drizzle-orm';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { emitToRoom } from '../realtime/socketServer.js';

const router = Router();

function generateTrackingCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function getNextOrderNumber(branchId: string): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const result = await db.select({ maxNum: sql<number>`MAX(${orders.order_number})` })
    .from(orders)
    .where(and(
      eq(orders.branch_id, branchId),
      gte(orders.created_at, today),
      lte(orders.created_at, today + 'T23:59:59.999Z'),
    ))
    .get();
  return (result?.maxNum ?? 0) + 1;
}

// ============================================================================
// ORDER LIST & GENERATE NUMBER
// ============================================================================

router.get('/items', requireAuth, async (req, res, next) => {
  try {
    const pedidoId = req.query.pedidoId as string;
    if (!pedidoId) throw new AppError(400, 'pedidoId is required');
    const rows = await db.select().from(order_items)
      .where(eq(order_items.pedido_id, pedidoId))
      .orderBy(order_items.created_at);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/payments', requireAuth, async (req, res, next) => {
  try {
    const pedidoId = req.query.pedidoId as string;
    if (!pedidoId) throw new AppError(400, 'pedidoId is required');
    const rows = await db.select().from(order_payments)
      .where(eq(order_payments.pedido_id, pedidoId));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/delivered', requireAuth, async (req, res, next) => {
  try {
    const { branchId, fromDate } = req.query;
    const rows = await db.select().from(orders)
      .where(and(
        eq(orders.branch_id, branchId as string),
        eq(orders.status, 'entregado'),
        gte(orders.created_at, fromDate as string),
      ))
      .orderBy(desc(orders.created_at));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/closure', requireAuth, async (req, res, next) => {
  try {
    const { branchId, fecha } = req.query;
    const dateStr = fecha as string;
    const rows = await db.select().from(orders)
      .where(and(
        eq(orders.branch_id, branchId as string),
        gte(orders.created_at, dateStr),
        lte(orders.created_at, dateStr + 'T23:59:59.999Z'),
      ))
      .orderBy(orders.created_at);

    const result = [];
    for (const order of rows) {
      const items = await db.select().from(order_items)
        .where(eq(order_items.pedido_id, order.id));
      const payments = await db.select().from(order_payments)
        .where(eq(order_payments.pedido_id, order.id));
      result.push({ ...order, items, payments });
    }
    res.json({ data: result });
  } catch (err) { next(err); }
});

router.get('/reconciliation-payments', requireAuth, async (req, res, next) => {
  try {
    const { branchId, desde, hasta } = req.query;
    const conditions = [eq(orders.branch_id, branchId as string)];
    if (desde) conditions.push(gte(orders.created_at, desde as string));
    if (hasta) conditions.push(lte(orders.created_at, hasta as string));

    const orderRows = await db.select({ id: orders.id }).from(orders)
      .where(and(...conditions));
    const ids = orderRows.map(o => o.id);
    if (ids.length === 0) return res.json({ data: [] });

    const rows = await db.select().from(order_payments)
      .where(inArray(order_payments.pedido_id, ids));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/kitchen', requireAuth, async (req, res, next) => {
  try {
    const branchId = req.query.branchId as string;
    const rows = await db.select().from(orders)
      .where(and(
        eq(orders.branch_id, branchId),
        sql`${orders.status} IN ('pendiente', 'confirmado', 'preparando', 'pending', 'confirmed', 'preparing')`,
      ))
      .orderBy(orders.created_at);

    const result = [];
    for (const order of rows) {
      const items = await db.select().from(order_items)
        .where(eq(order_items.pedido_id, order.id));
      result.push({ ...order, items });
    }
    res.json({ data: result });
  } catch (err) { next(err); }
});

router.get('/history', requireAuth, async (req, res, next) => {
  try {
    const { branchId, fromDate } = req.query;
    const rows = await db.select().from(orders)
      .where(and(
        eq(orders.branch_id, branchId as string),
        gte(orders.created_at, fromDate as string),
      ))
      .orderBy(desc(orders.created_at));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/frequent-item-sales', requireAuth, async (req, res, next) => {
  try {
    const { branchId, since } = req.query;
    const rows = await db.select({
      item_carta_id: order_items.item_carta_id,
      name: order_items.name,
      total_quantity: sql<number>`SUM(${order_items.quantity})`,
      order_count: sql<number>`COUNT(DISTINCT ${order_items.pedido_id})`,
    }).from(order_items)
      .innerJoin(orders, eq(order_items.pedido_id, orders.id))
      .where(and(
        eq(orders.branch_id, branchId as string),
        gte(orders.created_at, since as string),
      ))
      .groupBy(order_items.item_carta_id, order_items.name)
      .orderBy(sql`SUM(${order_items.quantity}) DESC`);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/shift-pedido-ids', requireAuth, async (req, res, next) => {
  try {
    const { branchId, since } = req.query;
    const rows = await db.select({ id: orders.id }).from(orders)
      .where(and(
        eq(orders.branch_id, branchId as string),
        gte(orders.created_at, since as string),
      ));
    res.json({ data: rows.map(r => r.id) });
  } catch (err) { next(err); }
});

router.get('/shift-analysis', requireAuth, async (req, res, next) => {
  try {
    const { branchId, since } = req.query;
    const rows = await db.select().from(orders)
      .where(and(
        eq(orders.branch_id, branchId as string),
        gte(orders.created_at, since as string),
      ))
      .orderBy(orders.created_at);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/menu-categories-by-name', requireAuth, async (req, res, next) => {
  try {
    const pattern = req.query.pattern as string;
    const rows = await db.select().from(menu_categories)
      .where(sql`${menu_categories.name} LIKE ${`%${pattern}%`}`);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/menu-categorias-print', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select({
      id: menu_categories.id,
      name: menu_categories.name,
      print_type: menu_categories.print_type,
    }).from(menu_categories)
      .where(eq(menu_categories.is_active, true))
      .orderBy(menu_categories.sort_order);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/vale-category-ids', requireAuth, async (_req, res, next) => {
  try {
    const rows = await db.select({ id: menu_categories.id }).from(menu_categories)
      .where(eq(menu_categories.print_type, 'vale'));
    res.json({ data: rows.map(r => r.id) });
  } catch (err) { next(err); }
});

router.get('/item-extra-assignments', requireAuth, async (req, res, next) => {
  try {
    const itemId = req.query.itemId as string;
    const assignments = await db.select().from(extra_assignments)
      .where(eq(extra_assignments.item_carta_id, itemId));

    const extraIds = assignments.map(a => a.extra_id).filter(Boolean) as string[];
    if (extraIds.length === 0) return res.json({ data: [] });

    const extras = await db.select().from(menu_items)
      .where(and(inArray(menu_items.id, extraIds), eq(menu_items.is_active, true)));

    const result = assignments.map(a => {
      const extra = extras.find(e => e.id === a.extra_id);
      return { ...a, extra };
    });
    res.json({ data: result });
  } catch (err) { next(err); }
});

router.get('/item-removibles', requireAuth, async (req, res, next) => {
  try {
    const itemId = req.query.itemId as string;
    const rows = await db.select().from(removable_items)
      .where(and(
        eq(removable_items.item_carta_id, itemId),
        eq(removable_items.is_active, true),
      ));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/user-roles-verification', requireAuth, async (req, res, next) => {
  try {
    const userId = req.query.userId as string;
    const rows = await db.select({
      role_id: user_role_assignments.role_id,
      branch_id: user_role_assignments.branch_id,
      is_active: user_role_assignments.is_active,
    }).from(user_role_assignments)
      .where(eq(user_role_assignments.user_id, userId));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/user-active-roles', requireAuth, async (req, res, next) => {
  try {
    const userId = req.query.userId as string;
    const assignments = await db.select().from(user_role_assignments)
      .where(and(
        eq(user_role_assignments.user_id, userId),
        eq(user_role_assignments.is_active, true),
      ));

    const roleIds = assignments.map(a => a.role_id).filter(Boolean) as string[];
    const roleRows = roleIds.length > 0
      ? await db.select().from(roles).where(inArray(roles.id, roleIds))
      : [];

    const result = assignments.map(a => {
      const role = roleRows.find(r => r.id === a.role_id);
      return { ...a, role };
    });
    res.json({ data: result });
  } catch (err) { next(err); }
});

router.get('/profile-name/:userId', requireAuth, async (req, res, next) => {
  try {
    const row = await db.select({ full_name: profiles.full_name }).from(profiles)
      .where(eq(profiles.id, req.params.userId)).get();
    res.json({ data: row || { full_name: null } });
  } catch (err) { next(err); }
});

// ============================================================================
// ORDERS CRUD
// ============================================================================

router.post('/generate-number', requireAuth, async (req, res, next) => {
  try {
    const { branchId } = req.body;
    if (!branchId) throw new AppError(400, 'branchId is required');
    const num = await getNextOrderNumber(branchId);
    res.json({ data: num });
  } catch (err) { next(err); }
});

router.post('/items', requireAuth, async (req, res, next) => {
  try {
    const { items: newItems } = req.body;
    if (!Array.isArray(newItems)) throw new AppError(400, 'items must be an array');
    const now = new Date().toISOString();
    const inserted = [];
    for (const item of newItems) {
      const id = item.id || crypto.randomUUID();
      await db.insert(order_items).values({
        id,
        pedido_id: item.pedido_id,
        item_carta_id: item.item_carta_id,
        name: item.name || item.nombre,
        quantity: item.quantity ?? item.cantidad ?? 1,
        unit_price: item.unit_price ?? item.precio_unitario,
        subtotal: item.subtotal,
        notes: item.notes || item.notas,
        estacion: item.estacion,
        status: item.status || 'pendiente',
        reference_price: item.reference_price,
        categoria_carta_id: item.categoria_carta_id,
        articulo_id: item.articulo_id,
        articulo_tipo: item.articulo_tipo,
        promocion_id: item.promocion_id,
        promocion_item_id: item.promocion_item_id,
        created_at: now,
      });
      inserted.push(id);
    }
    res.status(201).json({ data: inserted });
  } catch (err) { next(err); }
});

router.post('/payments', requireAuth, async (req, res, next) => {
  try {
    const { pagos } = req.body;
    if (!Array.isArray(pagos)) throw new AppError(400, 'pagos must be an array');
    const now = new Date().toISOString();
    const inserted = [];
    for (const p of pagos) {
      const id = p.id || crypto.randomUUID();
      await db.insert(order_payments).values({
        id,
        pedido_id: p.pedido_id,
        method: p.method || p.metodo,
        amount: p.amount ?? p.monto,
        received_amount: p.received_amount ?? p.monto_recibido,
        vuelto: p.vuelto,
        tarjeta_ultimos_4: p.tarjeta_ultimos_4,
        tarjeta_marca: p.tarjeta_marca,
        mp_payment_id: p.mp_payment_id,
        transferencia_referencia: p.transferencia_referencia,
        created_by: p.created_by || req.user?.userId,
        created_at: now,
      });
      inserted.push(id);

      if (p.pedido_id) {
        emitToRoom(`order:${p.pedido_id}`, 'payment:created', { id, ...p });
      }
    }
    res.status(201).json({ data: inserted });
  } catch (err) { next(err); }
});

router.post('/customer-address', requireAuth, async (req, res, next) => {
  try {
    const { user_id, label, address, city, is_primary } = req.body;
    const id = crypto.randomUUID();
    await db.insert(customer_addresses).values({
      id, user_id, label, address, city,
      is_primary: is_primary ?? false,
      created_at: new Date().toISOString(),
    });
    res.status(201).json({ data: { id } });
  } catch (err) { next(err); }
});

router.post('/operator-session-log', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    await db.insert(operator_session_logs).values({
      id,
      branch_id: req.body.branch_id,
      current_user_id: req.body.current_user_id,
      previous_user_id: req.body.previous_user_id,
      action_type: req.body.action_type,
      triggered_by: req.body.triggered_by,
      created_at: new Date().toISOString(),
    });
    res.status(201).json({ data: { id } });
  } catch (err) { next(err); }
});

router.post('/validate-supervisor-pin', requireAuth, async (req, res, next) => {
  try {
    const { _branch_id: branchId, _pin: pin } = req.body;

    const supervisorRoles = await db.select({ id: roles.id }).from(roles)
      .where(sql`${roles.key} IN ('supervisor', 'admin', 'owner', 'superadmin', 'encargado')`);
    const roleIds = supervisorRoles.map(r => r.id);
    if (roleIds.length === 0) return res.json({ data: { valid: false } });

    const assignments = await db.select().from(user_role_assignments)
      .where(and(
        eq(user_role_assignments.branch_id, branchId),
        eq(user_role_assignments.is_active, true),
        inArray(user_role_assignments.role_id, roleIds),
      ));

    const match = assignments.find(a => a.clock_pin === pin);
    if (match) {
      const profile = await db.select({ full_name: profiles.full_name }).from(profiles)
        .where(eq(profiles.id, match.user_id!)).get();
      return res.json({ data: { valid: true, user_id: match.user_id, full_name: profile?.full_name } });
    }

    const userIds = assignments.map(a => a.user_id).filter(Boolean) as string[];
    if (userIds.length > 0) {
      const pinMatch = await db.select({ id: profiles.id, full_name: profiles.full_name })
        .from(profiles)
        .where(and(inArray(profiles.id, userIds), eq(profiles.pin_hash, pin)))
        .get();
      if (pinMatch) {
        return res.json({ data: { valid: true, user_id: pinMatch.id, full_name: pinMatch.full_name } });
      }
    }

    res.json({ data: { valid: false } });
  } catch (err) { next(err); }
});

router.post('/lookup-profile-by-phone', requireAuth, async (req, res, next) => {
  try {
    const { phoneVariants } = req.body;
    if (!Array.isArray(phoneVariants) || phoneVariants.length === 0) {
      return res.json({ data: null });
    }
    const row = await db.select().from(profiles)
      .where(inArray(profiles.phone, phoneVariants))
      .get();
    res.json({ data: row || null });
  } catch (err) { next(err); }
});

router.post('/item-quantities-by-categories', requireAuth, async (req, res, next) => {
  try {
    const { categoryIds, pedidoIds } = req.body;
    if (!categoryIds?.length || !pedidoIds?.length) return res.json({ data: [] });

    const rows = await db.select({
      item_carta_id: order_items.item_carta_id,
      name: order_items.name,
      categoria_carta_id: order_items.categoria_carta_id,
      total: sql<number>`SUM(${order_items.quantity})`,
    }).from(order_items)
      .where(and(
        inArray(order_items.pedido_id, pedidoIds),
        inArray(order_items.categoria_carta_id, categoryIds),
      ))
      .groupBy(order_items.item_carta_id, order_items.name, order_items.categoria_carta_id);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/payment-edit-audit', requireAuth, async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    await db.insert(order_payment_edits).values({
      id,
      pedido_id: req.body.pedido_id,
      pagos_antes: typeof req.body.pagos_antes === 'string' ? req.body.pagos_antes : JSON.stringify(req.body.pagos_antes),
      pagos_despues: typeof req.body.pagos_despues === 'string' ? req.body.pagos_despues : JSON.stringify(req.body.pagos_despues),
      reason: req.body.reason,
      editado_por: req.body.editado_por || req.user?.userId,
      created_at: new Date().toISOString(),
    });
    res.status(201).json({ data: { id } });
  } catch (err) { next(err); }
});

// ── Main order insert ──

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const b = req.body;
    const id = b.id || crypto.randomUUID();
    const now = new Date().toISOString();
    const orderNumber = b.order_number ?? await getNextOrderNumber(b.branch_id);
    const trackingCode = b.webapp_tracking_code || generateTrackingCode();

    await db.insert(orders).values({
      id,
      branch_id: b.branch_id,
      order_number: orderNumber,
      caller_number: b.caller_number,
      type: b.type,
      customer_name: b.customer_name,
      customer_phone: b.customer_phone,
      customer_address: b.customer_address,
      cliente_notas: b.cliente_notas,
      cadete_id: b.cadete_id,
      delivery_cost: b.delivery_cost,
      status: b.status || 'pendiente',
      subtotal: b.subtotal,
      descuento: b.descuento,
      descuento_motivo: b.descuento_motivo,
      total: b.total,
      requires_invoice: b.requires_invoice,
      invoice_type: b.invoice_type,
      invoice_cuit: b.invoice_cuit,
      invoice_business_name: b.invoice_business_name,
      created_by: b.created_by || req.user?.userId,
      canal_venta: b.canal_venta,
      service_type: b.service_type,
      canal_app: b.canal_app,
      propina: b.propina,
      source: b.source || 'pos',
      pago_online_id: b.pago_online_id,
      pago_estado: b.pago_estado,
      webapp_tracking_code: trackingCode,
      cliente_email: b.cliente_email,
      delivery_zone_id: b.delivery_zone_id,
      cliente_user_id: b.cliente_user_id,
      delivery_lat: b.delivery_lat,
      delivery_lng: b.delivery_lng,
      delivery_distance_km: b.delivery_distance_km,
      delivery_address: b.delivery_address,
      delivery_neighborhood: b.delivery_neighborhood,
      promised_time: b.promised_time,
      mp_payment_intent_id: b.mp_payment_intent_id,
      created_at: now,
    });

    if (b.branch_id) {
      emitToRoom(`kitchen:${b.branch_id}`, 'order:updated', { id, order_number: orderNumber });
    }

    res.status(201).json({ data: { id, order_number: orderNumber } });
  } catch (err) { next(err); }
});

// ── Root GET (list orders by branch) ──

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const branchId = (req.query.branchId || req.query.branch_id) as string;
    if (!branchId) throw new AppError(400, 'branchId is required');
    const rows = await db.select().from(orders)
      .where(eq(orders.branch_id, branchId))
      .orderBy(desc(orders.created_at));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

// ============================================================================
// CASH REGISTER & SHIFTS
// ============================================================================

router.get('/cash/open-register', requireAuth, async (req, res, next) => {
  try {
    const branchId = req.query.branchId as string;
    const row = await db.select().from(cash_registers)
      .where(and(
        eq(cash_registers.branch_id, branchId),
        eq(cash_registers.is_active, true),
      ))
      .get();
    res.json({ data: row || null });
  } catch (err) { next(err); }
});

router.get('/cash/open-shift', requireAuth, async (req, res, next) => {
  try {
    const branchId = req.query.branchId as string;
    const row = await db.select().from(cash_register_shifts)
      .where(and(
        eq(cash_register_shifts.branch_id, branchId),
        eq(cash_register_shifts.status, 'open'),
      ))
      .get();
    res.json({ data: row || null });
  } catch (err) { next(err); }
});

router.get('/cash/open-shift-for-branch', requireAuth, async (req, res, next) => {
  try {
    const branchId = req.query.branchId as string;
    const row = await db.select().from(cash_register_shifts)
      .where(and(
        eq(cash_register_shifts.branch_id, branchId),
        eq(cash_register_shifts.status, 'open'),
      ))
      .get();
    res.json({ data: row || null });
  } catch (err) { next(err); }
});

router.post('/cash/movement', requireAuth, async (req, res, next) => {
  try {
    const b = req.body;
    const id = b.id || crypto.randomUUID();
    await db.insert(cash_register_movements).values({
      id,
      shift_id: b.shift_id,
      branch_id: b.branch_id,
      type: b.type,
      payment_method: b.payment_method,
      amount: b.amount,
      concept: b.concept,
      order_id: b.order_id,
      recorded_by: b.recorded_by || req.user?.userId,
      source_register_id: b.source_register_id,
      expense_category: b.expense_category,
      rdo_category_code: b.rdo_category_code,
      approval_status: b.approval_status,
      extra_notes: b.extra_notes,
      created_at: new Date().toISOString(),
    });
    res.status(201).json({ data: { id } });
  } catch (err) { next(err); }
});

router.get('/cash/shift-expenses', requireAuth, async (req, res, next) => {
  try {
    const shiftId = req.query.shiftId as string;
    const rows = await db.select().from(cash_register_movements)
      .where(eq(cash_register_movements.shift_id, shiftId))
      .orderBy(cash_register_movements.created_at);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.put('/cash/expense/:id/approval', requireAuth, async (req, res, next) => {
  try {
    const { estado_aprobacion } = req.body;
    await db.update(cash_register_movements)
      .set({ approval_status: estado_aprobacion })
      .where(eq(cash_register_movements.id, req.params.id));
    const row = await db.select().from(cash_register_movements)
      .where(eq(cash_register_movements.id, req.params.id)).get();
    res.json({ data: row });
  } catch (err) { next(err); }
});

// ============================================================================
// STOCK
// ============================================================================

router.get('/stock', requireAuth, async (req, res, next) => {
  try {
    const branchId = req.query.branchId as string;
    const insumos = await db.select().from(supplies)
      .where(and(eq(supplies.is_active, true), isNull(supplies.deleted_at)));
    const stockActual = await db.select().from(stock_actual)
      .where(eq(stock_actual.branch_id, branchId));
    const movimientos = await db.select().from(stock_movements)
      .where(eq(stock_movements.branch_id, branchId))
      .orderBy(desc(stock_movements.created_at));
    res.json({ data: { insumos, stockActual, movimientos } });
  } catch (err) { next(err); }
});

router.get('/stock/insumo-unit/:insumoId', requireAuth, async (req, res, next) => {
  try {
    const row = await db.select({ base_unit: supplies.base_unit }).from(supplies)
      .where(eq(supplies.id, req.params.insumoId)).get();
    res.json({ data: row || { base_unit: 'un' } });
  } catch (err) { next(err); }
});

router.post('/stock/upsert', requireAuth, async (req, res, next) => {
  try {
    const { branch_id, insumo_id, quantity, unit } = req.body;
    const existing = await db.select().from(stock_actual)
      .where(and(
        eq(stock_actual.branch_id, branch_id),
        eq(stock_actual.insumo_id, insumo_id),
      )).get();

    const now = new Date().toISOString();
    if (existing) {
      await db.update(stock_actual)
        .set({ quantity, unit, updated_at: now })
        .where(eq(stock_actual.id, existing.id));
    } else {
      await db.insert(stock_actual).values({
        id: crypto.randomUUID(),
        branch_id, insumo_id, quantity, unit, updated_at: now,
      });
    }
    res.json({ data: null });
  } catch (err) { next(err); }
});

router.post('/stock/movement', requireAuth, async (req, res, next) => {
  try {
    const b = req.body;
    const id = b.id || crypto.randomUUID();
    await db.insert(stock_movements).values({
      id,
      branch_id: b.branch_id,
      insumo_id: b.insumo_id,
      type: b.type,
      quantity: b.quantity,
      quantity_before: b.quantity_before,
      quantity_after: b.quantity_after,
      pedido_id: b.pedido_id,
      supplier_invoice_id: b.supplier_invoice_id,
      reason: b.reason,
      note: b.note,
      created_by: b.created_by || req.user?.userId,
      created_at: new Date().toISOString(),
    });
    res.status(201).json({ data: { id } });
  } catch (err) { next(err); }
});

router.get('/stock/actual-item', requireAuth, async (req, res, next) => {
  try {
    const { branchId, insumoId } = req.query;
    const row = await db.select().from(stock_actual)
      .where(and(
        eq(stock_actual.branch_id, branchId as string),
        eq(stock_actual.insumo_id, insumoId as string),
      )).get();
    res.json({ data: row || null });
  } catch (err) { next(err); }
});

router.get('/stock/actual-row', requireAuth, async (req, res, next) => {
  try {
    const { branchId, insumoId } = req.query;
    const row = await db.select().from(stock_actual)
      .where(and(
        eq(stock_actual.branch_id, branchId as string),
        eq(stock_actual.insumo_id, insumoId as string),
      )).get();
    res.json({ data: row || null });
  } catch (err) { next(err); }
});

router.get('/stock/actual-with-names', requireAuth, async (req, res, next) => {
  try {
    const branchId = req.query.branchId as string;
    const stockRows = await db.select().from(stock_actual)
      .where(eq(stock_actual.branch_id, branchId));

    const insumoIds = stockRows.map(s => s.insumo_id).filter(Boolean) as string[];
    const insumoMap = new Map<string, string>();
    if (insumoIds.length > 0) {
      const insumos = await db.select({ id: supplies.id, name: supplies.name })
        .from(supplies).where(inArray(supplies.id, insumoIds));
      for (const i of insumos) insumoMap.set(i.id, i.name!);
    }

    const result = stockRows.map(s => ({
      ...s,
      insumo_name: insumoMap.get(s.insumo_id!) || null,
    }));
    res.json({ data: result });
  } catch (err) { next(err); }
});

router.get('/stock/movements-period', requireAuth, async (req, res, next) => {
  try {
    const { branchId, start, end } = req.query;
    const rows = await db.select().from(stock_movements)
      .where(and(
        eq(stock_movements.branch_id, branchId as string),
        gte(stock_movements.created_at, start as string),
        lte(stock_movements.created_at, end as string),
      ))
      .orderBy(stock_movements.created_at);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/stock/movements-for-insumo', requireAuth, async (req, res, next) => {
  try {
    const { branchId, insumoId, from, to } = req.query;
    const rows = await db.select().from(stock_movements)
      .where(and(
        eq(stock_movements.branch_id, branchId as string),
        eq(stock_movements.insumo_id, insumoId as string),
        gte(stock_movements.created_at, from as string),
        lte(stock_movements.created_at, to as string),
      ))
      .orderBy(stock_movements.created_at);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/stock/movements-history', requireAuth, async (req, res, next) => {
  try {
    const { branchId, insumoId, limit: limitStr } = req.query;
    const limitNum = parseInt(limitStr as string) || 10;
    const rows = await db.select().from(stock_movements)
      .where(and(
        eq(stock_movements.branch_id, branchId as string),
        eq(stock_movements.insumo_id, insumoId as string),
      ))
      .orderBy(desc(stock_movements.created_at))
      .limit(limitNum);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/stock/cierre-anterior', requireAuth, async (req, res, next) => {
  try {
    const { branchId, periodo } = req.query;
    const rows = await db.select().from(stock_cierre_mensual)
      .where(and(
        eq(stock_cierre_mensual.branch_id, branchId as string),
        eq(stock_cierre_mensual.period, periodo as string),
      ));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/stock/prev-cierre-insumo', requireAuth, async (req, res, next) => {
  try {
    const { branchId, insumoId, periodo } = req.query;
    const row = await db.select().from(stock_cierre_mensual)
      .where(and(
        eq(stock_cierre_mensual.branch_id, branchId as string),
        eq(stock_cierre_mensual.insumo_id, insumoId as string),
        eq(stock_cierre_mensual.period, periodo as string),
      )).get();
    res.json({ data: row || null });
  } catch (err) { next(err); }
});

router.get('/stock/insumo-cost/:insumoId', requireAuth, async (req, res, next) => {
  try {
    const row = await db.select({
      base_unit_cost: supplies.base_unit_cost,
      reference_price: supplies.reference_price,
      purchase_unit_price: supplies.purchase_unit_price,
      base_unit: supplies.base_unit,
      purchase_unit: supplies.purchase_unit,
      purchase_unit_content: supplies.purchase_unit_content,
    }).from(supplies)
      .where(eq(supplies.id, req.params.insumoId)).get();
    res.json({ data: row || null });
  } catch (err) { next(err); }
});

router.post('/stock/insumos-by-ids', requireAuth, async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.json({ data: [] });
    const rows = await db.select().from(supplies).where(inArray(supplies.id, ids));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/stock/upsert-cierre-mensual', requireAuth, async (req, res, next) => {
  try {
    const b = req.body;
    const existing = await db.select().from(stock_cierre_mensual)
      .where(and(
        eq(stock_cierre_mensual.branch_id, b.branch_id),
        eq(stock_cierre_mensual.insumo_id, b.insumo_id),
        eq(stock_cierre_mensual.period, b.period),
      )).get();

    if (existing) {
      await db.update(stock_cierre_mensual).set({
        stock_apertura: b.stock_apertura,
        compras: b.compras,
        consumo_ventas: b.consumo_ventas,
        stock_esperado: b.stock_esperado,
        stock_cierre_fisico: b.stock_cierre_fisico,
        merma: b.merma,
      }).where(eq(stock_cierre_mensual.id, existing.id));
      const updated = await db.select().from(stock_cierre_mensual)
        .where(eq(stock_cierre_mensual.id, existing.id)).get();
      return res.json({ data: updated });
    }

    const id = crypto.randomUUID();
    await db.insert(stock_cierre_mensual).values({
      id,
      branch_id: b.branch_id,
      insumo_id: b.insumo_id,
      period: b.period,
      stock_apertura: b.stock_apertura,
      compras: b.compras,
      consumo_ventas: b.consumo_ventas,
      stock_esperado: b.stock_esperado,
      stock_cierre_fisico: b.stock_cierre_fisico,
      merma: b.merma,
      created_by: b.created_by || req.user?.userId,
      created_at: new Date().toISOString(),
    });
    const row = await db.select().from(stock_cierre_mensual)
      .where(eq(stock_cierre_mensual.id, id)).get();
    res.json({ data: row });
  } catch (err) { next(err); }
});

router.post('/stock/consumo-manual', requireAuth, async (req, res, next) => {
  try {
    const b = req.body;
    const id = b.id || crypto.randomUUID();
    await db.insert(manual_consumptions).values({
      id,
      branch_id: b.branch_id,
      period: b.period,
      pl_category: b.pl_category,
      consumed_amount: b.consumed_amount,
      type: b.type,
      details: b.details,
      notes: b.notes,
      created_by: b.created_by || req.user?.userId,
      created_at: new Date().toISOString(),
    });
    res.status(201).json({ data: { id } });
  } catch (err) { next(err); }
});

// ── Stock Conteos ──

router.post('/stock/conteo', requireAuth, async (req, res, next) => {
  try {
    const b = req.body;
    const id = b.id || crypto.randomUUID();
    await db.insert(stock_conteos).values({
      id,
      branch_id: b.branch_id,
      date: b.date,
      period: b.period,
      nota_general: b.nota_general,
      resumen: typeof b.resumen === 'string' ? b.resumen : JSON.stringify(b.resumen),
      status: b.status || 'borrador',
      created_by: b.created_by || req.user?.userId,
      created_at: new Date().toISOString(),
    });
    res.status(201).json({ data: { id } });
  } catch (err) { next(err); }
});

router.delete('/stock/conteo/:conteoId/items', requireAuth, async (req, res, next) => {
  try {
    await db.delete(stock_conteo_items)
      .where(eq(stock_conteo_items.conteo_id, req.params.conteoId));
    res.json({ data: null });
  } catch (err) { next(err); }
});

router.post('/stock/conteo-items', requireAuth, async (req, res, next) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) throw new AppError(400, 'items must be an array');
    for (const item of items) {
      await db.insert(stock_conteo_items).values({
        id: item.id || crypto.randomUUID(),
        conteo_id: item.conteo_id,
        insumo_id: item.insumo_id,
        stock_teorico: item.stock_teorico,
        stock_real: item.stock_real,
        unit_cost: item.unit_cost,
      });
    }
    res.status(201).json({ data: null });
  } catch (err) { next(err); }
});

router.put('/stock/conteo/:conteoId', requireAuth, async (req, res, next) => {
  try {
    const b = req.body;
    await db.update(stock_conteos).set({
      ...(b.status !== undefined && { status: b.status }),
      ...(b.nota_general !== undefined && { nota_general: b.nota_general }),
      ...(b.resumen !== undefined && { resumen: typeof b.resumen === 'string' ? b.resumen : JSON.stringify(b.resumen) }),
      ...(b.confirmed_at !== undefined && { confirmed_at: b.confirmed_at }),
    }).where(eq(stock_conteos.id, req.params.conteoId));
    const row = await db.select().from(stock_conteos)
      .where(eq(stock_conteos.id, req.params.conteoId)).get();
    res.json({ data: row });
  } catch (err) { next(err); }
});

router.put('/stock/actual-fields', requireAuth, async (req, res, next) => {
  try {
    const { branchId, insumoId, ...fields } = req.body;
    const now = new Date().toISOString();
    await db.update(stock_actual).set({
      ...(fields.quantity !== undefined && { quantity: fields.quantity }),
      ...(fields.unit !== undefined && { unit: fields.unit }),
      ...(fields.stock_minimo !== undefined && { stock_minimo: fields.stock_minimo }),
      ...(fields.stock_critico !== undefined && { stock_critico: fields.stock_critico }),
      ...(fields.stock_minimo_local !== undefined && { stock_minimo_local: fields.stock_minimo_local }),
      ...(fields.stock_critico_local !== undefined && { stock_critico_local: fields.stock_critico_local }),
      updated_at: now,
    }).where(and(
      eq(stock_actual.branch_id, branchId),
      eq(stock_actual.insumo_id, insumoId),
    ));
    res.json({ data: null });
  } catch (err) { next(err); }
});

router.post('/stock/actual-record', requireAuth, async (req, res, next) => {
  try {
    const b = req.body;
    const id = b.id || crypto.randomUUID();
    await db.insert(stock_actual).values({
      id,
      branch_id: b.branch_id,
      insumo_id: b.insumo_id,
      quantity: b.quantity ?? 0,
      unit: b.unit,
      stock_minimo: b.stock_minimo,
      stock_critico: b.stock_critico,
      stock_minimo_local: b.stock_minimo_local,
      stock_critico_local: b.stock_critico_local,
      updated_at: new Date().toISOString(),
    });
    res.status(201).json({ data: { id } });
  } catch (err) { next(err); }
});

// ============================================================================
// DELIVERY
// ============================================================================

router.get('/delivery/cadetes', requireAuth, async (req, res, next) => {
  try {
    const branchId = req.query.branchId as string;
    const rows = await db.select().from(delivery_drivers)
      .where(and(
        eq(delivery_drivers.branch_id, branchId),
        eq(delivery_drivers.is_active, true),
      ));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/delivery/pedidos', requireAuth, async (req, res, next) => {
  try {
    const branchId = req.query.branchId as string;
    const rows = await db.select().from(orders)
      .where(and(
        eq(orders.branch_id, branchId),
        sql`${orders.type} IN ('delivery', 'Delivery')`,
        sql`${orders.status} NOT IN ('entregado', 'cancelado', 'rechazado')`,
      ))
      .orderBy(orders.created_at);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

// ============================================================================
// WEBAPP ORDERS (in-branch management)
// ============================================================================

router.get('/webapp/pending', requireAuth, async (req, res, next) => {
  try {
    const branchId = req.query.branchId as string;
    const rows = await db.select().from(orders)
      .where(and(
        eq(orders.branch_id, branchId),
        eq(orders.source, 'webapp'),
        eq(orders.status, 'pendiente_webapp'),
      ))
      .orderBy(orders.created_at);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.post('/webapp/active', requireAuth, async (req, res, next) => {
  try {
    const { branchId, activeStates } = req.body;
    if (!Array.isArray(activeStates) || activeStates.length === 0) return res.json({ data: [] });
    const rows = await db.select().from(orders)
      .where(and(
        eq(orders.branch_id, branchId),
        eq(orders.source, 'webapp'),
        inArray(orders.status, activeStates),
      ))
      .orderBy(desc(orders.created_at));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

router.get('/webapp/recent', requireAuth, async (req, res, next) => {
  try {
    const { branchId, since } = req.query;
    const rows = await db.select().from(orders)
      .where(and(
        eq(orders.branch_id, branchId as string),
        eq(orders.source, 'webapp'),
        gte(orders.created_at, since as string),
      ))
      .orderBy(desc(orders.created_at));
    res.json({ data: rows });
  } catch (err) { next(err); }
});

// ============================================================================
// CHAT MESSAGES
// ============================================================================

router.post('/chat/message', requireAuth, async (req, res, next) => {
  try {
    const b = req.body;
    const id = b.id || crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(webapp_order_messages).values({
      id,
      pedido_id: b.pedido_id,
      branch_id: b.branch_id,
      sender_type: b.sender_type,
      sender_id: b.sender_id || req.user?.userId,
      sender_name: b.sender_name,
      message: b.message,
      created_at: now,
    });
    const row = await db.select().from(webapp_order_messages)
      .where(eq(webapp_order_messages.id, id)).get();

    if (b.pedido_id) {
      emitToRoom(`order:${b.pedido_id}`, 'chat:message', row);
    }
    res.status(201).json({ data: row });
  } catch (err) { next(err); }
});

// ============================================================================
// PENDING WEBAPP COUNT (from webappOrderService)
// ============================================================================

router.get('/branch/:branchId/pending-webapp-count', requireAuth, async (req, res, next) => {
  try {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(and(
        eq(orders.branch_id, req.params.branchId),
        eq(orders.source, 'webapp'),
        eq(orders.status, 'pendiente_webapp'),
      ))
      .get();
    res.json({ data: result?.count ?? 0 });
  } catch (err) { next(err); }
});

// ============================================================================
// DYNAMIC :pedidoId ROUTES (must be after all fixed routes)
// ============================================================================

router.put('/:pedidoId/status', requireAuth, async (req, res, next) => {
  try {
    const { status, ...extra } = req.body;
    if (!status) throw new AppError(400, 'status is required');
    const now = new Date().toISOString();

    const timestampMap: Record<string, string> = {
      confirmado: 'confirmed_at_time',
      confirmed: 'confirmed_at_time',
      preparando: 'prep_started_at_time',
      preparing: 'prep_started_at_time',
      listo: 'ready_at_time',
      ready: 'ready_at_time',
      en_ruta: 'on_route_at_time',
      on_route: 'on_route_at_time',
      entregado: 'delivered_at_time',
      delivered: 'delivered_at_time',
    };

    const tsField = timestampMap[status];
    const setObj: Record<string, unknown> = { status };
    if (tsField) setObj[tsField] = now;
    if (extra.cadete_id !== undefined) setObj.cadete_id = extra.cadete_id;

    await db.update(orders).set(setObj)
      .where(eq(orders.id, req.params.pedidoId));

    const order = await db.select().from(orders)
      .where(eq(orders.id, req.params.pedidoId)).get();
    if (!order) throw new AppError(404, 'Order not found');

    emitToRoom(`kitchen:${order.branch_id}`, 'order:updated', order);
    emitToRoom(`order:${req.params.pedidoId}`, 'order:tracking', order);

    res.json({ data: order });
  } catch (err) { next(err); }
});

router.put('/:pedidoId/cancel', requireAuth, async (req, res, next) => {
  try {
    const now = new Date().toISOString();
    await db.update(orders).set({ status: 'cancelado' })
      .where(eq(orders.id, req.params.pedidoId));

    const order = await db.select().from(orders)
      .where(eq(orders.id, req.params.pedidoId)).get();
    if (order?.branch_id) {
      emitToRoom(`kitchen:${order.branch_id}`, 'order:updated', order);
      emitToRoom(`order:${req.params.pedidoId}`, 'order:tracking', order);
    }
    res.json({ data: order });
  } catch (err) { next(err); }
});

router.put('/:orderId/accept', requireAuth, async (req, res, next) => {
  try {
    const now = new Date().toISOString();
    await db.update(orders).set({ status: 'confirmado', confirmed_at_time: now })
      .where(eq(orders.id, req.params.orderId));

    const order = await db.select().from(orders)
      .where(eq(orders.id, req.params.orderId)).get();
    if (order?.branch_id) {
      emitToRoom(`kitchen:${order.branch_id}`, 'order:updated', order);
      emitToRoom(`branch:${order.branch_id}`, 'webapp-order:new', order);
      emitToRoom(`order:${req.params.orderId}`, 'order:tracking', order);
    }
    res.json({ data: order });
  } catch (err) { next(err); }
});

router.put('/:orderId/reject', requireAuth, async (req, res, next) => {
  try {
    await db.update(orders).set({ status: 'rechazado' })
      .where(eq(orders.id, req.params.orderId));

    const order = await db.select().from(orders)
      .where(eq(orders.id, req.params.orderId)).get();
    if (order?.branch_id) {
      emitToRoom(`kitchen:${order.branch_id}`, 'order:updated', order);
      emitToRoom(`order:${req.params.orderId}`, 'order:tracking', order);
    }
    res.json({ data: order });
  } catch (err) { next(err); }
});

router.put('/:pedidoId/assign-cadete', requireAuth, async (req, res, next) => {
  try {
    const { cadeteId } = req.body;
    await db.update(orders).set({ cadete_id: cadeteId })
      .where(eq(orders.id, req.params.pedidoId));

    const order = await db.select().from(orders)
      .where(eq(orders.id, req.params.pedidoId)).get();
    if (order?.branch_id) {
      emitToRoom(`kitchen:${order.branch_id}`, 'order:updated', order);
    }
    res.json({ data: order });
  } catch (err) { next(err); }
});

router.put('/:pedidoId/chat/mark-read', requireAuth, async (req, res, next) => {
  try {
    const now = new Date().toISOString();
    await db.update(webapp_order_messages)
      .set({ leido: now })
      .where(and(
        eq(webapp_order_messages.pedido_id, req.params.pedidoId),
        isNull(webapp_order_messages.leido),
      ));
    res.json({ data: null });
  } catch (err) { next(err); }
});

router.delete('/:pedidoId/payments', requireAuth, async (req, res, next) => {
  try {
    await db.delete(order_payments)
      .where(eq(order_payments.pedido_id, req.params.pedidoId));
    res.json({ data: null });
  } catch (err) { next(err); }
});

router.get('/:pedidoId/chat', requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(webapp_order_messages)
      .where(eq(webapp_order_messages.pedido_id, req.params.pedidoId))
      .orderBy(webapp_order_messages.created_at);
    res.json({ data: rows });
  } catch (err) { next(err); }
});

export { router as orderRoutes };

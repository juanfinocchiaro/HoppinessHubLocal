
-- =============================================
-- Phase 2 Batch: descripcion→description, cantidad→quantity, monto→amount, observaciones→notes, medio_pago→payment_method
-- =============================================

-- 1. DROP all views that reference affected columns
DROP VIEW IF EXISTS public.webapp_menu_items;
DROP VIEW IF EXISTS public.rdo_multivista_items_base;
DROP VIEW IF EXISTS public.balance_socios;
DROP VIEW IF EXISTS public.rdo_report_data;
DROP VIEW IF EXISTS public.cuenta_corriente_proveedores;
DROP VIEW IF EXISTS public.cuenta_corriente_marca;

-- 2a. RENAME descripcion → description
ALTER TABLE public.delivery_zones RENAME COLUMN descripcion TO description;
ALTER TABLE public.investments RENAME COLUMN descripcion TO description;
ALTER TABLE public.menu_categories RENAME COLUMN descripcion TO description;
ALTER TABLE public.menu_items RENAME COLUMN descripcion TO description;
ALTER TABLE public.order_item_modifiers RENAME COLUMN descripcion TO description;
ALTER TABLE public.promotions RENAME COLUMN descripcion TO description;
ALTER TABLE public.rdo_movimientos RENAME COLUMN descripcion TO description;
ALTER TABLE public.recipes RENAME COLUMN descripcion TO description;
ALTER TABLE public.service_concepts RENAME COLUMN descripcion TO description;
ALTER TABLE public.supplies RENAME COLUMN descripcion TO description;
ALTER TABLE public.supply_categories RENAME COLUMN descripcion TO description;

-- 2b. RENAME cantidad → quantity
ALTER TABLE public.invoice_items RENAME COLUMN cantidad TO quantity;
ALTER TABLE public.menu_item_compositions RENAME COLUMN cantidad TO quantity;
ALTER TABLE public.menu_item_option_group_items RENAME COLUMN cantidad TO quantity;
ALTER TABLE public.order_items RENAME COLUMN cantidad TO quantity;
ALTER TABLE public.promotion_item_extras RENAME COLUMN cantidad TO quantity;
ALTER TABLE public.recipe_ingredients RENAME COLUMN cantidad TO quantity;
ALTER TABLE public.stock_actual RENAME COLUMN cantidad TO quantity;
ALTER TABLE public.stock_movimientos RENAME COLUMN cantidad TO quantity;
ALTER TABLE public.stock_movimientos RENAME COLUMN cantidad_anterior TO quantity_before;
ALTER TABLE public.stock_movimientos RENAME COLUMN cantidad_nueva TO quantity_after;

-- 2c. RENAME monto → amount
ALTER TABLE public.canon_payments RENAME COLUMN monto TO amount;
ALTER TABLE public.expenses RENAME COLUMN monto TO amount;
ALTER TABLE public.order_payments RENAME COLUMN monto TO amount;
ALTER TABLE public.partner_movements RENAME COLUMN monto TO amount;
ALTER TABLE public.rdo_movimientos RENAME COLUMN monto TO amount;
ALTER TABLE public.supplier_payments RENAME COLUMN monto TO amount;

-- 2d. RENAME observaciones → notes
ALTER TABLE public.branch_monthly_sales RENAME COLUMN observaciones TO notes;
ALTER TABLE public.canon_payments RENAME COLUMN observaciones TO notes;
ALTER TABLE public.canon_settlements RENAME COLUMN observaciones TO notes;
ALTER TABLE public.cash_register_movements RENAME COLUMN observaciones TO notes_extra;
ALTER TABLE public.expenses RENAME COLUMN observaciones TO notes;
ALTER TABLE public.financial_audit_log RENAME COLUMN observaciones TO notes;
ALTER TABLE public.investments RENAME COLUMN observaciones TO notes;
ALTER TABLE public.invoice_items RENAME COLUMN observaciones TO notes;
ALTER TABLE public.manual_consumptions RENAME COLUMN observaciones TO notes;
ALTER TABLE public.partner_movements RENAME COLUMN observaciones TO notes;
ALTER TABLE public.profit_distributions RENAME COLUMN observaciones TO notes;
ALTER TABLE public.supplier_branch_terms RENAME COLUMN observaciones TO notes;
ALTER TABLE public.supplier_invoices RENAME COLUMN observaciones TO notes;
ALTER TABLE public.supplier_payments RENAME COLUMN observaciones TO notes;
ALTER TABLE public.suppliers RENAME COLUMN observaciones TO notes;
ALTER TABLE public.tax_config RENAME COLUMN observaciones TO notes;

-- 2e. RENAME medio_pago → payment_method
ALTER TABLE public.canon_payments RENAME COLUMN medio_pago TO payment_method;
ALTER TABLE public.expenses RENAME COLUMN medio_pago TO payment_method;
ALTER TABLE public.supplier_payments RENAME COLUMN medio_pago TO payment_method;

-- 3. RECREATE views with new column names
CREATE OR REPLACE VIEW public.webapp_menu_items AS
SELECT ic.id,
    ic.name,
    ic.nombre_corto,
    ic.description,
    ic.imagen_url,
    ic.precio_base,
    ic.categoria_carta_id,
    mc.name AS categoria_nombre,
    mc.orden AS categoria_orden,
    ic.orden,
    ic.disponible_delivery,
    ic.disponible_webapp,
    ic.tipo
FROM menu_items ic
LEFT JOIN menu_categories mc ON mc.id = ic.categoria_carta_id
WHERE ic.is_active = true AND ic.deleted_at IS NULL AND ic.disponible_webapp = true
ORDER BY mc.orden, ic.orden;

CREATE OR REPLACE VIEW public.rdo_multivista_items_base AS
SELECT pi.id AS item_id,
    pi.pedido_id,
    p.branch_id,
    (p.created_at)::date AS fecha,
    normalize_rdo_channel((p.canal_venta)::text, (p.canal_app)::text, (p.tipo)::text) AS canal,
    pi.item_carta_id AS producto_id,
    COALESCE(pi.name, 'Sin nombre'::character varying) AS producto_nombre,
    COALESCE(pi.categoria_carta_id, ic.categoria_carta_id) AS categoria_id,
    COALESCE(mc.name, 'Sin categoría'::text) AS categoria_nombre,
    (COALESCE(pi.quantity, 0))::numeric AS cantidad,
    COALESCE(pi.subtotal, (0)::numeric) AS ventas,
    COALESCE(ic.costo_total, (0)::numeric) AS costo_unitario,
    ((COALESCE(pi.quantity, 0))::numeric * COALESCE(ic.costo_total, (0)::numeric)) AS costo_total
FROM order_items pi
JOIN orders p ON p.id = pi.pedido_id
LEFT JOIN menu_items ic ON ic.id = pi.item_carta_id
LEFT JOIN menu_categories mc ON mc.id = COALESCE(pi.categoria_carta_id, ic.categoria_carta_id)
WHERE (p.estado)::text = ANY (ARRAY['entregado'::text, 'listo'::text]);

CREATE OR REPLACE VIEW public.balance_socios AS
SELECT s.id AS socio_id,
    s.name AS nombre,
    s.branch_id,
    b.name AS branch_nombre,
    s.porcentaje_participacion,
    count(m.id) AS cantidad_movimientos,
    COALESCE(sum(m.amount) FILTER (WHERE (m.tipo)::text = 'aporte_capital'), 0::numeric) AS total_aportes,
    COALESCE(sum(m.amount) FILTER (WHERE (m.tipo)::text = 'prestamo_socio'), 0::numeric) AS total_prestamos_dados,
    COALESCE(sum(m.amount) FILTER (WHERE (m.tipo)::text = 'devolucion_prestamo'), 0::numeric) AS total_devoluciones,
    COALESCE(sum(m.amount) FILTER (WHERE (m.tipo)::text = 'distribucion_utilidades'), 0::numeric) AS total_utilidades,
    COALESCE(sum(m.amount) FILTER (WHERE (m.tipo)::text = ANY (ARRAY['retiro_anticipado'::text, 'retiro_utilidades'::text])), 0::numeric) AS total_retiros,
    (SELECT pm.saldo_acumulado FROM partner_movements pm WHERE pm.socio_id = s.id AND pm.deleted_at IS NULL ORDER BY pm.fecha DESC, pm.created_at DESC LIMIT 1) AS saldo_actual
FROM partners s
JOIN branches b ON b.id = s.branch_id
LEFT JOIN partner_movements m ON m.socio_id = s.id AND m.deleted_at IS NULL
WHERE s.deleted_at IS NULL AND s.is_active = true
GROUP BY s.id, s.name, s.branch_id, b.name, s.porcentaje_participacion;

CREATE OR REPLACE VIEW public.rdo_report_data AS
SELECT branch_id, periodo, rdo_category_code, sum(amount) AS total
FROM rdo_movimientos
WHERE deleted_at IS NULL
GROUP BY branch_id, periodo, rdo_category_code;

CREATE OR REPLACE VIEW public.cuenta_corriente_proveedores AS
SELECT p.id AS proveedor_id,
    p.razon_social,
    p.cuit,
    COALESCE(f_agg.branch_id, pa.branch_id) AS branch_id,
    COALESCE(f_agg.total_facturado, 0::numeric) AS total_facturado,
    (COALESCE(f_agg.pagado_en_facturas, 0::numeric) + COALESCE(pa.pagos_a_cuenta, 0::numeric)) AS total_pagado,
    (COALESCE(f_agg.total_facturado, 0::numeric) - (COALESCE(f_agg.pagado_en_facturas, 0::numeric) + COALESCE(pa.pagos_a_cuenta, 0::numeric))) AS total_pendiente,
    COALESCE(f_agg.cantidad_facturas, 0::bigint) AS cantidad_facturas,
    COALESCE(f_agg.facturas_pendientes, 0::bigint) AS facturas_pendientes,
    COALESCE(f_agg.facturas_vencidas, 0::bigint) AS facturas_vencidas,
    COALESCE(f_agg.monto_vencido, 0::numeric) AS monto_vencido,
    f_agg.proximo_vencimiento
FROM suppliers p
LEFT JOIN LATERAL (
    SELECT ff.branch_id,
        sum(ff.total) AS total_facturado,
        (sum(ff.total) - sum(ff.saldo_pendiente)) AS pagado_en_facturas,
        count(ff.id) AS cantidad_facturas,
        count(ff.id) FILTER (WHERE (ff.estado_pago)::text = 'pendiente') AS facturas_pendientes,
        count(ff.id) FILTER (WHERE (ff.estado_pago)::text = 'pendiente' AND ff.fecha_vencimiento < CURRENT_DATE) AS facturas_vencidas,
        COALESCE(sum(ff.saldo_pendiente) FILTER (WHERE (ff.estado_pago)::text = 'pendiente' AND ff.fecha_vencimiento < CURRENT_DATE), 0::numeric) AS monto_vencido,
        min(ff.fecha_vencimiento) FILTER (WHERE (ff.estado_pago)::text = 'pendiente' AND ff.fecha_vencimiento >= CURRENT_DATE) AS proximo_vencimiento
    FROM supplier_invoices ff
    WHERE ff.proveedor_id = p.id AND ff.deleted_at IS NULL
    GROUP BY ff.branch_id
) f_agg ON true
LEFT JOIN (
    SELECT sp.proveedor_id, sp.branch_id,
        COALESCE(sum(sp.amount), 0::numeric) AS pagos_a_cuenta
    FROM supplier_payments sp
    WHERE sp.factura_id IS NULL AND sp.deleted_at IS NULL
    GROUP BY sp.proveedor_id, sp.branch_id
) pa ON pa.proveedor_id = p.id AND pa.branch_id = COALESCE(f_agg.branch_id, pa.branch_id)
WHERE p.deleted_at IS NULL;

CREATE OR REPLACE VIEW public.cuenta_corriente_marca AS
SELECT f.id,
    f.branch_id,
    b.name AS local_nombre,
    f.periodo,
    f.factura_numero,
    f.factura_fecha,
    f.total AS monto_canon,
    f.saldo_pendiente,
    f.estado_pago,
    f.fecha_vencimiento,
    f.notes AS detalle
FROM supplier_invoices f
JOIN branches b ON b.id = f.branch_id
WHERE f.proveedor_id = '00000000-0000-0000-0000-000000000001'::uuid AND f.deleted_at IS NULL
ORDER BY f.periodo DESC, b.name;

-- 4. Update trigger functions that reference old column names
CREATE OR REPLACE FUNCTION public.calcular_saldo_socio()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  saldo_anterior NUMERIC(12,2);
BEGIN
  SELECT COALESCE(saldo_acumulado, 0) INTO saldo_anterior
  FROM partner_movements
  WHERE socio_id = NEW.socio_id
    AND deleted_at IS NULL
    AND (fecha < NEW.fecha OR (fecha = NEW.fecha AND created_at < NEW.created_at))
  ORDER BY fecha DESC, created_at DESC
  LIMIT 1;

  IF saldo_anterior IS NULL THEN saldo_anterior = 0; END IF;

  NEW.saldo_acumulado = saldo_anterior + NEW.amount;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_expense_movement_to_gastos()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_periodo TEXT;
  v_branch_id UUID;
BEGIN
  IF NEW.type != 'expense' THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.estado_aprobacion, 'aprobado') = 'rechazado' THEN
    RETURN NEW;
  END IF;

  v_branch_id := NEW.branch_id;
  v_periodo := to_char(COALESCE(NEW.created_at, now()), 'YYYY-MM');

  INSERT INTO public.expenses (
    id, branch_id, periodo, categoria_principal, concepto,
    amount, fecha, payment_method, notes, estado, created_by, rdo_category_code
  ) VALUES (
    NEW.id, v_branch_id, v_periodo,
    COALESCE(NEW.categoria_gasto, 'caja_chica'),
    NEW.concept, NEW.amount,
    (COALESCE(NEW.created_at, now()) AT TIME ZONE 'America/Argentina/Cordoba')::date,
    NEW.payment_method, NEW.notes_extra,
    CASE WHEN COALESCE(NEW.estado_aprobacion, 'aprobado') = 'pendiente_aprobacion' THEN 'pendiente' ELSE 'pagado' END,
    NEW.recorded_by, NEW.rdo_category_code
  )
  ON CONFLICT (id) DO UPDATE SET
    categoria_principal = COALESCE(EXCLUDED.categoria_principal, expenses.categoria_principal),
    concepto = EXCLUDED.concepto,
    amount = EXCLUDED.amount,
    payment_method = EXCLUDED.payment_method,
    notes = EXCLUDED.notes,
    estado = EXCLUDED.estado,
    rdo_category_code = EXCLUDED.rdo_category_code,
    updated_at = now();

  RETURN NEW;
END;
$function$;

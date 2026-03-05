-- ============================================================
-- PHASE 2: COMPLETE COLUMN RENAME (Spanish → English)
-- ============================================================

-- STEP 1: DROP AFFECTED VIEWS
DROP VIEW IF EXISTS webapp_menu_items CASCADE;
DROP VIEW IF EXISTS rdo_multivista_items_base CASCADE;
DROP VIEW IF EXISTS rdo_multivista_ventas_base CASCADE;
DROP VIEW IF EXISTS rdo_report_data CASCADE;
DROP VIEW IF EXISTS cuenta_corriente_proveedores CASCADE;
DROP VIEW IF EXISTS cuenta_corriente_marca CASCADE;
DROP VIEW IF EXISTS balance_socios CASCADE;

-- STEP 2A: FREQUENT COLUMNS

ALTER TABLE partners RENAME COLUMN telefono TO phone;
ALTER TABLE suppliers RENAME COLUMN telefono TO phone;
ALTER TABLE suppliers RENAME COLUMN telefono_secundario TO secondary_phone;

ALTER TABLE customer_addresses RENAME COLUMN direccion TO address;
ALTER TABLE suppliers RENAME COLUMN direccion TO address;

ALTER TABLE expenses RENAME COLUMN fecha TO date;
ALTER TABLE investments RENAME COLUMN fecha TO date;
ALTER TABLE partner_movements RENAME COLUMN fecha TO date;
ALTER TABLE shift_closures RENAME COLUMN fecha TO date;
ALTER TABLE stock_conteos RENAME COLUMN fecha TO date;

ALTER TABLE branch_monthly_sales RENAME COLUMN periodo TO period;
ALTER TABLE canon_settlements RENAME COLUMN periodo TO period;
ALTER TABLE expenses RENAME COLUMN periodo TO period;
ALTER TABLE investments RENAME COLUMN periodo TO period;
ALTER TABLE manual_consumptions RENAME COLUMN periodo TO period;
ALTER TABLE partner_movements RENAME COLUMN periodo TO period;
ALTER TABLE profit_distributions RENAME COLUMN periodo TO period;
ALTER TABLE rdo_movimientos RENAME COLUMN periodo TO period;
ALTER TABLE stock_cierre_mensual RENAME COLUMN periodo TO period;
ALTER TABLE stock_conteos RENAME COLUMN periodo TO period;
ALTER TABLE supplier_invoices RENAME COLUMN periodo TO period;

ALTER TABLE expenses RENAME COLUMN concepto TO concept;

ALTER TABLE invoice_items RENAME COLUMN precio_unitario TO unit_price;
ALTER TABLE order_items RENAME COLUMN precio_unitario TO unit_price;

ALTER TABLE menu_items RENAME COLUMN precio_base TO base_price;
ALTER TABLE menu_items RENAME COLUMN imagen_url TO image_url;

ALTER TABLE brand_closure_config RENAME COLUMN orden TO sort_order;
ALTER TABLE delivery_zones RENAME COLUMN orden TO sort_order;
ALTER TABLE item_modifiers RENAME COLUMN orden TO sort_order;
ALTER TABLE menu_categories RENAME COLUMN orden TO sort_order;
ALTER TABLE menu_item_compositions RENAME COLUMN orden TO sort_order;
ALTER TABLE menu_item_extras RENAME COLUMN orden TO sort_order;
ALTER TABLE menu_item_option_groups RENAME COLUMN orden TO sort_order;
ALTER TABLE menu_items RENAME COLUMN orden TO sort_order;
ALTER TABLE recipe_categories RENAME COLUMN orden TO sort_order;
ALTER TABLE recipe_ingredients RENAME COLUMN orden TO sort_order;
ALTER TABLE recipe_options RENAME COLUMN orden TO sort_order;
ALTER TABLE supply_categories RENAME COLUMN orden TO sort_order;

ALTER TABLE expenses RENAME COLUMN detalle TO details;
ALTER TABLE manual_consumptions RENAME COLUMN detalle TO details;
ALTER TABLE partner_movements RENAME COLUMN detalle TO details;

ALTER TABLE menu_item_price_history RENAME COLUMN motivo TO reason;
ALTER TABLE order_payment_edits RENAME COLUMN motivo TO reason;
ALTER TABLE stock_movimientos RENAME COLUMN motivo TO reason;
ALTER TABLE supply_cost_history RENAME COLUMN motivo TO reason;

ALTER TABLE recipe_ingredients RENAME COLUMN unidad TO unit;
ALTER TABLE stock_actual RENAME COLUMN unidad TO unit;

ALTER TABLE financial_audit_log RENAME COLUMN usuario_id TO user_id;
ALTER TABLE menu_item_price_history RENAME COLUMN usuario_id TO user_id;

ALTER TABLE canon_payments RENAME COLUMN referencia TO reference;
ALTER TABLE customer_addresses RENAME COLUMN referencia TO reference;
ALTER TABLE supplier_payments RENAME COLUMN referencia TO reference;

ALTER TABLE canon_settlements RENAME COLUMN fecha_vencimiento TO due_date;
ALTER TABLE expenses RENAME COLUMN fecha_vencimiento TO due_date;
ALTER TABLE supplier_invoices RENAME COLUMN fecha_vencimiento TO due_date;

ALTER TABLE canon_payments RENAME COLUMN fecha_pago TO payment_date;
ALTER TABLE expenses RENAME COLUMN fecha_pago TO payment_date;
ALTER TABLE supplier_payments RENAME COLUMN fecha_pago TO payment_date;

ALTER TABLE item_modifiers RENAME COLUMN precio_extra TO extra_price;
ALTER TABLE order_item_modifiers RENAME COLUMN precio_extra TO extra_price;
ALTER TABLE recipes RENAME COLUMN precio_extra TO extra_price;
ALTER TABLE supplies RENAME COLUMN precio_extra TO extra_price;

ALTER TABLE branch_monthly_sales RENAME COLUMN fuente TO source;
ALTER TABLE shift_closures RENAME COLUMN fuente TO source;

ALTER TABLE brand_closure_config RENAME COLUMN etiqueta TO label;
ALTER TABLE customer_addresses RENAME COLUMN etiqueta TO label;

ALTER TABLE orders RENAME COLUMN factura_numero TO invoice_number;
ALTER TABLE supplier_invoices RENAME COLUMN factura_numero TO invoice_number;

ALTER TABLE afip_config RENAME COLUMN razon_social TO business_name;
ALTER TABLE suppliers RENAME COLUMN razon_social TO business_name;

ALTER TABLE branch_monthly_sales RENAME COLUMN porcentaje_ft TO cash_percentage;
ALTER TABLE canon_settlements RENAME COLUMN porcentaje_ft TO cash_percentage;

ALTER TABLE canon_settlements RENAME COLUMN saldo_pendiente TO pending_balance;
ALTER TABLE supplier_invoices RENAME COLUMN saldo_pendiente TO pending_balance;

ALTER TABLE afip_config RENAME COLUMN estado_conexion TO connection_status;
ALTER TABLE mercadopago_config RENAME COLUMN estado_conexion TO connection_status;

-- STEP 2B: SPECIFIC COLUMNS

ALTER TABLE order_payments RENAME COLUMN metodo TO method;
ALTER TABLE menu_items RENAME COLUMN nombre_corto TO short_name;
ALTER TABLE removable_items RENAME COLUMN nombre_display TO display_name;

ALTER TABLE menu_item_price_history RENAME COLUMN precio_anterior TO previous_price;
ALTER TABLE menu_item_price_history RENAME COLUMN precio_nuevo TO new_price;

ALTER TABLE item_modifiers RENAME COLUMN cantidad_ahorro TO saving_quantity;
ALTER TABLE item_modifiers RENAME COLUMN unidad_ahorro TO saving_unit;
ALTER TABLE item_modifiers RENAME COLUMN costo_ahorro TO saving_cost;
ALTER TABLE item_modifiers RENAME COLUMN cantidad_extra TO extra_quantity;
ALTER TABLE item_modifiers RENAME COLUMN unidad_extra TO extra_unit;
ALTER TABLE item_modifiers RENAME COLUMN costo_extra TO extra_cost;

ALTER TABLE recipes RENAME COLUMN costo_calculado TO calculated_cost;
ALTER TABLE recipes RENAME COLUMN costo_manual TO manual_cost;

ALTER TABLE supplies RENAME COLUMN unidad_base TO base_unit;
ALTER TABLE supplies RENAME COLUMN costo_por_unidad_base TO base_unit_cost;

ALTER TABLE suppliers RENAME COLUMN contacto_secundario TO secondary_contact;

ALTER TABLE supplier_invoices RENAME COLUMN factura_tipo TO invoice_type;
ALTER TABLE supplier_invoices RENAME COLUMN factura_fecha TO invoice_date;
ALTER TABLE supplier_invoices RENAME COLUMN condicion_pago TO payment_terms;
ALTER TABLE supplier_invoices RENAME COLUMN motivo_extraordinaria TO extraordinary_reason;

ALTER TABLE supplier_payments RENAME COLUMN fecha_vencimiento_pago TO payment_due_date;

ALTER TABLE partners RENAME COLUMN porcentaje_participacion TO ownership_percentage;
ALTER TABLE partner_movements RENAME COLUMN saldo_acumulado TO cumulative_balance;

ALTER TABLE branch_monthly_sales RENAME COLUMN venta_total TO total_sales;
ALTER TABLE branch_monthly_sales RENAME COLUMN efectivo TO cash;
ALTER TABLE branch_monthly_sales RENAME COLUMN cargado_por TO loaded_by;

ALTER TABLE shift_closures RENAME COLUMN turno TO shift;
ALTER TABLE shift_closures RENAME COLUMN cerrado_por TO closed_by;

ALTER TABLE customer_addresses RENAME COLUMN piso TO floor;
ALTER TABLE customer_addresses RENAME COLUMN ciudad TO city;
ALTER TABLE customer_addresses RENAME COLUMN latitud TO latitude;
ALTER TABLE customer_addresses RENAME COLUMN longitud TO longitude;

ALTER TABLE sales_channels RENAME COLUMN es_base TO is_base;

ALTER TABLE afip_config RENAME COLUMN direccion_fiscal TO fiscal_address;
ALTER TABLE afip_config RENAME COLUMN inicio_actividades TO activity_start_date;
ALTER TABLE afip_config RENAME COLUMN clave_privada_enc TO private_key_enc;
ALTER TABLE afip_config RENAME COLUMN ultimo_error TO last_error;
ALTER TABLE afip_config RENAME COLUMN ultima_verificacion TO last_verification;
ALTER TABLE afip_config RENAME COLUMN ultimo_nro_factura_a TO last_invoice_number_a;
ALTER TABLE afip_config RENAME COLUMN ultimo_nro_factura_b TO last_invoice_number_b;
ALTER TABLE afip_config RENAME COLUMN ultimo_nro_factura_c TO last_invoice_number_c;
ALTER TABLE afip_config RENAME COLUMN estado_certificado TO certificate_status;
ALTER TABLE afip_config RENAME COLUMN reglas_facturacion TO invoicing_rules;

-- STEP 3: RECREATE FUNCTIONS

CREATE OR REPLACE FUNCTION public.calcular_saldo_socio()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
DECLARE saldo_anterior NUMERIC(12,2);
BEGIN
  SELECT COALESCE(cumulative_balance, 0) INTO saldo_anterior
  FROM partner_movements
  WHERE socio_id = NEW.socio_id AND deleted_at IS NULL
    AND (date < NEW.date OR (date = NEW.date AND created_at < NEW.created_at))
  ORDER BY date DESC, created_at DESC LIMIT 1;
  IF saldo_anterior IS NULL THEN saldo_anterior = 0; END IF;
  NEW.cumulative_balance = saldo_anterior + NEW.amount;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.sync_expense_movement_to_gastos()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_period TEXT; v_branch_id UUID;
BEGIN
  IF NEW.type != 'expense' THEN RETURN NEW; END IF;
  IF COALESCE(NEW.estado_aprobacion, 'aprobado') = 'rechazado' THEN RETURN NEW; END IF;
  v_branch_id := NEW.branch_id;
  v_period := to_char(COALESCE(NEW.created_at, now()), 'YYYY-MM');
  INSERT INTO public.expenses (
    id, branch_id, period, categoria_principal, concept,
    amount, date, payment_method, notes, estado, created_by, rdo_category_code
  ) VALUES (
    NEW.id, v_branch_id, v_period,
    COALESCE(NEW.categoria_gasto, 'caja_chica'),
    NEW.concept, NEW.amount,
    (COALESCE(NEW.created_at, now()) AT TIME ZONE 'America/Argentina/Cordoba')::date,
    NEW.payment_method, NEW.notes_extra,
    CASE WHEN COALESCE(NEW.estado_aprobacion, 'aprobado') = 'pendiente_aprobacion' THEN 'pendiente' ELSE 'pagado' END,
    NEW.recorded_by, NEW.rdo_category_code
  ) ON CONFLICT (id) DO UPDATE SET
    categoria_principal = COALESCE(EXCLUDED.categoria_principal, expenses.categoria_principal),
    concept = EXCLUDED.concept, amount = EXCLUDED.amount,
    payment_method = EXCLUDED.payment_method, notes = EXCLUDED.notes,
    estado = EXCLUDED.estado, rdo_category_code = EXCLUDED.rdo_category_code, updated_at = now();
  RETURN NEW;
END; $function$;

-- STEP 4: RECREATE VIEWS

CREATE OR REPLACE VIEW balance_socios AS
SELECT s.id AS socio_id, s.name AS nombre, s.branch_id, b.name AS branch_nombre,
    s.ownership_percentage, count(m.id) AS cantidad_movimientos,
    COALESCE(sum(m.amount) FILTER (WHERE (m.tipo)::text = 'aporte_capital'), 0::numeric) AS total_aportes,
    COALESCE(sum(m.amount) FILTER (WHERE (m.tipo)::text = 'prestamo_socio'), 0::numeric) AS total_prestamos_dados,
    COALESCE(sum(m.amount) FILTER (WHERE (m.tipo)::text = 'devolucion_prestamo'), 0::numeric) AS total_devoluciones,
    COALESCE(sum(m.amount) FILTER (WHERE (m.tipo)::text = 'distribucion_utilidades'), 0::numeric) AS total_utilidades,
    COALESCE(sum(m.amount) FILTER (WHERE (m.tipo)::text = ANY (ARRAY['retiro_anticipado','retiro_utilidades'])), 0::numeric) AS total_retiros,
    (SELECT pm.cumulative_balance FROM partner_movements pm
     WHERE pm.socio_id = s.id AND pm.deleted_at IS NULL
     ORDER BY pm.date DESC, pm.created_at DESC LIMIT 1) AS saldo_actual
FROM partners s JOIN branches b ON b.id = s.branch_id
LEFT JOIN partner_movements m ON m.socio_id = s.id AND m.deleted_at IS NULL
WHERE s.deleted_at IS NULL AND s.is_active = true
GROUP BY s.id, s.name, s.branch_id, b.name, s.ownership_percentage;

CREATE OR REPLACE VIEW cuenta_corriente_marca AS
SELECT f.id, f.branch_id, b.name AS local_nombre, f.period,
    f.invoice_number, f.invoice_date, f.total AS monto_canon,
    f.pending_balance, f.estado_pago, f.due_date, f.notes AS detalle
FROM supplier_invoices f JOIN branches b ON b.id = f.branch_id
WHERE f.proveedor_id = '00000000-0000-0000-0000-000000000001'::uuid AND f.deleted_at IS NULL
ORDER BY f.period DESC, b.name;

CREATE OR REPLACE VIEW cuenta_corriente_proveedores AS
SELECT p.id AS proveedor_id, p.business_name, p.cuit,
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
        (sum(ff.total) - sum(ff.pending_balance)) AS pagado_en_facturas,
        count(ff.id) AS cantidad_facturas,
        count(ff.id) FILTER (WHERE (ff.estado_pago)::text = 'pendiente') AS facturas_pendientes,
        count(ff.id) FILTER (WHERE (ff.estado_pago)::text = 'pendiente' AND ff.due_date < CURRENT_DATE) AS facturas_vencidas,
        COALESCE(sum(ff.pending_balance) FILTER (WHERE (ff.estado_pago)::text = 'pendiente' AND ff.due_date < CURRENT_DATE), 0::numeric) AS monto_vencido,
        min(ff.due_date) FILTER (WHERE (ff.estado_pago)::text = 'pendiente' AND ff.due_date >= CURRENT_DATE) AS proximo_vencimiento
    FROM supplier_invoices ff WHERE ff.proveedor_id = p.id AND ff.deleted_at IS NULL
    GROUP BY ff.branch_id
) f_agg ON true
LEFT JOIN (
    SELECT sp.proveedor_id, sp.branch_id, COALESCE(sum(sp.amount), 0::numeric) AS pagos_a_cuenta
    FROM supplier_payments sp WHERE sp.factura_id IS NULL AND sp.deleted_at IS NULL
    GROUP BY sp.proveedor_id, sp.branch_id
) pa ON pa.proveedor_id = p.id AND pa.branch_id = COALESCE(f_agg.branch_id, pa.branch_id)
WHERE p.deleted_at IS NULL;

CREATE OR REPLACE VIEW rdo_multivista_items_base AS
SELECT pi.id AS item_id, pi.pedido_id, p.branch_id,
    (p.created_at)::date AS fecha,
    normalize_rdo_channel((p.canal_venta)::text, (p.canal_app)::text, (p.tipo)::text) AS canal,
    pi.item_carta_id AS producto_id,
    COALESCE(pi.name, 'Sin nombre'::character varying) AS producto_nombre,
    COALESCE(pi.categoria_carta_id, ic.categoria_carta_id) AS categoria_id,
    COALESCE(mc.name, 'Sin categoría'::text) AS categoria_nombre,
    (COALESCE(pi.quantity, 0))::numeric AS cantidad,
    COALESCE(pi.subtotal, 0::numeric) AS ventas,
    COALESCE(ic.costo_total, 0::numeric) AS costo_unitario,
    ((COALESCE(pi.quantity, 0))::numeric * COALESCE(ic.costo_total, 0::numeric)) AS costo_total
FROM order_items pi
JOIN orders p ON p.id = pi.pedido_id
LEFT JOIN menu_items ic ON ic.id = pi.item_carta_id
LEFT JOIN menu_categories mc ON mc.id = COALESCE(pi.categoria_carta_id, ic.categoria_carta_id)
WHERE (p.estado)::text = ANY (ARRAY['entregado','listo']);

CREATE OR REPLACE VIEW rdo_multivista_ventas_base AS
SELECT id AS pedido_id, branch_id, (created_at)::date AS fecha, created_at,
    normalize_rdo_channel((canal_venta)::text, (canal_app)::text, (tipo)::text) AS canal,
    COALESCE(total, 0::numeric) AS total
FROM orders p
WHERE (estado)::text = ANY (ARRAY['entregado','listo']);

CREATE OR REPLACE VIEW rdo_report_data AS
SELECT branch_id, period, rdo_category_code, sum(amount) AS total
FROM rdo_movimientos WHERE deleted_at IS NULL
GROUP BY branch_id, period, rdo_category_code;

CREATE OR REPLACE VIEW webapp_menu_items AS
SELECT ic.id, ic.name, ic.short_name, ic.description, ic.image_url, ic.base_price,
    ic.categoria_carta_id, mc.name AS categoria_nombre,
    mc.sort_order AS categoria_orden, ic.sort_order,
    ic.disponible_delivery, ic.disponible_webapp, ic.tipo
FROM menu_items ic LEFT JOIN menu_categories mc ON mc.id = ic.categoria_carta_id
WHERE ic.is_active = true AND ic.deleted_at IS NULL AND ic.disponible_webapp = true
ORDER BY mc.sort_order, ic.sort_order;
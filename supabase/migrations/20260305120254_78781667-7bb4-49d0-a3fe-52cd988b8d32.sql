
-- ============================================================
-- Phase 2 Final: Rename ALL remaining Spanish columns
-- ============================================================

-- 1. DROP ALL AFFECTED VIEWS FIRST
DROP VIEW IF EXISTS webapp_menu_items CASCADE;
DROP VIEW IF EXISTS balance_socios CASCADE;
DROP VIEW IF EXISTS cuenta_corriente_marca CASCADE;
DROP VIEW IF EXISTS cuenta_corriente_proveedores CASCADE;
DROP VIEW IF EXISTS rdo_multivista_items_base CASCADE;
DROP VIEW IF EXISTS rdo_multivista_ventas_base CASCADE;
DROP VIEW IF EXISTS rdo_report_data CASCADE;

-- 2. RENAME COLUMNS (alphabetical by table)

-- afip_errores_log
ALTER TABLE afip_errores_log RENAME COLUMN codigo_afip TO afip_code;
ALTER TABLE afip_errores_log RENAME COLUMN mensaje TO message;
ALTER TABLE afip_errores_log RENAME COLUMN tipo_error TO error_type;

-- branch_monthly_sales
ALTER TABLE branch_monthly_sales RENAME COLUMN fecha_carga TO loaded_at;

-- canon_payments
ALTER TABLE canon_payments RENAME COLUMN verificado_at TO verified_at;
ALTER TABLE canon_payments RENAME COLUMN verificado_notas TO verified_notes;
ALTER TABLE canon_payments RENAME COLUMN verificado_por TO verified_by;

-- cash_register_movements
ALTER TABLE cash_register_movements RENAME COLUMN estado_aprobacion TO approval_status;

-- delivery_zones
ALTER TABLE delivery_zones RENAME COLUMN costo_envio TO delivery_cost;
ALTER TABLE delivery_zones RENAME COLUMN tiempo_estimado_min TO estimated_time_min;

-- discount_code_uses
ALTER TABLE discount_code_uses RENAME COLUMN codigo_id TO code_id;

-- discount_codes
ALTER TABLE discount_codes RENAME COLUMN codigo TO code;
ALTER TABLE discount_codes RENAME COLUMN fecha_fin TO end_date;
ALTER TABLE discount_codes RENAME COLUMN fecha_inicio TO start_date;

-- expenses
ALTER TABLE expenses RENAME COLUMN costo_transferencia TO transfer_cost;
ALTER TABLE expenses RENAME COLUMN referencia_pago TO payment_reference;
ALTER TABLE expenses RENAME COLUMN tipo_pago TO payment_type;

-- investments
ALTER TABLE investments RENAME COLUMN tipo_inversion TO investment_type;

-- invoice_items
ALTER TABLE invoice_items RENAME COLUMN concepto_servicio_id TO service_concept_id;
ALTER TABLE invoice_items RENAME COLUMN factura_id TO invoice_id;
ALTER TABLE invoice_items RENAME COLUMN precio_bruto TO gross_price;
ALTER TABLE invoice_items RENAME COLUMN precio_neto TO net_price;
ALTER TABLE invoice_items RENAME COLUMN precio_unitario_bruto TO gross_unit_price;
ALTER TABLE invoice_items RENAME COLUMN tipo_item TO item_type;

-- invoice_payment_links
ALTER TABLE invoice_payment_links RENAME COLUMN factura_id TO invoice_id;

-- issued_invoices
ALTER TABLE issued_invoices RENAME COLUMN factura_asociada_id TO linked_invoice_id;
ALTER TABLE issued_invoices RENAME COLUMN fecha_emision TO issue_date;
ALTER TABLE issued_invoices RENAME COLUMN numero_comprobante TO receipt_number;
ALTER TABLE issued_invoices RENAME COLUMN tipo_comprobante TO receipt_type;

-- item_modifiers
ALTER TABLE item_modifiers RENAME COLUMN cantidad_nuevo TO new_quantity;
ALTER TABLE item_modifiers RENAME COLUMN unidad_nuevo TO new_unit;

-- menu_categories
ALTER TABLE menu_categories RENAME COLUMN tipo_impresion TO print_type;

-- menu_item_option_group_items
ALTER TABLE menu_item_option_group_items RENAME COLUMN costo_unitario TO unit_cost;

-- menu_item_option_groups
ALTER TABLE menu_item_option_groups RENAME COLUMN costo_promedio TO average_cost;

-- menu_items
ALTER TABLE menu_items RENAME COLUMN costo_total TO total_cost;
ALTER TABLE menu_items RENAME COLUMN disponible_delivery TO available_delivery;
ALTER TABLE menu_items RENAME COLUMN disponible_webapp TO available_webapp;
ALTER TABLE menu_items RENAME COLUMN precio_promo TO promo_price;
ALTER TABLE menu_items RENAME COLUMN precio_referencia TO reference_price;

-- order_items
ALTER TABLE order_items RENAME COLUMN precio_referencia TO reference_price;

-- orders (skip direccion_entrega as delivery_address already exists)
ALTER TABLE orders RENAME COLUMN costo_delivery TO delivery_cost;
ALTER TABLE orders RENAME COLUMN factura_cae TO invoice_cae;
ALTER TABLE orders RENAME COLUMN factura_cuit TO invoice_cuit;
ALTER TABLE orders RENAME COLUMN factura_razon_social TO invoice_business_name;
ALTER TABLE orders RENAME COLUMN factura_vencimiento_cae TO invoice_cae_expiry;
ALTER TABLE orders RENAME COLUMN numero_llamador TO caller_number;
ALTER TABLE orders RENAME COLUMN numero_pedido TO order_number;
ALTER TABLE orders RENAME COLUMN tiempo_confirmado TO confirmed_at_time;
ALTER TABLE orders RENAME COLUMN tiempo_en_camino TO on_route_at_time;
ALTER TABLE orders RENAME COLUMN tiempo_entregado TO delivered_at_time;
ALTER TABLE orders RENAME COLUMN tiempo_inicio_prep TO prep_started_at_time;
ALTER TABLE orders RENAME COLUMN tiempo_listo TO ready_at_time;
ALTER TABLE orders RENAME COLUMN tiempo_prometido TO promised_time;
ALTER TABLE orders RENAME COLUMN tipo_factura TO invoice_type;
ALTER TABLE orders RENAME COLUMN tipo_servicio TO service_type;
-- Drop duplicate Spanish column (data already in delivery_address)
ALTER TABLE orders DROP COLUMN IF EXISTS direccion_entrega;

-- partners
ALTER TABLE partners RENAME COLUMN fecha_ingreso TO start_date;
ALTER TABLE partners RENAME COLUMN fecha_salida TO end_date;

-- pos_config
ALTER TABLE pos_config RENAME COLUMN costo_delivery_default TO default_delivery_cost;
ALTER TABLE pos_config RENAME COLUMN facturacion_habilitada TO invoicing_enabled;
ALTER TABLE pos_config RENAME COLUMN tiempo_preparacion_default TO default_prep_time;

-- profit_distributions
ALTER TABLE profit_distributions RENAME COLUMN fecha_distribucion TO distribution_date;
ALTER TABLE profit_distributions RENAME COLUMN fecha_proceso TO process_date;

-- promotion_items
ALTER TABLE promotion_items RENAME COLUMN precio_promo TO promo_price;

-- promotions
ALTER TABLE promotions RENAME COLUMN fecha_fin TO end_date;
ALTER TABLE promotions RENAME COLUMN fecha_inicio TO start_date;
ALTER TABLE promotions RENAME COLUMN tipo_usuario TO user_type;

-- recipes
ALTER TABLE recipes RENAME COLUMN metodo_costeo TO costing_method;

-- shift_closures
ALTER TABLE shift_closures RENAME COLUMN facturacion_diferencia TO invoicing_difference;
ALTER TABLE shift_closures RENAME COLUMN facturacion_esperada TO expected_invoicing;

-- stock_conteo_items
ALTER TABLE stock_conteo_items RENAME COLUMN costo_unitario TO unit_cost;

-- stock_movimientos
ALTER TABLE stock_movimientos RENAME COLUMN factura_proveedor_id TO supplier_invoice_id;

-- supplier_invoices
ALTER TABLE supplier_invoices RENAME COLUMN costo_real TO actual_cost;
ALTER TABLE supplier_invoices RENAME COLUMN estado_pago TO payment_status;
ALTER TABLE supplier_invoices RENAME COLUMN factura_url TO invoice_url;

-- supplier_payments
ALTER TABLE supplier_payments RENAME COLUMN factura_id TO invoice_id;
ALTER TABLE supplier_payments RENAME COLUMN verificado_at TO verified_at;
ALTER TABLE supplier_payments RENAME COLUMN verificado_notas TO verified_notes;
ALTER TABLE supplier_payments RENAME COLUMN verificado_por TO verified_by;

-- suppliers
ALTER TABLE suppliers RENAME COLUMN tipo_proveedor TO supplier_type;

-- 3. RECREATE ALL VIEWS

-- webapp_menu_items
CREATE OR REPLACE VIEW webapp_menu_items AS
SELECT ic.id,
    ic.name,
    ic.short_name,
    ic.description,
    ic.image_url,
    ic.base_price,
    ic.categoria_carta_id,
    mc.name AS categoria_nombre,
    mc.sort_order AS categoria_orden,
    ic.sort_order,
    ic.available_delivery,
    ic.available_webapp,
    ic.tipo
FROM menu_items ic
LEFT JOIN menu_categories mc ON mc.id = ic.categoria_carta_id
WHERE ic.is_active = true AND ic.deleted_at IS NULL AND ic.available_webapp = true
ORDER BY mc.sort_order, ic.sort_order;

-- balance_socios
CREATE OR REPLACE VIEW balance_socios AS
SELECT s.id AS socio_id,
    s.name AS nombre,
    s.branch_id,
    b.name AS branch_nombre,
    s.ownership_percentage,
    count(m.id) AS movement_count,
    COALESCE(sum(m.amount) FILTER (WHERE m.tipo::text = 'aporte_capital'), 0::numeric) AS total_aportes,
    COALESCE(sum(m.amount) FILTER (WHERE m.tipo::text = 'prestamo_socio'), 0::numeric) AS total_prestamos_dados,
    COALESCE(sum(m.amount) FILTER (WHERE m.tipo::text = 'devolucion_prestamo'), 0::numeric) AS total_devoluciones,
    COALESCE(sum(m.amount) FILTER (WHERE m.tipo::text = 'distribucion_utilidades'), 0::numeric) AS total_utilidades,
    COALESCE(sum(m.amount) FILTER (WHERE m.tipo::text = ANY (ARRAY['retiro_anticipado', 'retiro_utilidades'])), 0::numeric) AS total_retiros,
    (SELECT pm.cumulative_balance FROM partner_movements pm WHERE pm.socio_id = s.id AND pm.deleted_at IS NULL ORDER BY pm.date DESC, pm.created_at DESC LIMIT 1) AS saldo_actual
FROM partners s
JOIN branches b ON b.id = s.branch_id
LEFT JOIN partner_movements m ON m.socio_id = s.id AND m.deleted_at IS NULL
WHERE s.deleted_at IS NULL AND s.is_active = true
GROUP BY s.id, s.name, s.branch_id, b.name, s.ownership_percentage;

-- cuenta_corriente_marca
CREATE OR REPLACE VIEW cuenta_corriente_marca AS
SELECT f.id,
    f.branch_id,
    b.name AS local_nombre,
    f.period,
    f.invoice_number,
    f.invoice_date,
    f.total AS monto_canon,
    f.pending_balance,
    f.payment_status,
    f.due_date,
    f.notes AS detalle
FROM supplier_invoices f
JOIN branches b ON b.id = f.branch_id
WHERE f.proveedor_id = '00000000-0000-0000-0000-000000000001'::uuid AND f.deleted_at IS NULL
ORDER BY f.period DESC, b.name;

-- cuenta_corriente_proveedores
CREATE OR REPLACE VIEW cuenta_corriente_proveedores AS
SELECT p.id AS proveedor_id,
    p.business_name,
    p.cuit,
    COALESCE(f_agg.branch_id, pa.branch_id) AS branch_id,
    COALESCE(f_agg.total_facturado, 0::numeric) AS total_facturado,
    (COALESCE(f_agg.pagado_en_facturas, 0::numeric) + COALESCE(pa.pagos_a_cuenta, 0::numeric)) AS total_pagado,
    (COALESCE(f_agg.total_facturado, 0::numeric) - (COALESCE(f_agg.pagado_en_facturas, 0::numeric) + COALESCE(pa.pagos_a_cuenta, 0::numeric))) AS total_pendiente,
    COALESCE(f_agg.invoice_count, 0::bigint) AS invoice_count,
    COALESCE(f_agg.pending_invoices, 0::bigint) AS pending_invoices,
    COALESCE(f_agg.overdue_invoices, 0::bigint) AS overdue_invoices,
    COALESCE(f_agg.monto_vencido, 0::numeric) AS monto_vencido,
    f_agg.proximo_vencimiento
FROM suppliers p
LEFT JOIN LATERAL (
    SELECT ff.branch_id,
        sum(ff.total) AS total_facturado,
        (sum(ff.total) - sum(ff.pending_balance)) AS pagado_en_facturas,
        count(ff.id) AS invoice_count,
        count(ff.id) FILTER (WHERE ff.payment_status::text = 'pendiente') AS pending_invoices,
        count(ff.id) FILTER (WHERE ff.payment_status::text = 'pendiente' AND ff.due_date < CURRENT_DATE) AS overdue_invoices,
        COALESCE(sum(ff.pending_balance) FILTER (WHERE ff.payment_status::text = 'pendiente' AND ff.due_date < CURRENT_DATE), 0::numeric) AS monto_vencido,
        min(ff.due_date) FILTER (WHERE ff.payment_status::text = 'pendiente' AND ff.due_date >= CURRENT_DATE) AS proximo_vencimiento
    FROM supplier_invoices ff
    WHERE ff.proveedor_id = p.id AND ff.deleted_at IS NULL
    GROUP BY ff.branch_id
) f_agg ON true
LEFT JOIN (
    SELECT sp.proveedor_id,
        sp.branch_id,
        COALESCE(sum(sp.amount), 0::numeric) AS pagos_a_cuenta
    FROM supplier_payments sp
    WHERE sp.invoice_id IS NULL AND sp.deleted_at IS NULL
    GROUP BY sp.proveedor_id, sp.branch_id
) pa ON pa.proveedor_id = p.id AND pa.branch_id = COALESCE(f_agg.branch_id, pa.branch_id)
WHERE p.deleted_at IS NULL;

-- rdo_multivista_items_base
CREATE OR REPLACE VIEW rdo_multivista_items_base AS
SELECT pi.id AS item_id,
    pi.pedido_id,
    p.branch_id,
    p.created_at::date AS date,
    normalize_rdo_channel(p.canal_venta::text, p.canal_app::text, p.tipo::text) AS canal,
    pi.item_carta_id AS producto_id,
    COALESCE(pi.name, 'Sin nombre'::varchar) AS producto_nombre,
    COALESCE(pi.categoria_carta_id, ic.categoria_carta_id) AS categoria_id,
    COALESCE(mc.name, 'Sin categoría'::text) AS categoria_nombre,
    COALESCE(pi.quantity, 0)::numeric AS quantity,
    COALESCE(pi.subtotal, 0::numeric) AS ventas,
    COALESCE(ic.total_cost, 0::numeric) AS unit_cost,
    (COALESCE(pi.quantity, 0)::numeric * COALESCE(ic.total_cost, 0::numeric)) AS total_cost
FROM order_items pi
JOIN orders p ON p.id = pi.pedido_id
LEFT JOIN menu_items ic ON ic.id = pi.item_carta_id
LEFT JOIN menu_categories mc ON mc.id = COALESCE(pi.categoria_carta_id, ic.categoria_carta_id)
WHERE p.estado::text = ANY (ARRAY['entregado', 'listo']);

-- rdo_multivista_ventas_base
CREATE OR REPLACE VIEW rdo_multivista_ventas_base AS
SELECT id AS pedido_id,
    branch_id,
    created_at::date AS date,
    created_at,
    normalize_rdo_channel(canal_venta::text, canal_app::text, tipo::text) AS canal,
    COALESCE(total, 0::numeric) AS total
FROM orders p
WHERE estado::text = ANY (ARRAY['entregado', 'listo']);

-- rdo_report_data
CREATE OR REPLACE VIEW rdo_report_data AS
SELECT branch_id,
    period,
    rdo_category_code,
    sum(amount) AS total
FROM rdo_movimientos
WHERE deleted_at IS NULL
GROUP BY branch_id, period, rdo_category_code;

-- branches_public (unchanged but recreate since it was dropped via CASCADE)
CREATE OR REPLACE VIEW branches_public AS
SELECT id, name, address, city, slug, opening_time, closing_time,
    is_active, is_open, local_open_state, public_status, public_hours,
    cover_image_url, latitude, longitude, google_place_id
FROM branches
WHERE is_active = true AND (public_status = 'active' OR public_status = 'coming_soon');


-- ============================================================
-- MIGRATION: Final Spanish→English column renames + enum values
-- Covers: ~55 columns, 3 enums, 6 views recreation
-- ============================================================

-- ==================== PHASE 1: DROP DEPENDENT VIEWS ====================
DROP VIEW IF EXISTS rdo_multivista_items_base CASCADE;
DROP VIEW IF EXISTS rdo_multivista_ventas_base CASCADE;
DROP VIEW IF EXISTS balance_socios CASCADE;
DROP VIEW IF EXISTS webapp_menu_items CASCADE;
DROP VIEW IF EXISTS cuenta_corriente_proveedores CASCADE;
DROP VIEW IF EXISTS cuenta_corriente_marca CASCADE;

-- ==================== PHASE 2: RENAME COLUMNS ====================

-- Grupo: tipo → type
ALTER TABLE brand_closure_config RENAME COLUMN tipo TO type;
ALTER TABLE discount_codes RENAME COLUMN tipo TO type;
ALTER TABLE item_modifiers RENAME COLUMN tipo TO type;
ALTER TABLE manual_consumptions RENAME COLUMN tipo TO type;
ALTER TABLE menu_items RENAME COLUMN tipo TO type;
ALTER TABLE order_item_modifiers RENAME COLUMN tipo TO type;
ALTER TABLE orders RENAME COLUMN tipo TO type;
ALTER TABLE partner_movements RENAME COLUMN tipo TO type;
ALTER TABLE promotions RENAME COLUMN tipo TO type;
ALTER TABLE recipes RENAME COLUMN tipo TO type;
ALTER TABLE service_concepts RENAME COLUMN tipo TO type;
ALTER TABLE stock_movimientos RENAME COLUMN tipo TO type;
ALTER TABLE supplier_invoices RENAME COLUMN tipo TO type;
ALTER TABLE supply_categories RENAME COLUMN tipo TO type;

-- Grupo: estado → status
ALTER TABLE canon_settlements RENAME COLUMN estado TO status;
ALTER TABLE expenses RENAME COLUMN estado TO status;
ALTER TABLE investments RENAME COLUMN estado TO status;
ALTER TABLE order_items RENAME COLUMN estado TO status;
ALTER TABLE orders RENAME COLUMN estado TO status;
ALTER TABLE register_shifts_legacy RENAME COLUMN estado TO status;
ALTER TABLE webapp_config RENAME COLUMN estado TO status;

-- Grupo: notas → notes
ALTER TABLE order_items RENAME COLUMN notas TO notes;
ALTER TABLE shift_closures RENAME COLUMN notas TO notes;

-- Grupo: monto_* → *_amount
ALTER TABLE discount_code_uses RENAME COLUMN monto_descontado TO discount_amount;
ALTER TABLE investments RENAME COLUMN monto_total TO total_amount;
ALTER TABLE invoice_payment_links RENAME COLUMN monto_aplicado TO applied_amount;
ALTER TABLE manual_consumptions RENAME COLUMN monto_consumido TO consumed_amount;
ALTER TABLE order_payments RENAME COLUMN monto_recibido TO received_amount;
ALTER TABLE profit_distributions RENAME COLUMN monto_distribuible TO distributable_amount;

-- Grupo: precio_*/costo_* (supplies family)
ALTER TABLE price_list_items RENAME COLUMN precio TO price;
ALTER TABLE supplies RENAME COLUMN precio_venta TO sale_price;
ALTER TABLE supplies RENAME COLUMN precio_referencia TO reference_price;
ALTER TABLE supplies RENAME COLUMN precio_maximo_sugerido TO max_suggested_price;
ALTER TABLE supplies RENAME COLUMN tipo_item TO item_type;
ALTER TABLE supplies RENAME COLUMN motivo_control TO control_reason;
ALTER TABLE supplies RENAME COLUMN unidad_compra TO purchase_unit;
ALTER TABLE supplies RENAME COLUMN unidad_compra_contenido TO purchase_unit_content;
ALTER TABLE supplies RENAME COLUMN unidad_compra_precio TO purchase_unit_price;
ALTER TABLE supply_cost_history RENAME COLUMN costo_anterior TO previous_cost;
ALTER TABLE supply_cost_history RENAME COLUMN costo_nuevo TO new_cost;
ALTER TABLE supply_cost_history RENAME COLUMN factura_id TO invoice_id;

-- Columnas sueltas
ALTER TABLE brand_closure_config RENAME COLUMN clave TO key;
ALTER TABLE financial_audit_log RENAME COLUMN usuario_email TO user_email;
ALTER TABLE invoice_items RENAME COLUMN unidad TO unit;
ALTER TABLE menu_categories RENAME COLUMN visible_en_carta TO is_visible_menu;
ALTER TABLE mercadopago_config RENAME COLUMN ultimo_test TO last_test;
ALTER TABLE mercadopago_config RENAME COLUMN ultimo_test_ok TO last_test_ok;
ALTER TABLE service_concepts RENAME COLUMN visible_local TO is_visible_local;
ALTER TABLE shift_closures RENAME COLUMN cerrado_at TO closed_at;
ALTER TABLE suppliers RENAME COLUMN numero_cuenta TO account_number;
ALTER TABLE suppliers RENAME COLUMN tipo_especial TO special_type;
ALTER TABLE webapp_config RENAME COLUMN mensaje_pausa TO pause_message;
ALTER TABLE webapp_config RENAME COLUMN tiempo_estimado_delivery_min TO estimated_delivery_time_min;
ALTER TABLE webapp_config RENAME COLUMN tiempo_estimado_retiro_min TO estimated_pickup_time_min;
ALTER TABLE webapp_order_messages RENAME COLUMN mensaje TO message;

-- ==================== PHASE 3: RENAME ENUM VALUES ====================

-- order_area
ALTER TYPE order_area RENAME VALUE 'salon' TO 'dine_in';
ALTER TYPE order_area RENAME VALUE 'mostrador' TO 'counter';

-- payment_method
ALTER TYPE payment_method RENAME VALUE 'efectivo' TO 'cash';
ALTER TYPE payment_method RENAME VALUE 'tarjeta_debito' TO 'debit_card';
ALTER TYPE payment_method RENAME VALUE 'tarjeta_credito' TO 'credit_card';
ALTER TYPE payment_method RENAME VALUE 'transferencia' TO 'transfer';
ALTER TYPE payment_method RENAME VALUE 'vales' TO 'vouchers';

-- work_position_type
ALTER TYPE work_position_type RENAME VALUE 'cajero' TO 'cashier';
ALTER TYPE work_position_type RENAME VALUE 'cocinero' TO 'cook';
ALTER TYPE work_position_type RENAME VALUE 'lavacopas' TO 'dishwasher';

-- ==================== PHASE 4: RECREATE VIEWS ====================

-- webapp_menu_items
CREATE OR REPLACE VIEW webapp_menu_items AS
SELECT ic.id,
    ic.name,
    ic.short_name,
    ic.description,
    ic.image_url,
    ic.base_price,
    ic.categoria_carta_id,
    mc.name AS category_name,
    mc.sort_order AS category_sort_order,
    ic.sort_order,
    ic.available_delivery,
    ic.available_webapp,
    ic.type
FROM menu_items ic
LEFT JOIN menu_categories mc ON mc.id = ic.categoria_carta_id
WHERE ic.is_active = true AND ic.deleted_at IS NULL AND ic.available_webapp = true
ORDER BY mc.sort_order, ic.sort_order;

-- balance_socios
CREATE OR REPLACE VIEW balance_socios AS
SELECT s.id AS socio_id,
    s.name,
    s.branch_id,
    b.name AS branch_name,
    s.ownership_percentage,
    count(m.id) AS movement_count,
    COALESCE(sum(m.amount) FILTER (WHERE m.type::text = 'aporte_capital'), 0::numeric) AS total_aportes,
    COALESCE(sum(m.amount) FILTER (WHERE m.type::text = 'prestamo_socio'), 0::numeric) AS total_prestamos_dados,
    COALESCE(sum(m.amount) FILTER (WHERE m.type::text = 'devolucion_prestamo'), 0::numeric) AS total_devoluciones,
    COALESCE(sum(m.amount) FILTER (WHERE m.type::text = 'distribucion_utilidades'), 0::numeric) AS total_utilidades,
    COALESCE(sum(m.amount) FILTER (WHERE m.type::text = ANY (ARRAY['retiro_anticipado', 'retiro_utilidades'])), 0::numeric) AS total_retiros,
    (SELECT pm.cumulative_balance FROM partner_movements pm WHERE pm.socio_id = s.id AND pm.deleted_at IS NULL ORDER BY pm.date DESC, pm.created_at DESC LIMIT 1) AS current_balance
FROM partners s
JOIN branches b ON b.id = s.branch_id
LEFT JOIN partner_movements m ON m.socio_id = s.id AND m.deleted_at IS NULL
WHERE s.deleted_at IS NULL AND s.is_active = true
GROUP BY s.id, s.name, s.branch_id, b.name, s.ownership_percentage;

-- cuenta_corriente_marca
CREATE OR REPLACE VIEW cuenta_corriente_marca AS
SELECT f.id,
    f.branch_id,
    b.name AS branch_name,
    f.period,
    f.invoice_number,
    f.invoice_date,
    f.total AS canon_amount,
    f.pending_balance,
    f.payment_status,
    f.due_date,
    f.notes AS details
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
    COALESCE(f_agg.total_invoiced, 0::numeric) AS total_invoiced,
    COALESCE(f_agg.paid_on_invoices, 0::numeric) + COALESCE(pa.account_payments, 0::numeric) AS total_paid,
    COALESCE(f_agg.total_invoiced, 0::numeric) - (COALESCE(f_agg.paid_on_invoices, 0::numeric) + COALESCE(pa.account_payments, 0::numeric)) AS total_pending,
    COALESCE(f_agg.invoice_count, 0::bigint) AS invoice_count,
    COALESCE(f_agg.pending_invoices, 0::bigint) AS pending_invoices,
    COALESCE(f_agg.overdue_invoices, 0::bigint) AS overdue_invoices,
    COALESCE(f_agg.overdue_amount, 0::numeric) AS overdue_amount,
    f_agg.next_due_date
FROM suppliers p
LEFT JOIN LATERAL (
    SELECT ff.branch_id,
        sum(ff.total) AS total_invoiced,
        sum(ff.total) - sum(ff.pending_balance) AS paid_on_invoices,
        count(ff.id) AS invoice_count,
        count(ff.id) FILTER (WHERE ff.payment_status::text = 'pendiente') AS pending_invoices,
        count(ff.id) FILTER (WHERE ff.payment_status::text = 'pendiente' AND ff.due_date < CURRENT_DATE) AS overdue_invoices,
        COALESCE(sum(ff.pending_balance) FILTER (WHERE ff.payment_status::text = 'pendiente' AND ff.due_date < CURRENT_DATE), 0::numeric) AS overdue_amount,
        min(ff.due_date) FILTER (WHERE ff.payment_status::text = 'pendiente' AND ff.due_date >= CURRENT_DATE) AS next_due_date
    FROM supplier_invoices ff
    WHERE ff.proveedor_id = p.id AND ff.deleted_at IS NULL
    GROUP BY ff.branch_id
) f_agg ON true
LEFT JOIN (
    SELECT sp.proveedor_id,
        sp.branch_id,
        COALESCE(sum(sp.amount), 0::numeric) AS account_payments
    FROM supplier_payments sp
    WHERE sp.invoice_id IS NULL AND sp.deleted_at IS NULL
    GROUP BY sp.proveedor_id, sp.branch_id
) pa ON pa.proveedor_id = p.id AND pa.branch_id = COALESCE(f_agg.branch_id, pa.branch_id)
WHERE p.deleted_at IS NULL;

-- rdo_multivista_ventas_base
CREATE OR REPLACE VIEW rdo_multivista_ventas_base AS
SELECT id AS pedido_id,
    branch_id,
    created_at::date AS date,
    created_at,
    normalize_rdo_channel(canal_venta::text, canal_app::text, type::text) AS canal,
    COALESCE(total, 0::numeric) AS total
FROM orders p
WHERE status::text = ANY (ARRAY['entregado', 'listo']);

-- rdo_multivista_items_base
CREATE OR REPLACE VIEW rdo_multivista_items_base AS
SELECT pi.id AS item_id,
    pi.pedido_id,
    p.branch_id,
    p.created_at::date AS date,
    normalize_rdo_channel(p.canal_venta::text, p.canal_app::text, p.type::text) AS canal,
    pi.item_carta_id AS producto_id,
    COALESCE(pi.name, 'Sin nombre'::character varying) AS producto_nombre,
    COALESCE(pi.categoria_carta_id, ic.categoria_carta_id) AS categoria_id,
    COALESCE(mc.name, 'Sin categoría'::text) AS categoria_nombre,
    COALESCE(pi.quantity, 0)::numeric AS quantity,
    COALESCE(pi.subtotal, 0::numeric) AS ventas,
    COALESCE(ic.total_cost, 0::numeric) AS unit_cost,
    COALESCE(pi.quantity, 0)::numeric * COALESCE(ic.total_cost, 0::numeric) AS total_cost
FROM order_items pi
JOIN orders p ON p.id = pi.pedido_id
LEFT JOIN menu_items ic ON ic.id = pi.item_carta_id
LEFT JOIN menu_categories mc ON mc.id = COALESCE(pi.categoria_carta_id, ic.categoria_carta_id)
WHERE p.status::text = ANY (ARRAY['entregado', 'listo']);

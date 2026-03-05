-- ═══ Batch 1: nombre → name ═══
-- Drop affected views first
DROP VIEW IF EXISTS public.webapp_menu_items;
DROP VIEW IF EXISTS public.rdo_multivista_items_base;
DROP VIEW IF EXISTS public.balance_socios;

-- Rename columns (15 tables, excluding balance_socios which is a view)
ALTER TABLE public.delivery_zones RENAME COLUMN nombre TO name;
ALTER TABLE public.item_modifiers RENAME COLUMN nombre TO name;
ALTER TABLE public.menu_categories RENAME COLUMN nombre TO name;
ALTER TABLE public.menu_item_option_groups RENAME COLUMN nombre TO name;
ALTER TABLE public.menu_items RENAME COLUMN nombre TO name;
ALTER TABLE public.order_items RENAME COLUMN nombre TO name;
ALTER TABLE public.partners RENAME COLUMN nombre TO name;
ALTER TABLE public.promotions RENAME COLUMN nombre TO name;
ALTER TABLE public.recipe_categories RENAME COLUMN nombre TO name;
ALTER TABLE public.recipes RENAME COLUMN nombre TO name;
ALTER TABLE public.service_concepts RENAME COLUMN nombre TO name;
ALTER TABLE public.supplies RENAME COLUMN nombre TO name;
ALTER TABLE public.supply_categories RENAME COLUMN nombre TO name;

-- Recreate webapp_menu_items with new column names
CREATE OR REPLACE VIEW public.webapp_menu_items AS
SELECT ic.id,
    ic.name,
    ic.nombre_corto,
    ic.descripcion,
    ic.imagen_url,
    ic.precio_base,
    ic.categoria_carta_id,
    mc.name AS categoria_nombre,
    mc.orden AS categoria_orden,
    ic.orden,
    ic.disponible_delivery,
    ic.disponible_webapp,
    ic.tipo
FROM (menu_items ic
    LEFT JOIN menu_categories mc ON ((mc.id = ic.categoria_carta_id)))
WHERE ((ic.is_active = true) AND (ic.deleted_at IS NULL) AND (ic.disponible_webapp = true))
ORDER BY mc.orden, ic.orden;

-- Recreate rdo_multivista_items_base
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
    (COALESCE(pi.cantidad, 0))::numeric AS cantidad,
    COALESCE(pi.subtotal, (0)::numeric) AS ventas,
    COALESCE(ic.costo_total, (0)::numeric) AS costo_unitario,
    ((COALESCE(pi.cantidad, 0))::numeric * COALESCE(ic.costo_total, (0)::numeric)) AS costo_total
FROM (((order_items pi
    JOIN orders p ON ((p.id = pi.pedido_id)))
    LEFT JOIN menu_items ic ON ((ic.id = pi.item_carta_id)))
    LEFT JOIN menu_categories mc ON ((mc.id = COALESCE(pi.categoria_carta_id, ic.categoria_carta_id))))
WHERE ((p.estado)::text = ANY ((ARRAY['entregado'::character varying, 'listo'::character varying])::text[]));

-- Recreate balance_socios
CREATE OR REPLACE VIEW public.balance_socios AS
SELECT s.id AS socio_id,
    s.name AS nombre,
    s.branch_id,
    b.name AS branch_nombre,
    s.porcentaje_participacion,
    count(m.id) AS cantidad_movimientos,
    COALESCE(sum(m.monto) FILTER (WHERE ((m.tipo)::text = 'aporte_capital'::text)), (0)::numeric) AS total_aportes,
    COALESCE(sum(m.monto) FILTER (WHERE ((m.tipo)::text = 'prestamo_socio'::text)), (0)::numeric) AS total_prestamos_dados,
    COALESCE(sum(m.monto) FILTER (WHERE ((m.tipo)::text = 'devolucion_prestamo'::text)), (0)::numeric) AS total_devoluciones,
    COALESCE(sum(m.monto) FILTER (WHERE ((m.tipo)::text = 'distribucion_utilidades'::text)), (0)::numeric) AS total_utilidades,
    COALESCE(sum(m.monto) FILTER (WHERE ((m.tipo)::text = ANY ((ARRAY['retiro_anticipado'::character varying, 'retiro_utilidades'::character varying])::text[]))), (0)::numeric) AS total_retiros,
    ( SELECT partner_movements.saldo_acumulado
           FROM partner_movements
          WHERE ((partner_movements.socio_id = s.id) AND (partner_movements.deleted_at IS NULL))
          ORDER BY partner_movements.fecha DESC, partner_movements.created_at DESC
         LIMIT 1) AS saldo_actual
FROM ((partners s
    JOIN branches b ON ((b.id = s.branch_id)))
    LEFT JOIN partner_movements m ON (((m.socio_id = s.id) AND (m.deleted_at IS NULL))))
WHERE ((s.deleted_at IS NULL) AND (s.is_active = true))
GROUP BY s.id, s.name, s.branch_id, b.name, s.porcentaje_participacion;
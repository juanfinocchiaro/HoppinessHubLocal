
-- Migration C: Recreate RDO views with English column aliases

DROP VIEW IF EXISTS public.rdo_multivista_items_base;
DROP VIEW IF EXISTS public.rdo_multivista_ventas_base;

CREATE VIEW public.rdo_multivista_ventas_base WITH (security_invoker = true) AS
SELECT id AS order_id,
    branch_id,
    (created_at)::date AS date,
    created_at,
    normalize_rdo_channel((canal_venta)::text, (canal_app)::text, (type)::text) AS channel,
    COALESCE(total, (0)::numeric) AS total
FROM orders
WHERE (status)::text = ANY (ARRAY['entregado'::text, 'listo'::text]);

CREATE VIEW public.rdo_multivista_items_base WITH (security_invoker = true) AS
SELECT pi.id AS item_id,
    pi.pedido_id AS order_id,
    p.branch_id,
    (p.created_at)::date AS date,
    normalize_rdo_channel((p.canal_venta)::text, (p.canal_app)::text, (p.type)::text) AS channel,
    pi.item_carta_id AS product_id,
    COALESCE(pi.name, 'Sin nombre'::character varying) AS product_name,
    COALESCE(pi.categoria_carta_id, ic.categoria_carta_id) AS category_id,
    COALESCE(mc.name, 'Sin categoría'::text) AS category_name,
    (COALESCE(pi.quantity, 0))::numeric AS quantity,
    COALESCE(pi.subtotal, (0)::numeric) AS sales,
    COALESCE(ic.total_cost, (0)::numeric) AS unit_cost,
    ((COALESCE(pi.quantity, 0))::numeric * COALESCE(ic.total_cost, (0)::numeric)) AS total_cost
FROM (((order_items pi
    JOIN orders p ON ((p.id = pi.pedido_id)))
    LEFT JOIN menu_items ic ON ((ic.id = pi.item_carta_id)))
    LEFT JOIN menu_categories mc ON ((mc.id = COALESCE(pi.categoria_carta_id, ic.categoria_carta_id))))
WHERE (p.status)::text = ANY (ARRAY['entregado'::text, 'listo'::text]);

-- Grant access
GRANT SELECT ON public.rdo_multivista_ventas_base TO authenticated, anon;
GRANT SELECT ON public.rdo_multivista_items_base TO authenticated, anon;

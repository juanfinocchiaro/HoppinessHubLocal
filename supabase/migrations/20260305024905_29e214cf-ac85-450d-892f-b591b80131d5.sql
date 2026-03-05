-- Drop the view that references old table names
DROP VIEW IF EXISTS public.balance_socios;

-- Rename the 5 pending tables
ALTER TABLE public.socios RENAME TO partners;
ALTER TABLE public.movimientos_socio RENAME TO partner_movements;
ALTER TABLE public.distribuciones_utilidades RENAME TO profit_distributions;
ALTER TABLE public.insumos_costos_historial RENAME TO supply_cost_history;
ALTER TABLE public.cliente_direcciones RENAME TO customer_addresses;

-- Recreate the view with new table names
CREATE OR REPLACE VIEW public.balance_socios AS
SELECT s.id AS socio_id,
    s.nombre,
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
  GROUP BY s.id, s.nombre, s.branch_id, b.name, s.porcentaje_participacion;
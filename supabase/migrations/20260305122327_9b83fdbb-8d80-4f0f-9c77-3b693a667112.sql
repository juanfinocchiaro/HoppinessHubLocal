
-- =====================================================
-- MIGRATION A: Rename 5 remaining Spanish columns
-- =====================================================

ALTER TABLE public.discount_codes RENAME COLUMN monto_minimo_pedido TO min_order_amount;
ALTER TABLE public.suppliers RENAME COLUMN contacto TO contact;
ALTER TABLE public.branch_closure_config RENAME COLUMN habilitado TO enabled;
ALTER TABLE public.orders RENAME COLUMN requiere_factura TO requires_invoice;
ALTER TABLE public.supplier_invoices RENAME COLUMN total_factura TO invoice_total;

-- =====================================================
-- MIGRATION B: Rename 3 views to English
-- =====================================================

-- 1) balance_socios → partner_balance
DROP VIEW IF EXISTS public.balance_socios;
CREATE VIEW public.partner_balance AS
SELECT s.id AS socio_id,
    s.name,
    s.branch_id,
    b.name AS branch_name,
    s.ownership_percentage,
    count(m.id) AS movement_count,
    COALESCE(sum(m.amount) FILTER (WHERE m.type::text = 'aporte_capital'::text), 0::numeric) AS total_aportes,
    COALESCE(sum(m.amount) FILTER (WHERE m.type::text = 'prestamo_socio'::text), 0::numeric) AS total_prestamos_dados,
    COALESCE(sum(m.amount) FILTER (WHERE m.type::text = 'devolucion_prestamo'::text), 0::numeric) AS total_devoluciones,
    COALESCE(sum(m.amount) FILTER (WHERE m.type::text = 'distribucion_utilidades'::text), 0::numeric) AS total_utilidades,
    COALESCE(sum(m.amount) FILTER (WHERE m.type::text = ANY (ARRAY['retiro_anticipado'::text, 'retiro_utilidades'::text])), 0::numeric) AS total_retiros,
    ( SELECT pm.cumulative_balance
           FROM partner_movements pm
          WHERE pm.socio_id = s.id AND pm.deleted_at IS NULL
          ORDER BY pm.date DESC, pm.created_at DESC
         LIMIT 1) AS current_balance
   FROM partners s
     JOIN branches b ON b.id = s.branch_id
     LEFT JOIN partner_movements m ON m.socio_id = s.id AND m.deleted_at IS NULL
  WHERE s.deleted_at IS NULL AND s.is_active = true
  GROUP BY s.id, s.name, s.branch_id, b.name, s.ownership_percentage;

-- 2) cuenta_corriente_marca → brand_current_account
DROP VIEW IF EXISTS public.cuenta_corriente_marca;
CREATE VIEW public.brand_current_account AS
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

-- 3) cuenta_corriente_proveedores → supplier_current_account
DROP VIEW IF EXISTS public.cuenta_corriente_proveedores;
CREATE VIEW public.supplier_current_account AS
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
     LEFT JOIN LATERAL ( SELECT ff.branch_id,
            sum(ff.total) AS total_invoiced,
            sum(ff.total) - sum(ff.pending_balance) AS paid_on_invoices,
            count(ff.id) AS invoice_count,
            count(ff.id) FILTER (WHERE ff.payment_status::text = 'pendiente'::text) AS pending_invoices,
            count(ff.id) FILTER (WHERE ff.payment_status::text = 'pendiente'::text AND ff.due_date < CURRENT_DATE) AS overdue_invoices,
            COALESCE(sum(ff.pending_balance) FILTER (WHERE ff.payment_status::text = 'pendiente'::text AND ff.due_date < CURRENT_DATE), 0::numeric) AS overdue_amount,
            min(ff.due_date) FILTER (WHERE ff.payment_status::text = 'pendiente'::text AND ff.due_date >= CURRENT_DATE) AS next_due_date
           FROM supplier_invoices ff
          WHERE ff.proveedor_id = p.id AND ff.deleted_at IS NULL
          GROUP BY ff.branch_id) f_agg ON true
     LEFT JOIN ( SELECT sp.proveedor_id,
            sp.branch_id,
            COALESCE(sum(sp.amount), 0::numeric) AS account_payments
           FROM supplier_payments sp
          WHERE sp.invoice_id IS NULL AND sp.deleted_at IS NULL
          GROUP BY sp.proveedor_id, sp.branch_id) pa ON pa.proveedor_id = p.id AND pa.branch_id = COALESCE(f_agg.branch_id, pa.branch_id)
  WHERE p.deleted_at IS NULL;

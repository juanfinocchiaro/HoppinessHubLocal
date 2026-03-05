
-- Migration A: Rename remaining Spanish columns to English

-- orders (4 columns)
ALTER TABLE public.orders RENAME COLUMN cliente_nombre TO customer_name;
ALTER TABLE public.orders RENAME COLUMN cliente_telefono TO customer_phone;
ALTER TABLE public.orders RENAME COLUMN cliente_direccion TO customer_address;
ALTER TABLE public.orders RENAME COLUMN origen TO source;

-- canon_settlements (8 columns)
ALTER TABLE public.canon_settlements RENAME COLUMN canon_porcentaje TO canon_percentage;
ALTER TABLE public.canon_settlements RENAME COLUMN canon_monto TO canon_amount;
ALTER TABLE public.canon_settlements RENAME COLUMN marketing_porcentaje TO marketing_percentage;
ALTER TABLE public.canon_settlements RENAME COLUMN marketing_monto TO marketing_amount;
ALTER TABLE public.canon_settlements RENAME COLUMN pago_vt_sugerido TO suggested_transfer_payment;
ALTER TABLE public.canon_settlements RENAME COLUMN pago_ft_sugerido TO suggested_cash_payment;
ALTER TABLE public.canon_settlements RENAME COLUMN fc_total TO online_total;
ALTER TABLE public.canon_settlements RENAME COLUMN ft_total TO cash_total;

-- branch_monthly_sales (2 columns)
ALTER TABLE public.branch_monthly_sales RENAME COLUMN fc_total TO online_total;
ALTER TABLE public.branch_monthly_sales RENAME COLUMN ft_total TO cash_total;

-- rdo_movimientos (2 columns)
ALTER TABLE public.rdo_movimientos RENAME COLUMN origen TO source;
ALTER TABLE public.rdo_movimientos RENAME COLUMN datos_extra TO extra_data;

-- invoice_items (3 columns)
ALTER TABLE public.invoice_items RENAME COLUMN categoria_pl TO pl_category;
ALTER TABLE public.invoice_items RENAME COLUMN descuento_monto TO discount_amount;
ALTER TABLE public.invoice_items RENAME COLUMN iva_monto TO vat_amount;

-- manual_consumptions (1 column)
ALTER TABLE public.manual_consumptions RENAME COLUMN categoria_pl TO pl_category;

-- supplies (1 column)
ALTER TABLE public.supplies RENAME COLUMN categoria_pl TO pl_category;

-- item_modifiers (1 column)
ALTER TABLE public.item_modifiers RENAME COLUMN diferencia_precio TO price_difference;

-- webapp_order_messages (1 column)
ALTER TABLE public.webapp_order_messages RENAME COLUMN sender_nombre TO sender_name;

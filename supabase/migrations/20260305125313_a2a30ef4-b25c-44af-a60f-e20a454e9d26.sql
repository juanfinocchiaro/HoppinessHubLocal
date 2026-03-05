-- Etapa 1: shift_closures — 14 columns
ALTER TABLE public.shift_closures RENAME COLUMN hamburguesas TO burgers;
ALTER TABLE public.shift_closures RENAME COLUMN ventas_local TO local_sales;
ALTER TABLE public.shift_closures RENAME COLUMN ventas_apps TO app_sales;
ALTER TABLE public.shift_closures RENAME COLUMN total_facturado TO total_invoiced;
ALTER TABLE public.shift_closures RENAME COLUMN total_hamburguesas TO total_burgers;
ALTER TABLE public.shift_closures RENAME COLUMN total_vendido TO total_sold;
ALTER TABLE public.shift_closures RENAME COLUMN total_efectivo TO total_cash;
ALTER TABLE public.shift_closures RENAME COLUMN tiene_alerta_facturacion TO has_invoicing_alert;
ALTER TABLE public.shift_closures RENAME COLUMN tiene_alerta_posnet TO has_posnet_alert;
ALTER TABLE public.shift_closures RENAME COLUMN tiene_alerta_apps TO has_apps_alert;
ALTER TABLE public.shift_closures RENAME COLUMN tiene_alerta_caja TO has_register_alert;
ALTER TABLE public.shift_closures RENAME COLUMN arqueo_caja TO register_reconciliation;
ALTER TABLE public.shift_closures RENAME COLUMN diferencia_posnet TO posnet_difference;
ALTER TABLE public.shift_closures RENAME COLUMN diferencia_apps TO apps_difference;

-- Etapa 2: register_shifts_legacy — 12 columns
ALTER TABLE public.register_shifts_legacy RENAME COLUMN cajero_id TO cashier_id;
ALTER TABLE public.register_shifts_legacy RENAME COLUMN apertura_at TO opened_at;
ALTER TABLE public.register_shifts_legacy RENAME COLUMN fondo_apertura TO opening_fund;
ALTER TABLE public.register_shifts_legacy RENAME COLUMN cierre_at TO closed_at;
ALTER TABLE public.register_shifts_legacy RENAME COLUMN total_efectivo TO total_cash;
ALTER TABLE public.register_shifts_legacy RENAME COLUMN total_tarjeta_debito TO total_debit;
ALTER TABLE public.register_shifts_legacy RENAME COLUMN total_tarjeta_credito TO total_credit;
ALTER TABLE public.register_shifts_legacy RENAME COLUMN total_transferencia TO total_transfer;
ALTER TABLE public.register_shifts_legacy RENAME COLUMN total_ventas TO total_sales;
ALTER TABLE public.register_shifts_legacy RENAME COLUMN diferencia TO difference;
ALTER TABLE public.register_shifts_legacy RENAME COLUMN diferencia_motivo TO difference_reason;
ALTER TABLE public.register_shifts_legacy RENAME COLUMN retiros_efectivo TO cash_withdrawals;

-- Etapa 3: cash_register_movements — 2 columns
ALTER TABLE public.cash_register_movements RENAME COLUMN categoria_gasto TO expense_category;
ALTER TABLE public.cash_register_movements RENAME COLUMN notes_extra TO extra_notes;

-- Etapa 4: service_concepts + item_modifiers — 2 columns
ALTER TABLE public.service_concepts RENAME COLUMN categoria_gasto TO expense_category;
ALTER TABLE public.item_modifiers RENAME COLUMN diferencia_costo TO cost_difference;
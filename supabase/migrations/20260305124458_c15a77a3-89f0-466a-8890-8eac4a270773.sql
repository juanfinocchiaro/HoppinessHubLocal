-- Etapas 5-7: FK-like columns + booleans

-- ETAPA 5: canon_liquidacion_id → canon_settlement_id
ALTER TABLE public.canon_payments DROP CONSTRAINT IF EXISTS pagos_canon_canon_liquidacion_id_fkey;
ALTER TABLE public.canon_payments RENAME COLUMN canon_liquidacion_id TO canon_settlement_id;
ALTER TABLE public.canon_payments ADD CONSTRAINT canon_payments_canon_settlement_id_fkey
  FOREIGN KEY (canon_settlement_id) REFERENCES public.canon_settlements(id);

-- ETAPA 6: ventas_id → monthly_sales_id  
ALTER TABLE public.canon_settlements DROP CONSTRAINT IF EXISTS canon_liquidaciones_ventas_id_fkey;
ALTER TABLE public.canon_settlements RENAME COLUMN ventas_id TO monthly_sales_id;
ALTER TABLE public.canon_settlements ADD CONSTRAINT canon_settlements_monthly_sales_id_fkey
  FOREIGN KEY (monthly_sales_id) REFERENCES public.branch_monthly_sales(id);

-- ETAPA 7: Boolean columns without is_ prefix
ALTER TABLE public.recipes RENAME COLUMN puede_ser_extra TO can_be_extra;
ALTER TABLE public.recipes RENAME COLUMN fc_objetivo_extra TO extra_target_fc;
ALTER TABLE public.supplies RENAME COLUMN puede_ser_extra TO can_be_extra;
ALTER TABLE public.supplies RENAME COLUMN fc_objetivo_extra TO extra_target_fc;
ALTER TABLE public.invoice_items RENAME COLUMN afecta_costo_base TO affects_base_cost;
ALTER TABLE public.register_shifts_legacy RENAME COLUMN efectivo_contado TO cash_counted;
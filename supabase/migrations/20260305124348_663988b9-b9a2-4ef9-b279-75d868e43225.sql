-- Etapas 1-4: Rename 2 tables + ~18 columns

-- ETAPA 1: Rename table stock_movimientos → stock_movements
ALTER TABLE public.stock_movimientos RENAME TO stock_movements;

-- ETAPA 2: Rename table rdo_movimientos → rdo_movements
ALTER TABLE public.rdo_movimientos RENAME TO rdo_movements;

-- ETAPA 3: Misc columns in Spanish
ALTER TABLE public.stock_movements RENAME COLUMN nota TO note;
ALTER TABLE public.discount_codes RENAME COLUMN valor TO value;
ALTER TABLE public.discount_codes RENAME COLUMN usos_maximos TO max_uses;
ALTER TABLE public.discount_codes RENAME COLUMN usos_actuales TO current_uses;
ALTER TABLE public.discount_codes RENAME COLUMN uso_unico_por_usuario TO single_use_per_user;
ALTER TABLE public.promotions RENAME COLUMN valor TO value;
ALTER TABLE public.expenses RENAME COLUMN adjuntos TO attachments;
ALTER TABLE public.expenses RENAME COLUMN afecta_caja TO affects_register;
ALTER TABLE public.expenses RENAME COLUMN categoria_principal TO main_category;
ALTER TABLE public.expenses RENAME COLUMN subcategoria TO subcategory;
ALTER TABLE public.expenses RENAME COLUMN gasto_relacionado_id TO related_expense_id;
ALTER TABLE public.service_concepts RENAME COLUMN subcategoria TO subcategory;

-- ETAPA 4: Financial columns
ALTER TABLE public.investments RENAME COLUMN cuotas_pagadas TO installments_paid;
ALTER TABLE public.investments RENAME COLUMN cuotas_total TO total_installments;
ALTER TABLE public.canon_payments RENAME COLUMN datos_pago TO payment_data;
ALTER TABLE public.supplier_payments RENAME COLUMN datos_pago TO payment_data;
ALTER TABLE public.afip_config RENAME COLUMN punto_venta TO point_of_sale;
ALTER TABLE public.issued_invoices RENAME COLUMN punto_venta TO point_of_sale;
-- Etapa 5: Recreate sync_expense_movement with new column names
CREATE OR REPLACE FUNCTION public.sync_expense_movement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_period TEXT; v_branch_id UUID;
BEGIN
  IF NEW.type != 'expense' THEN RETURN NEW; END IF;
  IF COALESCE(NEW.approval_status, 'aprobado') = 'rechazado' THEN RETURN NEW; END IF;
  v_branch_id := NEW.branch_id;
  v_period := to_char(COALESCE(NEW.created_at, now()), 'YYYY-MM');
  INSERT INTO public.expenses (
    id, branch_id, period, main_category, concept,
    amount, date, payment_method, notes, status, created_by, rdo_category_code
  ) VALUES (
    NEW.id, v_branch_id, v_period,
    COALESCE(NEW.expense_category, 'caja_chica'),
    NEW.concept, NEW.amount,
    (COALESCE(NEW.created_at, now()) AT TIME ZONE 'America/Argentina/Cordoba')::date,
    NEW.payment_method, NEW.extra_notes,
    CASE WHEN COALESCE(NEW.approval_status, 'aprobado') = 'pendiente_aprobacion' THEN 'pendiente' ELSE 'pagado' END,
    NEW.recorded_by, NEW.rdo_category_code
  ) ON CONFLICT (id) DO UPDATE SET
    main_category = COALESCE(EXCLUDED.main_category, expenses.main_category),
    concept = EXCLUDED.concept, amount = EXCLUDED.amount,
    payment_method = EXCLUDED.payment_method, notes = EXCLUDED.notes,
    status = EXCLUDED.status, rdo_category_code = EXCLUDED.rdo_category_code, updated_at = now();
  RETURN NEW;
END;
$$;

-- RLS policy renames

-- expenses
DROP POLICY IF EXISTS "gastos_select" ON public.expenses;
DROP POLICY IF EXISTS "gastos_insert" ON public.expenses;
DROP POLICY IF EXISTS "gastos_update" ON public.expenses;
DROP POLICY IF EXISTS "gastos_delete_admin" ON public.expenses;
CREATE POLICY "expenses_select" ON public.expenses FOR SELECT TO authenticated USING (is_financial_for_branch(auth.uid(), branch_id));
CREATE POLICY "expenses_insert" ON public.expenses FOR INSERT TO authenticated WITH CHECK (is_financial_for_branch(auth.uid(), branch_id));
CREATE POLICY "expenses_update" ON public.expenses FOR UPDATE TO authenticated USING (is_financial_for_branch(auth.uid(), branch_id));
CREATE POLICY "expenses_delete_admin" ON public.expenses FOR DELETE TO authenticated USING (is_superadmin(auth.uid()));

-- invoice_items
DROP POLICY IF EXISTS "items_factura_select" ON public.invoice_items;
DROP POLICY IF EXISTS "items_factura_insert" ON public.invoice_items;
DROP POLICY IF EXISTS "items_factura_update" ON public.invoice_items;
DROP POLICY IF EXISTS "items_factura_delete" ON public.invoice_items;
CREATE POLICY "invoice_items_select" ON public.invoice_items FOR SELECT TO public USING (EXISTS (SELECT 1 FROM supplier_invoices f WHERE f.id = invoice_items.invoice_id AND is_financial_for_branch(auth.uid(), f.branch_id)));
CREATE POLICY "invoice_items_insert" ON public.invoice_items FOR INSERT TO public WITH CHECK (EXISTS (SELECT 1 FROM supplier_invoices f WHERE f.id = invoice_items.invoice_id AND is_financial_for_branch(auth.uid(), f.branch_id)));
CREATE POLICY "invoice_items_update" ON public.invoice_items FOR UPDATE TO public USING (EXISTS (SELECT 1 FROM supplier_invoices f WHERE f.id = invoice_items.invoice_id AND is_financial_for_branch(auth.uid(), f.branch_id)));
CREATE POLICY "invoice_items_delete" ON public.invoice_items FOR DELETE TO public USING (EXISTS (SELECT 1 FROM supplier_invoices f WHERE f.id = invoice_items.invoice_id AND is_financial_for_branch(auth.uid(), f.branch_id)));

-- invoice_payment_links
DROP POLICY IF EXISTS "pago_factura_select" ON public.invoice_payment_links;
DROP POLICY IF EXISTS "pago_factura_insert" ON public.invoice_payment_links;
DROP POLICY IF EXISTS "pago_factura_delete" ON public.invoice_payment_links;
CREATE POLICY "invoice_payment_links_select" ON public.invoice_payment_links FOR SELECT TO public USING (true);
CREATE POLICY "invoice_payment_links_insert" ON public.invoice_payment_links FOR INSERT TO public WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "invoice_payment_links_delete" ON public.invoice_payment_links FOR DELETE TO public USING (auth.uid() IS NOT NULL);

-- afip_config
DROP POLICY IF EXISTS "franquiciado_afip_config" ON public.afip_config;
CREATE POLICY "franchisee_afip_config" ON public.afip_config FOR ALL TO authenticated USING (has_role_for_branch(auth.uid(), branch_id, 'franquiciado'::text)) WITH CHECK (has_role_for_branch(auth.uid(), branch_id, 'franquiciado'::text));

-- issued_invoices
DROP POLICY IF EXISTS "franquiciado_insert_facturas" ON public.issued_invoices;
DROP POLICY IF EXISTS "branch_access_facturas" ON public.issued_invoices;
DROP POLICY IF EXISTS "superadmin_all_facturas" ON public.issued_invoices;
CREATE POLICY "franchisee_insert_invoices" ON public.issued_invoices FOR INSERT TO public WITH CHECK (can_access_branch(auth.uid(), branch_id));
CREATE POLICY "branch_access_invoices" ON public.issued_invoices FOR SELECT TO public USING (can_access_branch(auth.uid(), branch_id));
CREATE POLICY "superadmin_all_invoices" ON public.issued_invoices FOR ALL TO public USING (is_superadmin(auth.uid()));

-- partner_movements
DROP POLICY IF EXISTS "movimientos_socio_insert" ON public.partner_movements;
DROP POLICY IF EXISTS "movimientos_socio_select" ON public.partner_movements;
CREATE POLICY "partner_movements_insert" ON public.partner_movements FOR INSERT TO authenticated WITH CHECK (is_partner_admin(auth.uid(), branch_id));
CREATE POLICY "partner_movements_select" ON public.partner_movements FOR SELECT TO authenticated USING (is_partner_admin(auth.uid(), branch_id));

-- partners
DROP POLICY IF EXISTS "socios_select" ON public.partners;
DROP POLICY IF EXISTS "socios_update" ON public.partners;
DROP POLICY IF EXISTS "socios_insert" ON public.partners;
CREATE POLICY "partners_select" ON public.partners FOR SELECT TO authenticated USING (is_partner_admin(auth.uid(), branch_id));
CREATE POLICY "partners_update" ON public.partners FOR UPDATE TO authenticated USING (is_partner_admin(auth.uid(), branch_id));
CREATE POLICY "partners_insert" ON public.partners FOR INSERT TO authenticated WITH CHECK (is_partner_admin(auth.uid(), branch_id));

-- order_item_modifiers
DROP POLICY IF EXISTS "Staff can manage pedido_item_modificadores" ON public.order_item_modifiers;
CREATE POLICY "Staff can manage order_item_modifiers" ON public.order_item_modifiers FOR ALL TO public
  USING (EXISTS (SELECT 1 FROM order_items pi JOIN orders p ON p.id = pi.pedido_id WHERE pi.id = order_item_modifiers.pedido_item_id AND (has_branch_access_v2(auth.uid(), p.branch_id) OR is_superadmin(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM order_items pi JOIN orders p ON p.id = pi.pedido_id WHERE pi.id = order_item_modifiers.pedido_item_id AND (has_branch_access_v2(auth.uid(), p.branch_id) OR is_superadmin(auth.uid()))));

-- order_items
DROP POLICY IF EXISTS "Staff can manage pedido_items" ON public.order_items;
CREATE POLICY "Staff can manage order_items" ON public.order_items FOR ALL TO public
  USING (EXISTS (SELECT 1 FROM orders p WHERE p.id = order_items.pedido_id AND (has_branch_access_v2(auth.uid(), p.branch_id) OR is_superadmin(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM orders p WHERE p.id = order_items.pedido_id AND (has_branch_access_v2(auth.uid(), p.branch_id) OR is_superadmin(auth.uid()))));

-- order_payments
DROP POLICY IF EXISTS "Staff delete pedido_pagos" ON public.order_payments;
DROP POLICY IF EXISTS "Staff insert pedido_pagos_with_shift" ON public.order_payments;
DROP POLICY IF EXISTS "Staff select pedido_pagos" ON public.order_payments;
DROP POLICY IF EXISTS "Staff update pedido_pagos" ON public.order_payments;
CREATE POLICY "Staff delete order_payments" ON public.order_payments FOR DELETE TO public
  USING (EXISTS (SELECT 1 FROM orders p WHERE p.id = order_payments.pedido_id AND (has_branch_access_v2(auth.uid(), p.branch_id) OR is_superadmin(auth.uid()))));
CREATE POLICY "Staff insert order_payments_with_shift" ON public.order_payments FOR INSERT TO public
  WITH CHECK (EXISTS (SELECT 1 FROM orders p WHERE p.id = order_payments.pedido_id AND (has_branch_access_v2(auth.uid(), p.branch_id) OR is_superadmin(auth.uid())) AND (is_superadmin(auth.uid()) OR is_franchisee_or_accountant_for_branch(auth.uid(), p.branch_id) OR has_open_shift_at_branch(auth.uid(), p.branch_id))));
CREATE POLICY "Staff select order_payments" ON public.order_payments FOR SELECT TO public
  USING (EXISTS (SELECT 1 FROM orders p WHERE p.id = order_payments.pedido_id AND (has_branch_access_v2(auth.uid(), p.branch_id) OR is_superadmin(auth.uid()))));
CREATE POLICY "Staff update order_payments" ON public.order_payments FOR UPDATE TO public
  USING (EXISTS (SELECT 1 FROM orders p WHERE p.id = order_payments.pedido_id AND (has_branch_access_v2(auth.uid(), p.branch_id) OR is_superadmin(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM orders p WHERE p.id = order_payments.pedido_id AND (has_branch_access_v2(auth.uid(), p.branch_id) OR is_superadmin(auth.uid()))));

-- orders
DROP POLICY IF EXISTS "Staff delete pedidos" ON public.orders;
DROP POLICY IF EXISTS "Staff insert pedidos_with_shift" ON public.orders;
DROP POLICY IF EXISTS "Staff select pedidos" ON public.orders;
DROP POLICY IF EXISTS "Staff update pedidos" ON public.orders;
CREATE POLICY "Staff delete orders" ON public.orders FOR DELETE TO public
  USING (has_branch_access_v2(auth.uid(), branch_id) OR is_superadmin(auth.uid()));
CREATE POLICY "Staff insert orders_with_shift" ON public.orders FOR INSERT TO public
  WITH CHECK ((has_branch_access_v2(auth.uid(), branch_id) OR is_superadmin(auth.uid())) AND (is_superadmin(auth.uid()) OR is_franchisee_or_accountant_for_branch(auth.uid(), branch_id) OR has_open_shift_at_branch(auth.uid(), branch_id)));
CREATE POLICY "Staff select orders" ON public.orders FOR SELECT TO public
  USING (has_branch_access_v2(auth.uid(), branch_id) OR is_superadmin(auth.uid()));
CREATE POLICY "Staff update orders" ON public.orders FOR UPDATE TO public
  USING (has_branch_access_v2(auth.uid(), branch_id) OR is_superadmin(auth.uid()))
  WITH CHECK (has_branch_access_v2(auth.uid(), branch_id) OR is_superadmin(auth.uid()));

-- stock_movements
DROP POLICY IF EXISTS "Staff can manage stock_movimientos" ON public.stock_movements;
CREATE POLICY "Staff can manage stock_movements" ON public.stock_movements FOR ALL TO public
  USING (has_branch_access_v2(auth.uid(), branch_id) OR is_superadmin(auth.uid()))
  WITH CHECK (has_branch_access_v2(auth.uid(), branch_id) OR is_superadmin(auth.uid()));

-- supplier_invoices
DROP POLICY IF EXISTS "facturas_select" ON public.supplier_invoices;
DROP POLICY IF EXISTS "facturas_insert" ON public.supplier_invoices;
DROP POLICY IF EXISTS "facturas_update" ON public.supplier_invoices;
CREATE POLICY "supplier_invoices_select" ON public.supplier_invoices FOR SELECT TO public USING (is_financial_for_branch(auth.uid(), branch_id));
CREATE POLICY "supplier_invoices_insert" ON public.supplier_invoices FOR INSERT TO public WITH CHECK (is_financial_for_branch(auth.uid(), branch_id));
CREATE POLICY "supplier_invoices_update" ON public.supplier_invoices FOR UPDATE TO public USING (is_financial_for_branch(auth.uid(), branch_id));

-- cash_register_shifts (update policy that references legacy alias)
DROP POLICY IF EXISTS "Staff insert cash_register_shifts_with_fichaje" ON public.cash_register_shifts;
CREATE POLICY "Staff insert cash_register_shifts_with_clock" ON public.cash_register_shifts FOR INSERT TO public
  WITH CHECK ((has_branch_access_v2(auth.uid(), branch_id) OR is_superadmin(auth.uid())) AND (is_superadmin(auth.uid()) OR is_franchisee_or_accountant_for_branch(auth.uid(), branch_id) OR ((get_local_role_for_branch(auth.uid(), branch_id) = ANY (ARRAY['encargado'::text, 'cajero'::text])) AND is_clocked_in_at_branch(auth.uid(), branch_id))));

-- profit_distributions (references is_socio_admin)
DROP POLICY IF EXISTS "distribuciones_select" ON public.profit_distributions;
CREATE POLICY "profit_distributions_select" ON public.profit_distributions FOR SELECT TO authenticated USING (is_partner_admin(auth.uid(), branch_id));

-- periods (references is_socio_admin)
DROP POLICY IF EXISTS "periodos_update" ON public.periods;
CREATE POLICY "periods_update" ON public.periods FOR UPDATE TO authenticated USING (is_partner_admin(auth.uid(), branch_id));

-- Drop legacy function aliases (now safe - all dependents updated)
DROP FUNCTION IF EXISTS public.is_franquiciado_or_contador_for_branch(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_socio_admin(uuid, uuid);
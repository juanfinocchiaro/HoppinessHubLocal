-- 1. Change FK from CASCADE to SET NULL so payments survive invoice regeneration
ALTER TABLE public.supplier_payments
  DROP CONSTRAINT pagos_proveedores_factura_id_fkey;
ALTER TABLE public.supplier_payments
  ADD CONSTRAINT pagos_proveedores_factura_id_fkey
  FOREIGN KEY (invoice_id) REFERENCES public.supplier_invoices(id) ON DELETE SET NULL;

-- 2. Update generate_canon_invoice to relink orphaned payments and recalculate pending_balance
CREATE OR REPLACE FUNCTION public.generate_canon_invoice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  canon_monto NUMERIC(12,2);
  marketing_monto NUMERIC(12,2);
  total_canon NUMERIC(12,2);
  v_factura_id UUID;
  v_old_factura_id UUID;
  v_branch_code TEXT;
  v_vt NUMERIC(12,2);
  v_ef NUMERIC(12,2);
  v_online NUMERIC(12,2);
  v_factura_numero VARCHAR(50);
  v_fecha_emision DATE;
  v_total_pagado NUMERIC(12,2);
BEGIN
  v_vt := COALESCE(NEW.total_sales, 0);
  v_ef := COALESCE(NEW.cash, 0);
  v_online := v_vt - v_ef;

  IF v_vt <= 0 THEN RETURN NEW; END IF;

  canon_monto := v_vt * 0.045;
  marketing_monto := v_vt * 0.005;
  total_canon := canon_monto + marketing_monto;

  v_fecha_emision := (DATE_TRUNC('month', (NEW.period || '-01')::date) + INTERVAL '1 month')::date;

  SELECT COALESCE(slug, LEFT(id::text, 4)) INTO v_branch_code FROM branches WHERE id = NEW.branch_id;
  v_factura_numero := 'CANON-' || NEW.period || '-' || UPPER(COALESCE(v_branch_code, 'XX'));

  -- Remember old invoice ID before deleting
  SELECT id INTO v_old_factura_id
  FROM public.supplier_invoices
  WHERE proveedor_id = '00000000-0000-0000-0000-000000000001'
    AND branch_id = NEW.branch_id
    AND period = NEW.period
  LIMIT 1;

  -- Delete old invoice (payments get SET NULL thanks to new FK rule)
  DELETE FROM public.supplier_invoices
  WHERE proveedor_id = '00000000-0000-0000-0000-000000000001'
    AND branch_id = NEW.branch_id
    AND period = NEW.period;

  -- Create new invoice
  INSERT INTO public.supplier_invoices (
    id, branch_id, proveedor_id, invoice_type, invoice_number,
    invoice_date, subtotal, total, payment_terms, due_date,
    payment_status, pending_balance, period, type, notes
  ) VALUES (
    gen_random_uuid(), NEW.branch_id, '00000000-0000-0000-0000-000000000001',
    'C', v_factura_numero, v_fecha_emision, total_canon, total_canon,
    'cuenta_corriente', v_fecha_emision, 'pendiente', total_canon,
    NEW.period, 'normal',
    'Canon 4.5%: $' || ROUND(canon_monto) || ' | Mktg 0.5%: $' || ROUND(marketing_monto) ||
    ' | VT: $' || ROUND(v_vt) || ' | Ef: $' || ROUND(v_ef) || ' | Online: $' || ROUND(v_online)
  ) RETURNING id INTO v_factura_id;

  -- Create invoice items
  INSERT INTO public.invoice_items (invoice_id, insumo_id, quantity, unit, unit_price, subtotal, pl_category)
  VALUES
    (v_factura_id, '00000000-0000-0000-0000-000000000011', 1, 'servicio', canon_monto, canon_monto, 'publicidad_marca'),
    (v_factura_id, '00000000-0000-0000-0000-000000000012', 1, 'servicio', marketing_monto, marketing_monto, 'publicidad_marca');

  -- Relink orphaned payments (from the old invoice) to the new invoice
  IF v_old_factura_id IS NOT NULL THEN
    UPDATE public.supplier_payments
    SET invoice_id = v_factura_id
    WHERE invoice_id IS NULL
      AND proveedor_id = '00000000-0000-0000-0000-000000000001'
      AND branch_id = NEW.branch_id
      AND deleted_at IS NULL
      AND created_at >= (SELECT created_at FROM public.supplier_invoices WHERE id = v_factura_id);
  END IF;

  -- Also relink any payments that were explicitly for this period but got orphaned
  UPDATE public.supplier_payments
  SET invoice_id = v_factura_id
  WHERE invoice_id IS NULL
    AND proveedor_id = '00000000-0000-0000-0000-000000000001'
    AND branch_id = NEW.branch_id
    AND deleted_at IS NULL;

  -- Recalculate pending_balance based on verified payments
  SELECT COALESCE(SUM(amount), 0) INTO v_total_pagado
  FROM public.supplier_payments
  WHERE invoice_id = v_factura_id
    AND is_verified = true
    AND deleted_at IS NULL;

  UPDATE public.supplier_invoices
  SET pending_balance = GREATEST(0, total_canon - v_total_pagado),
      payment_status = CASE
        WHEN v_total_pagado >= total_canon THEN 'pagado'
        WHEN v_total_pagado > 0 THEN 'parcial'
        ELSE 'pendiente'
      END
  WHERE id = v_factura_id;

  RETURN NEW;
END;
$$;
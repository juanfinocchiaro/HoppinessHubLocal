
CREATE OR REPLACE FUNCTION public.generate_canon_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  canon_monto NUMERIC(12,2);
  marketing_monto NUMERIC(12,2);
  total_canon NUMERIC(12,2);
  v_factura_id UUID;
  v_branch_code TEXT;
  v_vt NUMERIC(12,2);
  v_ef NUMERIC(12,2);
  v_online NUMERIC(12,2);
  v_factura_numero VARCHAR(50);
  v_fecha_emision DATE;
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

  DELETE FROM public.supplier_invoices
  WHERE proveedor_id = '00000000-0000-0000-0000-000000000001'
    AND branch_id = NEW.branch_id
    AND period = NEW.period;

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

  INSERT INTO public.invoice_items (invoice_id, insumo_id, quantity, unit, unit_price, subtotal, pl_category)
  VALUES
    (v_factura_id, '00000000-0000-0000-0000-000000000011', 1, 'servicio', canon_monto, canon_monto, 'publicidad_marca'),
    (v_factura_id, '00000000-0000-0000-0000-000000000012', 1, 'servicio', marketing_monto, marketing_monto, 'publicidad_marca');

  RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION public.insert_complete_invoice(p_factura jsonb, p_items jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_factura_id uuid;
  v_item jsonb;
BEGIN
  INSERT INTO supplier_invoices (
    branch_id, proveedor_id, invoice_type, invoice_number, invoice_date,
    subtotal, iva, otros_impuestos, total, payment_terms, due_date,
    payment_status, pending_balance, type, extraordinary_reason, period,
    notes, created_by, subtotal_bruto, total_descuentos, subtotal_neto,
    imp_internos, iva_21, iva_105, perc_iva, perc_provincial, perc_municipal,
    invoice_total
  )
  SELECT
    (p_factura->>'branch_id')::uuid,
    (p_factura->>'proveedor_id')::uuid,
    COALESCE(p_factura->>'invoice_type', p_factura->>'factura_tipo'),
    COALESCE(p_factura->>'invoice_number', p_factura->>'factura_numero'),
    (p_factura->>'invoice_date')::date,
    (p_factura->>'subtotal')::numeric,
    COALESCE((p_factura->>'iva')::numeric, 0),
    COALESCE((p_factura->>'otros_impuestos')::numeric, 0),
    (p_factura->>'total')::numeric,
    COALESCE(p_factura->>'payment_terms', p_factura->>'condicion_pago'),
    (p_factura->>'due_date')::date,
    p_factura->>'payment_status',
    (p_factura->>'pending_balance')::numeric,
    COALESCE(p_factura->>'type', 'normal'),
    COALESCE(p_factura->>'extraordinary_reason', p_factura->>'motivo_extraordinaria'),
    p_factura->>'period',
    p_factura->>'notes',
    (p_factura->>'created_by')::uuid,
    (p_factura->>'subtotal_bruto')::numeric,
    COALESCE((p_factura->>'total_descuentos')::numeric, 0),
    (p_factura->>'subtotal_neto')::numeric,
    COALESCE((p_factura->>'imp_internos')::numeric, 0),
    COALESCE((p_factura->>'iva_21')::numeric, 0),
    COALESCE((p_factura->>'iva_105')::numeric, 0),
    COALESCE((p_factura->>'perc_iva')::numeric, 0),
    COALESCE((p_factura->>'perc_provincial')::numeric, 0),
    COALESCE((p_factura->>'perc_municipal')::numeric, 0),
    (p_factura->>'invoice_total')::numeric
  RETURNING id INTO v_factura_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO invoice_items (
      invoice_id, item_type, insumo_id, service_concept_id,
      quantity, unit, unit_price, subtotal, affects_base_cost,
      pl_category, alicuota_iva, vat_amount, gross_unit_price
    ) VALUES (
      v_factura_id,
      COALESCE(v_item->>'item_type', v_item->>'tipo_item', 'insumo'),
      (v_item->>'insumo_id')::uuid,
      (v_item->>'service_concept_id')::uuid,
      (v_item->>'quantity')::numeric,
      v_item->>'unit',
      (v_item->>'unit_price')::numeric,
      (v_item->>'subtotal')::numeric,
      COALESCE((v_item->>'affects_base_cost')::boolean, (v_item->>'afecta_costo_base')::boolean, true),
      COALESCE(v_item->>'pl_category', v_item->>'categoria_pl'),
      (v_item->>'alicuota_iva')::numeric,
      COALESCE((v_item->>'vat_amount')::numeric, (v_item->>'iva_monto')::numeric),
      COALESCE((v_item->>'gross_unit_price')::numeric, (v_item->>'precio_unitario_bruto')::numeric)
    );
  END LOOP;

  RETURN v_factura_id;
END;
$$;


-- 1. validate_invoice_item_type
CREATE OR REPLACE FUNCTION public.validate_invoice_item_type()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.item_type = 'insumo' THEN
    IF NEW.insumo_id IS NULL THEN
      RAISE EXCEPTION 'insumo_id required for item_type=insumo';
    END IF;
    IF NEW.service_concept_id IS NOT NULL THEN
      RAISE EXCEPTION 'service_concept_id must be NULL for item_type=insumo';
    END IF;
  ELSIF NEW.item_type = 'servicio' THEN
    IF NEW.service_concept_id IS NULL THEN
      RAISE EXCEPTION 'service_concept_id required for item_type=servicio';
    END IF;
    IF NEW.insumo_id IS NOT NULL THEN
      RAISE EXCEPTION 'insumo_id must be NULL for item_type=servicio';
    END IF;
  ELSE
    RAISE EXCEPTION 'item_type must be insumo or servicio';
  END IF;
  RETURN NEW;
END;
$$;

-- 2. add_stock_from_purchase
CREATE OR REPLACE FUNCTION public.add_stock_from_purchase()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_branch_id UUID;
  v_unidad_base TEXT;
  v_contenido DECIMAL(12,4);
  v_cantidad_base DECIMAL(10,3);
  v_cantidad_anterior DECIMAL(10,3);
  v_cantidad_nueva DECIMAL(10,3);
BEGIN
  IF NEW.insumo_id IS NULL OR (NEW.item_type IS NOT NULL AND NEW.item_type != 'insumo') THEN
    RETURN NEW;
  END IF;

  SELECT f.branch_id INTO v_branch_id
  FROM supplier_invoices f
  WHERE f.id = NEW.invoice_id AND f.deleted_at IS NULL;

  IF v_branch_id IS NULL THEN RETURN NEW; END IF;

  SELECT i.base_unit, COALESCE(i.purchase_unit_content, 1)
  INTO v_unidad_base, v_contenido
  FROM supplies i WHERE i.id = NEW.insumo_id;

  IF v_unidad_base IS NULL THEN
    v_unidad_base := COALESCE(NEW.unit, 'un');
    v_contenido := 1;
  END IF;

  IF NEW.unit IS NOT NULL AND LOWER(TRIM(NEW.unit)) != LOWER(v_unidad_base) AND v_contenido > 0 THEN
    v_cantidad_base := NEW.quantity * v_contenido;
  ELSE
    v_cantidad_base := NEW.quantity;
  END IF;

  IF v_cantidad_base <= 0 THEN RETURN NEW; END IF;

  SELECT COALESCE(sa.quantity, 0) INTO v_cantidad_anterior
  FROM stock_actual sa
  WHERE sa.branch_id = v_branch_id AND sa.insumo_id = NEW.insumo_id;

  INSERT INTO stock_actual (branch_id, insumo_id, quantity, unit)
  VALUES (v_branch_id, NEW.insumo_id, v_cantidad_base, v_unidad_base)
  ON CONFLICT (branch_id, insumo_id)
  DO UPDATE SET quantity = stock_actual.quantity + v_cantidad_base, updated_at = NOW();

  v_cantidad_nueva := COALESCE(v_cantidad_anterior, 0) + v_cantidad_base;

  INSERT INTO stock_movements (branch_id, insumo_id, type, quantity, quantity_before, quantity_after, supplier_invoice_id, reason)
  VALUES (v_branch_id, NEW.insumo_id, 'compra', v_cantidad_base, COALESCE(v_cantidad_anterior, 0), v_cantidad_nueva, NEW.invoice_id, 'Compra factura proveedor');

  RETURN NEW;
END;
$$;

-- 3. update_invoice_total
CREATE OR REPLACE FUNCTION public.update_invoice_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  nuevo_subtotal NUMERIC(12,2);
  v_invoice_id UUID;
BEGIN
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

  SELECT COALESCE(SUM(subtotal), 0) INTO nuevo_subtotal
  FROM public.invoice_items
  WHERE invoice_id = v_invoice_id;

  UPDATE public.supplier_invoices
  SET subtotal = nuevo_subtotal,
      total = nuevo_subtotal + COALESCE(iva, 0) + COALESCE(otros_impuestos, 0),
      updated_at = NOW()
  WHERE id = v_invoice_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 4. update_supply_cost_from_purchase
CREATE OR REPLACE FUNCTION public.update_supply_cost_from_purchase()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_costo_anterior DECIMAL(12,4);
  v_costo_nuevo DECIMAL(12,4);
  v_contenido INT;
BEGIN
  IF NEW.insumo_id IS NULL THEN RETURN NEW; END IF;

  SELECT base_unit_cost INTO v_costo_anterior FROM supplies WHERE id = NEW.insumo_id;
  SELECT purchase_unit_content INTO v_contenido FROM supplies WHERE id = NEW.insumo_id;

  IF v_contenido > 0 THEN
    v_costo_nuevo := NEW.unit_price / v_contenido;
  ELSE
    v_costo_nuevo := NEW.unit_price;
  END IF;

  IF v_costo_anterior IS DISTINCT FROM v_costo_nuevo THEN
    UPDATE supplies SET base_unit_cost = v_costo_nuevo, updated_at = now() WHERE id = NEW.insumo_id;
    INSERT INTO supply_cost_history (insumo_id, branch_id, previous_cost, new_cost, invoice_id, reason)
    VALUES (
      NEW.insumo_id,
      (SELECT branch_id FROM supplier_invoices WHERE id = NEW.invoice_id),
      v_costo_anterior,
      v_costo_nuevo,
      NEW.invoice_id,
      'Actualización automática desde compra'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 5. sync_invoice_item_to_rdo
CREATE OR REPLACE FUNCTION public.sync_invoice_item_to_rdo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_branch_id UUID;
  v_period TEXT;
  v_rdo_code TEXT;
  v_deleted TIMESTAMPTZ;
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE rdo_movements SET deleted_at = now()
    WHERE source_table = 'invoice_items' AND source_id = OLD.id AND deleted_at IS NULL;
    RETURN OLD;
  END IF;

  SELECT f.branch_id, f.period, f.deleted_at INTO v_branch_id, v_period, v_deleted
  FROM supplier_invoices f WHERE f.id = NEW.invoice_id;

  IF NEW.insumo_id IS NOT NULL THEN
    SELECT rdo_category_code INTO v_rdo_code FROM supplies WHERE id = NEW.insumo_id;
  ELSIF NEW.service_concept_id IS NOT NULL THEN
    SELECT rdo_category_code INTO v_rdo_code FROM service_concepts WHERE id = NEW.service_concept_id;
  END IF;

  IF v_rdo_code IS NULL THEN v_rdo_code := NEW.pl_category; END IF;

  IF v_rdo_code IS NULL OR v_deleted IS NOT NULL THEN
    UPDATE rdo_movements SET deleted_at = now()
    WHERE source_table = 'invoice_items' AND source_id = NEW.id AND deleted_at IS NULL;
    RETURN NEW;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM rdo_categories WHERE code = v_rdo_code) THEN RETURN NEW; END IF;

  DELETE FROM rdo_movements WHERE source_table = 'invoice_items' AND source_id = NEW.id AND deleted_at IS NULL;

  INSERT INTO rdo_movements (branch_id, period, rdo_category_code, source, amount, source_table, source_id)
  VALUES (v_branch_id, v_period, v_rdo_code, 'compra_directa', NEW.subtotal, 'invoice_items', NEW.id);

  RETURN NEW;
END;
$$;

-- 6. update_invoice_balance (triggers on supplier_payments)
CREATE OR REPLACE FUNCTION public.update_invoice_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_pagado NUMERIC(12,2);
  total_fact NUMERIC(12,2);
  v_invoice_id UUID;
BEGIN
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

  SELECT COALESCE(SUM(amount), 0) INTO total_pagado
  FROM public.supplier_payments
  WHERE invoice_id = v_invoice_id AND deleted_at IS NULL AND is_verified = true;

  SELECT total INTO total_fact
  FROM public.supplier_invoices WHERE id = v_invoice_id;

  UPDATE public.supplier_invoices
  SET pending_balance = total_fact - total_pagado,
      payment_status = CASE WHEN total_fact - total_pagado <= 0 THEN 'pagado' ELSE 'pendiente' END,
      updated_at = NOW()
  WHERE id = v_invoice_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 7. set_canon_payment_unverified (triggers on supplier_payments)
CREATE OR REPLACE FUNCTION public.set_canon_payment_unverified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM supplier_invoices
    WHERE id = NEW.invoice_id
    AND proveedor_id = '00000000-0000-0000-0000-000000000001'
  ) THEN
    NEW.is_verified := false;
  END IF;
  RETURN NEW;
END;
$$;

-- 8. sync_stock_sale_to_rdo (triggers on stock_movements)
CREATE OR REPLACE FUNCTION public.sync_stock_sale_to_rdo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rdo_code TEXT;
  v_periodo TEXT;
  v_costo_unit NUMERIC(12,4);
  v_pl_category TEXT;
  v_monto NUMERIC(12,2);
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE rdo_movements SET deleted_at = now()
    WHERE source_table = 'stock_movements' AND source_id = OLD.id AND deleted_at IS NULL;
    RETURN OLD;
  END IF;

  IF NEW.type <> 'venta' THEN
    UPDATE rdo_movements SET deleted_at = now()
    WHERE source_table = 'stock_movements' AND source_id = NEW.id AND deleted_at IS NULL;
    RETURN NEW;
  END IF;

  SELECT COALESCE(i.rdo_category_code, ''), COALESCE(i.base_unit_cost, 0), COALESCE(i.pl_category, '')
  INTO v_rdo_code, v_costo_unit, v_pl_category
  FROM supplies i WHERE i.id = NEW.insumo_id;

  IF v_rdo_code = '' THEN
    v_rdo_code := CASE v_pl_category
      WHEN 'materia_prima' THEN 'cmv_hamburguesas'
      WHEN 'descartables' THEN 'descartables_salon'
      WHEN 'limpieza' THEN 'limpieza_higiene'
      WHEN 'mantenimiento' THEN 'mantenimiento'
      WHEN 'marketing' THEN 'marketing'
      ELSE 'cmv_hamburguesas'
    END;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM rdo_categories WHERE code = v_rdo_code) THEN
    RETURN NEW;
  END IF;

  v_monto := ROUND(ABS(COALESCE(NEW.quantity, 0)) * COALESCE(v_costo_unit, 0), 2);

  IF v_monto <= 0 THEN
    UPDATE rdo_movements SET deleted_at = now()
    WHERE source_table = 'stock_movements' AND source_id = NEW.id AND deleted_at IS NULL;
    RETURN NEW;
  END IF;

  v_periodo := to_char((COALESCE(NEW.created_at, now()) AT TIME ZONE 'America/Argentina/Cordoba'), 'YYYY-MM');

  DELETE FROM rdo_movements
  WHERE source_table = 'stock_movements' AND source_id = NEW.id AND deleted_at IS NULL;

  INSERT INTO rdo_movements (
    branch_id, period, rdo_category_code, source, amount,
    description, source_table, source_id, created_by
  ) VALUES (
    NEW.branch_id, v_periodo, v_rdo_code, 'consumo_inventario', v_monto,
    COALESCE(NEW.reason, 'Consumo automatico por venta POS'),
    'stock_movements', NEW.id, NEW.created_by
  );

  RETURN NEW;
END;
$$;

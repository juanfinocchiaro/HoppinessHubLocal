-- Fix DB functions that reference old (pre-rename) column names.
-- Columns renamed in earlier migrations:
--   supplies.costo_por_unidad_base  → base_unit_cost
--   supplies.unidad_base            → base_unit
--   recipes.costo_calculado         → calculated_cost
--   recipes.costo_manual            → manual_cost
--   recipes.metodo_costeo           → costing_method
--   recipe_ingredients.orden        → sort_order
--   menu_items.precio_base          → base_price
--   menu_items.costo_total          → total_cost

-- ─── 1. calculate_base_unit_cost ───
CREATE OR REPLACE FUNCTION public.calculate_base_unit_cost()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.purchase_unit_content > 0 AND NEW.purchase_unit_price IS NOT NULL THEN
    NEW.base_unit_cost := NEW.purchase_unit_price / NEW.purchase_unit_content;
  ELSE NEW.base_unit_cost := NULL; END IF;
  RETURN NEW;
END; $function$;

-- ─── 2. calculate_product_margin ───
CREATE OR REPLACE FUNCTION public.calculate_product_margin()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.item_type = 'producto' AND NEW.sale_price IS NOT NULL AND NEW.sale_price > 0 THEN
    NEW.margen_bruto := NEW.sale_price - COALESCE(NEW.base_unit_cost, 0);
    IF NEW.sale_price > 0 THEN NEW.margen_porcentaje := (NEW.margen_bruto / NEW.sale_price) * 100; END IF;
  ELSE NEW.margen_bruto := NULL; NEW.margen_porcentaje := NULL; END IF;
  RETURN NEW;
END; $function$;

-- ─── 3. deduct_order_stock ───
CREATE OR REPLACE FUNCTION public.deduct_order_stock()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
DECLARE v_branch_id UUID; v_composicion RECORD; v_cantidad_descontar DECIMAL(10,3); v_cantidad_anterior DECIMAL(10,3); v_cantidad_nueva DECIMAL(10,3);
BEGIN
  SELECT branch_id INTO v_branch_id FROM orders WHERE id = NEW.pedido_id;
  FOR v_composicion IN SELECT icc.insumo_id, icc.quantity::DECIMAL(10,3) AS cantidad_receta FROM menu_item_compositions icc WHERE icc.item_carta_id = NEW.item_carta_id AND icc.insumo_id IS NOT NULL
  LOOP
    v_cantidad_descontar := v_composicion.cantidad_receta * NEW.quantity;
    INSERT INTO stock_actual (branch_id, insumo_id, cantidad, unidad) SELECT v_branch_id, v_composicion.insumo_id, 0, COALESCE(i.base_unit, 'un') FROM supplies i WHERE i.id = v_composicion.insumo_id ON CONFLICT (branch_id, insumo_id) DO NOTHING;
    SELECT cantidad INTO v_cantidad_anterior FROM stock_actual WHERE branch_id = v_branch_id AND insumo_id = v_composicion.insumo_id;
    v_cantidad_nueva := v_cantidad_anterior - v_cantidad_descontar;
    UPDATE stock_actual SET cantidad = v_cantidad_nueva, updated_at = NOW() WHERE branch_id = v_branch_id AND insumo_id = v_composicion.insumo_id;
    INSERT INTO stock_movimientos (branch_id, insumo_id, type, cantidad, cantidad_anterior, cantidad_nueva, pedido_id) VALUES (v_branch_id, v_composicion.insumo_id, 'venta', -v_cantidad_descontar, v_cantidad_anterior, v_cantidad_nueva, NEW.pedido_id);
  END LOOP;
  RETURN NEW;
END; $function$;

-- ─── 4. update_supply_cost_from_purchase ───
CREATE OR REPLACE FUNCTION public.update_supply_cost_from_purchase()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
DECLARE v_costo_anterior DECIMAL(12,4); v_costo_nuevo DECIMAL(12,4); v_contenido INT;
BEGIN
  IF NEW.insumo_id IS NULL THEN RETURN NEW; END IF;
  SELECT base_unit_cost INTO v_costo_anterior FROM supplies WHERE id = NEW.insumo_id;
  SELECT purchase_unit_content INTO v_contenido FROM supplies WHERE id = NEW.insumo_id;
  IF v_contenido > 0 THEN v_costo_nuevo := NEW.unit_price / v_contenido; ELSE v_costo_nuevo := NEW.unit_price; END IF;
  IF v_costo_anterior IS DISTINCT FROM v_costo_nuevo THEN
    UPDATE supplies SET base_unit_cost = v_costo_nuevo, updated_at = now() WHERE id = NEW.insumo_id;
    INSERT INTO supply_cost_history (insumo_id, branch_id, previous_cost, new_cost, invoice_id, motivo) VALUES (NEW.insumo_id, (SELECT branch_id FROM supplier_invoices WHERE id = NEW.factura_id), v_costo_anterior, v_costo_nuevo, NEW.factura_id, 'Actualización automática desde compra');
  END IF;
  RETURN NEW;
END; $function$;

-- ─── 5. recalculate_menu_item_cost ───
CREATE OR REPLACE FUNCTION public.recalculate_menu_item_cost(_item_id uuid)
 RETURNS void LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
DECLARE v_costo_fijo DECIMAL(12,2) := 0; v_costo_grupos DECIMAL(12,2) := 0; v_costo DECIMAL(12,2) := 0; v_precio DECIMAL(12,2); v_precio_neto DECIMAL(12,2); v_ref_prep_id UUID; v_ref_insumo_id UUID; v_has_composicion BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM menu_item_compositions WHERE item_carta_id = _item_id) INTO v_has_composicion;
  IF v_has_composicion THEN
    SELECT COALESCE(SUM(ic.quantity * COALESCE(p.calculated_cost, i.base_unit_cost, 0)), 0) INTO v_costo_fijo FROM menu_item_compositions ic LEFT JOIN recipes p ON p.id = ic.preparacion_id LEFT JOIN supplies i ON i.id = ic.insumo_id WHERE ic.item_carta_id = _item_id AND ic.quantity > 0;
  ELSE
    SELECT composicion_ref_preparacion_id, composicion_ref_insumo_id INTO v_ref_prep_id, v_ref_insumo_id FROM menu_items WHERE id = _item_id;
    IF v_ref_prep_id IS NOT NULL THEN SELECT COALESCE(calculated_cost, 0) INTO v_costo_fijo FROM recipes WHERE id = v_ref_prep_id;
    ELSIF v_ref_insumo_id IS NOT NULL THEN SELECT COALESCE(base_unit_cost, 0) INTO v_costo_fijo FROM supplies WHERE id = v_ref_insumo_id; END IF;
  END IF;
  SELECT COALESCE(SUM(g.costo_promedio), 0) INTO v_costo_grupos FROM menu_item_option_groups g WHERE g.item_carta_id = _item_id;
  v_costo := v_costo_fijo + v_costo_grupos;
  SELECT base_price INTO v_precio FROM menu_items WHERE id = _item_id;
  v_precio_neto := CASE WHEN v_precio > 0 THEN v_precio / 1.21 ELSE 0 END;
  UPDATE menu_items SET total_cost = v_costo, fc_actual = CASE WHEN v_precio_neto > 0 THEN ROUND((v_costo / v_precio_neto * 100)::numeric, 2) ELSE NULL END WHERE id = _item_id;
END; $function$;

-- ─── 6. recalculate_recipe_cost ───
CREATE OR REPLACE FUNCTION public.recalculate_recipe_cost(_prep_id uuid)
 RETURNS numeric LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
DECLARE v_costo DECIMAL(12,2) := 0; v_tipo TEXT; v_es_inter BOOLEAN; v_metodo TEXT; v_costo_manual DECIMAL(12,2);
BEGIN
  SELECT type, is_interchangeable, costing_method, manual_cost INTO v_tipo, v_es_inter, v_metodo, v_costo_manual FROM recipes WHERE id = _prep_id;
  IF v_tipo = 'elaborado' THEN
    SELECT COALESCE(SUM(pi.quantity * i.base_unit_cost * CASE WHEN pi.unit IN ('kg', 'l') THEN 1000 ELSE 1 END), 0) INTO v_costo FROM recipe_ingredients pi JOIN supplies i ON i.id = pi.insumo_id WHERE pi.preparacion_id = _prep_id AND pi.insumo_id IS NOT NULL;
    v_costo := v_costo + COALESCE((SELECT SUM(pi.quantity * COALESCE(p.calculated_cost, 0)) FROM recipe_ingredients pi JOIN recipes p ON p.id = pi.sub_preparacion_id WHERE pi.preparacion_id = _prep_id AND pi.sub_preparacion_id IS NOT NULL), 0);
  ELSIF v_tipo = 'componente_terminado' THEN
    IF v_costo_manual IS NOT NULL THEN v_costo := v_costo_manual;
    ELSIF v_es_inter THEN
      IF v_metodo = 'mas_caro' THEN SELECT COALESCE(MAX(i.base_unit_cost), 0) INTO v_costo FROM recipe_options po JOIN supplies i ON i.id = po.insumo_id WHERE po.preparacion_id = _prep_id;
      ELSE SELECT COALESCE(AVG(i.base_unit_cost), 0) INTO v_costo FROM recipe_options po JOIN supplies i ON i.id = po.insumo_id WHERE po.preparacion_id = _prep_id; END IF;
    ELSE SELECT COALESCE(i.base_unit_cost, 0) INTO v_costo FROM recipe_ingredients pi JOIN supplies i ON i.id = pi.insumo_id WHERE pi.preparacion_id = _prep_id AND pi.insumo_id IS NOT NULL ORDER BY pi.sort_order LIMIT 1; END IF;
  END IF;
  UPDATE recipes SET calculated_cost = v_costo WHERE id = _prep_id;
  RETURN v_costo;
END; $function$;

-- ─── 7. add_stock_from_purchase ───
CREATE OR REPLACE FUNCTION public.add_stock_from_purchase()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
DECLARE v_branch_id UUID; v_unidad_base TEXT; v_contenido DECIMAL(12,4); v_cantidad_base DECIMAL(10,3); v_cantidad_anterior DECIMAL(10,3); v_cantidad_nueva DECIMAL(10,3);
BEGIN
  IF NEW.insumo_id IS NULL OR (NEW.tipo_item IS NOT NULL AND NEW.tipo_item != 'insumo') THEN RETURN NEW; END IF;
  SELECT f.branch_id INTO v_branch_id FROM supplier_invoices f WHERE f.id = NEW.factura_id AND f.deleted_at IS NULL;
  IF v_branch_id IS NULL THEN RETURN NEW; END IF;
  SELECT i.base_unit, COALESCE(i.purchase_unit_content, 1) INTO v_unidad_base, v_contenido FROM supplies i WHERE i.id = NEW.insumo_id;
  IF v_unidad_base IS NULL THEN v_unidad_base := COALESCE(NEW.unit, 'un'); v_contenido := 1; END IF;
  IF NEW.unit IS NOT NULL AND LOWER(TRIM(NEW.unit)) != LOWER(v_unidad_base) AND v_contenido > 0 THEN v_cantidad_base := NEW.quantity * v_contenido; ELSE v_cantidad_base := NEW.quantity; END IF;
  IF v_cantidad_base <= 0 THEN RETURN NEW; END IF;
  SELECT COALESCE(sa.cantidad, 0) INTO v_cantidad_anterior FROM stock_actual sa WHERE sa.branch_id = v_branch_id AND sa.insumo_id = NEW.insumo_id;
  INSERT INTO stock_actual (branch_id, insumo_id, cantidad, unidad) VALUES (v_branch_id, NEW.insumo_id, v_cantidad_base, v_unidad_base) ON CONFLICT (branch_id, insumo_id) DO UPDATE SET cantidad = stock_actual.cantidad + v_cantidad_base, updated_at = NOW();
  v_cantidad_nueva := COALESCE(v_cantidad_anterior, 0) + v_cantidad_base;
  INSERT INTO stock_movimientos (branch_id, insumo_id, type, cantidad, cantidad_anterior, cantidad_nueva, factura_proveedor_id, motivo) VALUES (v_branch_id, NEW.insumo_id, 'compra', v_cantidad_base, COALESCE(v_cantidad_anterior, 0), v_cantidad_nueva, NEW.factura_id, 'Compra factura proveedor');
  RETURN NEW;
END; $function$;

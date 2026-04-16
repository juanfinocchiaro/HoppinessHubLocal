
-- Fix recalculate_menu_item_cost: add SECURITY DEFINER so UPDATE bypasses RLS
CREATE OR REPLACE FUNCTION public.recalculate_menu_item_cost(_item_id uuid)
RETURNS void LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public AS $$
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
END;
$$;

-- Fix recalculate_recipe_cost: add SECURITY DEFINER so UPDATE bypasses RLS
CREATE OR REPLACE FUNCTION public.recalculate_recipe_cost(_prep_id uuid)
RETURNS DECIMAL LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public AS $$
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
END;
$$;

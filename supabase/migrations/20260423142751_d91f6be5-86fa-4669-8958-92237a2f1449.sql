CREATE OR REPLACE FUNCTION public.recalculate_menu_item_cost(_item_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_costo_fijo DECIMAL(12,2) := 0;
  v_costo_grupos DECIMAL(12,2) := 0;
  v_costo DECIMAL(12,2) := 0;
  v_precio DECIMAL(12,2);
  v_precio_neto DECIMAL(12,2);
  v_ref_prep_id UUID;
  v_ref_insumo_id UUID;
  v_has_composicion BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM menu_item_compositions WHERE item_carta_id = _item_id)
    INTO v_has_composicion;

  IF v_has_composicion THEN
    SELECT COALESCE(SUM(ic.quantity * COALESCE(p.calculated_cost, i.base_unit_cost, 0)), 0)
      INTO v_costo_fijo
      FROM menu_item_compositions ic
      LEFT JOIN recipes p ON p.id = ic.preparacion_id
      LEFT JOIN supplies i ON i.id = ic.insumo_id
     WHERE ic.item_carta_id = _item_id
       AND ic.quantity > 0;
  ELSE
    SELECT composicion_ref_preparacion_id, composicion_ref_insumo_id
      INTO v_ref_prep_id, v_ref_insumo_id
      FROM menu_items
     WHERE id = _item_id;

    IF v_ref_prep_id IS NOT NULL THEN
      SELECT COALESCE(calculated_cost, 0) INTO v_costo_fijo
        FROM recipes WHERE id = v_ref_prep_id;
    ELSIF v_ref_insumo_id IS NOT NULL THEN
      SELECT COALESCE(base_unit_cost, 0) INTO v_costo_fijo
        FROM supplies WHERE id = v_ref_insumo_id;
    END IF;
  END IF;

  -- FIX: la columna ahora se llama average_cost (antes costo_promedio)
  SELECT COALESCE(SUM(g.average_cost), 0)
    INTO v_costo_grupos
    FROM menu_item_option_groups g
   WHERE g.item_carta_id = _item_id;

  v_costo := v_costo_fijo + v_costo_grupos;

  SELECT base_price INTO v_precio FROM menu_items WHERE id = _item_id;
  v_precio_neto := CASE WHEN v_precio > 0 THEN v_precio / 1.21 ELSE 0 END;

  UPDATE menu_items
     SET total_cost = v_costo,
         fc_actual  = CASE WHEN v_precio_neto > 0
                           THEN ROUND((v_costo / v_precio_neto * 100)::numeric, 2)
                           ELSE NULL END
   WHERE id = _item_id;
END;
$function$;
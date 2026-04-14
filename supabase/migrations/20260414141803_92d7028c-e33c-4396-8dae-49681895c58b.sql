
CREATE OR REPLACE FUNCTION public.reverse_stock_on_order_cancel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mov RECORD;
  v_prev NUMERIC(12,3);
  v_new NUMERIC(12,3);
  v_unidad TEXT;
  v_qty_restore NUMERIC(12,3);
BEGIN
  IF NEW.status <> 'cancelado' OR COALESCE(OLD.status, '') = 'cancelado' THEN
    RETURN NEW;
  END IF;

  FOR v_mov IN
    SELECT id, supply_id, quantity
    FROM stock_movements
    WHERE order_id = NEW.id
      AND movement_type = 'venta'
  LOOP
    v_qty_restore := ABS(COALESCE(v_mov.quantity, 0));
    IF v_qty_restore <= 0 THEN
      CONTINUE;
    END IF;

    SELECT current_quantity INTO v_prev
    FROM current_stock
    WHERE branch_id = NEW.branch_id
      AND supply_id = v_mov.supply_id;

    IF v_prev IS NULL THEN
      SELECT COALESCE(base_unit, 'un') INTO v_unidad
      FROM supplies
      WHERE id = v_mov.supply_id;

      INSERT INTO current_stock (branch_id, supply_id, current_quantity, unit)
      VALUES (NEW.branch_id, v_mov.supply_id, v_qty_restore, COALESCE(v_unidad, 'un'))
      ON CONFLICT (branch_id, supply_id) DO UPDATE
      SET current_quantity = current_stock.current_quantity + EXCLUDED.current_quantity,
          updated_at = now();

      v_prev := 0;
      v_new := v_qty_restore;
    ELSE
      v_new := v_prev + v_qty_restore;
      UPDATE current_stock
      SET current_quantity = v_new,
          updated_at = now()
      WHERE branch_id = NEW.branch_id
        AND supply_id = v_mov.supply_id;
    END IF;

    INSERT INTO stock_movements (
      branch_id,
      supply_id,
      movement_type,
      quantity,
      previous_quantity,
      new_quantity,
      order_id,
      reason
    ) VALUES (
      NEW.branch_id,
      v_mov.supply_id,
      'ajuste',
      v_qty_restore,
      v_prev,
      v_new,
      NEW.id,
      'Reversion por cancelacion de pedido'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

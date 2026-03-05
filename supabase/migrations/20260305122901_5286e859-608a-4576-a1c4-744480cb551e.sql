
-- =====================================================
-- MIGRATION C: Rename ~25 DB functions to English
-- For functions used in RLS policies, keep old as alias
-- =====================================================

-- ─── 1. actualizar_saldo_factura → update_invoice_balance ───
CREATE OR REPLACE FUNCTION public.update_invoice_balance()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  total_pagado NUMERIC(12,2); total_fact NUMERIC(12,2); v_factura_id UUID;
BEGIN
  v_factura_id := COALESCE(NEW.factura_id, OLD.factura_id);
  SELECT COALESCE(SUM(amount), 0) INTO total_pagado FROM public.supplier_payments WHERE factura_id = v_factura_id AND deleted_at IS NULL AND is_verified = true;
  SELECT total INTO total_fact FROM public.supplier_invoices WHERE id = v_factura_id;
  UPDATE public.supplier_invoices SET pending_balance = total_fact - total_pagado, payment_status = CASE WHEN total_fact - total_pagado <= 0 THEN 'pagado' ELSE 'pendiente' END, updated_at = NOW() WHERE id = v_factura_id;
  RETURN COALESCE(NEW, OLD);
END; $function$;
DROP TRIGGER IF EXISTS trg_actualizar_saldo ON public.supplier_payments;
CREATE TRIGGER trg_update_invoice_balance AFTER INSERT OR UPDATE OR DELETE ON public.supplier_payments FOR EACH ROW EXECUTE FUNCTION public.update_invoice_balance();
DROP FUNCTION IF EXISTS public.actualizar_saldo_factura() CASCADE;

-- ─── 2. actualizar_total_factura → update_invoice_total ───
CREATE OR REPLACE FUNCTION public.update_invoice_total()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE nuevo_subtotal NUMERIC(12,2); v_factura_id UUID;
BEGIN
  v_factura_id := COALESCE(NEW.factura_id, OLD.factura_id);
  SELECT COALESCE(SUM(subtotal), 0) INTO nuevo_subtotal FROM public.invoice_items WHERE factura_id = v_factura_id;
  UPDATE public.supplier_invoices SET subtotal = nuevo_subtotal, total = nuevo_subtotal + COALESCE(iva, 0) + COALESCE(otros_impuestos, 0), updated_at = NOW() WHERE id = v_factura_id;
  RETURN COALESCE(NEW, OLD);
END; $function$;
DROP TRIGGER IF EXISTS update_total_after_item_change ON public.invoice_items;
CREATE TRIGGER trg_update_invoice_total AFTER INSERT OR UPDATE OR DELETE ON public.invoice_items FOR EACH ROW EXECUTE FUNCTION public.update_invoice_total();
DROP FUNCTION IF EXISTS public.actualizar_total_factura() CASCADE;

-- ─── 3. asignar_llamador → assign_pager ───
CREATE OR REPLACE FUNCTION public.assign_pager(p_branch_id uuid, p_pedido_id uuid)
 RETURNS integer LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
DECLARE v_numero INTEGER;
BEGIN
  SELECT numero INTO v_numero FROM pagers WHERE branch_id = p_branch_id AND en_uso = FALSE ORDER BY numero LIMIT 1 FOR UPDATE SKIP LOCKED;
  IF v_numero IS NULL THEN RETURN NULL; END IF;
  UPDATE pagers SET en_uso = TRUE, pedido_id = p_pedido_id, asignado_at = NOW() WHERE branch_id = p_branch_id AND numero = v_numero;
  RETURN v_numero;
END; $function$;
DROP FUNCTION IF EXISTS public.asignar_llamador(uuid, uuid);

-- ─── 4. calcular_costo_real_factura → calculate_real_invoice_cost ───
CREATE OR REPLACE FUNCTION public.calculate_real_invoice_cost()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  NEW.costo_real := COALESCE(NEW.subtotal_neto, NEW.subtotal, 0) + COALESCE(NEW.imp_internos, 0) + COALESCE(NEW.perc_provincial, 0) + COALESCE(NEW.perc_municipal, 0);
  RETURN NEW;
END; $function$;
DROP TRIGGER IF EXISTS trg_calcular_costo_real ON public.supplier_invoices;
CREATE TRIGGER trg_calculate_real_invoice_cost BEFORE INSERT OR UPDATE ON public.supplier_invoices FOR EACH ROW EXECUTE FUNCTION public.calculate_real_invoice_cost();
DROP FUNCTION IF EXISTS public.calcular_costo_real_factura() CASCADE;

-- ─── 5. calcular_costo_unidad_base → calculate_base_unit_cost ───
CREATE OR REPLACE FUNCTION public.calculate_base_unit_cost()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.purchase_unit_content > 0 AND NEW.purchase_unit_price IS NOT NULL THEN
    NEW.costo_por_unidad_base := NEW.purchase_unit_price / NEW.purchase_unit_content;
  ELSE NEW.costo_por_unidad_base := NULL; END IF;
  RETURN NEW;
END; $function$;
DROP TRIGGER IF EXISTS trg_calcular_costo_unidad ON public.supplies;
CREATE TRIGGER trg_calculate_base_unit_cost BEFORE INSERT OR UPDATE ON public.supplies FOR EACH ROW EXECUTE FUNCTION public.calculate_base_unit_cost();
DROP FUNCTION IF EXISTS public.calcular_costo_unidad_base() CASCADE;

-- ─── 6. calcular_margen_producto → calculate_product_margin ───
CREATE OR REPLACE FUNCTION public.calculate_product_margin()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.item_type = 'producto' AND NEW.sale_price IS NOT NULL AND NEW.sale_price > 0 THEN
    NEW.margen_bruto := NEW.sale_price - COALESCE(NEW.costo_por_unidad_base, 0);
    IF NEW.sale_price > 0 THEN NEW.margen_porcentaje := (NEW.margen_bruto / NEW.sale_price) * 100; END IF;
  ELSE NEW.margen_bruto := NULL; NEW.margen_porcentaje := NULL; END IF;
  RETURN NEW;
END; $function$;
DROP TRIGGER IF EXISTS trg_calcular_margen ON public.supplies;
CREATE TRIGGER trg_calculate_product_margin BEFORE INSERT OR UPDATE ON public.supplies FOR EACH ROW EXECUTE FUNCTION public.calculate_product_margin();
DROP FUNCTION IF EXISTS public.calcular_margen_producto() CASCADE;

-- ─── 7. calcular_saldo_socio → calculate_partner_balance ───
CREATE OR REPLACE FUNCTION public.calculate_partner_balance()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
DECLARE saldo_anterior NUMERIC(12,2);
BEGIN
  SELECT COALESCE(cumulative_balance, 0) INTO saldo_anterior FROM partner_movements
  WHERE socio_id = NEW.socio_id AND deleted_at IS NULL AND (date < NEW.date OR (date = NEW.date AND created_at < NEW.created_at))
  ORDER BY date DESC, created_at DESC LIMIT 1;
  IF saldo_anterior IS NULL THEN saldo_anterior = 0; END IF;
  NEW.cumulative_balance = saldo_anterior + NEW.amount;
  RETURN NEW;
END; $function$;
DROP TRIGGER IF EXISTS calc_saldo_socio ON public.partner_movements;
CREATE TRIGGER trg_calculate_partner_balance BEFORE INSERT ON public.partner_movements FOR EACH ROW EXECUTE FUNCTION public.calculate_partner_balance();
DROP FUNCTION IF EXISTS public.calcular_saldo_socio() CASCADE;

-- ─── 8. check_porcentajes_suman_100 → check_percentages_sum_100 ───
CREATE OR REPLACE FUNCTION public.check_percentages_sum_100()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
DECLARE total_porcentaje NUMERIC(5,2);
BEGIN
  SELECT SUM(porcentaje_participacion) INTO total_porcentaje FROM partners WHERE branch_id = NEW.branch_id AND is_active = TRUE AND deleted_at IS NULL;
  IF total_porcentaje IS NOT NULL AND total_porcentaje > 100 THEN RAISE EXCEPTION 'La suma de participaciones supera 100%% (actual: %)', total_porcentaje; END IF;
  RETURN NEW;
END; $function$;
DROP TRIGGER IF EXISTS trg_check_porcentajes ON public.partners;
CREATE TRIGGER trg_check_percentages_sum_100 AFTER INSERT OR UPDATE ON public.partners FOR EACH ROW EXECUTE FUNCTION public.check_percentages_sum_100();
DROP FUNCTION IF EXISTS public.check_porcentajes_suman_100() CASCADE;

-- ─── 9. descontar_stock_pedido → deduct_order_stock ───
CREATE OR REPLACE FUNCTION public.deduct_order_stock()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
DECLARE v_branch_id UUID; v_composicion RECORD; v_cantidad_descontar DECIMAL(10,3); v_cantidad_anterior DECIMAL(10,3); v_cantidad_nueva DECIMAL(10,3);
BEGIN
  SELECT branch_id INTO v_branch_id FROM orders WHERE id = NEW.pedido_id;
  FOR v_composicion IN SELECT icc.insumo_id, icc.quantity::DECIMAL(10,3) AS cantidad_receta FROM menu_item_compositions icc WHERE icc.item_carta_id = NEW.item_carta_id AND icc.insumo_id IS NOT NULL
  LOOP
    v_cantidad_descontar := v_composicion.cantidad_receta * NEW.quantity;
    INSERT INTO stock_actual (branch_id, insumo_id, cantidad, unidad) SELECT v_branch_id, v_composicion.insumo_id, 0, COALESCE(i.unidad_base, 'un') FROM supplies i WHERE i.id = v_composicion.insumo_id ON CONFLICT (branch_id, insumo_id) DO NOTHING;
    SELECT cantidad INTO v_cantidad_anterior FROM stock_actual WHERE branch_id = v_branch_id AND insumo_id = v_composicion.insumo_id;
    v_cantidad_nueva := v_cantidad_anterior - v_cantidad_descontar;
    UPDATE stock_actual SET cantidad = v_cantidad_nueva, updated_at = NOW() WHERE branch_id = v_branch_id AND insumo_id = v_composicion.insumo_id;
    INSERT INTO stock_movimientos (branch_id, insumo_id, type, cantidad, cantidad_anterior, cantidad_nueva, pedido_id) VALUES (v_branch_id, v_composicion.insumo_id, 'venta', -v_cantidad_descontar, v_cantidad_anterior, v_cantidad_nueva, NEW.pedido_id);
  END LOOP;
  RETURN NEW;
END; $function$;
DROP TRIGGER IF EXISTS trg_descontar_stock ON public.order_items;
CREATE TRIGGER trg_deduct_order_stock AFTER INSERT ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.deduct_order_stock();
DROP FUNCTION IF EXISTS public.descontar_stock_pedido() CASCADE;

-- ─── 10. fn_actualizar_costo_insumo_desde_compra → update_supply_cost_from_purchase ───
CREATE OR REPLACE FUNCTION public.update_supply_cost_from_purchase()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
DECLARE v_costo_anterior DECIMAL(12,4); v_costo_nuevo DECIMAL(12,4); v_contenido INT;
BEGIN
  IF NEW.insumo_id IS NULL THEN RETURN NEW; END IF;
  SELECT costo_por_unidad_base INTO v_costo_anterior FROM supplies WHERE id = NEW.insumo_id;
  SELECT purchase_unit_content INTO v_contenido FROM supplies WHERE id = NEW.insumo_id;
  IF v_contenido > 0 THEN v_costo_nuevo := NEW.unit_price / v_contenido; ELSE v_costo_nuevo := NEW.unit_price; END IF;
  IF v_costo_anterior IS DISTINCT FROM v_costo_nuevo THEN
    UPDATE supplies SET costo_por_unidad_base = v_costo_nuevo, updated_at = now() WHERE id = NEW.insumo_id;
    INSERT INTO supply_cost_history (insumo_id, branch_id, previous_cost, new_cost, invoice_id, motivo) VALUES (NEW.insumo_id, (SELECT branch_id FROM supplier_invoices WHERE id = NEW.factura_id), v_costo_anterior, v_costo_nuevo, NEW.factura_id, 'Actualización automática desde compra');
  END IF;
  RETURN NEW;
END; $function$;
DROP TRIGGER IF EXISTS trg_actualizar_costo_insumo ON public.invoice_items;
CREATE TRIGGER trg_update_supply_cost_from_purchase AFTER INSERT ON public.invoice_items FOR EACH ROW EXECUTE FUNCTION public.update_supply_cost_from_purchase();
DROP FUNCTION IF EXISTS public.fn_actualizar_costo_insumo_desde_compra() CASCADE;

-- ─── 11. generar_factura_canon → generate_canon_invoice ───
CREATE OR REPLACE FUNCTION public.generate_canon_invoice()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE canon_monto NUMERIC(12,2); marketing_monto NUMERIC(12,2); total_canon NUMERIC(12,2); v_factura_id UUID; v_branch_code TEXT; v_vt NUMERIC(12,2); v_ef NUMERIC(12,2); v_online NUMERIC(12,2); v_factura_numero VARCHAR(50); v_fecha_emision DATE;
BEGIN
  v_vt := COALESCE(NEW.total_sales, 0); v_ef := COALESCE(NEW.cash, 0); v_online := v_vt - v_ef;
  IF v_vt <= 0 THEN RETURN NEW; END IF;
  canon_monto := v_vt * 0.045; marketing_monto := v_vt * 0.005; total_canon := canon_monto + marketing_monto;
  v_fecha_emision := (DATE_TRUNC('month', (NEW.period || '-01')::date) + INTERVAL '1 month')::date;
  SELECT COALESCE(slug, LEFT(id::text, 4)) INTO v_branch_code FROM branches WHERE id = NEW.branch_id;
  v_factura_numero := 'CANON-' || NEW.period || '-' || UPPER(COALESCE(v_branch_code, 'XX'));
  DELETE FROM public.supplier_invoices WHERE proveedor_id = '00000000-0000-0000-0000-000000000001' AND branch_id = NEW.branch_id AND period = NEW.period;
  INSERT INTO public.supplier_invoices (id, branch_id, proveedor_id, factura_tipo, factura_numero, invoice_date, subtotal, total, condicion_pago, due_date, payment_status, pending_balance, period, type, notes)
  VALUES (gen_random_uuid(), NEW.branch_id, '00000000-0000-0000-0000-000000000001', 'C', v_factura_numero, v_fecha_emision, total_canon, total_canon, 'cuenta_corriente', v_fecha_emision, 'pendiente', total_canon, NEW.period, 'normal', 'Canon 4.5%: $' || ROUND(canon_monto) || ' | Mktg 0.5%: $' || ROUND(marketing_monto) || ' | VT: $' || ROUND(v_vt) || ' | Ef: $' || ROUND(v_ef) || ' | Online: $' || ROUND(v_online))
  RETURNING id INTO v_factura_id;
  INSERT INTO public.invoice_items (factura_id, insumo_id, quantity, unit, unit_price, subtotal, categoria_pl) VALUES
    (v_factura_id, '00000000-0000-0000-0000-000000000011', 1, 'servicio', canon_monto, canon_monto, 'publicidad_marca'),
    (v_factura_id, '00000000-0000-0000-0000-000000000012', 1, 'servicio', marketing_monto, marketing_monto, 'publicidad_marca');
  RETURN NEW;
END; $function$;
DROP TRIGGER IF EXISTS trg_generar_factura_canon ON public.branch_monthly_sales;
DROP TRIGGER IF EXISTS trigger_generar_factura_canon ON public.branch_monthly_sales;
CREATE TRIGGER trg_generate_canon_invoice AFTER INSERT OR UPDATE ON public.branch_monthly_sales FOR EACH ROW EXECUTE FUNCTION public.generate_canon_invoice();
DROP FUNCTION IF EXISTS public.generar_factura_canon() CASCADE;

-- ─── 12. generar_numero_pedido → generate_order_number ───
CREATE OR REPLACE FUNCTION public.generate_order_number(p_branch_id uuid)
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_numero INTEGER;
BEGIN
  SELECT COALESCE(MAX(numero_pedido), 0) + 1 INTO v_numero FROM orders WHERE branch_id = p_branch_id;
  RETURN v_numero;
END; $function$;
DROP FUNCTION IF EXISTS public.generar_numero_pedido(uuid);

-- ─── 13. generar_shift_closure_desde_pos → generate_shift_closure_from_pos ───
CREATE OR REPLACE FUNCTION public.generate_shift_closure_from_pos(p_branch_id uuid, p_fecha date, p_turno text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_closure_id UUID; v_cerrado_por UUID := auth.uid();
BEGIN
  IF NOT (public.has_branch_access_v2(v_cerrado_por, p_branch_id) OR public.is_superadmin(v_cerrado_por)) THEN RAISE EXCEPTION 'No tienes acceso a esta sucursal'; END IF;
  IF p_turno NOT IN ('mañana', 'mediodía', 'noche', 'trasnoche') THEN RAISE EXCEPTION 'Turno inválido'; END IF;
  INSERT INTO shift_closures (branch_id, fecha, turno, hamburguesas, ventas_local, ventas_apps, total_hamburguesas, total_vendido, total_efectivo, total_digital, facturacion_esperada, facturacion_diferencia, total_facturado, cerrado_por, fuente)
  SELECT p_branch_id, p_fecha, p_turno, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 0, 0, 0, 0, 0, 0, 0, v_cerrado_por, 'pos'
  WHERE NOT EXISTS (SELECT 1 FROM shift_closures WHERE branch_id = p_branch_id AND fecha = p_fecha AND turno = p_turno)
  RETURNING id INTO v_closure_id;
  IF v_closure_id IS NULL THEN SELECT id INTO v_closure_id FROM shift_closures WHERE branch_id = p_branch_id AND fecha = p_fecha AND turno = p_turno; END IF;
  RETURN v_closure_id;
END; $function$;
DROP FUNCTION IF EXISTS public.generar_shift_closure_desde_pos(uuid, date, text);

-- ─── 14. insert_factura_completa → insert_complete_invoice ───
CREATE OR REPLACE FUNCTION public.insert_complete_invoice(p_factura jsonb, p_items jsonb)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_factura_id uuid; v_item jsonb;
BEGIN
  INSERT INTO supplier_invoices (branch_id, proveedor_id, factura_tipo, factura_numero, invoice_date, subtotal, iva, otros_impuestos, total, condicion_pago, due_date, payment_status, pending_balance, type, motivo_extraordinaria, period, notes, created_by, subtotal_bruto, total_descuentos, subtotal_neto, imp_internos, iva_21, iva_105, perc_iva, perc_provincial, perc_municipal, invoice_total)
  SELECT (p_factura->>'branch_id')::uuid, (p_factura->>'proveedor_id')::uuid, p_factura->>'factura_tipo', p_factura->>'factura_numero', (p_factura->>'invoice_date')::date, (p_factura->>'subtotal')::numeric, COALESCE((p_factura->>'iva')::numeric, 0), COALESCE((p_factura->>'otros_impuestos')::numeric, 0), (p_factura->>'total')::numeric, p_factura->>'condicion_pago', (p_factura->>'due_date')::date, p_factura->>'payment_status', (p_factura->>'pending_balance')::numeric, COALESCE(p_factura->>'type', 'normal'), p_factura->>'motivo_extraordinaria', p_factura->>'period', p_factura->>'notes', (p_factura->>'created_by')::uuid, (p_factura->>'subtotal_bruto')::numeric, COALESCE((p_factura->>'total_descuentos')::numeric, 0), (p_factura->>'subtotal_neto')::numeric, COALESCE((p_factura->>'imp_internos')::numeric, 0), COALESCE((p_factura->>'iva_21')::numeric, 0), COALESCE((p_factura->>'iva_105')::numeric, 0), COALESCE((p_factura->>'perc_iva')::numeric, 0), COALESCE((p_factura->>'perc_provincial')::numeric, 0), COALESCE((p_factura->>'perc_municipal')::numeric, 0), (p_factura->>'invoice_total')::numeric
  RETURNING id INTO v_factura_id;
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO invoice_items (factura_id, tipo_item, insumo_id, concepto_servicio_id, quantity, unit, unit_price, subtotal, afecta_costo_base, categoria_pl, alicuota_iva, iva_monto, precio_unitario_bruto)
    VALUES (v_factura_id, COALESCE(v_item->>'tipo_item', 'insumo'), (v_item->>'insumo_id')::uuid, (v_item->>'concepto_servicio_id')::uuid, (v_item->>'quantity')::numeric, v_item->>'unit', (v_item->>'unit_price')::numeric, (v_item->>'subtotal')::numeric, COALESCE((v_item->>'afecta_costo_base')::boolean, true), v_item->>'categoria_pl', (v_item->>'alicuota_iva')::numeric, (v_item->>'iva_monto')::numeric, (v_item->>'precio_unitario_bruto')::numeric);
  END LOOP;
  RETURN v_factura_id;
END; $function$;
DROP FUNCTION IF EXISTS public.insert_factura_completa(jsonb, jsonb);

-- ─── 15. is_franquiciado_or_contador_for_branch: keep old for RLS, create English alias ───
CREATE OR REPLACE FUNCTION public.is_franchisee_or_accountant_for_branch(p_user_id uuid, p_branch_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT public.is_franquiciado_or_contador_for_branch(p_user_id, p_branch_id)
$function$;
-- DO NOT drop is_franquiciado_or_contador_for_branch — used in RLS policies

-- ─── 16. is_socio_admin: keep old for RLS, create English alias ───
CREATE OR REPLACE FUNCTION public.is_partner_admin(_user_id uuid, _branch_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT public.is_socio_admin(_user_id, _branch_id)
$function$;
-- DO NOT drop is_socio_admin — may be used in RLS policies

-- ─── 17. liberar_llamador → release_pager ───
CREATE OR REPLACE FUNCTION public.release_pager(p_pedido_id uuid)
 RETURNS void LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN UPDATE pagers SET en_uso = FALSE, pedido_id = NULL, asignado_at = NULL WHERE pedido_id = p_pedido_id; END; $function$;
DROP FUNCTION IF EXISTS public.liberar_llamador(uuid);

-- ─── 18. obtener_proximo_numero_factura → get_next_invoice_number ───
CREATE OR REPLACE FUNCTION public.get_next_invoice_number(_branch_id uuid, _tipo text)
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_campo TEXT; v_numero INTEGER;
BEGIN
  IF lower(_tipo) NOT IN ('a', 'b', 'c') THEN RAISE EXCEPTION 'Tipo de factura inválido: %', _tipo; END IF;
  v_campo := 'ultimo_nro_factura_' || lower(_tipo);
  EXECUTE format('UPDATE afip_config SET %I = COALESCE(%I, 0) + 1 WHERE branch_id = $1 RETURNING %I', v_campo, v_campo, v_campo) INTO v_numero USING _branch_id;
  IF v_numero IS NULL THEN RAISE EXCEPTION 'No se encontró configuración ARCA para branch_id: %', _branch_id; END IF;
  RETURN v_numero;
END; $function$;
DROP FUNCTION IF EXISTS public.obtener_proximo_numero_factura(uuid, text);

-- ─── 19. procesar_distribucion_utilidades → process_profit_distribution ───
CREATE OR REPLACE FUNCTION public.process_profit_distribution()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE dist JSONB;
BEGIN
  IF NEW.procesado = TRUE AND OLD.procesado = FALSE THEN
    FOR dist IN SELECT * FROM jsonb_array_elements(NEW.distribuciones) LOOP
      INSERT INTO partner_movements (socio_id, branch_id, type, date, amount, period, resultado_periodo, detalle, created_by)
      VALUES ((dist->>'socio_id')::UUID, NEW.branch_id, 'distribucion_utilidades', NEW.fecha_distribucion, (dist->>'monto')::NUMERIC, NEW.period, NEW.resultado_neto, jsonb_build_object('porcentaje', dist->>'porcentaje', 'reserva_legal', NEW.reserva_legal, 'monto_distribuible', NEW.distributable_amount), NEW.created_by);
    END LOOP;
    NEW.fecha_proceso = NOW();
  END IF;
  RETURN NEW;
END; $function$;
DROP TRIGGER IF EXISTS trg_procesar_distribucion ON public.profit_distributions;
CREATE TRIGGER trg_process_profit_distribution BEFORE UPDATE ON public.profit_distributions FOR EACH ROW EXECUTE FUNCTION public.process_profit_distribution();
DROP FUNCTION IF EXISTS public.procesar_distribucion_utilidades() CASCADE;

-- ─── 20. recalcular_costo_item_carta → recalculate_menu_item_cost ───
CREATE OR REPLACE FUNCTION public.recalculate_menu_item_cost(_item_id uuid)
 RETURNS void LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
DECLARE v_costo_fijo DECIMAL(12,2) := 0; v_costo_grupos DECIMAL(12,2) := 0; v_costo DECIMAL(12,2) := 0; v_precio DECIMAL(12,2); v_precio_neto DECIMAL(12,2); v_ref_prep_id UUID; v_ref_insumo_id UUID; v_has_composicion BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM menu_item_compositions WHERE item_carta_id = _item_id) INTO v_has_composicion;
  IF v_has_composicion THEN
    SELECT COALESCE(SUM(ic.quantity * COALESCE(p.costo_calculado, i.costo_por_unidad_base, 0)), 0) INTO v_costo_fijo FROM menu_item_compositions ic LEFT JOIN recipes p ON p.id = ic.preparacion_id LEFT JOIN supplies i ON i.id = ic.insumo_id WHERE ic.item_carta_id = _item_id AND ic.quantity > 0;
  ELSE
    SELECT composicion_ref_preparacion_id, composicion_ref_insumo_id INTO v_ref_prep_id, v_ref_insumo_id FROM menu_items WHERE id = _item_id;
    IF v_ref_prep_id IS NOT NULL THEN SELECT COALESCE(costo_calculado, 0) INTO v_costo_fijo FROM recipes WHERE id = v_ref_prep_id;
    ELSIF v_ref_insumo_id IS NOT NULL THEN SELECT COALESCE(costo_por_unidad_base, 0) INTO v_costo_fijo FROM supplies WHERE id = v_ref_insumo_id; END IF;
  END IF;
  SELECT COALESCE(SUM(g.costo_promedio), 0) INTO v_costo_grupos FROM menu_item_option_groups g WHERE g.item_carta_id = _item_id;
  v_costo := v_costo_fijo + v_costo_grupos;
  SELECT precio_base INTO v_precio FROM menu_items WHERE id = _item_id;
  v_precio_neto := CASE WHEN v_precio > 0 THEN v_precio / 1.21 ELSE 0 END;
  UPDATE menu_items SET costo_total = v_costo, fc_actual = CASE WHEN v_precio_neto > 0 THEN ROUND((v_costo / v_precio_neto * 100)::numeric, 2) ELSE NULL END WHERE id = _item_id;
END; $function$;
DROP FUNCTION IF EXISTS public.recalcular_costo_item_carta(uuid);

-- ─── 21. recalcular_costo_preparacion → recalculate_recipe_cost ───
CREATE OR REPLACE FUNCTION public.recalculate_recipe_cost(_prep_id uuid)
 RETURNS numeric LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
DECLARE v_costo DECIMAL(12,2) := 0; v_tipo TEXT; v_es_inter BOOLEAN; v_metodo TEXT; v_costo_manual DECIMAL(12,2);
BEGIN
  SELECT type, is_interchangeable, metodo_costeo, costo_manual INTO v_tipo, v_es_inter, v_metodo, v_costo_manual FROM recipes WHERE id = _prep_id;
  IF v_tipo = 'elaborado' THEN
    SELECT COALESCE(SUM(pi.quantity * i.costo_por_unidad_base * CASE WHEN pi.unit IN ('kg', 'l') THEN 1000 ELSE 1 END), 0) INTO v_costo FROM recipe_ingredients pi JOIN supplies i ON i.id = pi.insumo_id WHERE pi.preparacion_id = _prep_id AND pi.insumo_id IS NOT NULL;
    v_costo := v_costo + COALESCE((SELECT SUM(pi.quantity * COALESCE(p.costo_calculado, 0)) FROM recipe_ingredients pi JOIN recipes p ON p.id = pi.sub_preparacion_id WHERE pi.preparacion_id = _prep_id AND pi.sub_preparacion_id IS NOT NULL), 0);
  ELSIF v_tipo = 'componente_terminado' THEN
    IF v_costo_manual IS NOT NULL THEN v_costo := v_costo_manual;
    ELSIF v_es_inter THEN
      IF v_metodo = 'mas_caro' THEN SELECT COALESCE(MAX(i.costo_por_unidad_base), 0) INTO v_costo FROM recipe_options po JOIN supplies i ON i.id = po.insumo_id WHERE po.preparacion_id = _prep_id;
      ELSE SELECT COALESCE(AVG(i.costo_por_unidad_base), 0) INTO v_costo FROM recipe_options po JOIN supplies i ON i.id = po.insumo_id WHERE po.preparacion_id = _prep_id; END IF;
    ELSE SELECT COALESCE(i.costo_por_unidad_base, 0) INTO v_costo FROM recipe_ingredients pi JOIN supplies i ON i.id = pi.insumo_id WHERE pi.preparacion_id = _prep_id AND pi.insumo_id IS NOT NULL ORDER BY pi.orden LIMIT 1; END IF;
  END IF;
  UPDATE recipes SET costo_calculado = v_costo WHERE id = _prep_id;
  RETURN v_costo;
END; $function$;
DROP FUNCTION IF EXISTS public.recalcular_costo_preparacion(uuid);

-- ─── 22. recalcular_todos_los_costos → recalculate_all_costs ───
CREATE OR REPLACE FUNCTION public.recalculate_all_costs()
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM recipes WHERE deleted_at IS NULL LOOP PERFORM recalculate_recipe_cost(r.id); END LOOP;
  FOR r IN SELECT id FROM menu_items WHERE deleted_at IS NULL AND is_active = true LOOP PERFORM recalculate_menu_item_cost(r.id); END LOOP;
END; $function$;
DROP FUNCTION IF EXISTS public.recalcular_todos_los_costos();

-- ─── 23. sumar_stock_desde_compra → add_stock_from_purchase ───
CREATE OR REPLACE FUNCTION public.add_stock_from_purchase()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
DECLARE v_branch_id UUID; v_unidad_base TEXT; v_contenido DECIMAL(12,4); v_cantidad_base DECIMAL(10,3); v_cantidad_anterior DECIMAL(10,3); v_cantidad_nueva DECIMAL(10,3);
BEGIN
  IF NEW.insumo_id IS NULL OR (NEW.tipo_item IS NOT NULL AND NEW.tipo_item != 'insumo') THEN RETURN NEW; END IF;
  SELECT f.branch_id INTO v_branch_id FROM supplier_invoices f WHERE f.id = NEW.factura_id AND f.deleted_at IS NULL;
  IF v_branch_id IS NULL THEN RETURN NEW; END IF;
  SELECT i.unidad_base, COALESCE(i.purchase_unit_content, 1) INTO v_unidad_base, v_contenido FROM supplies i WHERE i.id = NEW.insumo_id;
  IF v_unidad_base IS NULL THEN v_unidad_base := COALESCE(NEW.unit, 'un'); v_contenido := 1; END IF;
  IF NEW.unit IS NOT NULL AND LOWER(TRIM(NEW.unit)) != LOWER(v_unidad_base) AND v_contenido > 0 THEN v_cantidad_base := NEW.quantity * v_contenido; ELSE v_cantidad_base := NEW.quantity; END IF;
  IF v_cantidad_base <= 0 THEN RETURN NEW; END IF;
  SELECT COALESCE(sa.cantidad, 0) INTO v_cantidad_anterior FROM stock_actual sa WHERE sa.branch_id = v_branch_id AND sa.insumo_id = NEW.insumo_id;
  INSERT INTO stock_actual (branch_id, insumo_id, cantidad, unidad) VALUES (v_branch_id, NEW.insumo_id, v_cantidad_base, v_unidad_base) ON CONFLICT (branch_id, insumo_id) DO UPDATE SET cantidad = stock_actual.cantidad + v_cantidad_base, updated_at = NOW();
  v_cantidad_nueva := COALESCE(v_cantidad_anterior, 0) + v_cantidad_base;
  INSERT INTO stock_movimientos (branch_id, insumo_id, type, cantidad, cantidad_anterior, cantidad_nueva, factura_proveedor_id, motivo) VALUES (v_branch_id, NEW.insumo_id, 'compra', v_cantidad_base, COALESCE(v_cantidad_anterior, 0), v_cantidad_nueva, NEW.factura_id, 'Compra factura proveedor');
  RETURN NEW;
END; $function$;
DROP TRIGGER IF EXISTS trg_sumar_stock_compra ON public.invoice_items;
CREATE TRIGGER trg_add_stock_from_purchase AFTER INSERT ON public.invoice_items FOR EACH ROW EXECUTE FUNCTION public.add_stock_from_purchase();
DROP FUNCTION IF EXISTS public.sumar_stock_desde_compra() CASCADE;

-- ─── 24-29: Validation functions ───

-- validate_canal_tipo_ajuste → validate_channel_adjustment_type
CREATE OR REPLACE FUNCTION public.validate_channel_adjustment_type()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$ BEGIN IF NEW.tipo_ajuste NOT IN ('porcentaje', 'fijo') THEN RAISE EXCEPTION 'tipo_ajuste must be porcentaje or fijo'; END IF; RETURN NEW; END; $function$;
DO $$ DECLARE t RECORD; BEGIN FOR t IN SELECT tgname, c.relname FROM pg_trigger tg JOIN pg_class c ON tg.tgrelid = c.oid JOIN pg_proc p ON tg.tgfoid = p.oid WHERE p.proname = 'validate_canal_tipo_ajuste' AND NOT tg.tgisinternal LOOP EXECUTE format('DROP TRIGGER %I ON public.%I', t.tgname, t.relname); EXECUTE format('CREATE TRIGGER trg_validate_channel_adjustment_type BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.validate_channel_adjustment_type()', t.relname); END LOOP; END $$;
DROP FUNCTION IF EXISTS public.validate_canal_tipo_ajuste() CASCADE;

-- validate_estado_certificado → validate_certificate_status
CREATE OR REPLACE FUNCTION public.validate_certificate_status()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$ BEGIN IF NEW.certificate_status NOT IN ('sin_configurar', 'csr_generado', 'certificado_subido', 'conectado', 'error') THEN RAISE EXCEPTION 'certificate_status inválido: %', NEW.certificate_status; END IF; RETURN NEW; END; $function$;
DROP TRIGGER IF EXISTS trg_validate_estado_certificado ON public.afip_config;
CREATE TRIGGER trg_validate_certificate_status BEFORE INSERT OR UPDATE ON public.afip_config FOR EACH ROW EXECUTE FUNCTION public.validate_certificate_status();
DROP FUNCTION IF EXISTS public.validate_estado_certificado() CASCADE;

-- validate_insumo_nivel_control → validate_supply_control_level
CREATE OR REPLACE FUNCTION public.validate_supply_control_level()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$ BEGIN IF NEW.nivel_control NOT IN ('obligatorio', 'semi_libre', 'libre') THEN RAISE EXCEPTION 'nivel_control must be obligatorio, semi_libre, or libre'; END IF; IF NEW.nivel_control = 'obligatorio' AND NEW.proveedor_obligatorio_id IS NULL THEN RAISE EXCEPTION 'Nivel obligatorio requiere proveedor_obligatorio_id'; END IF; IF NEW.nivel_control = 'libre' AND NEW.proveedor_obligatorio_id IS NOT NULL THEN RAISE EXCEPTION 'Nivel libre no puede tener proveedor_obligatorio_id'; END IF; RETURN NEW; END; $function$;
DO $$ DECLARE t RECORD; BEGIN FOR t IN SELECT tgname, c.relname FROM pg_trigger tg JOIN pg_class c ON tg.tgrelid = c.oid JOIN pg_proc p ON tg.tgfoid = p.oid WHERE p.proname = 'validate_insumo_nivel_control' AND NOT tg.tgisinternal LOOP EXECUTE format('DROP TRIGGER %I ON public.%I', t.tgname, t.relname); EXECUTE format('CREATE TRIGGER trg_validate_supply_control_level BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.validate_supply_control_level()', t.relname); END LOOP; END $$;
DROP FUNCTION IF EXISTS public.validate_insumo_nivel_control() CASCADE;

-- validate_item_factura_tipo → validate_invoice_item_type
CREATE OR REPLACE FUNCTION public.validate_invoice_item_type()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$ BEGIN IF NEW.tipo_item = 'insumo' THEN IF NEW.insumo_id IS NULL THEN RAISE EXCEPTION 'insumo_id required for tipo_item=insumo'; END IF; IF NEW.concepto_servicio_id IS NOT NULL THEN RAISE EXCEPTION 'concepto_servicio_id must be NULL for tipo_item=insumo'; END IF; ELSIF NEW.tipo_item = 'servicio' THEN IF NEW.concepto_servicio_id IS NULL THEN RAISE EXCEPTION 'concepto_servicio_id required for tipo_item=servicio'; END IF; IF NEW.insumo_id IS NOT NULL THEN RAISE EXCEPTION 'insumo_id must be NULL for tipo_item=servicio'; END IF; ELSE RAISE EXCEPTION 'tipo_item must be insumo or servicio'; END IF; RETURN NEW; END; $function$;
DROP TRIGGER IF EXISTS trg_validate_item_tipo ON public.invoice_items;
CREATE TRIGGER trg_validate_invoice_item_type BEFORE INSERT OR UPDATE ON public.invoice_items FOR EACH ROW EXECUTE FUNCTION public.validate_invoice_item_type();
DROP FUNCTION IF EXISTS public.validate_item_factura_tipo() CASCADE;

-- validate_menu_producto_tipo → validate_menu_product_type
CREATE OR REPLACE FUNCTION public.validate_menu_product_type()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$ BEGIN IF NEW.type NOT IN ('elaborado', 'terminado', 'combo') THEN RAISE EXCEPTION 'type must be elaborado, terminado, or combo'; END IF; RETURN NEW; END; $function$;
DO $$ DECLARE t RECORD; BEGIN FOR t IN SELECT tgname, c.relname FROM pg_trigger tg JOIN pg_class c ON tg.tgrelid = c.oid JOIN pg_proc p ON tg.tgfoid = p.oid WHERE p.proname = 'validate_menu_producto_tipo' AND NOT tg.tgisinternal LOOP EXECUTE format('DROP TRIGGER %I ON public.%I', t.tgname, t.relname); EXECUTE format('CREATE TRIGGER trg_validate_menu_product_type BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.validate_menu_product_type()', t.relname); END LOOP; END $$;
DROP FUNCTION IF EXISTS public.validate_menu_producto_tipo() CASCADE;

-- validate_modificador → validate_modifier
CREATE OR REPLACE FUNCTION public.validate_modifier()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$ BEGIN IF NEW.type NOT IN ('removible', 'extra', 'sustitucion') THEN RAISE EXCEPTION 'type debe ser removible, extra o sustitucion'; END IF; IF NEW.type = 'removible' AND NEW.ingrediente_id IS NULL THEN RAISE EXCEPTION 'Removible debe tener ingrediente_id'; END IF; IF NEW.type = 'extra' AND NEW.ingrediente_extra_id IS NULL AND NEW.receta_extra_id IS NULL THEN RAISE EXCEPTION 'Extra debe tener ingrediente_extra_id o receta_extra_id'; END IF; IF NEW.type = 'sustitucion' AND (NEW.ingrediente_original_id IS NULL OR NEW.ingrediente_nuevo_id IS NULL) THEN RAISE EXCEPTION 'Sustitucion debe tener ingrediente_original_id e ingrediente_nuevo_id'; END IF; RETURN NEW; END; $function$;
DROP TRIGGER IF EXISTS trg_validate_modificador ON public.item_modifiers;
CREATE TRIGGER trg_validate_modifier BEFORE INSERT OR UPDATE ON public.item_modifiers FOR EACH ROW EXECUTE FUNCTION public.validate_modifier();
DROP FUNCTION IF EXISTS public.validate_modificador() CASCADE;

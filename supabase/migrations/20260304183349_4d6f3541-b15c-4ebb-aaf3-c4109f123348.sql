
-- Phase 1: Rename boolean columns to is_/has_ convention

-- activo → is_active (15 tables)
ALTER TABLE brand_closure_config RENAME COLUMN activo TO is_active;
ALTER TABLE cadetes RENAME COLUMN activo TO is_active;
ALTER TABLE canales_venta RENAME COLUMN activo TO is_active;
ALTER TABLE categorias_insumo RENAME COLUMN activo TO is_active;
ALTER TABLE categorias_preparacion RENAME COLUMN activo TO is_active;
ALTER TABLE codigos_descuento RENAME COLUMN activo TO is_active;
ALTER TABLE conceptos_servicio RENAME COLUMN activo TO is_active;
ALTER TABLE insumos RENAME COLUMN activo TO is_active;
ALTER TABLE item_modificadores RENAME COLUMN activo TO is_active;
ALTER TABLE item_removibles RENAME COLUMN activo TO is_active;
ALTER TABLE items_carta RENAME COLUMN activo TO is_active;
ALTER TABLE menu_categorias RENAME COLUMN activo TO is_active;
ALTER TABLE preparaciones RENAME COLUMN activo TO is_active;
ALTER TABLE proveedores RENAME COLUMN activo TO is_active;
ALTER TABLE socios RENAME COLUMN activo TO is_active;

-- activa → is_active (promociones)
ALTER TABLE promociones RENAME COLUMN activa TO is_active;

-- disponible → is_available (cadetes)
ALTER TABLE cadetes RENAME COLUMN disponible TO is_available;

-- verificado → is_verified (pagos_proveedores, pagos_canon)
ALTER TABLE pagos_proveedores RENAME COLUMN verificado TO is_verified;
ALTER TABLE pagos_canon RENAME COLUMN verificado TO is_verified;

-- es_produccion → is_production (afip_config)
ALTER TABLE afip_config RENAME COLUMN es_produccion TO is_production;

-- es_principal → is_primary (cliente_direcciones)
ALTER TABLE cliente_direcciones RENAME COLUMN es_principal TO is_primary;

-- es_removible → is_removable (item_carta_composicion)
ALTER TABLE item_carta_composicion RENAME COLUMN es_removible TO is_removable;

-- es_obligatorio → is_required (item_carta_grupo_opcional)
ALTER TABLE item_carta_grupo_opcional RENAME COLUMN es_obligatorio TO is_required;

-- es_intercambiable → is_interchangeable (preparaciones)
ALTER TABLE preparaciones RENAME COLUMN es_intercambiable TO is_interchangeable;

-- es_calculado → is_calculated (conceptos_servicio)
ALTER TABLE conceptos_servicio RENAME COLUMN es_calculado TO is_calculated;

-- Also update DB functions that reference these columns

-- Update recalcular_todos_los_costos (references activo)
CREATE OR REPLACE FUNCTION public.recalcular_todos_los_costos()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM preparaciones WHERE deleted_at IS NULL
  LOOP
    PERFORM recalcular_costo_preparacion(r.id);
  END LOOP;

  FOR r IN SELECT id FROM items_carta WHERE deleted_at IS NULL AND is_active = true
  LOOP
    PERFORM recalcular_costo_item_carta(r.id);
  END LOOP;
END;
$function$;

-- Update check_porcentajes_suman_100 (references activo)
CREATE OR REPLACE FUNCTION public.check_porcentajes_suman_100()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  total_porcentaje NUMERIC(5,2);
BEGIN
  SELECT SUM(porcentaje_participacion) INTO total_porcentaje
  FROM socios
  WHERE branch_id = NEW.branch_id
    AND is_active = TRUE
    AND deleted_at IS NULL;

  IF total_porcentaje IS NOT NULL AND total_porcentaje > 100 THEN
    RAISE EXCEPTION 'La suma de participaciones supera 100%% (actual: %)', total_porcentaje;
  END IF;

  RETURN NEW;
END;
$function$;

-- Update update_canon_saldo (references verificado)
CREATE OR REPLACE FUNCTION public.update_canon_saldo()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _canon_id uuid;
  _total_verificado numeric;
  _total_canon numeric;
  _saldo numeric;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _canon_id := OLD.canon_liquidacion_id;
  ELSE
    _canon_id := NEW.canon_liquidacion_id;
  END IF;

  SELECT COALESCE(SUM(monto), 0) INTO _total_verificado
  FROM pagos_canon
  WHERE canon_liquidacion_id = _canon_id
    AND is_verified = true
    AND deleted_at IS NULL;

  SELECT total_canon INTO _total_canon
  FROM canon_liquidaciones
  WHERE id = _canon_id;

  _saldo := GREATEST(_total_canon - _total_verificado, 0);

  UPDATE canon_liquidaciones
  SET saldo_pendiente = _saldo,
      estado = CASE
        WHEN _saldo <= 0 THEN 'pagado'
        WHEN _total_verificado > 0 THEN 'parcial'
        ELSE 'pendiente'
      END,
      updated_at = now()
  WHERE id = _canon_id;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Update actualizar_saldo_factura (references verificado)
CREATE OR REPLACE FUNCTION public.actualizar_saldo_factura()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  total_pagado NUMERIC(12,2);
  total_factura NUMERIC(12,2);
  v_factura_id UUID;
BEGIN
  v_factura_id := COALESCE(NEW.factura_id, OLD.factura_id);
  
  SELECT COALESCE(SUM(monto), 0) INTO total_pagado
  FROM public.pagos_proveedores
  WHERE factura_id = v_factura_id 
    AND deleted_at IS NULL
    AND is_verified = true;
  
  SELECT total INTO total_factura
  FROM public.facturas_proveedores
  WHERE id = v_factura_id;
  
  UPDATE public.facturas_proveedores
  SET 
    saldo_pendiente = total_factura - total_pagado,
    estado_pago = CASE 
      WHEN total_factura - total_pagado <= 0 THEN 'pagado'
      ELSE 'pendiente'
    END,
    updated_at = NOW()
  WHERE id = v_factura_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Update set_canon_payment_unverified (references verificado)
CREATE OR REPLACE FUNCTION public.set_canon_payment_unverified()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1 FROM facturas_proveedores 
    WHERE id = NEW.factura_id 
    AND proveedor_id = '00000000-0000-0000-0000-000000000001'
  ) THEN
    NEW.is_verified := false;
  END IF;
  RETURN NEW;
END;
$function$;

-- Update prevent_delete_verified_payment (references verificado)
CREATE OR REPLACE FUNCTION public.prevent_delete_verified_payment()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.is_verified = true AND NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    RAISE EXCEPTION 'No se puede eliminar un pago verificado por la marca';
  END IF;
  RETURN NEW;
END;
$function$;

-- Update sync_canon_liquidacion (references verificado)
CREATE OR REPLACE FUNCTION public.sync_canon_liquidacion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _vt numeric;
  _ef numeric;
  _online numeric;
  _canon_monto numeric;
  _mkt_monto numeric;
  _total numeric;
  _pago_ef numeric;
  _pago_transf numeric;
  _existing_id uuid;
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  _vt := COALESCE(NEW.venta_total, 0);
  _ef := COALESCE(NEW.efectivo, 0);
  _online := _vt - _ef;

  _canon_monto := ROUND(_vt * 0.045, 2);
  _mkt_monto := ROUND(_vt * 0.005, 2);
  _total := _canon_monto + _mkt_monto;

  _pago_ef := ROUND(_ef * 0.05, 2);
  _pago_transf := ROUND(_online * 0.05, 2);

  SELECT id INTO _existing_id
  FROM canon_liquidaciones
  WHERE ventas_id = NEW.id
    AND deleted_at IS NULL;

  IF _existing_id IS NOT NULL THEN
    UPDATE canon_liquidaciones SET
      fc_total = _online,
      ft_total = _ef,
      canon_porcentaje = 4.5,
      canon_monto = _canon_monto,
      marketing_porcentaje = 0.5,
      marketing_monto = _mkt_monto,
      total_canon = _total,
      pago_ft_sugerido = _pago_ef,
      pago_vt_sugerido = _pago_transf,
      porcentaje_ft = CASE WHEN _vt > 0 THEN ROUND((_ef / _vt) * 100, 1) ELSE 0 END,
      saldo_pendiente = _total - COALESCE((
        SELECT SUM(monto) FROM pagos_canon 
        WHERE canon_liquidacion_id = _existing_id 
          AND is_verified = true 
          AND deleted_at IS NULL
      ), 0),
      updated_at = now()
    WHERE id = _existing_id;
  ELSE
    INSERT INTO canon_liquidaciones (
      branch_id, periodo, ventas_id,
      fc_total, ft_total,
      canon_porcentaje, canon_monto,
      marketing_porcentaje, marketing_monto,
      total_canon, saldo_pendiente,
      pago_ft_sugerido, pago_vt_sugerido,
      porcentaje_ft,
      estado, created_by
    ) VALUES (
      NEW.branch_id, NEW.periodo, NEW.id,
      _online, _ef,
      4.5, _canon_monto,
      0.5, _mkt_monto,
      _total, _total,
      _pago_ef, _pago_transf,
      CASE WHEN _vt > 0 THEN ROUND((_ef / _vt) * 100, 1) ELSE 0 END,
      'pendiente', NEW.cargado_por
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Update get_rdo_financiero (references verificado in pagos_proveedores query - uses column name in SQL)
-- Note: This function uses column names in SQL text, so "verificado" references are via table queries
-- The function itself doesn't reference these columns directly in a way that breaks

-- Update recalcular_costo_preparacion (references es_intercambiable)
CREATE OR REPLACE FUNCTION public.recalcular_costo_preparacion(_prep_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_costo DECIMAL(12,2) := 0;
  v_tipo TEXT;
  v_es_inter BOOLEAN;
  v_metodo TEXT;
  v_costo_manual DECIMAL(12,2);
BEGIN
  SELECT tipo, is_interchangeable, metodo_costeo, costo_manual
  INTO v_tipo, v_es_inter, v_metodo, v_costo_manual
  FROM preparaciones WHERE id = _prep_id;

  IF v_tipo = 'elaborado' THEN
    SELECT COALESCE(SUM(
      pi.cantidad * i.costo_por_unidad_base * 
      CASE WHEN pi.unidad IN ('kg', 'l') THEN 1000 ELSE 1 END
    ), 0)
    INTO v_costo
    FROM preparacion_ingredientes pi
    JOIN insumos i ON i.id = pi.insumo_id
    WHERE pi.preparacion_id = _prep_id
      AND pi.insumo_id IS NOT NULL;

    v_costo := v_costo + COALESCE((
      SELECT SUM(pi.cantidad * COALESCE(p.costo_calculado, 0))
      FROM preparacion_ingredientes pi
      JOIN preparaciones p ON p.id = pi.sub_preparacion_id
      WHERE pi.preparacion_id = _prep_id
        AND pi.sub_preparacion_id IS NOT NULL
    ), 0);

  ELSIF v_tipo = 'componente_terminado' THEN
    IF v_costo_manual IS NOT NULL THEN
      v_costo := v_costo_manual;
    ELSIF v_es_inter THEN
      IF v_metodo = 'mas_caro' THEN
        SELECT COALESCE(MAX(i.costo_por_unidad_base), 0)
        INTO v_costo
        FROM preparacion_opciones po
        JOIN insumos i ON i.id = po.insumo_id
        WHERE po.preparacion_id = _prep_id;
      ELSE
        SELECT COALESCE(AVG(i.costo_por_unidad_base), 0)
        INTO v_costo
        FROM preparacion_opciones po
        JOIN insumos i ON i.id = po.insumo_id
        WHERE po.preparacion_id = _prep_id;
      END IF;
    ELSE
      SELECT COALESCE(i.costo_por_unidad_base, 0)
      INTO v_costo
      FROM preparacion_ingredientes pi
      JOIN insumos i ON i.id = pi.insumo_id
      WHERE pi.preparacion_id = _prep_id
        AND pi.insumo_id IS NOT NULL
      ORDER BY pi.orden LIMIT 1;
    END IF;
  END IF;

  UPDATE preparaciones SET costo_calculado = v_costo WHERE id = _prep_id;
  RETURN v_costo;
END;
$function$;

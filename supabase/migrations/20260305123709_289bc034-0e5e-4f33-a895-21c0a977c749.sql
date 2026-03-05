
-- Migration B: Fix 5 broken functions + update triggers

-- 1. Drop old broken functions
DROP FUNCTION IF EXISTS public.sync_canon_liquidacion() CASCADE;
DROP FUNCTION IF EXISTS public.sync_factura_to_canon() CASCADE;
DROP FUNCTION IF EXISTS public.sync_item_factura_to_rdo() CASCADE;
DROP FUNCTION IF EXISTS public.update_canon_saldo() CASCADE;
DROP FUNCTION IF EXISTS public.set_canon_payment_unverified() CASCADE;

-- 2. Recreate sync_canon_settlement (was sync_canon_liquidacion)
CREATE OR REPLACE FUNCTION public.sync_canon_settlement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _vt numeric;
  _ef numeric;
  _online numeric;
  _canon_amount numeric;
  _mkt_amount numeric;
  _total numeric;
  _pay_cash numeric;
  _pay_transfer numeric;
  _existing_id uuid;
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  _vt := COALESCE(NEW.total_sales, 0);
  _ef := COALESCE(NEW.cash, 0);
  _online := _vt - _ef;

  _canon_amount := ROUND(_vt * 0.045, 2);
  _mkt_amount := ROUND(_vt * 0.005, 2);
  _total := _canon_amount + _mkt_amount;

  _pay_cash := ROUND(_ef * 0.05, 2);
  _pay_transfer := ROUND(_online * 0.05, 2);

  SELECT id INTO _existing_id
  FROM canon_settlements
  WHERE ventas_id = NEW.id
    AND deleted_at IS NULL;

  IF _existing_id IS NOT NULL THEN
    UPDATE canon_settlements SET
      online_total = _online,
      cash_total = _ef,
      canon_percentage = 4.5,
      canon_amount = _canon_amount,
      marketing_percentage = 0.5,
      marketing_amount = _mkt_amount,
      total_canon = _total,
      suggested_cash_payment = _pay_cash,
      suggested_transfer_payment = _pay_transfer,
      cash_percentage = CASE WHEN _vt > 0 THEN ROUND((_ef / _vt) * 100, 1) ELSE 0 END,
      pending_balance = _total - COALESCE((
        SELECT SUM(amount) FROM canon_payments 
        WHERE canon_liquidacion_id = _existing_id 
          AND is_verified = true 
          AND deleted_at IS NULL
      ), 0),
      updated_at = now()
    WHERE id = _existing_id;
  ELSE
    INSERT INTO canon_settlements (
      branch_id, period, ventas_id,
      online_total, cash_total,
      canon_percentage, canon_amount,
      marketing_percentage, marketing_amount,
      total_canon, pending_balance,
      suggested_cash_payment, suggested_transfer_payment,
      cash_percentage,
      status, created_by
    ) VALUES (
      NEW.branch_id, NEW.period, NEW.id,
      _online, _ef,
      4.5, _canon_amount,
      0.5, _mkt_amount,
      _total, _total,
      _pay_cash, _pay_transfer,
      CASE WHEN _vt > 0 THEN ROUND((_ef / _vt) * 100, 1) ELSE 0 END,
      'pendiente', NEW.loaded_by
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Recreate sync_invoice_to_canon (was sync_factura_to_canon)
CREATE OR REPLACE FUNCTION public.sync_invoice_to_canon()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.proveedor_id != '00000000-0000-0000-0000-000000000001' THEN
    RETURN NEW;
  END IF;

  UPDATE canon_settlements
  SET pending_balance = NEW.pending_balance,
      status = CASE
        WHEN NEW.pending_balance <= 0 THEN 'pagado'
        WHEN NEW.pending_balance < NEW.total THEN 'pagado_parcial'
        ELSE 'pendiente'
      END,
      updated_at = now()
  WHERE branch_id = NEW.branch_id
    AND period = NEW.period
    AND deleted_at IS NULL;

  RETURN NEW;
END;
$$;

-- 4. Recreate sync_invoice_item_to_rdo (was sync_item_factura_to_rdo)
CREATE OR REPLACE FUNCTION public.sync_invoice_item_to_rdo()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_branch_id UUID; v_period TEXT; v_rdo_code TEXT; v_deleted TIMESTAMPTZ;
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE rdo_movimientos SET deleted_at = now() WHERE source_table = 'invoice_items' AND source_id = OLD.id AND deleted_at IS NULL;
    RETURN OLD;
  END IF;

  SELECT f.branch_id, f.period, f.deleted_at INTO v_branch_id, v_period, v_deleted
  FROM supplier_invoices f WHERE f.id = NEW.factura_id;

  IF NEW.insumo_id IS NOT NULL THEN
    SELECT rdo_category_code INTO v_rdo_code FROM supplies WHERE id = NEW.insumo_id;
  ELSIF NEW.concepto_servicio_id IS NOT NULL THEN
    SELECT rdo_category_code INTO v_rdo_code FROM service_concepts WHERE id = NEW.concepto_servicio_id;
  END IF;

  IF v_rdo_code IS NULL THEN v_rdo_code := NEW.pl_category; END IF;
  IF v_rdo_code IS NULL OR v_deleted IS NOT NULL THEN
    UPDATE rdo_movimientos SET deleted_at = now() WHERE source_table = 'invoice_items' AND source_id = NEW.id AND deleted_at IS NULL;
    RETURN NEW;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM rdo_categories WHERE code = v_rdo_code) THEN RETURN NEW; END IF;

  DELETE FROM rdo_movimientos WHERE source_table = 'invoice_items' AND source_id = NEW.id AND deleted_at IS NULL;

  INSERT INTO rdo_movimientos (branch_id, period, rdo_category_code, source, amount, source_table, source_id)
  VALUES (v_branch_id, v_period, v_rdo_code, 'compra_directa', NEW.subtotal, 'invoice_items', NEW.id);

  RETURN NEW;
END;
$$;

-- 5. Recreate update_canon_balance (was update_canon_saldo)
CREATE OR REPLACE FUNCTION public.update_canon_balance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _canon_id uuid;
  _total_verified numeric;
  _total_canon numeric;
  _balance numeric;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _canon_id := OLD.canon_liquidacion_id;
  ELSE
    _canon_id := NEW.canon_liquidacion_id;
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO _total_verified
  FROM canon_payments
  WHERE canon_liquidacion_id = _canon_id
    AND is_verified = true
    AND deleted_at IS NULL;

  SELECT total_canon INTO _total_canon
  FROM canon_settlements
  WHERE id = _canon_id;

  _balance := GREATEST(_total_canon - _total_verified, 0);

  UPDATE canon_settlements
  SET pending_balance = _balance,
      status = CASE
        WHEN _balance <= 0 THEN 'pagado'
        WHEN _total_verified > 0 THEN 'parcial'
        ELSE 'pendiente'
      END,
      updated_at = now()
  WHERE id = _canon_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 6. Recreate set_canon_payment_unverified (name already English, fix body)
CREATE OR REPLACE FUNCTION public.set_canon_payment_unverified()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM supplier_invoices 
    WHERE id = NEW.factura_id 
    AND proveedor_id = '00000000-0000-0000-0000-000000000001'
  ) THEN
    NEW.is_verified := false;
  END IF;
  RETURN NEW;
END;
$$;

-- 7. Recreate triggers pointing to new functions
CREATE TRIGGER trg_sync_canon_settlement
  AFTER INSERT OR UPDATE ON public.branch_monthly_sales
  FOR EACH ROW EXECUTE FUNCTION public.sync_canon_settlement();

CREATE TRIGGER trg_sync_invoice_to_canon
  AFTER INSERT OR UPDATE ON public.supplier_invoices
  FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_to_canon();

CREATE TRIGGER trg_sync_invoice_item_rdo
  AFTER INSERT OR UPDATE OR DELETE ON public.invoice_items
  FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_item_to_rdo();

CREATE TRIGGER trg_canon_payment_unverified
  BEFORE INSERT ON public.supplier_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_canon_payment_unverified();

CREATE TRIGGER trg_update_canon_balance
  AFTER INSERT OR UPDATE OR DELETE ON public.canon_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_canon_balance();

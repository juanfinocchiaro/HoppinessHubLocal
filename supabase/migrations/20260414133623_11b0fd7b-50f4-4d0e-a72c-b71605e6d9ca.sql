
CREATE OR REPLACE FUNCTION public.sync_canon_settlement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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
  WHERE monthly_sales_id = NEW.id
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
        WHERE canon_settlement_id = _existing_id
          AND is_verified = true
          AND deleted_at IS NULL
      ), 0),
      updated_at = now()
    WHERE id = _existing_id;
  ELSE
    INSERT INTO canon_settlements (
      branch_id, period, monthly_sales_id,
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

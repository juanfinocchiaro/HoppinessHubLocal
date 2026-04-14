CREATE OR REPLACE FUNCTION public.calculate_real_invoice_cost()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.actual_cost := COALESCE(NEW.subtotal_neto, NEW.subtotal, 0)
    + COALESCE(NEW.imp_internos, 0)
    + COALESCE(NEW.perc_provincial, 0)
    + COALESCE(NEW.perc_municipal, 0);
  RETURN NEW;
END;
$$;
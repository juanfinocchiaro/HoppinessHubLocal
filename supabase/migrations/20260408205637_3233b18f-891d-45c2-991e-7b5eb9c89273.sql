CREATE OR REPLACE FUNCTION public.generate_order_number(p_branch_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_numero INTEGER;
BEGIN
  SELECT COALESCE(MAX(order_number), 0) + 1 INTO v_numero FROM orders WHERE branch_id = p_branch_id;
  RETURN v_numero;
END;
$$;
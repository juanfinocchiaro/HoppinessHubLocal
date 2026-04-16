
CREATE OR REPLACE FUNCTION public.seed_branch_item_availability_for_item()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_active IS DISTINCT FROM true OR NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.branch_item_availability (branch_id, item_carta_id)
  SELECT b.id, NEW.id FROM public.branches b WHERE b.is_active = true
  ON CONFLICT (branch_id, item_carta_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.seed_branch_item_availability_for_branch()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_active IS DISTINCT FROM true THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.branch_item_availability (branch_id, item_carta_id)
  SELECT NEW.id, i.id FROM public.menu_items i
  WHERE i.is_active = true AND i.deleted_at IS NULL
  ON CONFLICT (branch_id, item_carta_id) DO NOTHING;
  RETURN NEW;
END;
$$;

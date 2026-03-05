-- Etapas 8-9: Functions cleanup + views

-- ETAPA 8a: Recreate sync_gasto_to_rdo → sync_expense_to_rdo with correct column names
CREATE OR REPLACE FUNCTION public.sync_expense_to_rdo()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE rdo_movements SET deleted_at = now() WHERE source_table = 'expenses' AND source_id = OLD.id AND deleted_at IS NULL;
    RETURN OLD;
  END IF;
  IF NEW.deleted_at IS NOT NULL OR NEW.rdo_category_code IS NULL THEN
    UPDATE rdo_movements SET deleted_at = now() WHERE source_table = 'expenses' AND source_id = NEW.id AND deleted_at IS NULL;
    RETURN NEW;
  END IF;
  DELETE FROM rdo_movements WHERE source_table = 'expenses' AND source_id = NEW.id AND deleted_at IS NULL;
  INSERT INTO rdo_movements (branch_id, period, rdo_category_code, source, amount, description, source_table, source_id, created_by)
  VALUES (NEW.branch_id, NEW.period, NEW.rdo_category_code, 'expense', NEW.amount, NEW.concept, 'expenses', NEW.id, NEW.created_by);
  RETURN NEW;
END;
$$;

-- Update trigger to use new function
DROP TRIGGER IF EXISTS trg_sync_gasto_rdo ON public.expenses;
CREATE TRIGGER trg_sync_expense_rdo
  AFTER INSERT OR UPDATE OR DELETE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.sync_expense_to_rdo();

-- ETAPA 8b: Recreate sync_consumo_to_rdo → sync_consumption_to_rdo
CREATE OR REPLACE FUNCTION public.sync_consumption_to_rdo()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_rdo_code TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE rdo_movements SET deleted_at = now() WHERE source_table = 'manual_consumptions' AND source_id = OLD.id AND deleted_at IS NULL;
    RETURN OLD;
  END IF;
  IF NEW.deleted_at IS NOT NULL THEN
    UPDATE rdo_movements SET deleted_at = now() WHERE source_table = 'manual_consumptions' AND source_id = NEW.id AND deleted_at IS NULL;
    RETURN NEW;
  END IF;
  v_rdo_code := CASE NEW.pl_category
    WHEN 'materia_prima' THEN 'cmv_hamburguesas'
    WHEN 'descartables' THEN 'descartables_salon'
    WHEN 'limpieza' THEN 'limpieza_higiene'
    WHEN 'mantenimiento' THEN 'mantenimiento'
    WHEN 'marketing' THEN 'marketing'
    ELSE NULL
  END;
  IF v_rdo_code IS NULL THEN RETURN NEW; END IF;
  DELETE FROM rdo_movements WHERE source_table = 'manual_consumptions' AND source_id = NEW.id AND deleted_at IS NULL;
  INSERT INTO rdo_movements (branch_id, period, rdo_category_code, source, amount, description, source_table, source_id, created_by)
  VALUES (NEW.branch_id, NEW.period, v_rdo_code, 'inventory_consumption', NEW.consumed_amount, NEW.notes, 'manual_consumptions', NEW.id, NEW.created_by);
  RETURN NEW;
END;
$$;

-- Update trigger
DROP TRIGGER IF EXISTS trg_sync_consumo_rdo ON public.manual_consumptions;
CREATE TRIGGER trg_sync_consumption_rdo
  AFTER INSERT OR UPDATE OR DELETE ON public.manual_consumptions
  FOR EACH ROW EXECUTE FUNCTION public.sync_consumption_to_rdo();

-- ETAPA 8c: Recreate sync_expense_movement_to_gastos → sync_expense_movement
CREATE OR REPLACE FUNCTION public.sync_expense_movement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_period TEXT; v_branch_id UUID;
BEGIN
  IF NEW.type != 'expense' THEN RETURN NEW; END IF;
  IF COALESCE(NEW.approval_status, 'aprobado') = 'rechazado' THEN RETURN NEW; END IF;
  v_branch_id := NEW.branch_id;
  v_period := to_char(COALESCE(NEW.created_at, now()), 'YYYY-MM');
  INSERT INTO public.expenses (
    id, branch_id, period, main_category, concept,
    amount, date, payment_method, notes, status, created_by, rdo_category_code
  ) VALUES (
    NEW.id, v_branch_id, v_period,
    COALESCE(NEW.categoria_gasto, 'caja_chica'),
    NEW.concept, NEW.amount,
    (COALESCE(NEW.created_at, now()) AT TIME ZONE 'America/Argentina/Cordoba')::date,
    NEW.payment_method, NEW.notes_extra,
    CASE WHEN COALESCE(NEW.approval_status, 'aprobado') = 'pendiente_aprobacion' THEN 'pendiente' ELSE 'pagado' END,
    NEW.recorded_by, NEW.rdo_category_code
  ) ON CONFLICT (id) DO UPDATE SET
    main_category = COALESCE(EXCLUDED.main_category, expenses.main_category),
    concept = EXCLUDED.concept, amount = EXCLUDED.amount,
    payment_method = EXCLUDED.payment_method, notes = EXCLUDED.notes,
    status = EXCLUDED.status, rdo_category_code = EXCLUDED.rdo_category_code, updated_at = now();
  RETURN NEW;
END;
$$;

-- Update trigger
DROP TRIGGER IF EXISTS trg_sync_expense_to_gastos ON public.cash_register_movements;
CREATE TRIGGER trg_sync_expense_movement
  AFTER INSERT OR UPDATE ON public.cash_register_movements
  FOR EACH ROW EXECUTE FUNCTION public.sync_expense_movement();

-- Drop old functions
DROP FUNCTION IF EXISTS public.sync_gasto_to_rdo() CASCADE;
DROP FUNCTION IF EXISTS public.sync_consumo_to_rdo() CASCADE;
DROP FUNCTION IF EXISTS public.sync_expense_movement_to_gastos() CASCADE;

-- ETAPA 9: Recreate rdo_report_data view with new table name
DROP VIEW IF EXISTS public.rdo_report_data;
CREATE VIEW public.rdo_report_data WITH (security_invoker = true) AS
SELECT branch_id, period, rdo_category_code, sum(amount) AS total
FROM public.rdo_movements
WHERE deleted_at IS NULL
GROUP BY branch_id, period, rdo_category_code;
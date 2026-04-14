CREATE OR REPLACE FUNCTION public.audit_financial_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  campos_mod TEXT[];
  key TEXT;
  old_json JSONB;
  new_json JSONB;
BEGIN
  old_json = CASE WHEN TG_OP != 'INSERT' THEN row_to_json(OLD)::jsonb ELSE NULL END;
  new_json = CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW)::jsonb ELSE NULL END;

  IF TG_OP = 'UPDATE' THEN
    campos_mod = ARRAY[]::TEXT[];
    FOR key IN SELECT jsonb_object_keys(new_json) LOOP
      IF old_json->key IS DISTINCT FROM new_json->key THEN
        campos_mod = array_append(campos_mod, key);
      END IF;
    END LOOP;
  END IF;

  INSERT INTO financial_audit_log (
    tabla, registro_id, operacion,
    datos_antes, datos_despues, campos_modificados,
    user_id, user_email
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    old_json, new_json, campos_mod,
    auth.uid(), auth.email()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;
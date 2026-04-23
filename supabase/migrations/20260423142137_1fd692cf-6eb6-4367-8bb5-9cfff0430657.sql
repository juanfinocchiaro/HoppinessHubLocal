-- Reparación de helpers RLS: migrar de la tabla eliminada user_roles_v2 al modelo
-- normalizado roles + user_role_assignments. Se mantienen nombres, parámetros y
-- semántica (superadmin = global, roles brand = global, roles branch = por sucursal).

-- 1) is_staff() -> existe alguna asignación activa
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_role_assignments ura
    WHERE ura.user_id = auth.uid()
      AND ura.is_active = true
  )
$function$;

-- 2) is_staff(uuid)
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_role_assignments ura
    WHERE ura.user_id = _user_id
      AND ura.is_active = true
  )
$function$;

-- 3) is_staff_member(uuid)
CREATE OR REPLACE FUNCTION public.is_staff_member(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_role_assignments ura
    WHERE ura.user_id = _user_id
      AND ura.is_active = true
  )
$function$;

-- 4) is_financial_manager(uuid)
CREATE OR REPLACE FUNCTION public.is_financial_manager(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_role_assignments ura
    JOIN public.roles r ON r.id = ura.role_id
    WHERE ura.user_id = user_uuid
      AND ura.is_active = true
      AND r.key IN ('superadmin', 'contador_marca', 'franquiciado', 'encargado', 'contador_local')
  );
$function$;

-- 5) is_hr_manager(uuid)
CREATE OR REPLACE FUNCTION public.is_hr_manager(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_role_assignments ura
    JOIN public.roles r ON r.id = ura.role_id
    WHERE ura.user_id = user_uuid
      AND ura.is_active = true
      AND r.key IN ('superadmin', 'coordinador', 'franquiciado', 'encargado')
  );
$function$;

-- 6) is_cashier_for_branch(uuid, uuid) - acceso cajero o superadmin a una sucursal
CREATE OR REPLACE FUNCTION public.is_cashier_for_branch(_user_id uuid, _branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_role_assignments ura
    JOIN public.roles r ON r.id = ura.role_id
    WHERE ura.user_id = _user_id
      AND ura.is_active = true
      AND (
        r.key = 'superadmin'
        OR ura.branch_id = _branch_id
      )
  )
$function$;

-- 7) user_has_branch_access(uuid)
CREATE OR REPLACE FUNCTION public.user_has_branch_access(p_branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_role_assignments ura
    JOIN public.roles r ON r.id = ura.role_id
    WHERE ura.user_id = auth.uid()
      AND ura.is_active = true
      AND (
        r.scope = 'brand'           -- roles de marca = acceso global
        OR ura.branch_id = p_branch_id
      )
  )
$function$;

-- 8) has_hr_access(uuid)
CREATE OR REPLACE FUNCTION public.has_hr_access(p_branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_role_assignments ura
    JOIN public.roles r ON r.id = ura.role_id
    WHERE ura.user_id = auth.uid()
      AND ura.is_active = true
      AND (
        r.key IN ('superadmin', 'coordinador')
        OR (ura.branch_id = p_branch_id AND r.key IN ('franquiciado', 'encargado'))
      )
  )
$function$;

-- 9) has_financial_access(uuid)
CREATE OR REPLACE FUNCTION public.has_financial_access(p_branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_role_assignments ura
    JOIN public.roles r ON r.id = ura.role_id
    WHERE ura.user_id = auth.uid()
      AND ura.is_active = true
      AND (
        r.key IN ('superadmin', 'coordinador', 'contador_marca')
        OR (ura.branch_id = p_branch_id AND r.key IN ('franquiciado', 'encargado', 'contador_local'))
      )
  )
$function$;

-- 10) validate_clock_pin(text, text)
-- El PIN ahora vive en user_role_assignments.clock_pin (no en profiles)
CREATE OR REPLACE FUNCTION public.validate_clock_pin(_branch_code text, _pin text)
RETURNS TABLE(user_id uuid, full_name text, branch_id uuid, branch_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    p.user_id,
    p.full_name,
    b.id AS branch_id,
    b.name AS branch_name
  FROM public.branches b
  JOIN public.user_role_assignments ura ON ura.is_active = true
  JOIN public.roles r ON r.id = ura.role_id
  JOIN public.profiles p ON p.user_id = ura.user_id
  WHERE b.clock_code = _branch_code
    AND (
      (ura.clock_pin = _pin)
      OR (p.clock_pin = _pin)
    )
    AND (
      r.key = 'superadmin'
      OR ura.branch_id = b.id
    )
  LIMIT 1;
END;
$function$;

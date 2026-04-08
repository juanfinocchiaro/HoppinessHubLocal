
-- Fix has_branch_role: replace user_branch_roles with user_role_assignments
CREATE OR REPLACE FUNCTION public.has_branch_role(_user_id uuid, _branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_role_assignments
    WHERE user_id = _user_id
    AND branch_id = _branch_id
    AND is_active = true
  ) OR is_superadmin(_user_id)
$$;

-- Fix is_hr_for_branch
CREATE OR REPLACE FUNCTION public.is_hr_for_branch(_user_id uuid, _branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_superadmin(_user_id) OR EXISTS (
    SELECT 1 FROM public.user_role_assignments ura
    JOIN public.roles r ON r.id = ura.role_id
    WHERE ura.user_id = _user_id
    AND ura.branch_id = _branch_id
    AND r.key IN ('franquiciado', 'encargado')
    AND ura.is_active = true
  )
$$;

-- Fix is_hr_for_branch_v2
CREATE OR REPLACE FUNCTION public.is_hr_for_branch_v2(_user_id uuid, _branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_superadmin(_user_id) OR EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = _user_id
    AND ura.branch_id = _branch_id
    AND r.key IN ('franquiciado', 'encargado')
    AND ura.is_active = true
  )
$$;

-- Fix can_close_shift
CREATE OR REPLACE FUNCTION public.can_close_shift(_user_id uuid, _branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_superadmin(_user_id) OR EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = _user_id
    AND ura.branch_id = _branch_id
    AND r.key IN ('franquiciado', 'encargado', 'cajero')
    AND ura.is_active = true
  )
$$;

-- Fix can_manage_coaching
CREATE OR REPLACE FUNCTION public.can_manage_coaching(_user_id uuid, _branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_superadmin(_user_id) OR EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = _user_id
    AND ura.branch_id = _branch_id
    AND r.key IN ('franquiciado', 'encargado')
    AND ura.is_active = true
  )
$$;

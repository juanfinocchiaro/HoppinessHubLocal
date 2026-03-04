
-- =============================================================
-- Part 1: New helper functions for common patterns
-- =============================================================

-- Check if user has any of specified brand role keys
CREATE OR REPLACE FUNCTION public.has_any_brand_role(_user_id uuid, _role_keys text[])
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = _user_id
      AND r.scope = 'brand'
      AND r.key = ANY(_role_keys)
      AND ura.is_active = true
      AND ura.branch_id IS NULL
  )
$$;

-- Check if user has any of specified local role keys at ANY branch
CREATE OR REPLACE FUNCTION public.has_any_local_role(_user_id uuid, _role_keys text[])
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = _user_id
      AND r.scope = 'branch'
      AND r.key = ANY(_role_keys)
      AND ura.is_active = true
  )
$$;

-- Check if user has any role key (brand or local) matching given keys
CREATE OR REPLACE FUNCTION public.user_has_any_role_key(_user_id uuid, _role_keys text[])
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = _user_id
      AND r.key = ANY(_role_keys)
      AND ura.is_active = true
  )
$$;

-- Check if user has access to any of specified branches
CREATE OR REPLACE FUNCTION public.user_has_access_to_any_branch(_user_id uuid, _branch_ids uuid[])
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT is_superadmin(_user_id) OR EXISTS (
    SELECT 1
    FROM user_role_assignments ura
    WHERE ura.user_id = _user_id
      AND ura.branch_id = ANY(_branch_ids)
      AND ura.is_active = true
  )
$$;

-- Check if user has a specific role at a specific branch
CREATE OR REPLACE FUNCTION public.has_role_for_branch(_user_id uuid, _branch_id uuid, _role_key text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = _user_id
      AND ura.branch_id = _branch_id
      AND r.key = _role_key
      AND ura.is_active = true
  )
$$;

-- Check if viewer (manager) shares a branch with target user
CREATE OR REPLACE FUNCTION public.shares_branch_as_manager(_viewer_id uuid, _target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_role_assignments viewer_ura
    JOIN roles vr ON vr.id = viewer_ura.role_id
    JOIN user_role_assignments target_ura ON target_ura.branch_id = viewer_ura.branch_id
    WHERE viewer_ura.user_id = _viewer_id
      AND target_ura.user_id = _target_user_id
      AND vr.key IN ('franquiciado', 'encargado')
      AND viewer_ura.is_active = true
      AND target_ura.is_active = true
  )
$$;

-- Check if user has any active role (is staff)
CREATE OR REPLACE FUNCTION public.is_active_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_role_assignments ura
    WHERE ura.user_id = _user_id
      AND ura.is_active = true
  )
$$;

-- =============================================================
-- Part 2: Rewrite PUBLIC policies
-- =============================================================

-- 1. afip_config
DROP POLICY IF EXISTS "franquiciado_afip_config" ON afip_config;
CREATE POLICY "franquiciado_afip_config" ON afip_config FOR ALL TO authenticated
  USING (has_role_for_branch(auth.uid(), branch_id, 'franquiciado'))
  WITH CHECK (has_role_for_branch(auth.uid(), branch_id, 'franquiciado'));

-- 2. audit_logs
DROP POLICY IF EXISTS "Only admins view audit" ON audit_logs;
CREATE POLICY "Only admins view audit" ON audit_logs FOR SELECT TO authenticated
  USING (is_superadmin(auth.uid()));

-- 3. branch_delivery_config
DROP POLICY IF EXISTS "Staff can update branch delivery config" ON branch_delivery_config;
CREATE POLICY "Staff can update branch delivery config" ON branch_delivery_config FOR UPDATE TO authenticated
  USING (
    has_any_brand_role(auth.uid(), ARRAY['superadmin', 'coordinador'])
    OR can_access_branch(auth.uid(), branch_id)
  );

DROP POLICY IF EXISTS "Superadmin can insert branch delivery config" ON branch_delivery_config;
CREATE POLICY "Superadmin can insert branch delivery config" ON branch_delivery_config FOR INSERT TO authenticated
  WITH CHECK (has_any_brand_role(auth.uid(), ARRAY['superadmin', 'coordinador']));

-- 4. branch_delivery_neighborhoods
DROP POLICY IF EXISTS "Brand admin can manage branch neighborhoods" ON branch_delivery_neighborhoods;
CREATE POLICY "Brand admin can manage branch neighborhoods" ON branch_delivery_neighborhoods FOR ALL TO authenticated
  USING (has_any_brand_role(auth.uid(), ARRAY['superadmin', 'coordinador']))
  WITH CHECK (has_any_brand_role(auth.uid(), ARRAY['superadmin', 'coordinador']));

-- 5. branch_inspections
DROP POLICY IF EXISTS "branch_inspections_local_view" ON branch_inspections;
CREATE POLICY "branch_inspections_local_view" ON branch_inspections FOR SELECT TO authenticated
  USING (is_hr_role(auth.uid(), branch_id));

-- 6. city_neighborhoods
DROP POLICY IF EXISTS "Superadmin can manage neighborhoods" ON city_neighborhoods;
CREATE POLICY "Superadmin can manage neighborhoods" ON city_neighborhoods FOR ALL TO authenticated
  USING (is_superadmin(auth.uid()))
  WITH CHECK (is_superadmin(auth.uid()));

-- 7. clock_entries
DROP POLICY IF EXISTS "clock_entries_insert_manual_by_manager" ON clock_entries;
CREATE POLICY "clock_entries_insert_manual_by_manager" ON clock_entries FOR INSERT TO authenticated
  WITH CHECK (
    is_superadmin(auth.uid())
    OR (is_manual = true AND manual_by = auth.uid() AND is_hr_role(auth.uid(), branch_id))
  );

-- 8. communications (manage)
DROP POLICY IF EXISTS "Brand admins can manage brand communications" ON communications;
CREATE POLICY "Brand admins can manage brand communications" ON communications FOR ALL TO authenticated
  USING (
    source_type = 'brand'
    AND has_any_brand_role(auth.uid(), ARRAY['superadmin', 'coordinador'])
  )
  WITH CHECK (
    source_type = 'brand'
    AND has_any_brand_role(auth.uid(), ARRAY['superadmin', 'coordinador'])
  );

-- 9. communications (view) - COMPLEX: uses target_roles and branch matching
DROP POLICY IF EXISTS "Users can view relevant communications" ON communications;
CREATE POLICY "Users can view relevant communications" ON communications FOR SELECT TO authenticated
  USING (
    is_published = true
    AND (
      (
        source_type = 'brand'
        AND (
          target_roles IS NULL
          OR target_roles = '{}'::text[]
          OR user_has_any_role_key(auth.uid(), target_roles)
        )
      )
      OR (
        source_type = 'local'
        AND source_branch_id IS NOT NULL
        AND can_access_branch(auth.uid(), source_branch_id)
      )
    )
    AND (
      target_branch_ids IS NULL
      OR target_branch_ids = '{}'::uuid[]
      OR is_superadmin(auth.uid())
      OR user_has_access_to_any_branch(auth.uid(), target_branch_ids)
    )
  );

-- 10. contact_messages
DROP POLICY IF EXISTS "contact_messages_admin_select" ON contact_messages;
CREATE POLICY "contact_messages_admin_select" ON contact_messages FOR SELECT TO authenticated
  USING (has_any_brand_role(auth.uid(), ARRAY['superadmin', 'coordinador']));

-- 11. delivery_pricing_config
DROP POLICY IF EXISTS "Superadmin can manage delivery pricing" ON delivery_pricing_config;
CREATE POLICY "Superadmin can manage delivery pricing" ON delivery_pricing_config FOR ALL TO authenticated
  USING (is_superadmin(auth.uid()))
  WITH CHECK (is_superadmin(auth.uid()));

-- 12. delivery_radius_overrides_log
DROP POLICY IF EXISTS "Brand admin can read override logs" ON delivery_radius_overrides_log;
CREATE POLICY "Brand admin can read override logs" ON delivery_radius_overrides_log FOR SELECT TO authenticated
  USING (is_active_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff can insert override logs" ON delivery_radius_overrides_log;
CREATE POLICY "Staff can insert override logs" ON delivery_radius_overrides_log FOR INSERT TO authenticated
  WITH CHECK (is_active_staff(auth.uid()));

-- 13. inspection_items
DROP POLICY IF EXISTS "inspection_items_local_view" ON inspection_items;
CREATE POLICY "inspection_items_local_view" ON inspection_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM branch_inspections bi
      WHERE bi.id = inspection_items.inspection_id
        AND is_hr_role(auth.uid(), bi.branch_id)
    )
  );

-- 14. inspection_staff_present (4 policies)
DROP POLICY IF EXISTS "Brand team can view inspection staff" ON inspection_staff_present;
CREATE POLICY "Brand team can view inspection staff" ON inspection_staff_present FOR SELECT TO authenticated
  USING (
    has_any_brand_role(auth.uid(), ARRAY['superadmin', 'coordinador'])
    OR EXISTS (
      SELECT 1 FROM branch_inspections bi
      WHERE bi.id = inspection_staff_present.inspection_id
        AND is_hr_role(auth.uid(), bi.branch_id)
    )
  );

DROP POLICY IF EXISTS "Brand team can insert inspection staff" ON inspection_staff_present;
CREATE POLICY "Brand team can insert inspection staff" ON inspection_staff_present FOR INSERT TO authenticated
  WITH CHECK (has_any_brand_role(auth.uid(), ARRAY['superadmin', 'coordinador']));

DROP POLICY IF EXISTS "Brand team can update inspection staff" ON inspection_staff_present;
CREATE POLICY "Brand team can update inspection staff" ON inspection_staff_present FOR UPDATE TO authenticated
  USING (has_any_brand_role(auth.uid(), ARRAY['superadmin', 'coordinador']));

DROP POLICY IF EXISTS "Brand team can delete inspection staff" ON inspection_staff_present;
CREATE POLICY "Brand team can delete inspection staff" ON inspection_staff_present FOR DELETE TO authenticated
  USING (has_any_brand_role(auth.uid(), ARRAY['superadmin', 'coordinador']));

-- 15. profiles (HR view)
DROP POLICY IF EXISTS "profiles_select_hr" ON profiles;
CREATE POLICY "profiles_select_hr" ON profiles FOR SELECT TO authenticated
  USING (shares_branch_as_manager(auth.uid(), id));

-- 16. promocion_item_extras
DROP POLICY IF EXISTS "staff_delete_promo_item_extras" ON promocion_item_extras;
CREATE POLICY "staff_delete_promo_item_extras" ON promocion_item_extras FOR DELETE TO authenticated
  USING (
    is_superadmin(auth.uid())
    OR has_any_local_role(auth.uid(), ARRAY['franquiciado', 'encargado'])
  );

DROP POLICY IF EXISTS "staff_insert_promo_item_extras" ON promocion_item_extras;
CREATE POLICY "staff_insert_promo_item_extras" ON promocion_item_extras FOR INSERT TO authenticated
  WITH CHECK (
    is_superadmin(auth.uid())
    OR has_any_local_role(auth.uid(), ARRAY['franquiciado', 'encargado'])
  );

-- 17. salary_advances
DROP POLICY IF EXISTS "Users view own or HR managers view all branch advances" ON salary_advances;
CREATE POLICY "Users view own or HR managers view all branch advances" ON salary_advances FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR is_financial_for_branch(auth.uid(), branch_id)
  );

-- =============================================================
-- Part 3: Rewrite STORAGE policies
-- =============================================================

-- regulation-signatures
DROP POLICY IF EXISTS "HR can upload regulation signatures" ON storage.objects;
CREATE POLICY "HR can upload regulation signatures" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'regulation-signatures'
    AND (
      is_superadmin(auth.uid())
      OR has_any_local_role(auth.uid(), ARRAY['franquiciado', 'encargado'])
    )
  );

DROP POLICY IF EXISTS "HR can view regulation signatures" ON storage.objects;
CREATE POLICY "HR can view regulation signatures" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'regulation-signatures'
    AND (
      is_superadmin(auth.uid())
      OR has_any_local_role(auth.uid(), ARRAY['franquiciado', 'encargado'])
    )
  );

DROP POLICY IF EXISTS "Managers can upload signature photos" ON storage.objects;
CREATE POLICY "Managers can upload signature photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'regulation-signatures'
    AND (
      is_superadmin(auth.uid())
      OR has_any_local_role(auth.uid(), ARRAY['franquiciado', 'encargado'])
    )
  );

DROP POLICY IF EXISTS "Staff can view their own signature photos" ON storage.objects;
CREATE POLICY "Staff can view their own signature photos" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'regulation-signatures'
    AND (
      is_superadmin(auth.uid())
      OR has_any_local_role(auth.uid(), ARRAY['franquiciado', 'encargado'])
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );

-- warning-signatures
DROP POLICY IF EXISTS "Managers can upload warning signatures" ON storage.objects;
CREATE POLICY "Managers can upload warning signatures" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'warning-signatures'
    AND (
      is_superadmin(auth.uid())
      OR has_any_local_role(auth.uid(), ARRAY['franquiciado', 'encargado'])
    )
  );

DROP POLICY IF EXISTS "Managers can view warning signatures" ON storage.objects;
CREATE POLICY "Managers can view warning signatures" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'warning-signatures'
    AND (
      is_superadmin(auth.uid())
      OR has_any_local_role(auth.uid(), ARRAY['franquiciado', 'encargado'])
    )
  );

DROP POLICY IF EXISTS "Managers can delete warning signatures" ON storage.objects;
CREATE POLICY "Managers can delete warning signatures" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'warning-signatures'
    AND (
      is_superadmin(auth.uid())
      OR has_any_local_role(auth.uid(), ARRAY['franquiciado', 'encargado'])
    )
  );

-- =============================================================
-- Part 4: Drop permission_config table (no longer needed)
-- =============================================================
DROP TABLE IF EXISTS public.permission_config;

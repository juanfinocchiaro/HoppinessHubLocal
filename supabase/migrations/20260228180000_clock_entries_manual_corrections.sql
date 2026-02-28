-- Add columns for manual clock entry corrections by managers
ALTER TABLE clock_entries
  ADD COLUMN IF NOT EXISTS is_manual boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS manual_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS manual_reason text,
  ADD COLUMN IF NOT EXISTS original_created_at timestamptz;

-- Allow encargados to update clock entries for their branch
CREATE POLICY clock_entries_update_by_manager ON clock_entries
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_branch_roles ubr
      WHERE ubr.user_id = auth.uid()
        AND ubr.branch_id = clock_entries.branch_id
        AND ubr.local_role IN ('encargado', 'franquiciado')
        AND ubr.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_branch_roles ubr
      WHERE ubr.user_id = auth.uid()
        AND ubr.branch_id = clock_entries.branch_id
        AND ubr.local_role IN ('encargado', 'franquiciado')
        AND ubr.is_active = true
    )
  );

-- Allow encargados to delete clock entries for their branch
CREATE POLICY clock_entries_delete_by_manager ON clock_entries
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_branch_roles ubr
      WHERE ubr.user_id = auth.uid()
        AND ubr.branch_id = clock_entries.branch_id
        AND ubr.local_role IN ('encargado', 'franquiciado')
        AND ubr.is_active = true
    )
  );

-- Allow encargados to insert manual clock entries for their branch
CREATE POLICY clock_entries_insert_manual_by_manager ON clock_entries
  FOR INSERT
  WITH CHECK (
    is_manual = true
    AND manual_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_branch_roles ubr
      WHERE ubr.user_id = auth.uid()
        AND ubr.branch_id = clock_entries.branch_id
        AND ubr.local_role IN ('encargado', 'franquiciado')
        AND ubr.is_active = true
    )
  );

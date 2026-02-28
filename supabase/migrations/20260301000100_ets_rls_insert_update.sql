-- Allow managers (encargado/franquiciado) to INSERT and UPDATE employee_time_state
-- so that manual clock entries from the frontend can update the state table.
CREATE POLICY "ets_upsert_hr" ON employee_time_state
  FOR ALL TO authenticated
  USING (public.is_hr_role(auth.uid(), branch_id))
  WITH CHECK (public.is_hr_role(auth.uid(), branch_id));

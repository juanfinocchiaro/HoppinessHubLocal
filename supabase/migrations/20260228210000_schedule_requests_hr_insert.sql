-- Allow HR/manager roles to create schedule requests for branch staff
-- while preserving self-service inserts for own user.
DROP POLICY IF EXISTS "schedule_requests_insert_consolidated" ON public.schedule_requests;

CREATE POLICY "schedule_requests_insert_consolidated" ON public.schedule_requests
FOR INSERT TO authenticated
WITH CHECK (
  (
    user_id = auth.uid()
    AND can_access_branch(auth.uid(), branch_id)
  )
  OR is_hr_role(auth.uid(), branch_id)
);

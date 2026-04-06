
-- Table for employee consumptions (what employees consumed from the branch as customers)
CREATE TABLE public.employee_consumptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  consumption_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_employee_consumptions_branch_date ON public.employee_consumptions (branch_id, consumption_date);
CREATE INDEX idx_employee_consumptions_user ON public.employee_consumptions (user_id);

-- Enable RLS
ALTER TABLE public.employee_consumptions ENABLE ROW LEVEL SECURITY;

-- RLS policies using existing helpers
CREATE POLICY "employee_consumptions_select"
ON public.employee_consumptions
FOR SELECT
TO authenticated
USING (
  public.is_superadmin(auth.uid())
  OR public.has_branch_access_v2(auth.uid(), branch_id)
);

CREATE POLICY "employee_consumptions_insert"
ON public.employee_consumptions
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_superadmin(auth.uid())
  OR public.is_hr_role(auth.uid(), branch_id)
);

CREATE POLICY "employee_consumptions_update"
ON public.employee_consumptions
FOR UPDATE
TO authenticated
USING (
  public.is_superadmin(auth.uid())
  OR public.is_hr_role(auth.uid(), branch_id)
);

CREATE POLICY "employee_consumptions_delete"
ON public.employee_consumptions
FOR DELETE
TO authenticated
USING (
  public.is_superadmin(auth.uid())
  OR public.is_hr_role(auth.uid(), branch_id)
);

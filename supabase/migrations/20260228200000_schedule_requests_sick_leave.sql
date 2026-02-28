-- Expand request_type to include sick_leave and vacation
ALTER TABLE public.schedule_requests
  DROP CONSTRAINT IF EXISTS schedule_requests_request_type_check;

ALTER TABLE public.schedule_requests
  ADD CONSTRAINT schedule_requests_request_type_check
    CHECK (request_type IN ('day_off', 'shift_change', 'sick_leave', 'vacation', 'other'));

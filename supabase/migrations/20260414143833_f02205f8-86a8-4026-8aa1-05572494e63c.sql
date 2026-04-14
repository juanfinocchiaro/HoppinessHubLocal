
-- Fix over-applied payment links and redistribute excess via FIFO
-- Step 1: Identify over-applied links and cap them at invoice capacity
DO $$
DECLARE
  inv RECORD;
  link RECORD;
  legacy_paid NUMERIC;
  capacity NUMERIC;
  used NUMERIC;
  excess NUMERIC;
  total_excess NUMERIC;
  target_inv RECORD;
  apply_amount NUMERIC;
BEGIN
  -- Process each branch+supplier combination
  FOR inv IN 
    SELECT DISTINCT si.branch_id, si.proveedor_id
    FROM supplier_invoices si
    WHERE si.deleted_at IS NULL
  LOOP
    total_excess := 0;
    
    -- For each invoice in this branch+supplier (oldest first), cap links
    FOR inv IN
      SELECT si.id, si.total, si.invoice_date, si.due_date
      FROM supplier_invoices si
      WHERE si.branch_id = inv.branch_id
        AND si.proveedor_id = inv.proveedor_id
        AND si.deleted_at IS NULL
      ORDER BY si.due_date ASC NULLS LAST, si.invoice_date ASC
    LOOP
      NULL; -- placeholder
    END LOOP;
  END LOOP;
END $$;

-- Simpler approach: direct fix for the known data pattern
-- 1. Get legacy paid for CANON-2026-01-MANANTIALES
-- Legacy payments (via invoice_id): imputación 7,492.79
-- Link: 2,500,000 but invoice total is 2,389,815.66
-- Max link should be: 2,389,815.66 - 7,492.79 = 2,382,322.87
-- Excess: 2,500,000 - 2,382,322.87 = 117,677.13

-- Cap the over-applied link
UPDATE invoice_payment_links
SET applied_amount = 2382322.87
WHERE pago_id = '76e844cb-9753-4467-9c72-da2696482ac9'
  AND invoice_id = 'c6d0d42c-0a41-4bc3-912b-4420a70c253e';

-- Add the excess to CANON-2026-02-MANANTIALES  
INSERT INTO invoice_payment_links (pago_id, invoice_id, applied_amount)
VALUES ('76e844cb-9753-4467-9c72-da2696482ac9', '58adb976-6629-4b3c-b440-268c29451cff', 117677.13)
ON CONFLICT (pago_id, invoice_id) DO UPDATE SET applied_amount = invoice_payment_links.applied_amount + 117677.13;

-- 2. Now recalculate ALL pending_balance and payment_status
WITH invoice_totals AS (
  SELECT 
    si.id,
    si.total,
    COALESCE((
      SELECT SUM(ipl.applied_amount) 
      FROM invoice_payment_links ipl 
      WHERE ipl.invoice_id = si.id
    ), 0) AS linked_paid,
    COALESCE((
      SELECT SUM(sp.amount)
      FROM supplier_payments sp
      WHERE sp.invoice_id = si.id
        AND sp.deleted_at IS NULL
    ), 0) AS legacy_paid
  FROM supplier_invoices si
  WHERE si.deleted_at IS NULL
)
UPDATE supplier_invoices si
SET 
  pending_balance = GREATEST(0, it.total - it.linked_paid - it.legacy_paid),
  payment_status = CASE
    WHEN GREATEST(0, it.total - it.linked_paid - it.legacy_paid) <= 0 THEN 'pagado'
    WHEN (it.linked_paid + it.legacy_paid) > 0 THEN 'parcial'
    ELSE si.payment_status
  END
FROM invoice_totals it
WHERE si.id = it.id;

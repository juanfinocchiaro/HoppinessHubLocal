
-- Recalculate pending_balance for invoices that use invoice_payment_links
-- This covers invoices where payments were linked but balance wasn't updated
WITH invoice_totals AS (
  SELECT 
    si.id,
    si.total,
    -- Sum from invoice_payment_links (new system)
    COALESCE((
      SELECT SUM(ipl.applied_amount) 
      FROM invoice_payment_links ipl 
      WHERE ipl.invoice_id = si.id
    ), 0) AS linked_paid,
    -- Sum from legacy invoice_id on supplier_payments
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
    WHEN GREATEST(0, it.total - it.linked_paid - it.legacy_paid) = 0 THEN 'pagado'
    WHEN (it.linked_paid + it.legacy_paid) > 0 THEN 'parcial'
    ELSE si.payment_status
  END
FROM invoice_totals it
WHERE si.id = it.id
  AND si.pending_balance != GREATEST(0, it.total - it.linked_paid - it.legacy_paid);

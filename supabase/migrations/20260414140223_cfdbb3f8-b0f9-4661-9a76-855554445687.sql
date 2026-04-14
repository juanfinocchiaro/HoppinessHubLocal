-- Relink the 2 orphaned payments to the Feb 2026 invoice
UPDATE public.supplier_payments
SET invoice_id = '5f3c173a-dc83-4755-920d-9c1d35ab0418'
WHERE id IN ('68629842-508d-4680-89c9-370335f7a5bf', '1a7b3341-4d47-4b3a-b4f1-8cf418b05eb7')
  AND invoice_id IS NULL;

-- Recalculate pending_balance for the Feb 2026 invoice  
UPDATE public.supplier_invoices
SET pending_balance = GREATEST(0, total - COALESCE((
  SELECT SUM(amount) FROM public.supplier_payments
  WHERE invoice_id = '5f3c173a-dc83-4755-920d-9c1d35ab0418'
    AND is_verified = true
    AND deleted_at IS NULL
), 0)),
payment_status = CASE
  WHEN COALESCE((
    SELECT SUM(amount) FROM public.supplier_payments
    WHERE invoice_id = '5f3c173a-dc83-4755-920d-9c1d35ab0418'
      AND is_verified = true
      AND deleted_at IS NULL
  ), 0) >= total THEN 'pagado'
  WHEN COALESCE((
    SELECT SUM(amount) FROM public.supplier_payments
    WHERE invoice_id = '5f3c173a-dc83-4755-920d-9c1d35ab0418'
      AND is_verified = true
      AND deleted_at IS NULL
  ), 0) > 0 THEN 'parcial'
  ELSE 'pendiente'
END
WHERE id = '5f3c173a-dc83-4755-920d-9c1d35ab0418';
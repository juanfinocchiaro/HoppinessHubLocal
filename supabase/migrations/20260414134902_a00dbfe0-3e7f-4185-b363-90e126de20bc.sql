
ALTER TABLE public.stock_movements
  DROP CONSTRAINT stock_movimientos_factura_proveedor_id_fkey;
ALTER TABLE public.stock_movements
  ADD CONSTRAINT stock_movimientos_factura_proveedor_id_fkey
  FOREIGN KEY (supplier_invoice_id) REFERENCES public.supplier_invoices(id) ON DELETE SET NULL;

ALTER TABLE public.supplier_payments
  DROP CONSTRAINT pagos_proveedores_factura_id_fkey;
ALTER TABLE public.supplier_payments
  ADD CONSTRAINT pagos_proveedores_factura_id_fkey
  FOREIGN KEY (invoice_id) REFERENCES public.supplier_invoices(id) ON DELETE CASCADE;

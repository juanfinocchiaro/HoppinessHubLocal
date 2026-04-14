
ALTER TABLE public.supply_cost_history
  DROP CONSTRAINT insumos_costos_historial_factura_id_fkey;

ALTER TABLE public.supply_cost_history
  ADD CONSTRAINT supply_cost_history_invoice_id_fkey
  FOREIGN KEY (invoice_id) REFERENCES supplier_invoices(id) ON DELETE SET NULL;



## Scan completo: Columnas legacy en COMPRAR + CANON

Encontré **muchos** nombres de columnas legacy en español que no coinciden con las columnas reales de la base de datos. Esto causa que las queries silenciosamente no devuelvan datos (por eso el historial y saldos aparecen vacíos).

### Tabla de discrepancias encontradas

```text
TABLA                    CÓDIGO USA (legacy)         DB REAL
─────────────────────────────────────────────────────────────
supplier_payments        factura_id                  invoice_id
                         referencia                  reference
                         verificado_por              verified_by
                         verificado_at               verified_at
                         verificado_notas            verified_notes

invoice_payment_links    factura_id                  invoice_id
                         monto_aplicado              applied_amount

canon_settlements        ventas_id                   monthly_sales_id
                         fc_total                    online_total
                         ft_total                    cash_total
                         periodo                     period
                         fecha_vencimiento           due_date

canon_payments           canon_liquidacion_id        canon_settlement_id
                         referencia                  reference
                         (verificado_por/at/notas)   verified_by/at/notes

invoice_items (RPC)      tipo_item                   item_type (RPC ya mapea)
                         cantidad                    quantity (RPC ya mapea)
                         precio_unitario             unit_price (RPC ya mapea)
                         afecta_costo_base           affects_base_cost (RPC ya mapea)
                         categoria_pl                pl_category (RPC ya mapea)
                         iva_monto                   vat_amount (RPC ya mapea)
                         precio_unitario_bruto       gross_unit_price (RPC ya mapea)

supplier_invoices        total_factura               invoice_total
```

**Nota**: La RPC `insert_complete_invoice` ya tiene `COALESCE` para aceptar ambos nombres, así que las inserciones de facturas funcionan. El problema principal es en las **lecturas** y en los **pagos/canon**.

### Archivos a modificar

1. **`src/services/financialService.ts`** (~15 cambios)
   - `createCanonLiquidacion`: `ventas_id` → `monthly_sales_id`, `fc_total` → `online_total`, `ft_total` → `cash_total`, `periodo` → `period`, `fecha_vencimiento` → `due_date`
   - `fetchPagosCanon`: `.eq('canon_liquidacion_id', ...)` → `.eq('canon_settlement_id', ...)`
   - `fetchPagosCanonFromProveedores`: `.select(...)` cambiar `referencia` → `reference`, `verificado_por` → `verified_by`, `verificado_at` → `verified_at`, `verificado_notas` → `verified_notes`; `.eq('factura_id', ...)` → `.eq('invoice_id', ...)`
   - `createPagoCanon`: `canon_liquidacion_id` → `canon_settlement_id`, `referencia` → `reference`
   - `fetchPagosProveedor`: `.select('monto_aplicado, ...')` → `.select('applied_amount, ...')`, `.eq('factura_id', ...)` → `.eq('invoice_id', ...)`; fallback legacy idem
   - `createPagoProveedor`: `referencia` → `reference`; junction rows: `factura_id` → `invoice_id`, `monto_aplicado` → `applied_amount`
   - `approvePagoProveedor`: `verificado_por` → `verified_by`, `verificado_at` → `verified_at`, `verificado_notas` → `verified_notes`
   - `rejectPagoProveedor`: `verificado_notas` → `verified_notes`

2. **`src/services/proveedoresService.ts`** (~4 cambios)
   - `fetchMovimientosProveedorData`: selects de pagos con `referencia` → `reference`
   - `fetchPagosCanonFromProveedores`: `factura_id` → `invoice_id`

3. **`src/hooks/useCuentaCorrienteProveedor.ts`** (~2 cambios)
   - Mapeo de `referencia` → `reference` al construir movimientos de pagos

4. **`src/types/ventas.ts`** (~3 cambios)
   - `CanonLiquidacionFormData`: `ventas_id` → `monthly_sales_id`, `fc_total` → `online_total`, `ft_total` → `cash_total`
   - `PagoCanonFormData`: `canon_liquidacion_id` → `canon_settlement_id`, `referencia` → `reference`

5. **`src/types/compra.ts`** (~2 cambios)
   - `PagoProveedorFormData`: `referencia` → `reference`, `aplicaciones.factura_id` → `invoice_id`, `aplicaciones.monto_aplicado` → `applied_amount`

6. **`src/components/finanzas/PagoProveedorModal.tsx`** — actualizar refs a nuevos nombres de campos
7. **`src/components/finanzas/PagoCanonModal.tsx`** — actualizar refs a nuevos nombres de campos
8. **`src/components/finanzas/VerificarPagoModal.tsx`** — `referencia` → `reference`
9. **`src/pages/admin/CanonPage.tsx`** — `referencia` → `reference`

### Resultado esperado
- Los saldos de proveedores se mostrarán correctamente
- El historial de cuenta corriente mostrará facturas y pagos
- Los pagos de canon se podrán registrar y consultar
- La verificación de pagos funcionará


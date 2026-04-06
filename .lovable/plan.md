
# Corrección masiva de errores de build — Spanish→English naming

## Resumen
~60 errores de TypeScript en 14+ archivos. Todos son propiedades en español que los types/interfaces ya definen en inglés. Se corrigen las referencias en los componentes para que coincidan.

## Archivos y cambios

### 1. `EmployeeSummaryPanel.tsx` — variables no usadas
- Prefixar `workingSince` y `entryId` con `_`

### 2. `PosHistoryView.tsx`, `AccountItemRow.tsx`, `OrderPanel.tsx` — `notas` → `notes`

### 3. `ConfigForm.tsx`, `ConfigHeader.tsx`, `ConfigSummaryLine.tsx`
- `clienteNombre` → `customerName`
- `clienteTelefono` → `customerPhone`
- `clienteDireccion` → `customerAddress`

### 4. `ChangeInvoiceModal.tsx`
- `tipo_comprobante` → `receipt_type`
- `punto_venta` → `point_of_sale`
- `numero_comprobante` → `receipt_number`

### 5. `ModifiersModal.tsx`
- `source.nombre` → `source.name`
- Extras/removibles: `nombre`→`name`, `cantidad`→`quantity`

### 6. `SalesAnalysisTab.tsx`
- `r.medio_pago` → `r.payment_method`

### 7. `ModificadoresTab.tsx`
- `grupo.nombre`→`grupo.name`, `grupo.costo_promedio`→`grupo.average_cost`
- `gi.insumos`→`gi.supplies`, `gi.preparaciones`→`gi.recipes`
- `gi.cantidad`→`gi.quantity`, `gi.costo_unitario`→`gi.unit_cost`

### 8. `NewExtraForm.tsx`, `NewRemovibleForm.tsx`
- `ing.nombre` → `ing.name`
- `selectedInsumo.cantidad` → `selectedInsumo.quantity`

### 9. `PromoCard.tsx`, `PromoFormFields.tsx`, `PromoItemRow.tsx`
- `promo.activa` → `promo.is_active`
- `e.cantidad` → `e.quantity`
- `form.description` → `form.descripcion`

No se tocan tipos ni interfaces — solo se actualizan las referencias en componentes.


# Corrección masiva de errores de build — Spanish→English naming

## Resumen
~60 errores de TypeScript en 14 archivos. Todos son propiedades en español que los types/interfaces ya definen en inglés. Se corrigen las referencias en los componentes.

## Archivos y cambios

### 1. `src/components/local/EmployeeSummaryPanel.tsx`
- Línea 98: prefixar `workingSince` con `_` o usar en el template (variable no usada)
- Línea 175: prefixar `entryId` con `_` en el destructuring

### 2. `src/components/local/sales/PosHistoryView.tsx`
- Línea 99: `i.notas` → `i.notes` (ya hay fallback `i.notas ?? i.notes`, simplificar a `i.notes`)

### 3. `src/components/pos/AccountItemRow.tsx`
- Línea 88: `item.notas` → `item.notes`

### 4. `src/components/pos/OrderPanel.tsx`
- Línea 159: `it.notas` → `it.notes`

### 5. `src/components/pos/ConfigForm.tsx`
- `clienteDireccion` → `customerAddress` (líneas 106, 108, 362, 363)
- `clienteTelefono` → `customerPhone` (líneas 146, 308, 310)
- `clienteNombre` → `customerName` (líneas 268, 269, 283, 285, 290, 325, 343, 344)

### 6. `src/components/pos/ConfigHeader.tsx`
- Línea 19: `clienteNombre` → `customerName`

### 7. `src/components/pos/ConfigSummaryLine.tsx`
- `clienteNombre` → `customerName` (líneas 33-36)
- `clienteTelefono` → `customerPhone` (línea 39)
- `clienteDireccion` → `customerAddress` (línea 40)

### 8. `src/components/pos/ChangeInvoiceModal.tsx`
- `tipo_comprobante` → `receipt_type` (líneas 49, 57, 99)
- `punto_venta` → `point_of_sale` (línea 85)
- `numero_comprobante` → `receipt_number` (línea 86)

### 9. `src/components/pos/ModifiersModal.tsx`
- Línea 102: `source.nombre` → `source.name`
- Líneas 281-292: mapear extras/removibles con `name`/`quantity` en vez de `nombre`/`cantidad`
- Línea 304-306: `nombre` → `name` en CartItemOpcional (ya usa `name` en el tipo)
- Líneas 318-329: `e.cantidad` → `e.quantity`, `e.nombre` → `e.name`, `r.nombre` → `r.name`

### 10. `src/components/pos/SalesAnalysisTab.tsx`
- `r.medio_pago` → `r.payment_method` (líneas 159, 449, 450)

### 11. `src/components/menu/ModificadoresTab.tsx`
- Línea 259: `grupo.nombre` → `grupo.name`
- Línea 262: `grupo.costo_promedio` → `grupo.average_cost`
- Línea 272: `gi.insumos` → `gi.supplies`, `gi.preparaciones` → `gi.recipes`
- Línea 274: `gi.cantidad` → `gi.quantity`, `gi.costo_unitario` → `gi.unit_cost`

### 12. `src/components/menu/NewExtraForm.tsx`
- Línea 117: `ing.nombre` → `ing.name` (DeepIngredient ya tiene `name`)

### 13. `src/components/menu/NewRemovibleForm.tsx`
- Líneas 75, 101: `selectedInsumo.cantidad` → `selectedInsumo.quantity` (InsumoLike usa `quantity`)
- Línea 149: `ing.nombre` → `ing.name`

### 14. `src/components/promociones/PromoCard.tsx`
- `promo.activa` → `promo.is_active` (líneas 33, 64)

### 15. `src/components/promociones/PromoFormFields.tsx`
- Línea 51: `e.cantidad` → `e.quantity` (PromoItemExtraDraft usa `quantity`)
- Línea 52: `it.precio_base` → `it.base_price` (PromoItemDraft usa `base_price`)
- Línea 167: `form.activa` → `form.is_active`
- Línea 173: `form.description` → `form.descripcion` (PromocionFormData tiene `descripcion`)

### 16. `src/components/promociones/PromoItemRow.tsx`
- `e.cantidad` → `e.quantity` (líneas 30, 40, 47, 52, 99)
- `nombre` → `name` en el draft object (línea 40)

## Detalle técnico
No se tocan tipos ni interfaces — todos ya están en inglés. Solo se actualizan las **referencias** en los componentes para que coincidan con los tipos definidos.

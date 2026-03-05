

# Auditoría DB: Lo que falta (sin frontend)

Comparado el prompt-6 contra el estado real de la base de datos. Fases 0, 1, 3 y 4 completadas. Fase 2 casi completa.

---

## ✅ YA COMPLETADO — No requiere acción

| Item | Estado |
|------|--------|
| 58 tablas renombradas (Fase 3) | Done |
| ~140 columnas renombradas (Fase 2) | ~95% done |
| Booleanos sin `is_`/`has_` (Fase 1) | Done |
| Tablas muertas eliminadas (Fase 0) | Done |
| 3 enums migrados: `order_area`, `payment_method`, `work_position_type` (Fase 4) | Done |
| `brand_role_type` / `local_role_type` | No existen como enums PG (son TEXT), nada que migrar |
| Vistas: columnas internas ya en inglés | Done (verificado `balance_socios`, `cuenta_corriente_*`, `webapp_menu_items`) |

---

## ⚠️ PENDIENTE — 6 columnas en tablas reales

| Tabla | Columna actual | Nuevo nombre |
|-------|---------------|--------------|
| `discount_codes` | `monto_minimo_pedido` | `min_order_amount` |
| `suppliers` | `contacto` | `contact` |
| `branch_closure_config` | `habilitado` | `enabled` |
| `orders` | `requiere_factura` | `requires_invoice` |
| `supplier_invoices` | `total_factura` | `invoice_total` |
| `brand_closure_config` | `categoria_padre` | `parent_category` (nota: plan.md lo marca como intencionalmente mantenido por alto impacto FK) |

---

## ⚠️ PENDIENTE — 3 vistas con nombres en español

| Vista actual | Sugerido |
|-------------|----------|
| `balance_socios` | `partner_balance` |
| `cuenta_corriente_marca` | `brand_current_account` |
| `cuenta_corriente_proveedores` | `supplier_current_account` |

(Las columnas internas de estas vistas ya están en inglés, solo falta el nombre de la vista.)

---

## ⚠️ PENDIENTE — ~25 funciones DB con nombres en español

Funciones que siguen con nombre en español:

| Función actual | Sugerido |
|---------------|----------|
| `actualizar_saldo_factura` | `update_invoice_balance` |
| `actualizar_total_factura` | `update_invoice_total` |
| `asignar_llamador` | `assign_pager` |
| `calcular_costo_real_factura` | `calculate_real_invoice_cost` |
| `calcular_costo_unidad_base` | `calculate_base_unit_cost` |
| `calcular_margen_producto` | `calculate_product_margin` |
| `calcular_saldo_socio` | `calculate_partner_balance` |
| `descontar_stock_pedido` | `deduct_order_stock` |
| `fn_actualizar_costo_insumo_desde_compra` | `update_supply_cost_from_purchase` |
| `generar_factura_canon` | `generate_canon_invoice` |
| `generar_numero_pedido` | `generate_order_number` |
| `generar_shift_closure_desde_pos` | `generate_shift_closure_from_pos` |
| `liberar_llamador` | `release_pager` |
| `obtener_proximo_numero_factura` | `get_next_invoice_number` |
| `procesar_distribucion_utilidades` | `process_profit_distribution` |
| `recalcular_costo_item_carta` | `recalculate_menu_item_cost` |
| `recalcular_costo_preparacion` | `recalculate_recipe_cost` |
| `recalcular_todos_los_costos` | `recalculate_all_costs` |
| `sumar_stock_desde_compra` | `add_stock_from_purchase` |
| `insert_factura_completa` | `insert_complete_invoice` |
| `check_porcentajes_suman_100` | `check_percentages_sum_100` |
| `is_franquiciado_or_contador_for_branch` | `is_franchisee_or_accountant_for_branch` |
| `is_socio_admin` | `is_partner_admin` |
| `validate_canal_tipo_ajuste` | `validate_channel_adjustment_type` |
| `validate_estado_certificado` | `validate_certificate_status` |
| `validate_insumo_nivel_control` | `validate_supply_control_level` |
| `validate_item_factura_tipo` | `validate_invoice_item_type` |
| `validate_menu_producto_tipo` | `validate_menu_product_type` |
| `validate_modificador` | `validate_modifier` |

---

## ❌ EXCLUIDO INTENCIONALMENTE (no migrar)

- **FK columns en español:** `pedido_id`, `proveedor_id`, `item_carta_id`, `socio_id`, `categoria_carta_id`, `categoria_padre` — alto impacto cascading, documentado en plan.md.
- **`user_roles_v2`** — mantiene sufijo `_v2` por riesgo en permisos.

---

## Resumen ejecutivo

| Categoría | Pendiente |
|-----------|-----------|
| Columnas en español | 6 (5 + 1 excluida) |
| Vistas con nombre en español | 3 |
| Funciones DB con nombre en español | ~25 |
| Enums | 0 (todo migrado) |
| Tablas | 0 (todo migrado) |

**Propuesta:** Ejecutar 3 migraciones SQL:
1. **Migración A:** 5 ALTER COLUMN para las columnas pendientes
2. **Migración B:** DROP + CREATE de las 3 vistas con nombres en inglés
3. **Migración C:** Renombrar las ~25 funciones (DROP + CREATE con nuevo nombre, preservando el cuerpo)

Todo SQL puro. Sin tocar frontend.


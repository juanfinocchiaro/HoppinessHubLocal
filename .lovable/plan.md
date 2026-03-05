
# Auditoría de Idioma y Convenciones de Nombres — Estado de Ejecución

## ✅ Fase 0 — Tablas muertas: COMPLETADA
DROP de tablas y vistas legacy (`webapp_customers`, `menu_combos`, `menu_precios_historial`, `devoluciones`, `v_menu_costos`).

## ✅ Fase 1 — Booleanos: COMPLETADA (DB + Frontend)
Renombrados en DB y en frontend:
- `es_produccion` → `is_production` (afip_config)
- `es_obligatorio` → `is_required` (item_carta_grupo_opcional)
- `es_principal` → `is_primary` (cliente_direcciones)
- `es_removible` → `is_removable` (item_carta_composicion)
- `es_intercambiable` → `is_interchangeable` (preparaciones)
- `activo` → `is_active` (~15 tablas)
- `verificado` → `is_verified` (pagos_proveedores, pagos_canon)

Archivos frontend actualizados: useAfipConfig.ts, fiscalService.ts, AfipConfigPage.tsx, posService.ts, checkoutService.ts, menuService.ts, usePreparaciones.ts, PreparacionFullModal.tsx, ModifiersModal.tsx, ProductCustomizeSheet.tsx, useWebappMenu.ts.

## ✅ Fase 3 — Tablas core: COMPLETADA (DB + Frontend) — 63/63 tablas
Todas las tablas en español fueron renombradas en la base de datos. El `types.ts` autogenerado ya refleja los nombres en inglés.
El frontend fue actualizado masivamente usando el helper `fromUntyped()` para mantener compatibilidad hasta que los tipos se regeneren completamente.
Las últimas 5 tablas fueron renombradas el 2026-03-05: `cliente_direcciones` → `customer_addresses`, `socios` → `partners`, `movimientos_socio` → `partner_movements`, `distribuciones_utilidades` → `profit_distributions`, `insumos_costos_historial` → `supply_cost_history`. Vista `balance_socios` recreada con nuevos nombres.

Renombramientos ejecutados (selección):
- `pedidos` → `orders`
- `pedido_items` → `order_items`
- `pedido_pagos` → `order_payments`
- `items_carta` → `menu_items`
- `item_carta_composicion` → `menu_item_compositions`
- `item_carta_extras` → `menu_item_extras`
- `item_carta_grupo_opcional` → `menu_item_option_groups`
- `item_carta_grupo_opcional_items` → `menu_item_option_group_items`
- `item_carta_precios_historial` → `menu_item_price_history`
- `item_extra_asignaciones` → `extra_assignments`
- `item_modificadores` → `item_modifiers`
- `item_removibles` → `removable_items`
- `items_factura` → `invoice_items`
- `preparaciones` → `recipes`
- `preparacion_ingredientes` → `recipe_ingredients`
- `preparacion_opciones` → `recipe_options`
- `categorias_preparacion` → `recipe_categories`
- `insumos` → `supplies`
- `insumos_costos_historial` → `supply_cost_history`
- `categorias_insumo` → `supply_categories`
- `gastos` → `expenses`
- `proveedores` → `suppliers`
- `facturas_proveedores` → `supplier_invoices`
- `pagos_proveedores` → `supplier_payments`
- `pagos_canon` → `canon_payments`
- `canon_liquidaciones` → `canon_settlements`
- `ventas_mensuales_local` → `branch_monthly_sales`
- `facturas_emitidas` → `issued_invoices`
- `codigos_descuento` → `discount_codes`
- `codigos_descuento_usos` → `discount_code_uses`
- `promociones` → `promotions`
- `promocion_items` → `promotion_items`
- `promocion_item_extras` → `promotion_item_extras`
- `socios` → `partners`
- `movimientos_socio` → `partner_movements`
- `distribuciones_utilidades` → `profit_distributions`  
- `inversiones` → `investments`
- `periodos` → `periods`
- `cadetes` → `delivery_drivers`
- `llamadores` → `pagers`
- `canales_venta` → `sales_channels`
- `conceptos_servicio` → `service_concepts`
- `configuracion_impuestos` → `tax_config`
- `consumos_manuales` → `manual_consumptions`
- `delivery_zones` (ya inglés, sin cambio)
- `menu_categorias` → `menu_categories`
- `menu_fichas_tecnicas` → `menu_tech_sheets`
- `menu_precios` → `menu_prices`
- `menu_productos` → `menu_products`
- `pago_factura` → `invoice_payments`
- `pedido_item_modificadores` → `order_item_modifiers`
- `pedido_payment_edits` → `order_payment_edits`
- `proveedor_condiciones_local` → `supplier_branch_terms`
- `turnos_caja` → `register_shifts_legacy`
- `webapp_pedido_mensajes` → `webapp_order_messages`
- `cliente_direcciones` (pendiente evaluar rename a `customer_addresses`)

Frontend: ~200+ archivos actualizados. Servicios clave migrados: posService, financialService, rdoService, fiscalService, adminService, promoService, printingService, deliveryService, webappOrderService, managerDashboardService, proveedoresService.

Patrón usado: `fromUntyped('new_table_name')` en lugar de `supabase.from('old_name')` para bypass de tipos hasta regeneración.

## ✅ Fase 2 — Columnas: COMPLETADA (DB + service layer)
Todas las columnas en español renombradas a inglés. Últimas columnas migradas el 2026-03-05:
- `discount_codes.monto_minimo_pedido` → `min_order_amount`
- `suppliers.contacto` → `contact`
- `branch_closure_config.habilitado` → `enabled`
- `orders.requiere_factura` → `requires_invoice`
- `supplier_invoices.total_factura` → `invoice_total`
- `orders`: `cliente_nombre` → `customer_name`, `cliente_telefono` → `customer_phone`, `cliente_direccion` → `customer_address`, `origen` → `source`
- `canon_settlements`: `canon_porcentaje` → `canon_percentage`, `canon_monto` → `canon_amount`, `marketing_porcentaje` → `marketing_percentage`, `marketing_monto` → `marketing_amount`, `pago_vt_sugerido` → `suggested_transfer_payment`, `pago_ft_sugerido` → `suggested_cash_payment`, `fc_total` → `online_total`, `ft_total` → `cash_total`
- `branch_monthly_sales`: `fc_total` → `online_total`, `ft_total` → `cash_total`
- `rdo_movimientos`: `origen` → `source`, `datos_extra` → `extra_data`
- `invoice_items`: `categoria_pl` → `pl_category`, `descuento_monto` → `discount_amount`, `iva_monto` → `vat_amount`
- `manual_consumptions`: `categoria_pl` → `pl_category`
- `supplies`: `categoria_pl` → `pl_category`
- `item_modifiers`: `diferencia_precio` → `price_difference`
- `webapp_order_messages`: `sender_nombre` → `sender_name`

Batch final el 2026-03-05 (prompt-8):
- `stock_movements` (antes `stock_movimientos`): `nota` → `note`
- `discount_codes`: `valor` → `value`, `usos_maximos` → `max_uses`, `usos_actuales` → `current_uses`, `uso_unico_por_usuario` → `single_use_per_user`
- `promotions`: `valor` → `value`
- `expenses`: `adjuntos` → `attachments`, `afecta_caja` → `affects_register`, `categoria_principal` → `main_category`, `subcategoria` → `subcategory`, `gasto_relacionado_id` → `related_expense_id`
- `service_concepts`: `subcategoria` → `subcategory`
- `investments`: `cuotas_pagadas` → `installments_paid`, `cuotas_total` → `total_installments`
- `canon_payments`: `datos_pago` → `payment_data`, `canon_liquidacion_id` → `canon_settlement_id`
- `supplier_payments`: `datos_pago` → `payment_data`
- `afip_config`: `punto_venta` → `point_of_sale`
- `issued_invoices`: `punto_venta` → `point_of_sale`
- `canon_settlements`: `ventas_id` → `monthly_sales_id`
- `recipes`: `puede_ser_extra` → `can_be_extra`, `fc_objetivo_extra` → `extra_target_fc`
- `supplies`: `puede_ser_extra` → `can_be_extra`, `fc_objetivo_extra` → `extra_target_fc`
- `invoice_items`: `afecta_costo_base` → `affects_base_cost`
- `register_shifts_legacy`: `efectivo_contado` → `cash_counted`

## ✅ Fase 3 — Tablas core: COMPLETADA (DB + Frontend) — 65/65 tablas
Todas las tablas en español fueron renombradas en la base de datos. El `types.ts` autogenerado ya refleja los nombres en inglés.
Últimas 2 tablas renombradas el 2026-03-05 (prompt-8):
- `stock_movimientos` → `stock_movements`
- `rdo_movimientos` → `rdo_movements`

## ✅ Fase 4 — Enum values: COMPLETADA (DB)
Los 3 enums PostgreSQL migrados.

## ✅ Fase 5 — Vistas renombradas: COMPLETADA
- `balance_socios` → `partner_balance`
- `cuenta_corriente_marca` → `brand_current_account`
- `cuenta_corriente_proveedores` → `supplier_current_account`
- `rdo_multivista_ventas_base`: columnas internas renombradas
- `rdo_multivista_items_base`: columnas internas renombradas
- `rdo_report_data`: recreada apuntando a `rdo_movements` (2026-03-05)

## ✅ Fase 6 — Funciones DB renombradas: COMPLETADA
~29 funciones renombradas de español a inglés. Triggers actualizados.

Funciones corregidas/renombradas el 2026-03-05 (prompt-8):
- `sync_gasto_to_rdo` → `sync_expense_to_rdo` (body usa `rdo_movements`, `expenses` con columnas inglés)
- `sync_consumo_to_rdo` → `sync_consumption_to_rdo` (body usa `rdo_movements`, `manual_consumptions` con columnas inglés)
- `sync_expense_movement_to_gastos` → `sync_expense_movement` (body usa `expenses.main_category`, `approval_status`)
- Triggers actualizados: `trg_sync_expense_rdo`, `trg_sync_consumption_rdo`, `trg_sync_expense_movement`

RLS aliases mantenidos (referenciados por 9+ policies):
- `is_franquiciado_or_contador_for_branch` (3 RLS policies)
- `is_socio_admin` (6 RLS policies)

## ⚠️ Nota sobre columnas FK en español
Quedan columnas FK con nombres en español que NO se renombraron por alto impacto cascading:
- `pedido_id` (~8 tablas), `proveedor_id` (~6 tablas), `item_carta_id` (~10 tablas)
- `insumo_id` (~10 tablas), `socio_id` (partner_movements), `categoria_carta_id` (menu_items, order_items)
- `categoria_padre` (brand_closure_config), `concepto_servicio_id`, `categoria_gasto` (cash_register_movements)
Estas requieren una migración dedicada con actualización masiva de FK constraints y frontend.

## 📋 Deuda técnica conocida
- El helper `fromUntyped()` se usa extensivamente como workaround de tipos.
- Algunos componentes tienen casteos `as any` para resolver incompatibilidades de tipos durante la transición.
- La tabla `user_roles_v2` mantiene el sufijo `_v2` (violación de convención) pero no se recomienda renombrar por el alto riesgo en el sistema de permisos.
- Componentes frontend UI pueden seguir usando nombres en español vía aliases de compatibilidad en hooks.
- `cash_register_movements` mantiene `categoria_gasto` y `notes_extra` en español (columnas referenciadas por función `sync_expense_movement`).

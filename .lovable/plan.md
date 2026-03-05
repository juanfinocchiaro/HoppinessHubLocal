
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

## ✅ Fase 2 — Columnas: COMPLETADA (DB done, frontend pendiente)
Migración DB ejecutada el 2026-03-05. Todas las columnas en español renombradas a inglés.

**Columnas frecuentes renombradas (~25 grupos, ~80+ ALTER):**
- `telefono` → `phone` (partners, suppliers)
- `telefono_secundario` → `secondary_phone` (suppliers)
- `direccion` → `address` (customer_addresses, suppliers)
- `fecha` → `date` (expenses, investments, partner_movements, shift_closures, stock_conteos)
- `periodo` → `period` (11 tablas: branch_monthly_sales, canon_settlements, expenses, investments, manual_consumptions, partner_movements, profit_distributions, rdo_movimientos, stock_cierre_mensual, stock_conteos, supplier_invoices)
- `concepto` → `concept` (expenses)
- `precio_unitario` → `unit_price` (invoice_items, order_items)
- `precio_base` → `base_price` (menu_items)
- `imagen_url` → `image_url` (menu_items)
- `orden` → `sort_order` (12 tablas: brand_closure_config, delivery_zones, item_modifiers, menu_categories, menu_item_compositions, menu_item_extras, menu_item_option_groups, menu_items, recipe_categories, recipe_ingredients, recipe_options, supply_categories)
- `detalle` → `details` (expenses, manual_consumptions, partner_movements)
- `motivo` → `reason` (menu_item_price_history, order_payment_edits, stock_movimientos, supply_cost_history)
- `unidad` → `unit` (recipe_ingredients, stock_actual)
- `usuario_id` → `user_id` (financial_audit_log, menu_item_price_history)
- `referencia` → `reference` (canon_payments, customer_addresses, supplier_payments)
- `fecha_vencimiento` → `due_date` (canon_settlements, expenses, supplier_invoices)
- `fecha_pago` → `payment_date` (canon_payments, expenses, supplier_payments)
- `precio_extra` → `extra_price` (item_modifiers, order_item_modifiers, recipes, supplies)
- `fuente` → `source` (branch_monthly_sales, shift_closures)
- `etiqueta` → `label` (brand_closure_config, customer_addresses)
- `factura_numero` → `invoice_number` (orders, supplier_invoices)
- `razon_social` → `business_name` (afip_config, suppliers)
- `porcentaje_ft` → `cash_percentage` (branch_monthly_sales, canon_settlements)
- `saldo_pendiente` → `pending_balance` (canon_settlements, supplier_invoices)
- `estado_conexion` → `connection_status` (afip_config, mercadopago_config)

**Columnas específicas por tabla:**
- order_payments: metodo→method
- menu_items: nombre_corto→short_name
- removable_items: nombre_display→display_name
- menu_item_price_history: precio_anterior→previous_price, precio_nuevo→new_price
- item_modifiers: cantidad_ahorro→saving_quantity, unidad_ahorro→saving_unit, costo_ahorro→saving_cost, cantidad_extra→extra_quantity, unidad_extra→extra_unit, costo_extra→extra_cost
- recipes: costo_calculado→calculated_cost, costo_manual→manual_cost
- supplies: unidad_base→base_unit, costo_por_unidad_base→base_unit_cost
- suppliers: contacto_secundario→secondary_contact
- supplier_invoices: factura_tipo→invoice_type, factura_fecha→invoice_date, condicion_pago→payment_terms, motivo_extraordinaria→extraordinary_reason
- supplier_payments: fecha_vencimiento_pago→payment_due_date
- partners: porcentaje_participacion→ownership_percentage
- partner_movements: saldo_acumulado→cumulative_balance
- branch_monthly_sales: venta_total→total_sales, efectivo→cash, cargado_por→loaded_by
- shift_closures: turno→shift, cerrado_por→closed_by
- customer_addresses: piso→floor, ciudad→city, latitud→latitude, longitud→longitude
- sales_channels: es_base→is_base
- afip_config: direccion_fiscal→fiscal_address, inicio_actividades→activity_start_date, clave_privada_enc→private_key_enc, ultimo_error→last_error, ultima_verificacion→last_verification, ultimo_nro_factura_a/b/c→last_invoice_number_a/b/c, estado_certificado→certificate_status, reglas_facturacion→invoicing_rules

Funciones actualizadas: calcular_saldo_socio, sync_expense_movement_to_gastos.
Vistas recreadas: balance_socios, cuenta_corriente_marca, cuenta_corriente_proveedores, rdo_multivista_items_base, rdo_multivista_ventas_base, rdo_report_data, webapp_menu_items.

⚠️ PENDIENTE FRONTEND: ~30 archivos tienen errores de build por referencias a columnas antiguas. Archivos afectados: ProveedorFormModal, SocioFormModal, StockHistorial, useStock, ClosureConfigPage, ProveedoresPage, adminService, configService, posService, rdoService, schedulesService.

## ❌ Fase 4 — Enum values: PENDIENTE
18 enum values en español a renombrar.
Impacto: Lógica de roles, pagos, posiciones, áreas.

| Enum type | Valores actuales (español) | Sugerido (inglés) |
|---|---|---|
| `brand_role_type` | `coordinador, informes, contador_marca` | `coordinator, reports, brand_accountant` |
| `local_role_type` | `franquiciado, encargado, contador_local, cajero, empleado` | `franchisee, manager, local_accountant, cashier, employee` |
| `payment_method` | `efectivo, tarjeta_debito, tarjeta_credito, transferencia, vales` | `cash, debit_card, credit_card, transfer, vouchers` |
| `work_position_type` | `cajero, cocinero, barista, runner, lavacopas` | `cashier, cook, barista, runner, dishwasher` |
| `order_area` | `salon, mostrador` | `dine_in, counter` |

⚠️ **Fase 4 es la de mayor riesgo**: requiere recrear enums (PostgreSQL no permite ALTER ENUM RENAME VALUE fácilmente), actualizar toda la lógica de permisos (usePermissionsV2), y cada referencia hardcodeada en el frontend.

## ⚠️ Nota sobre Fases 2 y 4
Cada fase requiere migración SQL coordinada con actualización masiva del frontend.
Renombrar 1 columna puede impactar entre 5 y 30 archivos.
Recomendación: ejecutar columna por columna o por módulo funcional.

## 📋 Deuda técnica conocida
- El helper `fromUntyped()` se usa extensivamente como workaround de tipos. Idealmente se eliminaría tras regenerar `types.ts` con el schema actualizado, pero dado que Fases 2 y 4 siguen pendientes, seguirá siendo necesario.
- Algunos componentes tienen casteos `as any` para resolver incompatibilidades de tipos durante la transición.
- La tabla `user_roles_v2` mantiene el sufijo `_v2` (violación de convención) pero no se recomienda renombrar por el alto riesgo en el sistema de permisos.

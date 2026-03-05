

# Auditoría: Lo que falta en DB (sin frontend)

Comparado el prompt contra el estado real de la base de datos. El `plan.md` marca la Fase 2 como "COMPLETADA" pero aun quedan **~60 columnas en español** en tablas reales + **3 enums** + **vistas desactualizadas**.

---

## 1. Columnas pendientes de renombrar (~60 ALTER)

Verificado contra `information_schema.columns`. Estas columnas siguen en español:

### Grupo `tipo` → `type` (~15 tablas)
| Tabla | Columna |
|-------|---------|
| brand_closure_config | `tipo` → `type` |
| discount_codes | `tipo` → `type` |
| item_modifiers | `tipo` → `type` |
| manual_consumptions | `tipo` → `type` |
| menu_items | `tipo` → `type` |
| order_item_modifiers | `tipo` → `type` |
| orders | `tipo` → `type` |
| partner_movements | `tipo` → `type` |
| promotions | `tipo` → `type` |
| recipes | `tipo` → `type` |
| service_concepts | `tipo` → `type` |
| stock_movimientos | `tipo` → `type` |
| supplier_invoices | `tipo` → `type` |
| supply_categories | `tipo` → `type` |

### Grupo `estado` → `status` (~6 tablas)
| Tabla | Columna |
|-------|---------|
| canon_settlements | `estado` → `status` |
| expenses | `estado` → `status` |
| investments | `estado` → `status` |
| order_items | `estado` → `status` |
| orders | `estado` → `status` |
| register_shifts_legacy | `estado` → `status` |
| webapp_config | `estado` → `status` |

### Grupo `notas` → `notes` (2 tablas)
| Tabla | Columna |
|-------|---------|
| order_items | `notas` → `notes` |
| shift_closures | `notas` → `notes` |

### Grupo `monto_*` → `*_amount` (5 tablas)
| Tabla | Columna actual | Nuevo |
|-------|---------------|-------|
| discount_code_uses | `monto_descontado` | `discount_amount` |
| investments | `monto_total` | `total_amount` |
| invoice_payment_links | `monto_aplicado` | `applied_amount` |
| manual_consumptions | `monto_consumido` | `consumed_amount` |
| order_payments | `monto_recibido` | `received_amount` |
| profit_distributions | `monto_distribuible` | `distributable_amount` |

### Grupo `precio_*` / `costo_*` (supplies + supply_cost_history + price_list_items)
| Tabla | Columna actual | Nuevo |
|-------|---------------|-------|
| price_list_items | `precio` | `price` |
| supplies | `precio_venta` | `sale_price` |
| supplies | `precio_referencia` | `reference_price` |
| supplies | `precio_maximo_sugerido` | `max_suggested_price` |
| supplies | `tipo_item` | `item_type` |
| supplies | `motivo_control` | `control_reason` |
| supplies | `unidad_compra` | `purchase_unit` |
| supplies | `unidad_compra_contenido` | `purchase_unit_content` |
| supplies | `unidad_compra_precio` | `purchase_unit_price` |
| supply_cost_history | `costo_anterior` | `previous_cost` |
| supply_cost_history | `costo_nuevo` | `new_cost` |
| supply_cost_history | `factura_id` | `invoice_id` |

### Columnas sueltas
| Tabla | Columna actual | Nuevo |
|-------|---------------|-------|
| brand_closure_config | `clave` | `key` |
| financial_audit_log | `usuario_email` | `user_email` |
| invoice_items | `unidad` | `unit` |
| menu_categories | `visible_en_carta` | `is_visible_menu` |
| mercadopago_config | `ultimo_test` | `last_test` |
| mercadopago_config | `ultimo_test_ok` | `last_test_ok` |
| service_concepts | `visible_local` | `is_visible_local` |
| shift_closures | `cerrado_at` | `closed_at` |
| suppliers | `numero_cuenta` | `account_number` |
| suppliers | `tipo_especial` | `special_type` |
| webapp_config | `mensaje_pausa` | `pause_message` |
| webapp_config | `tiempo_estimado_delivery_min` | `estimated_delivery_time_min` |
| webapp_config | `tiempo_estimado_retiro_min` | `estimated_pickup_time_min` |
| webapp_order_messages | `mensaje` | `message` |

---

## 2. Enums pendientes (Fase 4) — 3 enums, 10 valores

Verificado que `brand_role_type` y `local_role_type` NO existen como enums PostgreSQL (son TEXT). Solo quedan 3:

| Enum | Valores en español → inglés |
|------|-----------------------------|
| `order_area` | `salon`→`dine_in`, `mostrador`→`counter` (delivery ya OK) |
| `payment_method` | `efectivo`→`cash`, `tarjeta_debito`→`debit_card`, `tarjeta_credito`→`credit_card`, `transferencia`→`transfer`, `vales`→`vouchers` (mercadopago_qr/link ya OK) |
| `work_position_type` | `cajero`→`cashier`, `cocinero`→`cook`, `lavacopas`→`dishwasher` (barista/runner ya OK) |

---

## 3. Vistas con columnas en español (a recrear tras renames)

- `balance_socios`: `nombre`, `saldo_actual`
- `cuenta_corriente_marca`: `monto_canon`
- `cuenta_corriente_proveedores`: `monto_vencido`
- `webapp_menu_items`: `tipo`

---

## 4. Plan de ejecución

**Migración A** — ~60 ALTER TABLE para columnas pendientes. Un solo bloque SQL.

**Migración B** — 3 enums: crear nuevo tipo, ALTER columna, DROP viejo tipo. Actualizar datos existentes con UPDATE.

**Migración C** — Recrear las 4 vistas afectadas con nombres en inglés.

Actualizar `plan.md` al final.

No se toca ningún archivo frontend.


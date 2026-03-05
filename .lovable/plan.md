

# Lo que falta del prompt — Solo DB (sin frontend)

## Estado actual verificado contra la DB real

### ✅ COMPLETADO (no requiere acción)
- **Fase 0** — Tablas muertas: DROP ejecutado
- **Fase 1** — Booleanos: Todos renombrados (`activo`→`is_active`, `verificado`→`is_verified`, etc.)
- **Fase 3** — 63 tablas renombradas
- **Fase 2** — ~95% de columnas renombradas

### ⚠️ PENDIENTE EN DB — Columnas que siguen en español

Verificado con query directa a `information_schema.columns`. Solo quedan **6 columnas en tablas reales** + **3 en una tabla menor** + **vistas desactualizadas**:

| Tabla | Columna actual | Debería ser |
|-------|---------------|-------------|
| `orders` | `direccion_entrega` | `delivery_address` |
| `discount_codes` | `codigo` | `code` |
| `invoice_items` | `unidad` | `unit` |
| `afip_errores_log` | `tipo_error` | `error_type` |
| `afip_errores_log` | `codigo_afip` | `afip_code` |
| `afip_errores_log` | `mensaje` | `message` |

Además hay **~80 columnas en español** que no fueron cubiertas por las migraciones anteriores porque son menos frecuentes (ej: `fecha_ingreso`, `fecha_salida`, `fecha_carga`, `fecha_inicio`, `fecha_fin`, `fecha_emision`, `fecha_distribucion`, `fecha_proceso`, `costo_envio`, `costo_delivery`, `costo_unitario`, `costo_real`, `costo_total`, `costo_transferencia`, `costo_promedio`, `precio_promo`, `precio_referencia`, `precio_bruto`, `precio_neto`, `precio_unitario_bruto`, `numero_pedido`, `numero_llamador`, `numero_comprobante`, `numero_cuenta`, `tipo_factura`, `tipo_comprobante`, `tipo_servicio`, `tipo_proveedor`, `tipo_especial`, `tipo_impresion`, `tipo_item`, `tipo_pago`, `tipo_inversion`, `tipo_usuario`, `estado_pago`, `estado_aprobacion`, `metodo_costeo`, `factura_cae`, `factura_cuit`, `factura_razon_social`, `factura_vencimiento_cae`, `factura_url`, `factura_id`, `factura_asociada_id`, `concepto_servicio_id`, `codigo_id`, `verificado_por`, `verificado_at`, `verificado_notas`, `referencia_pago`, `tiempo_*` (6 cols en orders), `disponible_delivery`, `disponible_webapp`, `cantidad_nuevo`, `unidad_nuevo`, etc.)

### ⚠️ PENDIENTE — Vistas con columnas en español

Las vistas fueron recreadas pero algunas aún exponen columnas en español:
- `balance_socios`: `nombre`
- `cuenta_corriente_marca`: `detalle`
- `rdo_multivista_items_base`: `cantidad`, `fecha`
- `rdo_multivista_ventas_base`: `fecha`

### ❌ PENDIENTE — Fase 4: Enums (18 valores en español)

Verificado que siguen en español:

| Enum | Valores en español |
|------|--------------------|
| `order_area` | `salon`, `mostrador` |
| `payment_method` | `efectivo`, `tarjeta_debito`, `tarjeta_credito`, `transferencia`, `vales` |
| `work_position_type` | `cajero`, `cocinero`, `lavacopas` |
| `brand_role_type` | No existe como enum (probablemente TEXT) |
| `local_role_type` | No existe como enum (probablemente TEXT) |

Solo 3 enums reales requieren migración: `order_area`, `payment_method`, `work_position_type`.

### ⚠️ PENDIENTE — Build errors actuales (servicios/hooks, no UI components)

Hay ~30 errores de build. Los que son de **servicios** (no frontend puro) y necesitan fix:
- `posService.ts`: queries con `motivo`, `unidad` (columnas ya renombradas)
- `rdoService.ts`: queries con `periodo`, `direccion_fiscal`, `razon_social` (ya renombradas)
- `adminService.ts`: insert con `etiqueta`, `orden` (ahora `label`, `sort_order`)
- `configService.ts`: tipo `ClosureConfigItem` usa `etiqueta`/`orden` pero DB tiene `label`/`sort_order`
- `schedulesService.ts`: type instantiation errors

---

## Resumen de lo que falta (sin frontend)

1. **~80 columnas compuestas** aún en español en tablas reales (las más frecuentes ya se hicieron, pero quedan `fecha_*`, `costo_*`, `precio_*`, `tipo_*`, `numero_*`, `factura_*`, `tiempo_*`, etc.)
2. **6 columnas simples** no migradas (`orders.direccion_entrega`, `discount_codes.codigo`, `invoice_items.unidad`, 3 en `afip_errores_log`)
3. **5 vistas** con columnas en español expuestas
4. **3 enums** con valores en español (`order_area`, `payment_method`, `work_position_type`)
5. **~10 archivos de servicios/hooks** con errores de build por referencias a columnas antiguas (estos NO son componentes UI, son la capa de datos)


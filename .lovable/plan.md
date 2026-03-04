
# Auditoría de Idioma y Convenciones — Estado de Ejecución

## ✅ Fase 0 — Tablas muertas: COMPLETADA
DROP de tablas y vistas legacy (webapp_customers, menu_combos, menu_precios_historial, devoluciones, v_menu_costos).

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

## ❌ Fase 2 — Columnas comunes: PENDIENTE
~150 columnas en español (nombre→name, monto→amount, cantidad→quantity, orden→sort_order, etc.)
Impacto: ~200 archivos frontend, ~50 DB functions, ~20 triggers.

## ❌ Fase 3 — Tablas core: PENDIENTE
58 tablas a renombrar (pedidos→orders, items_carta→menu_items, preparaciones→recipes, etc.)
Impacto: Todas las queries del frontend, todas las DB functions, todas las RLS policies.

## ❌ Fase 4 — Enum values: PENDIENTE
18 enum values en español a renombrar.
Impacto: Lógica de roles, pagos, posiciones, áreas.

## ⚠️ Nota sobre Fases 2-4
Cada fase requiere migración SQL coordinada con actualización masiva del frontend. 
Renombrar 1 tabla implica actualizar entre 5 y 50 archivos.
Ejecutar las 3 fases juntas afectaría ~200+ archivos y es un proyecto de varias semanas.
Recomendación: ejecutar tabla por tabla o por módulo funcional.

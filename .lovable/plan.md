

## Precios por Canal en Centro de Costos

### Contexto actual

Ya existe toda la infraestructura necesaria:
- **`price_lists`**: una fila por canal con `pricing_mode` (base, percentage, fixed_amount, mirror, manual) y `pricing_value` (el % de comisión o monto fijo)
- **`price_list_items`**: overrides manuales por producto/canal
- **`useChannelPricing.ts`**: hooks y lógica de cálculo (`computeChannelPrice`, `resolveChannelMode`)
- **`ChannelPricingPage`**: ya gestiona reglas y precios por canal

No se necesitan tablas nuevas ni columnas nuevas. La columna `pricing_value` en `price_lists` ya representa la comisión de cada plataforma.

### Lo que falta es conectar esa data al Centro de Costos

### Plan

**1. Agregar tab "Canales" al panel expandido de cada item** (`ItemExpandedPanel.tsx`)

Nueva pestaña junto a Composición / Editar / Historial que muestre una tabla:

```text
Canal         | Precio Venta | Comisión  | Neto s/Com | FC%    | Margen
─────────────────────────────────────────────────────────────────────────
Mostrador     | $11.600      | —         | $9.587     | 36.2%  | $6.117
WebApp        | $11.600      | —         | $9.587     | 36.2%  | $6.117
Rappi         | $13.900      | 25% ($3.475)| $8.616   | 40.3%  | $5.147
Pedidos Ya    | $13.000      | 20% ($2.600)| $8.145   | 42.6%  | $4.676
MP Delivery   | $12.500      | 18% ($2.250)| $8.081   | 42.9%  | $4.612
```

- El precio se obtiene de `price_list_items` (override) o se calcula con la regla del canal
- La comisión se lee de `price_lists.pricing_value` cuando `pricing_mode = 'percentage'`
- FC% y Margen se recalculan considerando la comisión (neto = precio_venta × (1 - comisión%) / IVA)

**2. Crear componente `ChannelPricesInline.tsx`** en `src/components/centro-costos/`

- Recibe el `item` (con `base_price` y `total_cost`)
- Usa `usePriceLists()` y `useAllPriceListItems()` (ya existentes)
- Calcula por canal: precio final, comisión, neto post-comisión, FC%, margen
- Solo lectura — los precios se editan en la página de Precios por Canal

**3. Agregar sección colapsable "Comisiones por Canal" al Centro de Costos** (nivel página)

Un panel colapsable (similar al `ChannelRulesPanel` que ya existe en `ChannelPricingPage`) que permita:
- Ver y editar la comisión (%) de cada plataforma
- Usa `useUpdatePriceListConfig()` (ya existe) para guardar
- Solo muestra canales de apps (Rappi, PedidosYa, MP Delivery) — Mostrador y WebApp no tienen comisión

**4. Extender KPIs globales** (opcional, en AnalisisTab)

Agregar un KPI "Margen Apps" que muestre el margen promedio ponderado considerando comisiones de los canales de apps.

### Archivos a crear
- `src/components/centro-costos/ChannelPricesInline.tsx` — tabla de precios por canal en panel expandido

### Archivos a modificar
- `src/components/centro-costos/ItemExpandedPanel.tsx` — agregar tab "Canales"
- `src/pages/admin/CentroCostosPage.tsx` — agregar panel de comisiones colapsable

### Sin cambios de base de datos
Se reutiliza `price_lists.pricing_value` como comisión. No se crean tablas ni columnas nuevas.


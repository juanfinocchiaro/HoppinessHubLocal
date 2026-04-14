

## Fix: Error "Could not find 'efectivo' column of 'branch_monthly_sales'"

**Problema**: El código usa columnas con nombres viejos en español (`efectivo`, `fc_total`, `ft_total`) pero la tabla real tiene columnas en inglés (`cash`, `online_total`, `cash_total`).

**Columnas reales de la tabla**:
- `total_sales` (OK)
- `cash` (el código usa `efectivo`)
- `online_total` (el código usa `fc_total`)
- `cash_total` (el código usa `ft_total`)
- `cash_percentage`

**Cambio en un solo archivo**: `src/services/rdoService.ts`

Reemplazar en las funciones `createVentaMensual` y `updateVentaMensual`:
- `efectivo: ef` → `cash: ef`
- `fc_total: fc` → `online_total: fc`
- `ft_total: ef` → `cash_total: ef`

También agregar `cash_percentage` calculado automáticamente.


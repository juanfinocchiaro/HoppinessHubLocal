
# Refactorización UX Fichajes — Completada

## Cambios realizados

| Archivo | Cambio |
|---|---|
| `types.ts` | Agregados `anomalyDetail` y `hasManualEntry` a `RosterRow` |
| `helpers.ts` | Función `extractRowMeta()` propaga anomalías y fichajes manuales a cada fila |
| `DayOverviewBar.tsx` | **Nuevo** — fusiona `RosterSummaryBar` + `DaySummaryStats` en un solo componente compacto |
| `RosterSummaryBar.tsx` | Ya no se usa (reemplazado por DayOverviewBar) |
| `DaySummaryStats.tsx` | Ya no se usa (reemplazado por DayOverviewBar) |
| `RosterTable.tsx` | Menú contextual (⋮) siempre visible en vez de hover. Anomalías ⚠ y manual ✋ inline en estado |
| `RosterMobileList.tsx` | Mismos cambios: menú contextual, indicadores inline |
| `RosterExpandedRow.tsx` | Detalle del día primero con acciones directas. Historial mensual colapsable como secundario |
| `ClockInsPage.tsx` | Eliminado banner de anomalías genérico. Usa DayOverviewBar |

## Flujo del encargado (nuevo)

1. Abre Fichajes → ve resumen compacto en una línea
2. Filas con anomalías marcadas con ⚠, manuales con ✋
3. Click en fila → ve detalle del día con sesiones y acciones directas
4. Botón ⋮ siempre visible para corregir/eliminar/marcar licencia
5. Historial mensual disponible como sección colapsable



## Pre-cargar parámetros del horario al hacer clic en una celda

### Situación actual
Cuando se hace clic en una celda del calendario, se selecciona pero la toolbar mantiene sus valores por defecto (19:00-23:00, sin posición). El usuario tiene que cargar manualmente los valores si quiere hacer un cambio menor.

### Cambio propuesto
Al seleccionar **una sola celda** que ya tiene horario, los inputs de la toolbar se pre-llenan con los valores de esa celda (hora entrada, salida, posición, turno cortado, break).

### Implementación

**1. `SelectionToolbar.tsx`** — Agregar prop `initialValues` opcional:
- Nueva prop: `initialValues?: { startTime, endTime, position, isSplitShift, startTime2, endTime2 }`
- Usar `useEffect` que detecte cambios en `initialValues` y actualice los estados internos (`setStartTime`, `setEndTime`, `setSelectedPosition`, `setIsSplitShift`, `setStartTime2`, `setEndTime2`)

**2. `InlineScheduleEditor.tsx`** — Calcular los valores de la celda seleccionada:
- Cuando `selection.selectedCells.size === 1`, leer el `ScheduleValue` de esa celda usando `getEffectiveValue`
- Pasar esos valores como `initialValues` a `SelectionToolbar`
- Cuando hay 0 o múltiples celdas seleccionadas, pasar `undefined`

### Lógica de mapeo
```
celda.startTime → startTime (formato HH:mm)
celda.endTime → endTime
celda.position → selectedPosition
celda.startTime2 → startTime2 (si existe, activar isSplitShift)
celda.endTime2 → endTime2
```

Si la celda es Franco/Vacaciones/Cumpleaños (isDayOff), no se pre-cargan valores de tiempo.

### Archivos a modificar
- `src/components/hr/schedule-selection/SelectionToolbar.tsx`
- `src/components/hr/InlineScheduleEditor.tsx`


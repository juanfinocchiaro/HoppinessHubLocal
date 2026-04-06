

## Fix: "Detalle del día" no muestra todos los fichajes en empleados multi-turno

### Problema
Cuando un empleado tiene 2 turnos (ej: 12:00-15:00 y 19:00-02:00), el panel expandido "Detalle del día" solo muestra los fichajes del primer turno. Esto ocurre porque `RosterExpandedRow` recibe solo `mainRow` (el primer `RosterRow` del grupo), y `dayEntries` se construye únicamente desde `row.sessions`.

**Línea 103:**
```typescript
const dayEntries = row.sessions.flatMap((s) => [s.clockIn, s.clockOut].filter(Boolean));
```
Solo usa las sessions del row recibido (turno 1), ignorando el turno 2.

### Solución
Pasar **todas las rows del grupo** al `RosterExpandedRow` para que el detalle del día muestre todos los fichajes del empleado en ese día.

### Cambios

#### 1. `RosterExpandedRow.tsx` — aceptar `allRows` como prop
- Agregar prop `allRows?: RosterRow[]`
- Cambiar el cálculo de `dayEntries` para usar todas las rows:
  ```
  const dayEntries = (allRows ?? [row]).flatMap(r => r.sessions.flatMap(s => [s.clockIn, s.clockOut].filter(Boolean)))
  ```
- Deduplicar por `id` y ordenar cronológicamente

#### 2. `RosterTable.tsx` — pasar `allRows={group.rows}`
- En la llamada a `<RosterExpandedRow>` (línea 293), agregar `allRows={group.rows}`

#### 3. `RosterMobileList.tsx` — mismo cambio
- Pasar `allRows={group.rows}` en la llamada a `<RosterExpandedRow>`

### Archivos a modificar
- `src/components/local/clockins/RosterExpandedRow.tsx`
- `src/components/local/clockins/RosterTable.tsx`
- `src/components/local/clockins/RosterMobileList.tsx`




## Bug: Turno cortado con fichaje manual pierde el segundo segmento en liquidación

### Causa raíz

Leonardo tiene un **turno cortado** (12:00-15:00 / 21:00-02:00) que se guarda como **un solo registro** en `employee_schedules` (con `start_time_2` y `end_time_2`). Los 4 fichajes manuales (2 entradas + 2 salidas) se vincularon todos al **mismo `schedule_id`**.

En `pairClockEntries` (línea 172-174 de `timeEngine.ts`), cuando agrupa por `schedule_id`, usa `group.find()` que solo toma el **primer** clock_in y el **primer** clock_out, creando un solo par e ignorando el segundo turno completamente.

```text
Datos en DB (todos con schedule_id = 3245740c...):
  clock_in  14:53 (UTC) → 11:53 ARG  ← find() toma este
  clock_out 19:03 (UTC) → 16:03 ARG  ← find() toma este
  clock_in  23:56 (UTC) → 20:56 ARG  ← IGNORADO
  clock_out 03:55 (UTC) → 00:55 ARG  ← IGNORADO

Resultado: 1 par de 4h10m en vez de 2 pares (4h10m + 3h59m)
```

### Solución

**Archivo: `src/lib/timeEngine.ts`** — Modificar el bloque `bySchedule` (líneas 172-189):

En vez de tomar un solo par por `schedule_id`, emparejar **secuencialmente** todas las entradas del grupo (como ya hace el fallback sin schedule_id):

1. Dentro del loop `for (const [scheduleId, group] of bySchedule)`, en vez de `find()` para un solo clock_in/clock_out, iterar el grupo ordenado cronológicamente y emparejar cada clock_in con el siguiente clock_out
2. Esto cubre tanto turnos cortados (2 pares) como turnos simples (1 par) correctamente
3. Mantener el `scheduleId` en todos los pares generados

### Lógica nueva (pseudocódigo)

```typescript
for (const [scheduleId, group] of bySchedule) {
  let pending: RawClockEntry | null = null;
  for (const e of group) {
    if (e.entry_type === 'clock_in') {
      if (pending) {
        // clock_in sin cierre previo
        pairs.push({ clockIn: pending, clockOut: null, ... });
      }
      pending = e;
    } else if (e.entry_type === 'clock_out' && pending) {
      pairs.push({ clockIn: pending, clockOut: e, minutesWorked: diff(...), scheduleId });
      pending = null;
    }
  }
  if (pending && includeInProgress) {
    pairs.push({ clockIn: pending, clockOut: null, ... });
  }
}
```

### Archivos a modificar
- `src/lib/timeEngine.ts` — único archivo

### Impacto
- Corrige la liquidación de cualquier empleado con turno cortado fichado manualmente
- No afecta turnos simples (siguen generando 1 par)
- No requiere cambios en la UI ni en la base de datos


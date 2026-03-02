

# Fix: Turnos cortados aparecen como "No programado" en Fichajes

## Problema

`fetchDaySchedulesForClock` solo selecciona `start_time, end_time` — no trae `start_time_2, end_time_2`. Como consecuencia, cuando un empleado tiene turno cortado (ej: 12:00-17:00 / 20:00-02:00), el sistema solo conoce el primer tramo. Si el fichaje cae en el segundo tramo, no matchea con ningún turno y lo marca como **"No programado"**.

## Cambios necesarios

### 1. `src/services/hrService.ts` L685
Agregar `start_time_2, end_time_2` al select de `fetchDaySchedulesForClock`.

### 2. `src/components/local/clockins/types.ts` L25-30
Agregar `start_time_2` y `end_time_2` opcionales a `ScheduleInfo`.

### 3. `src/hooks/useClockEntries.ts` L56-61
Propagar `start_time_2` y `end_time_2` al construir el `ScheduleInfo` en `useDaySchedules`.

### 4. `src/components/local/clockins/helpers.ts`
- **`shiftLabel`** (~L290): Si hay `start_time_2`, mostrar `"12:00-17:00 / 20:00-02:00"`.
- **`groupEntriesBySchedule`** (~L103-115): Ampliar la ventana de validación para que entries en el segundo tramo también se vinculen al schedule.
- **`scheduledDurationMinutes`** (~L63): Sumar ambos tramos.
- **`resolveRowStatus`** (~L225): Usar `start_time` del primer tramo para tardanza, pero considerar que el turno puede tener dos ventanas válidas.
- **`isInWindow`**: Verificar contra ambas ventanas (primer y segundo tramo) antes de enviar a `unlinked`.


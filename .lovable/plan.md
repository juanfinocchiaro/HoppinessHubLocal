

# Plan Unificado: Consistencia entre Horarios, Fichajes y Liquidación

## Problema central
Los tres sistemas usan fuentes y lógica diferentes para los mismos conceptos. Vacaciones aparecen como "Franco" en fichajes, horas extras se calculan distinto (mensual vs diario), y la liquidación no muestra las mismas columnas que el negocio necesita.

## Archivos a modificar (8 archivos)

### 1. `src/services/hrService.ts` — Agregar `work_position` a queries
- `fetchDaySchedulesForClock`: agregar `work_position` al SELECT
- Query de schedules en `useLaborHours` (línea 275): agregar `work_position` al SELECT

### 2. `src/components/local/clockins/types.ts` — Nuevos tipos
- Agregar `position?: string | null` a `ScheduleInfo`
- Agregar `'vacation'` a `RosterRowStatus`

### 3. `src/components/local/clockins/constants.ts` — Nuevo status
- Agregar `vacation: 'Vacaciones'` a todos los records (`STATUS_LABEL`, `STATUS_COLOR`, `DOT_COLOR`, `STATUS_ORDER`)

### 4. `src/hooks/useClockEntries.ts` — Pasar `work_position`
- En `useDaySchedules`, incluir `position: row.work_position` al construir `ScheduleInfo`

### 5. `src/components/local/clockins/helpers.ts` — Distinguir vacaciones
- `shiftLabel()` (línea 341): si `schedule.is_day_off && schedule.position === 'vacaciones'` → "Vacaciones"; si `position === 'cumple'` → "Cumpleaños"
- `resolveRowStatus()` (línea 256): si `schedule.is_day_off && schedule.position === 'vacaciones'` → devolver status `'vacation'`

### 6. `src/hooks/useLaborHours.ts` — Corregir lógica de cálculo
**Cambios en la query (línea 274):** agregar `work_position` al SELECT de `employee_schedules`

**Cambios en el cálculo (líneas 345-362):** reemplazar la lógica actual:
```text
ANTES (mal):
  hsExtrasDiaHabil = max(0, hsHabiles - monthly_hours_limit)  // exceso mensual

DESPUÉS (correcto):
  Para cada día en hoursByDay:
    Si work_position='vacaciones' → diasVacaciones++ (no cuenta horas)
    Si es FERIADO → hsFeriado += horasDia
    Si es FRANCO  → hsFranco += horasDia
    Si es HÁBIL:
      hsRegulares += min(horasDia, daily_hours_limit)
      hsExtras    += max(0, horasDia - daily_hours_limit)
  
  hsTrabajadasMes = hsRegulares + hsExtras + hsFeriado + hsFranco
```

**Cambios en `EmployeeLaborSummary`:** agregar `hsRegulares`, `diasVacaciones`. Para esto necesito:
- Construir un mapa de `date → work_position` desde schedules para saber si cada día es vacaciones, franco normal, o hábil
- Iterar `hoursByDay` clasificando cada día

**Cambios en `generateLaborCSV`:** nuevas columnas alineadas con la tabla

### 7. `src/components/local/LaborHoursSummary.tsx` — Reorganizar tabla

**Columnas nuevas (en orden):**

| # | Columna | Campo |
|---|---------|-------|
| 1 | Empleado | nombre + rol |
| 2 | Hs Trabajadas | total (regulares + extras + feriado + franco) |
| 3 | Hs Regulares | `hsRegulares` — nuevo |
| 4 | Hs Extras | `hsExtrasDiaHabil` — recalculado diario |
| 5 | Hs Feriado | `feriadosHs` |
| 6 | Hs Franco | `hsFrancoTrabajado` |
| 7 | Licencia | `diasVacaciones` — días, no horas |
| 8 | Faltas Inj. | `faltasInjustificadas` |
| 9 | Presentismo | SI/NO + `(Xm)` tardanza |

**Columnas eliminadas:** CUIL, Hs Licencia, Lic. Enf., Tardanza (separada), Extras Franco

**Stats cards:** actualizar "Horas extras" para usar el nuevo cálculo

**Tooltips/leyenda:** actualizar descripciones

### 8. `src/components/local/clockins/DayOverviewBar.tsx` — Vacaciones en resumen
- Contar empleados con status `vacation` y mostrar indicador "X de vacaciones"

## Lógica unificada (los 3 sistemas)

```text
Fuente de verdad: employee_schedules.work_position

  work_position = 'vacaciones' → VACACIONES (Horarios ✅, Fichajes ✅, Liquidación ✅)
  work_position = 'cumple'     → CUMPLEAÑOS (Horarios ✅, Fichajes ✅)
  is_day_off = true (sin position especial) → FRANCO
  is_day_off = false + horario → DÍA HÁBIL

Horas extras = exceso DIARIO sobre daily_hours_limit (9hs default)
Vacaciones en liquidación = días con work_position='vacaciones' en schedules
Presentismo = sin faltas injustificadas AND tardanza acumulada ≤ 15min
```

## Sin cambios de base de datos
El campo `work_position` ya existe en `employee_schedules`.


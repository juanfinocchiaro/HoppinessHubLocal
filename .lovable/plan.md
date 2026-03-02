

# Plan: Motor de Fichaje y Liquidación — Fuente Única de Verdad

Este plan aborda los bugs críticos de la auditoría e incorpora tus respuestas de cierre. Se divide en 3 fases.

---

## Fase 1: Tabla de configuración laboral (labor_config)

Crear tabla `labor_config` asociada a `branch_id` (nullable = config global de marca) con todos los parámetros que hoy están hardcodeados:

| Campo | Tipo | Default | Descripción |
|---|---|---|---|
| `monthly_hours_limit` | numeric | 190 | Tope mensual horas hábiles |
| `daily_hours_limit` | numeric | 9 | Alerta diaria |
| `overtime_surcharge_pct` | numeric | 50 | Recargo extras día hábil |
| `holiday_surcharge_pct` | numeric | 100 | Recargo feriado/franco |
| `late_tolerance_total_min` | integer | 15 | Tolerancia acumulativa mensual (minutos) |
| `late_tolerance_per_entry_min` | integer | null | Tolerancia por fichaje individual (null = sin límite individual) |

**Archivos afectados:**
- Migración SQL para crear la tabla + insertar fila global default
- Nuevo hook `useLaborConfig(branchId)` para leer la config
- `useLaborHours.ts`: reemplazar constantes hardcodeadas por valores de `labor_config`
- `helpers.ts` línea 177: reemplazar `LATE_THRESHOLD = 10` por valor de config

---

## Fase 2: Fixes de integridad del motor de fichaje

### 2a. `deleteClockEntry` → recalcular `employee_time_state`
En `hrService.ts`, después del DELETE, consultar el último `clock_entry` del usuario y actualizar `employee_time_state` acorde. Si no quedan entradas → estado `off`.

### 2b. Protección anti-duplicados en Edge Function
En `register-clock-entry`, antes de insertar, verificar si existe un fichaje del mismo `user_id` + `entry_type` en los últimos 2 minutos. Si existe, retornar el existente sin insertar.

### 2c. Validación de solicitudes duplicadas
En `createLeaveRequest` / `createScheduleRequest`, verificar si ya existe una solicitud pendiente/aprobada para la misma fecha antes de insertar.

---

## Fase 3: Liquidación completa

### 3a. Presentismo con tardanza acumulativa
En `useLaborHours`, calcular la tardanza acumulada del mes:
- Para cada fichaje con horario programado, calcular minutos tarde (clock_in - schedule.start_time)
- Sumar solo los minutos positivos (llegadas tarde)
- `presentismo = faltasInjustificadas == 0 AND tardanzaAcumulada <= late_tolerance_total_min`
- Agregar campo `tardanzaAcumuladaMin` al `EmployeeLaborSummary`

### 3b. Retiro anticipado autorizado
- Agregar columna `early_leave_authorized` (boolean, default false) a `clock_entries`
- En `EditEntryDialog` / `AddManualEntryForm`, agregar checkbox "Retiro anticipado autorizado"
- En liquidación: las horas NO trabajadas por retiro anticipado autorizado NO se suman como trabajadas (comportamiento actual correcto, solo necesitamos que no afecte presentismo)
- Un retiro anticipado autorizado NO quita presentismo ni cuenta como falta

### 3c. Horas de licencia como columna separada
- En `useLaborHours`, cruzar `absences` (tipo `sick_leave`, `justified_absence`, `vacation`) con `employee_schedules` para obtener las horas programadas de cada día de licencia aprobada
- Agregar campo `hsLicencia` al `EmployeeLaborSummary` (columna separada, no suma a `hsTrabajadasMes`)
- Agregar columna "Hs Licencia" a la tabla de `LaborHoursSummary.tsx` y al CSV

### 3d. Horas en franco trabajado como desglose
- Separar `hsFrancoFeriado` en `hsFrancoTrabajado` y `feriadosHs` para mayor claridad en la UI y CSV

### 3e. Warning de edición retroactiva
- En `updateClockEntry` y formularios de edición, si la fecha del fichaje pertenece a un mes anterior al actual, mostrar un warning visual: "Estás editando un fichaje de un período anterior. Esto puede afectar una liquidación ya procesada."

---

## Archivos a crear/modificar

| Archivo | Acción |
|---|---|
| **Migración SQL** | Crear `labor_config` + agregar `early_leave_authorized` a `clock_entries` |
| `src/hooks/useLaborConfig.ts` | **Nuevo** — query a `labor_config` |
| `src/hooks/useLaborHours.ts` | Usar config dinámica, agregar `hsLicencia`, `tardanzaAcumuladaMin`, separar francos |
| `src/services/hrService.ts` | Fix `deleteClockEntry` (recalcular state), validar duplicados en `createLeaveRequest` |
| `supabase/functions/register-clock-entry/index.ts` | Agregar check anti-duplicados (2 min) |
| `src/components/local/LaborHoursSummary.tsx` | Agregar columnas: Hs Licencia, Tardanza Acum. |
| `src/components/local/clockins/helpers.ts` | Leer `late_tolerance` de config en vez de constante |
| CSV export (`generateLaborCSV`) | Agregar columnas nuevas |

---

## Sobre "fuente única de verdad" del motor de fichaje

La fuente de verdad es el siguiente stack, sin duplicación:

```text
FICHAJE REAL (QR/PIN)
  └─ Edge Function: register-clock-entry
       ├─ Valida PIN (RPC validate_clock_pin_v2)
       ├─ Lee employee_time_state → decide clock_in/clock_out
       ├─ Check duplicados (< 2 min)
       ├─ Empareja con schedule (hoy + overnight ayer)
       ├─ Inserta clock_entries (work_date = fecha operativa)
       └─ Actualiza employee_time_state

FICHAJE MANUAL (Encargado)
  └─ hrService.createManualClockEntry
       ├─ Misma lógica de schedule matching
       ├─ Inserta clock_entries (is_manual=true)
       └─ Actualiza employee_time_state

ELIMINACIÓN
  └─ hrService.deleteClockEntry  ← FIX: recalcular state

LIQUIDACIÓN (solo lectura)
  └─ useLaborHours
       ├─ Lee clock_entries por work_date
       ├─ Lee labor_config (config dinámica)
       ├─ Empareja por schedule_id
       └─ Calcula: horas, extras, presentismo, licencias
```

No hay otra ruta de escritura a `clock_entries` salvo estas dos + el reconciliador de turnos stale. Eso es la fuente única.


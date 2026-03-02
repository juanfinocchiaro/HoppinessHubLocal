

# Fix: Turnos cortados no se muestran en el calendario del empleado

## Diagnóstico

La DB ya tiene columnas `start_time_2` y `end_time_2` para turnos cortados, y el editor del encargado las guarda correctamente. Pero las vistas del empleado no las leen ni muestran:

1. **`fetchMySchedules`** solo selecciona `start_time, end_time` — no incluye `start_time_2, end_time_2, break_start, break_end`
2. **`MyScheduleCard.tsx`** y **`MiHorarioPage.tsx`** usan un tipo `ScheduleEntry` sin esos campos y renderizan solo un rango horario

## Cambios

| Archivo | Cambio |
|---|---|
| `src/services/schedulesService.ts` L464 | Agregar `start_time_2, end_time_2` al select de `fetchMySchedules` |
| `src/components/cuenta/MyScheduleCard.tsx` L48-55 | Agregar `start_time_2` y `end_time_2` al tipo `ScheduleEntry`. En todos los renders de horario, si hay `start_time_2`, mostrar `"12:00-17:00 / 20:00-02:00"` |
| `src/pages/cuenta/MiHorarioPage.tsx` L47-54 | Mismo cambio de tipo. Actualizar `calculateDuration` para sumar ambos tramos. Actualizar renders en "Hoy", "Esta semana" y calendario mensual |
| `src/pages/cuenta/MiHorarioPage.tsx` L135-154 | `totalHours` debe sumar también el segundo tramo |

## Formato visual

Donde hoy se muestra:
```
12:00 - 17:00
```

Se mostrará:
```
12:00-17:00 / 20:00-02:00
```

Y la duración sumará ambos tramos (ej: 5h + 6h = 11h).




# Fix: "No programado" incorrecto + nombre repetido en multi-turno

## Problema 1: Entries sin `schedule_id` aparecen como "No programado"

Cuando un usuario tiene **algunos** entries con `schedule_id` y otros sin él (ej: fichajes viejos), el sistema entra en el "new path" (`hasScheduleIds = true`) pero los entries sin `schedule_id` caen a `unlinked` → "No programado", incluso si hay un schedule vacío que les corresponde por horario.

**Fix en `helpers.ts` (~L353-390)**: Después de separar `unlinked`, intentar asignarlos a schedules vacíos por proximidad temporal (como hace el legacy rescue). Solo crear fila "No programado" si no hay schedule sin entries que matchee.

Lógica:
```
Para cada session unlinked:
  → buscar schedules que NO tengan entries en bySchedule
  → si el clockIn cae en la ventana de ese schedule → asignarlo ahí
  → solo si no matchea ninguno → crear "No programado"
```

## Problema 2: Nombre repetido en sub-rows

**Fix en `RosterTable.tsx` (~L238)** y `RosterMobileList.tsx` (~L166)**: En sub-rows, no mostrar el nombre del empleado. Dejar la celda vacía (o con un dash sutil) para que el borde izquierdo y el badge "2 turnos" del main row sean suficientes para agrupar visualmente.

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/components/local/clockins/helpers.ts` L353-390 | Rescue de entries unlinked hacia schedules vacíos antes de crear filas "No programado" |
| `src/components/local/clockins/RosterTable.tsx` L238 | Sub-row: celda de nombre vacía en vez de repetir nombre |
| `src/components/local/clockins/RosterMobileList.tsx` L166 | Idem en mobile |


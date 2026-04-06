

## Puesto por defecto en Horarios y Liquidación

### Problema
Cuando se asigna un horario sin elegir puesto, queda como "Sin puesto" tanto en el calendario como en Liquidación. El encargado tiene que elegir manualmente el puesto cada vez, aunque el empleado ya tiene uno asignado en Equipo.

### Solución
Hacer que el `default_position` del empleado (configurado en Equipo) se use automáticamente en dos lugares:

### Cambios

#### 1. Horarios — usar `default_position` al guardar celdas sin puesto
**`src/components/hr/InlineScheduleEditor.tsx`**
- En `handleCellChange` (línea ~317): si `value.position` es null/vacío, buscar el `default_position` del team member y usarlo
- Crear un mapa `teamDefaultPositions` (Map<userId, position>) a partir de `team`

#### 2. Horarios — pre-seleccionar posición en SelectionToolbar
**`src/components/hr/schedule-selection/useScheduleActions.ts`**
- En `handleApplyWithOptions`: cuando `position` es null, buscar el `default_position` de cada empleado seleccionado en lugar de dejarlo vacío
- Requiere pasar un mapa de `defaultPositions` al hook

**`src/components/hr/schedule-selection/useScheduleSelection.ts`**
- Aceptar `teamDefaultPositions` como parámetro y pasarlo a `useScheduleActions`

#### 3. Liquidación — fallback a `default_position` cuando `work_position` es null
**`src/services/hrService.ts`**
- En `fetchLaborUsersData`: incluir `default_position` del `user_role_assignments` en la respuesta

**`src/hooks/useLaborHours.ts`**
- En línea ~411: cambiar `const posKey = position || 'Sin puesto'` por `const posKey = position || userData?.default_position || 'Sin puesto'`
- En `positionByDate` (línea ~363): si `work_position` es null, usar `default_position` del usuario

### Resultado
- Al cargar horarios, el puesto se llena automáticamente con el del empleado
- En Liquidación, las horas se clasifican por el puesto real en vez de "Sin puesto"
- Si el encargado elige otro puesto manualmente, ese tiene prioridad

### Archivos a modificar
- `src/components/hr/InlineScheduleEditor.tsx`
- `src/components/hr/schedule-selection/useScheduleActions.ts`
- `src/components/hr/schedule-selection/useScheduleSelection.ts`
- `src/services/hrService.ts`
- `src/hooks/useLaborHours.ts`


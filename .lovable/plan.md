

# Fix: Datos cruzados y UX de multi-turno en Fichajes

## Problema 1: Datos cruzados
Cuando un empleado tiene dos horarios separados en el mismo día (ej: turno mañana + turno noche), los fichajes pueden caer fuera de la ventana temporal de su schedule vinculado y ser empujados a "No programado", mientras que el turno real queda vacío. Esto pasa en `groupEntriesBySchedule`: si un entry tiene `schedule_id` pero cae fuera de la ventana temporal, se envía a `unlinked` en vez de confiar en el `schedule_id` del backend.

**Fix**: Si un entry tiene `schedule_id` y ese schedule existe en la lista del día, **confiar en el `schedule_id`** sin validar ventana temporal. La ventana temporal solo debe usarse como filtro para entries **sin** `schedule_id` o con schedule_id de otro día (overnight).

### Archivo: `src/components/local/clockins/helpers.ts`
- En `groupEntriesBySchedule` (~L90-130): Eliminar la validación de ventana temporal cuando el entry tiene un `schedule_id` válido que pertenece a los schedules de hoy. Solo usar la ventana para filtrar entries cuyo `schedule_id` apunta a un schedule de otro día.

## Problema 2: UX del sub-row (↳)
La flechita `↳` debajo del nombre no comunica bien que el empleado tiene dos turnos.

**Fix**: Reemplazar la flecha por mostrar el nombre del empleado en ambas filas, pero con un borde izquierdo de color que agrupe visualmente las filas del mismo empleado. Además agregar un badge sutil `"2 turnos"` en la primera fila.

### Archivo: `src/components/local/clockins/RosterTable.tsx`
- Sub-rows (~L237-281): En vez de `↳`, mostrar el nombre del empleado con menor opacidad o estilo más sutil.
- Main row (~L196-197): Si `hasMultiple`, mostrar badge `"× 2"` o `"2 turnos"` al lado del nombre.
- Agregar un `border-l-2 border-primary/30` a las filas del grupo cuando hay múltiples turnos.


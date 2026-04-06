

# Fix Faltas Injustificadas en Liquidación

## Problema raíz

En **Fichajes**, una "falta" se detecta automáticamente: si el empleado tiene horario programado y no fichó → "Ausente".

En **Liquidación**, las faltas se cuentan desde `schedule_requests` (tabla de solicitudes). Si nadie creó un registro de ausencia para Micaela el 15/03, la falta no aparece.

**Son dos motores distintos para el mismo concepto.** Liquidación debe usar la misma lógica que Fichajes.

## Solución

Calcular faltas injustificadas directamente en `useLaborHours.ts` cruzando **schedules con clock_entries**, sin depender de `schedule_requests`.

### Lógica unificada para contar faltas

```text
Para cada día del mes hasta hoy:
  - Obtener schedules del usuario en ese día
  - Si tiene horario programado (is_day_off=false, start_time existe):
    - Si NO hay ningún clock_in ese día en completedEntries ni paired:
      - Si ese día tiene un absence aprobado en schedule_requests → falta JUSTIFICADA
      - Si no → falta INJUSTIFICADA
```

Esto replica exactamente lo que Fichajes muestra como "Ausente".

## Archivo a modificar

### `src/hooks/useLaborHours.ts`

**Reemplazar** el cálculo actual de `faltasInjustificadas` y `faltasJustificadas` (líneas 402-414) que solo cuenta registros de `schedule_requests`, por:

1. Iterar cada fecha del mes (hasta hoy, no fechas futuras)
2. Verificar si el usuario tiene schedule con `is_day_off=false` y `start_time`
3. Verificar si existe al menos un clock_in en `paired` para esa fecha
4. Si no fichó → verificar si hay absence aprobado en `schedule_requests`
   - Sí → `faltasJustificadas++` y sumar horas a `hsLicencia`
   - No → `faltasInjustificadas++`
5. Excluir días con `work_position='vacaciones'` o `'cumple'` (no son faltas)
6. Excluir feriados (no son faltas)

### Impacto en otros campos

- **Presentismo** se recalcula automáticamente (ya usa `faltasInjustificadas`)
- **Falta Justificada** (hsLicencia) también se beneficia porque ahora detecta el día aunque no haya registro en `schedule_requests`
- No se tocan las columnas de la tabla UI (ya están correctas del cambio anterior)


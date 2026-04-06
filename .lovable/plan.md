

# Reestructurar Liquidación: columnas correctas y extras hábil/inhábil

## Columnas solicitadas (en orden)

| # | Columna | Definición |
|---|---------|-----------|
| 1 | Empleado | Nombre + rol |
| 2 | Hs Trabajadas | Total de todas las horas trabajadas |
| 3 | Hs Regulares | Horas dentro del límite diario 9hs, en días hábiles (L-D), sin feriado ni franco |
| 4 | Vacaciones | Días de vacaciones configurados en Horarios (`work_position='vacaciones'`) |
| 5 | Faltas Inj. | Cantidad de faltas del mes (consistente con Fichajes) |
| 6 | Falta Justificada | Horas que suman las faltas justificadas según el horario del día |
| 7 | Tardanza | Minutos acumulados de tardanza (mismo motor que Fichajes) |
| 8 | Hs Feriados | Horas trabajadas en feriados |
| 9 | Hs Franco | Horas trabajadas en francos |
| 10 | Extras Hábil | Exceso sobre 9hs diarias en días Lunes a Viernes |
| 11 | Extras Inhábil | **NUEVO** — Exceso sobre 9hs diarias en Sábados y Domingos |
| 12 | Presentismo | SI/NO + minutos de tardanza |

## Cambios en `src/hooks/useLaborHours.ts`

### A. Nuevo campo `hsExtrasInhabil`
Agregar a `EmployeeLaborSummary` el campo `hsExtrasInhabil: number`.

### B. Clasificar extras por día de semana
En el loop de `hoursByDay`, para días hábiles (no feriado, no franco):
```text
const dayOfWeek = new Date(date + 'T12:00:00').getDay(); // 0=Dom, 6=Sab
const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

hsRegulares += min(horasDia, 9)
if (isWeekend) {
  hsExtrasInhabil += max(0, horasDia - 9)
} else {
  hsExtrasDiaHabil += max(0, horasDia - 9)
}
```

### C. Renombrar y aclarar campos
- `diasVacaciones` ya existe y se calcula desde schedules con `work_position='vacaciones'` — correcto
- `hsLicencia` ya se calcula cruzando absences justificadas con horarios — renombrar en UI a "Falta Justificada"
- `tardanzaAcumuladaMin` ya existe — mostrarlo como columna separada

### D. Actualizar `generateLaborCSV`
Agregar columna EXTRAS INHÁBIL y reorganizar columnas.

## Cambios en `src/components/local/LaborHoursSummary.tsx`

Reorganizar columnas de la tabla al orden solicitado:
1. Empleado
2. Hs Trabajadas
3. Hs Regulares
4. Vacaciones (días) — era "Licencia"
5. Faltas Inj.
6. Falta Just. (horas de `hsLicencia`)
7. Tardanza (minutos)
8. Hs Feriados
9. Hs Franco
10. Extras Hábil (`hsExtrasDiaHabil`)
11. Extras Inhábil (`hsExtrasInhabil`) — **NUEVO**
12. Presentismo

Actualizar tooltips, stats cards, y colspan del detalle expandido (colSpan=13).

## Fix build error
- `src/components/local/EmployeeSummaryPanel.tsx` línea 98: eliminar `_workingSince` no usada

## Archivos a modificar (3)
1. `src/hooks/useLaborHours.ts` — agregar `hsExtrasInhabil`, clasificar por día de semana
2. `src/components/local/LaborHoursSummary.tsx` — reorganizar columnas
3. `src/components/local/EmployeeSummaryPanel.tsx` — fix variable no usada

Los demás build errors (PromocionesPage, POSPage, FichaTecnicaTab, financialService, etc.) son pre-existentes y no están relacionados con esta funcionalidad.


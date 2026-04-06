

## Bug: "No prog" muestra horas extras falsas por no considerar turnos cortados

### Causa raíz

La función `getScheduledMinutes()` en `DayOverviewBar.tsx` y `DaySummaryStats.tsx` solo calcula los minutos programados del **primer segmento** del turno (`start_time` / `end_time`), ignorando `start_time_2` / `end_time_2`.

Ejemplo con Carolina (12:00-15:00 / 21:00-02:00):
- `getScheduledMinutes` devuelve **180 min** (solo 12:00-15:00)
- Pero trabajó **~520 min** (ambos segmentos)
- La diferencia (340 min ≈ 5h 40m) se suma como "No programado"

Esto explica los ~5h 37m que se muestran.

### Solución

Modificar `getScheduledMinutes()` en ambos archivos para sumar el segundo segmento si existe:

```typescript
function getScheduledMinutes(row: RosterRow): number | null {
  if (!row.schedule?.start_time || !row.schedule?.end_time) return null;
  const [sh, sm] = row.schedule.start_time.split(':').map(Number);
  const [eh, em] = row.schedule.end_time.split(':').map(Number);
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff <= 0) diff += 24 * 60;

  // Add second segment for split shifts
  if (row.schedule.start_time_2 && row.schedule.end_time_2) {
    const [sh2, sm2] = row.schedule.start_time_2.split(':').map(Number);
    const [eh2, em2] = row.schedule.end_time_2.split(':').map(Number);
    let diff2 = (eh2 * 60 + em2) - (sh2 * 60 + sm2);
    if (diff2 <= 0) diff2 += 24 * 60;
    diff += diff2;
  }

  return diff;
}
```

### Archivos a modificar
- `src/components/local/clockins/DayOverviewBar.tsx` — `getScheduledMinutes`
- `src/components/local/clockins/DaySummaryStats.tsx` — `getScheduledMinutes`


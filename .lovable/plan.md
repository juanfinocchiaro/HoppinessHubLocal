

## Mostrar puesto operativo en las celdas del calendario de horarios

### Situación actual

Hoy cada celda del calendario solo muestra:
- Rango horario (ej: `11:00-17:00`)
- Un **ícono pequeño** del puesto (tooltip al pasar el mouse)

El puesto asignado no se ve directamente — hay que hacer hover sobre el ícono para saber qué posición cubre.

### Cambio propuesto

Agregar el **nombre del puesto como texto** debajo del horario en cada celda, con el color correspondiente. Quedaría así:

```text
┌──────────────┐
│ 11:00-17:00  │
│ 🔥 Sandwich. │  ← nombre abreviado + ícono, en color
└──────────────┘
```

### Cambios en archivo

**`src/components/hr/InlineScheduleEditor.tsx`** (único archivo)

En la función `renderCellContent` (~línea 793-830), donde ya se renderiza el `PositionIcon` dentro de un tooltip:

1. Agregar el **label del puesto** como texto visible junto al ícono (no solo en tooltip)
2. Usar el color de `positionConfig.color` para el texto
3. Truncar nombres largos con `truncate` y `max-w` para que entre en la celda de 80px
4. Para posiciones que no están en `POSITION_ICONS` (dinámicas), mostrar el nombre capitalizado en gris

El ícono se mantiene, pero el label ahora es visible directamente sin necesidad de hover.


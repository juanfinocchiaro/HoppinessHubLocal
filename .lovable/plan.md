
## Formatear puestos y ajustar columnas del PDF de Liquidación

### Problema
1. Los puestos se muestran con guiones bajos tal como están en la base de datos (ej: `Encargado_turno` en vez de `Encargado de Turno`)
2. Las columnas no están bien dimensionadas, causando que el texto se corte o quede apretado

### Solución

**`src/utils/laborExport.ts`**:

1. **Agregar función `formatPosition()`** que reemplace guiones bajos por espacios y capitalice correctamente:
   ```typescript
   function formatPosition(pos: string | null | undefined): string {
     if (!pos) return '-';
     return pos
       .replace(/_/g, ' ')
       .replace(/\b\w/g, c => c.toUpperCase());
   }
   ```

2. **Aplicar en `buildRows()`** — en las 3 instancias donde se usa el puesto (single position, multi position header, sub-rows)

3. **Aplicar en `exportLaborExcel()`** — línea 288 donde usa `s.localRole`

4. **Ajustar `columnStyles`** del PDF para mejor distribución:
   - Empleado: 35mm → 38mm
   - Puesto: 22mm → 28mm (para que entre "Encargado de Turno")
   - Columnas numéricas: dejar en auto para que se distribuyan el espacio restante
   - Reducir fontSize general a 7.5 para que entre todo cómodo en landscape A4

### Archivo a modificar
- `src/utils/laborExport.ts`

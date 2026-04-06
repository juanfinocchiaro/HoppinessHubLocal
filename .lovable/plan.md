

## Fix: Input pierde foco al escribir en "Fichaje manual"

### Causa raíz
`ManualEntryForm` está definido como un componente inline (función dentro de `RosterExpandedRow`, línea 182). Cada vez que el usuario escribe en el campo "Motivo", cambia el estado `manualReason`, lo cual re-renderiza el padre, que **recrea** `ManualEntryForm` como una función nueva. React lo interpreta como un componente distinto, lo desmonta y lo vuelve a montar — perdiendo el foco del input.

### Solución
Convertir `ManualEntryForm` de componente inline a JSX directo (inline el markup en lugar de llamarlo como `<ManualEntryForm />`). Esto evita el problema de identidad de componente sin necesidad de extraerlo a un archivo separado.

En la línea 248 donde se usa `<ManualEntryForm dateStr={dayDateStr} eventKey={...} />`, reemplazar por el JSX del formulario directamente. Lo mismo para cualquier otro lugar donde se use `<ManualEntryForm />` en el archivo (verificar las líneas del historial mensual ~línea 400+).

Eliminar la definición de `ManualEntryForm` (líneas 182-217) y pegar el contenido directamente donde se invoca.

### Archivo a modificar
- `src/components/local/clockins/RosterExpandedRow.tsx`




## Consumos y Adelantos en Liquidación

### Situación actual
- La tabla `salary_advances` ya existe y funciona (se cargan desde Equipo > Adelantos)
- La tabla `employee_consumptions` **no existe** en la base de datos
- El PayrollClosingPanel (cierre contable) ya consulta ambas tablas, pero la página de Liquidación (`LaborHoursSummary`) no muestra ni consumos ni adelantos por empleado
- No hay forma de cargar consumos de empleados desde ningún lugar

### Plan

#### 1. Crear tabla `employee_consumptions`
Migration SQL para registrar consumos de empleados en el local:

```sql
CREATE TABLE public.employee_consumptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  amount NUMERIC NOT NULL DEFAULT 0,
  consumption_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  source TEXT NOT NULL DEFAULT 'manual',  -- 'manual' | 'automatic' (futuro)
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

ALTER TABLE public.employee_consumptions ENABLE ROW LEVEL SECURITY;
-- Políticas RLS usando helpers existentes
```

El campo `source` distingue carga manual vs automática futura (ej. desde cierre de caja).

#### 2. Agregar consumos y adelantos a cada EmployeeCard en Liquidación
En la barra de badges inferior de cada card (donde ya están Vacaciones, Faltas, Tardanza, Presentismo), agregar:
- **Consumos: $X** — total consumido en el mes
- **Adelantos: $X** — total de adelantos del mes

Fetch de datos: consultar `employee_consumptions` y `salary_advances` filtrando por `branch_id` y rango del mes seleccionado, agrupando por `user_id`.

#### 3. Botón para cargar consumos manualmente
En cada EmployeeCard, agregar un botón "+" (o dentro del dropdown de acciones) que abra un modal simple para registrar un consumo:
- Fecha (default hoy)
- Monto
- Descripción (opcional)

#### 4. Incluir en exports PDF/Excel
Agregar columnas "Consumos" y "Adelantos" tanto en el PDF como en el Excel de liquidación, y actualizar el glosario de referencias.

### Archivos a modificar
- **Nueva migración** — crear tabla `employee_consumptions` con RLS
- `src/services/hrService.ts` — funciones CRUD para consumos
- `src/hooks/useLaborHours.ts` o hook nuevo — fetch de consumos y adelantos por empleado/mes
- `src/components/local/LaborHoursSummary.tsx` — mostrar consumos/adelantos en badges + botón de carga
- Nuevo: `src/components/local/EmployeeConsumptionModal.tsx` — modal de carga manual
- `src/utils/laborExport.ts` — agregar columnas al PDF/Excel + glosario

### Preparación para carga automática
El campo `source = 'manual' | 'automatic'` permite que en el futuro, cuando se implemente el cierre de caja con consumos de empleados, el sistema inserte registros con `source = 'automatic'`. La UI ya mostrará ambos sin cambios.


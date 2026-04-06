## Override de encargado en fichaje bloqueado por reglamento

### Problema
Cuando un empleado tiene el fichaje bloqueado por no firmar el reglamento, la encargada no puede desbloquearlo desde la pantalla pública `/fichaje/:branchCode`.

### Solución
Agregar botón "Autorizar como encargado" en el step `regulation-blocked`. Al presionarlo, se muestra un input de PIN. Si el PIN pertenece a un encargado/franquiciado de esa sucursal, se permite continuar al paso de cámara.

### Cambios

#### 1. `src/services/hrService.ts` — nueva función
```typescript
export async function validateManagerOverridePin(branchCode: string, pin: string) {
  // Buscar branch por clock_code, luego buscar en user_role_assignments
  // un usuario con ese clock_pin + rol encargado/franquiciado en esa branch
  // Retorna { user_id, full_name } o null
}
```
Usa query a `branches` (por clock_code), luego `user_role_assignments` join `roles` (key in encargado, franquiciado, superadmin) join `profiles` (full_name), filtrando por `clock_pin = pin` y `branch_id` (o branch_id IS NULL para superadmin).

#### 2. `src/pages/FichajeEmpleado.tsx`
- Agregar estado: `managerOverride` (boolean), `managerPin` (string), `managerName` (string), `showManagerPinInput` (boolean)
- En step `regulation-blocked`: agregar botón "Autorizar como encargado"
  - Al presionar: muestra input de PIN de 4 dígitos
  - Al completar: llama `validateManagerOverridePin`
  - Si válido: setManagerOverride(true), avanzar a step `camera`
  - Si inválido: toast error
- En `clockMutation`: pasar `override_manager_name` al edge function (solo para registro/auditoría, no bloquea)

#### 3. `supabase/functions/register-clock-entry/index.ts`
- Aceptar campo opcional `override_manager_name` en el body
- Si presente, guardarlo en `manual_reason` del clock_entry (agregar al insert)

### Archivos
- `src/services/hrService.ts`
- `src/pages/FichajeEmpleado.tsx`
- `supabase/functions/register-clock-entry/index.ts`

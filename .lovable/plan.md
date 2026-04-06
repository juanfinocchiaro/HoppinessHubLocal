## Override de encargado en fichaje bloqueado por reglamento

### Cambios

#### 1. `src/services/hrService.ts` — nueva función después de línea 1010

Agregar `validateManagerOverridePin(branchCode, pin)`:
- Busca branch por `clock_code`
- Query `user_role_assignments` con `clock_pin = pin`, join `roles` filtrando `key IN ('encargado', 'franquiciado', 'superadmin')`, `is_active = true`
- Filtra por `branch_id` para roles de sucursal (superadmin no necesita branch)
- Busca `full_name` en `profiles`
- Retorna `{ user_id, full_name }` o `null`

#### 2. `src/pages/FichajeEmpleado.tsx`

**Nuevos estados:**
- `showManagerPinInput: boolean` (false)
- `managerPin: string` ('')
- `managerOverride: { name: string } | null` (null)
- `managerValidating: boolean` (false)

**En step `regulation-blocked` (líneas 357-368):**
Después del Alert existente, agregar:
- Separador con "ó"
- Botón "Autorizar como encargado" → setShowManagerPinInput(true)
- Si `showManagerPinInput`: Input PIN 4 dígitos con auto-submit
- Al completar PIN: llamar `validateManagerOverridePin(branchCode, managerPin)`
  - Si válido: setManagerOverride({ name }), avanzar a step `camera`, startCamera()
  - Si inválido: toast.error("PIN de encargado incorrecto")

**En clockMutation (línea 192):**
Agregar al body: `override_manager_name: managerOverride?.name || undefined`

**Import:** agregar `validateManagerOverridePin` a los imports de hrService, agregar `ShieldCheck` de lucide-react

#### 3. `supabase/functions/register-clock-entry/index.ts`

**En interface ClockEntryRequest (línea 10):**
Agregar: `override_manager_name?: string`

**En destructuring del body (línea 68):**
Agregar `override_manager_name`

**En insert clock_entry (línea 499):**
Agregar: `manual_reason: override_manager_name ? \`Override encargado: ${override_manager_name} - reglamento pendiente\` : null`

Desplegar edge function después de los cambios.
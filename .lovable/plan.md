

## Fix: Costos no se actualizan al guardar composición

### Problema raíz

Se identificaron **3 problemas** que impiden la actualización de costos:

1. **`recalculate_menu_item_cost` no tiene `SECURITY DEFINER`** — La función ejecuta un `UPDATE menu_items SET total_cost = ...` pero RLS está activo en `menu_items`. Sin `SECURITY DEFINER`, el UPDATE falla silenciosamente porque opera bajo las políticas RLS del usuario llamante.

2. **`recalculate_recipe_cost` tampoco tiene `SECURITY DEFINER`** — Mismo problema para recálculo de recetas.

3. **El botón "Recalcular Todo" llama a una función que no existe** — `adminService.ts` invoca `recalcular_todos_los_costos` (nombre viejo), pero la función actual se llama `recalculate_all_costs`.

### Plan

**Paso 1: Migración SQL** — Recrear ambas funciones con `SECURITY DEFINER`:

```sql
CREATE OR REPLACE FUNCTION public.recalculate_menu_item_cost(_item_id uuid)
RETURNS void LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public AS $$
-- misma lógica actual, ahora con SECURITY DEFINER
$$;

CREATE OR REPLACE FUNCTION public.recalculate_recipe_cost(_recipe_id uuid)
RETURNS void LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public AS $$
-- misma lógica actual, ahora con SECURITY DEFINER
$$;
```

**Paso 2: Corregir llamada en frontend** — En `src/services/adminService.ts`, cambiar:
```typescript
// De:
await supabase.rpc('recalcular_todos_los_costos' as never);
// A:
await supabase.rpc('recalculate_all_costs' as never);
```

### Resultado esperado
Al guardar composición, el costo se actualizará inmediatamente. El botón "Recalcular Todo" también funcionará.


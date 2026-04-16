

## Fix: Triggers con nombres de columnas/tablas antiguos

### Problema
Al crear un nuevo Item de Carta aparece el error **"record 'new' has no field 'activo'"**. Esto ocurre porque dos funciones de trigger siguen usando nombres antiguos (`activo`, `items_carta`) después de que las tablas y columnas fueron renombradas (`is_active`, `menu_items`).

### Funciones afectadas

1. **`seed_branch_item_availability_for_item()`** — trigger en `menu_items` al insertar
   - Usa `NEW.activo` → debe ser `NEW.is_active`

2. **`seed_branch_item_availability_for_branch()`** — trigger en `branches` al insertar
   - Referencia `items_carta` → debe ser `menu_items`
   - Usa `i.activo` → debe ser `i.is_active`

### Plan

Una migración SQL que recrea ambas funciones con los nombres correctos:

```sql
-- Fix function 1: references NEW.activo → NEW.is_active
CREATE OR REPLACE FUNCTION public.seed_branch_item_availability_for_item()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_active IS DISTINCT FROM true OR NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.branch_item_availability (branch_id, item_carta_id)
  SELECT b.id, NEW.id FROM public.branches b WHERE b.is_active = true
  ON CONFLICT (branch_id, item_carta_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Fix function 2: references items_carta.activo → menu_items.is_active
CREATE OR REPLACE FUNCTION public.seed_branch_item_availability_for_branch()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_active IS DISTINCT FROM true THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.branch_item_availability (branch_id, item_carta_id)
  SELECT NEW.id, i.id FROM public.menu_items i
  WHERE i.is_active = true AND i.deleted_at IS NULL
  ON CONFLICT (branch_id, item_carta_id) DO NOTHING;
  RETURN NEW;
END;
$$;
```

No se necesitan cambios en código frontend — el error es puramente de base de datos.


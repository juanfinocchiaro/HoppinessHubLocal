

## Plan: Normalización del modelo de roles y permisos

### Contexto actual

**Tablas actuales:**
- `user_roles_v2` — brand_role (ENUM `brand_role_type`), legacy `local_role` y `branch_ids[]`
- `user_branch_roles` — local_role (ENUM `local_role_type`), branch_id, clock_pin
- `permission_config` — allowed_roles (text[]), array desnormalizado

**Helpers RLS (SECURITY DEFINER):**
- `is_superadmin` → lee `user_roles_v2.brand_role = 'superadmin'`
- `get_brand_role` → lee `user_roles_v2.brand_role`
- `get_local_role` → lee `user_roles_v2.local_role` (legacy)
- `has_branch_access_v2` → lee `user_roles_v2.branch_ids[]` (legacy!)
- `can_access_branch` → lee `user_branch_roles`
- `is_hr_role` → lee `user_branch_roles`
- `is_branch_manager_v2` → lee `user_branch_roles`
- `is_financial_for_branch` → lee `user_roles_v2` (legacy)

**Datos:** 7 brand roles activos, 48 branch roles activos, 107 registros en permission_config.

---

### Fase A — Crear tablas nuevas y migrar datos (una sola migración SQL)

**1. Tabla `roles`**
```sql
CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('brand', 'branch')),
  hierarchy_level INTEGER NOT NULL DEFAULT 0,
  is_system BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Insertar 10 roles (5 brand + 5 branch) con hierarchy_level coherente con `ROLE_PRIORITY` existente.

**2. Tabla `permissions`**
```sql
CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('brand', 'local')),
  category TEXT NOT NULL,
  is_editable BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Migrar los 107 registros de `permission_config` (sin `allowed_roles`).

**3. Tabla `role_permissions` (many-to-many)**
```sql
CREATE TABLE public.role_permissions (
  role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);
```

Migrar datos expandiendo cada `permission_config.allowed_roles[]` en filas individuales, haciendo JOIN por `roles.key`.

**4. Tabla `user_role_assignments`**
```sql
CREATE TABLE public.user_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role_id, branch_id)
);
```

Migrar:
- `user_roles_v2` (brand_role activo) → assignment con `branch_id = NULL`
- `user_branch_roles` (activos) → assignment con `branch_id` correspondiente

**5. RLS para las 4 tablas nuevas**
- `roles` y `permissions`: SELECT para authenticated, ALL solo superadmin
- `role_permissions`: SELECT para authenticated, ALL solo superadmin
- `user_role_assignments`: SELECT propio + HR/superadmin, INSERT/UPDATE para superadmin y managers

---

### Fase B — Reescribir helpers RLS para leer del nuevo modelo

Reescribir las 8 funciones SECURITY DEFINER para que consulten `user_role_assignments + roles` en lugar de ENUMs directamente:

- **`is_superadmin(_user_id)`** → EXISTS en `user_role_assignments` JOIN `roles` WHERE `key = 'superadmin'`
- **`get_brand_role(_user_id)`** → SELECT `r.key` FROM `user_role_assignments ura` JOIN `roles r` WHERE `scope = 'brand'` ORDER BY `hierarchy_level DESC` LIMIT 1
- **`get_local_role(_user_id)`** → igual, scope = 'branch' (mantener compatibilidad de retorno TEXT)
- **`has_branch_access_v2(_user_id, _branch_id)`** → is_superadmin OR EXISTS en `user_role_assignments` WHERE branch_id matches
- **`can_access_branch`** → similar a has_branch_access_v2
- **`is_hr_role`** → EXISTS en `user_role_assignments` JOIN `roles` WHERE key IN ('franquiciado','encargado') AND branch_id matches
- **`is_branch_manager_v2`** → igual que is_hr_role
- **`is_financial_for_branch`** → superadmin OR key IN ('contador_marca') OR branch-level ('franquiciado','encargado','contador_local')

**Cambio de tipo de retorno clave:** `get_brand_role` y `get_local_role` actualmente retornan ENUM types. Se cambiarán a retornar `TEXT` y se actualizarán las políticas RLS que hacen cast a ENUM (ej: `= 'coordinador'::brand_role_type` → `= 'coordinador'`).

---

### Fase C — Adaptar frontend

**1. `usePermissionOverrides.ts`** — Reescribir para leer de `role_permissions` + `permissions` + `roles` en lugar de `permission_config.allowed_roles[]`.

**2. `usePermissionConfig.ts`** — Adaptar la UI de admin para leer/escribir `role_permissions` (INSERT/DELETE) en lugar de UPDATE de arrays.

**3. `permissionsService.ts`** — Nuevas funciones:
- `fetchPermissions()` (tabla `permissions`)
- `fetchRolePermissions()` (JOIN)
- `toggleRolePermission(roleId, permissionId)` (INSERT/DELETE en `role_permissions`)

**4. `PermissionsConfigPage.tsx`** — Adaptar para usar las nuevas funciones y mostrar roles desde la tabla `roles`.

**5. Sin cambios en:** guards, `useDynamicPermissions`, `usePermissions`, `useRoleLanding` — estos siguen funcionando porque consumen los helpers que ya fueron reescritos.

---

### Lo que NO se cambia

- No se eliminan ENUMs (`brand_role_type`, `local_role_type`)
- No se eliminan tablas legacy (`user_roles_v2`, `user_branch_roles`, `permission_config`)
- No se tocan políticas RLS existentes (solo los helpers que invocan)
- No cambia el comportamiento funcional

### Resumen de archivos

```text
MIGRACIÓN SQL (1 archivo):
  - 4 tablas nuevas + RLS + datos migrados + 8 helpers reescritos

FRONTEND (4 archivos):
  - src/services/permissionsService.ts (nuevas funciones)
  - src/hooks/usePermissionOverrides.ts (leer role_permissions)
  - src/hooks/usePermissionConfig.ts (admin UI)
  - src/pages/admin/PermissionsConfigPage.tsx (adaptar UI)
```


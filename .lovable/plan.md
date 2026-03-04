

# Auditoría y Actualización de Permisos + Botón Informativo

## Diagnóstico: Gaps entre DB y Código

Audité las 3 fuentes de verdad: la tabla `permission_config` (DB), `usePermissions.ts` (hardcoded), y `useDynamicPermissions.ts` (override dinámico).

### Permisos en DB pero NO conectados al código dinámico

| permission_key | En DB | Wired en useDynamic |
|---|---|---|
| `brand.viewSalesTable` | ✅ | ❌ |
| `brand.viewCommunications` | ✅ | ❌ |
| `brand.viewConfig` | ✅ | ❌ |
| `brand.editBranches` | ✅ | ❌ |
| `brand.manageRegulations` | ✅ | ❌ |
| `brand.viewRegulations` | ✅ | ❌ |
| `brand.viewClosureConfig` | ✅ | ❌ |
| `local.addTeamMember` | ✅ | ❌ (usa `inviteEmployees`) |
| `local.editTeamMember` | ✅ | ❌ |
| `local.approveRequests` | ✅ | ❌ |
| `local.viewSchedules` | ✅ | ❌ |
| `local.viewRegulationSignatures` | ✅ | ❌ |
| `local.viewConfig` | ✅ | ❌ |

### Permisos en código pero SIN entrada en DB

| permission_key | En código | En DB |
|---|---|---|
| `brand.viewProducts` | ✅ | ❌ |
| `brand.editProducts` | ✅ | ❌ |
| `local.inviteEmployees` | ✅ | ❌ (DB usa `addTeamMember`) |

### Permisos hardcoded que nunca pasan por `permission_config`

Varios permisos en `useDynamicPermissions` usan directamente `permissions.local.X` sin pasar por `getPermission()`:
- `canViewStock`, `canOrderFromSupplier`, `canDoInventoryCount`
- `canClockInOut`, `canViewMonthlyHours`, `canDeactivateEmployees`, `canCancelSalaryAdvance`
- `canAccessPOS`, `canViewKitchen`, `canAssignDelivery`, `canOperateDelivery`, `canOpenRegister`, `canCloseRegister`
- `canViewSalesReports`, `canViewCMV`, `canViewStockMovements`
- `canConfigPrinters`, `canConfigShifts`
- Todos los de `brand`: `canManageModifiers`, `canManageIngredients`, `canEditPrices`, `canManagePromotions`, `canManageSuppliers`, `canManageDeliveryPricing`, `canManageDeliveryZones`, `canManageChannels`, `canManageIntegrations`

---

## Plan de Implementación

### 1. Migración SQL: Insertar permisos faltantes en `permission_config`

Agregar las filas que faltan para que TODOS los permisos del sistema estén configurables:

**Brand (nuevos):**
- `brand.viewProducts` — "Ver Carta y Productos" — Catálogos Marca
- `brand.editProducts` — "Editar Carta y Productos" — Catálogos Marca
- `brand.manageModifiers` — "Gestionar Modificadores" — Catálogos Marca
- `brand.manageIngredients` — "Gestionar Ingredientes" — Catálogos Marca
- `brand.editPrices` — "Editar Precios" — Catálogos Marca
- `brand.managePromotions` — "Gestionar Promociones" — Catálogos Marca
- `brand.manageDeliveryPricing` — "Gestionar Precios Delivery" — Delivery
- `brand.manageDeliveryZones` — "Gestionar Zonas Delivery" — Delivery
- `brand.manageChannels` — "Gestionar Canales" — Configuración
- `brand.manageIntegrations` — "Gestionar Integraciones" — Configuración

**Local (nuevos):**
- `local.viewStock` — "Ver Stock" — Stock
- `local.orderFromSupplier` — "Pedir a Proveedor" — Stock
- `local.doInventoryCount` — "Hacer Conteo" — Stock
- `local.clockInOut` — "Fichar Entrada/Salida" — Fichajes
- `local.viewMonthlyHours` — "Ver Horas Mensuales" — RRHH
- `local.deactivateEmployees` — "Desactivar Empleados" — Equipo
- `local.cancelAdvance` — "Cancelar Adelantos" — Adelantos
- `local.accessPOS` — "Acceder al POS" — POS
- `local.viewKitchen` — "Ver Cocina (KDS)" — POS
- `local.assignDelivery` — "Asignar Delivery" — POS
- `local.operateDelivery` — "Operar Delivery" — POS
- `local.openRegister` — "Abrir Caja" — POS
- `local.closeRegister` — "Cerrar Caja" — POS
- `local.viewSalesReports` — "Ver Reportes de Ventas" — Finanzas
- `local.viewCMV` — "Ver CMV" — Finanzas
- `local.viewStockMovements` — "Ver Movimientos Stock" — Stock
- `local.configPrinters` — "Configurar Impresoras" — Configuración
- `local.configShifts` — "Configurar Turnos" — Configuración

Además, arreglar el key mismatch: `local.inviteEmployees` en código vs `local.addTeamMember` en DB → renombrar en DB a `local.inviteEmployees` para coincidir con el código.

### 2. Conectar TODOS los permisos al override dinámico

**Archivo: `src/hooks/useDynamicPermissions.ts`**

Cambiar todos los permisos que hoy usan `permissions.local.X` directamente para que pasen por `getPermission('local.xxx', localRole, permissions.local.X)`. Lo mismo para los de `brand`.

Esto asegura que CADA permiso visible en la tabla de configuración realmente se aplique cuando se togglea.

### 3. Agregar descripciones a `permission_config`

Agregar columna `description` a la tabla (o usar un mapa estático en el frontend) con textos explicativos de cada permiso. Ejemplo:
- `local.viewTeam` → "Permite ver la lista de empleados del local, sus datos de contacto y posición"
- `brand.viewDashboard` → "Permite acceder al dashboard principal de Mi Marca con métricas consolidadas"

Usaré un **mapa estático en el frontend** para evitar migración de columna y mantener flexibilidad.

### 4. Botón informativo (Info Popup) en la UI

**Archivo: `src/pages/admin/PermissionsConfigPage.tsx`**

Al lado de cada nombre de permiso en la tabla, agregar un pequeño icono `Info` (de lucide) que al hacer hover o click muestre un `Tooltip` o `Popover` con la descripción de qué hace ese permiso exactamente.

```text
| Ver Equipo ⓘ | ✅ | ✅ | ❌ | ❌ | ❌ |
                 ↕
         ┌──────────────────────────────┐
         │ Permite ver la lista de      │
         │ empleados, datos de contacto │
         │ y posiciones asignadas.      │
         └──────────────────────────────┘
```

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| **Migración SQL** | INSERT de ~28 permisos faltantes + fix key mismatch |
| `src/hooks/useDynamicPermissions.ts` | Conectar todos los permisos al `getPermission()` |
| `src/pages/admin/PermissionsConfigPage.tsx` | Agregar botón info con tooltip por permiso |
| Nuevo: `src/constants/permissionDescriptions.ts` | Mapa de `permission_key → descripción` |


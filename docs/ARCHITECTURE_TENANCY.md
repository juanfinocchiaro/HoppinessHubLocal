# Arquitectura de Tenancy — Location-First

> Versión post-Sprint-6. Reemplaza el modelo "Brand-First" previo.

## Modelo de datos

```
accounts (1 SaaS customer)
  └── locations (N físicos: "Nueva Córdoba", "Villa Allende")
        └── user_location_access (capabilities por usuario × location)
  └── user_account_access (capabilities de cuenta por usuario)
  └── suppliers (account_id, branch_id nullable)
  └── promotions (account_id)
  └── discount_codes (account_id)
  └── delivery_pricing_config (account_id)
```

## Presencia de catálogo (Sprint 2)

Basado en el patrón Square CatalogObject:

- `menu_items.present_at_all_locations = TRUE` → el ítem está disponible en TODOS los locales (default).
- `menu_items.present_at_all_locations = FALSE` → sólo en los locales listados en `product_location_presence`.
- `product_location_presence` registra EXCEPCIONES: `is_present` puede ser TRUE (incluir) o FALSE (excluir).

### Cómo leer la presencia en un local

```sql
-- ¿Está el ítem X disponible en el local L?
SELECT
  CASE
    WHEN m.present_at_all_locations = 1 THEN
      COALESCE(
        (SELECT is_present FROM product_location_presence
         WHERE product_id = m.id AND location_id = :locationId),
        1  -- default: presente
      )
    ELSE
      COALESCE(
        (SELECT is_present FROM product_location_presence
         WHERE product_id = m.id AND location_id = :locationId),
        0  -- default: ausente
      )
  END AS is_visible
FROM menu_items m WHERE m.id = :productId;
```

## Permisos (Sprint 3)

Reemplaza el enum `role` por capabilities composables:

| Tabla | Descripción |
|-------|-------------|
| `user_location_access` | Capabilities de un usuario en un local específico |
| `user_account_access` | Capabilities de un usuario a nivel cuenta (cross-location) |

### LocationCapability

| Key | Descripción |
|-----|-------------|
| `operate_pos` | Usar el POS (tomar pedidos) |
| `manage_staff` | Gestionar equipo |
| `manage_inventory` | Stock e insumos |
| `manage_catalog_local` | Editar carta local |
| `view_finance` | Ver finanzas (sólo lectura) |
| `manage_finance` | Editar finanzas |
| `manage_promotions` | Crear/editar promos |

### AccountCapability

| Key | Descripción |
|-----|-------------|
| `view_aggregate_sales` | Ver ventas de todos los locales |
| `view_aggregate_finance` | Ver finanzas consolidadas |
| `manage_account_catalog` | Editar carta a nivel cuenta |
| `manage_account_users` | Gestionar usuarios |
| `manage_account_settings` | Config general de la cuenta |

## LocationSwitcher (Sprint 4)

El componente `<LocationSwitcher />` se renderiza sólo cuando el usuario tiene acceso a >1 local o tiene `account_access`. Los usuarios de single-location nunca lo ven.

La selección se persiste en `localStorage` con la clave `hoppiness:selected_location`.

El contexto `CurrentLocationContext` expone:
- `current: { id, name, isAggregate }` — el local activo (o `__all__` para vista agregada)
- `setLocationId(id)` — cambiar local activo

## Rutas (Sprint 4)

Las rutas `/app/*` son el nuevo canónico; `/mimarca` y `/milocal` redirigen a ellas durante la transición.

```
/app/productos          → /mimarca/productos (redirect temporal)
/app/carta              → /mimarca/carta
/app/promociones        → /mimarca/promociones
/app/canales-venta      → /mimarca/canales-venta
/app/proveedores        → /mimarca/finanzas/proveedores
```

## Proveedores (Sprint 1 + 5)

- `suppliers.account_id` = tenant root (reemplaza `ambito='marca'`).
- `suppliers.branch_id` nullable = exclusivo de ese local (NULL = compartido por la cuenta).
- `suppliers.ambito` eliminada.
- `proveedor_sugerido_id` y `proveedor_obligatorio_id` en `supplies` son hints opcionales; no se fuerzan.

## Scoping (Sprint 1)

`parseScopeFromQuery` traduce query params a `ScopeContext`:

| Query | ScopeContext |
|-------|--------------|
| `scope=location&branch_id=<uuid>` | `{ type: 'location', id }` |
| `scope=account` | `{ type: 'account' }` |
| `branch_id=<uuid>` | `{ type: 'location', id }` (legacy) |
| `scope=brand` | `{ type: 'account' }` (legacy alias) |
| `branch_id=__marca_only__` | `{ type: 'account' }` (deprecated) |

`whereScope` genera SQL para filtrar por scope, incluyendo recursos de cuenta compartidos hacia abajo.

## Migraciones

| Script | Propósito |
|--------|-----------|
| `db:migrate:tenancy-s1` | Tablas billing, rename branches→locations, account_id |
| `db:migrate:tenancy-s2` | product_location_presence + backfill |
| `db:migrate:tenancy-s3` | user_location_access + user_account_access + migrar roles |
| `db:migrate:tenancy-s5` | Supplier liberation (nullability confirmada) |

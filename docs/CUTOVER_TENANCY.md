# Runbook: Cutover Tenancy Unification

> Ventana de mantenimiento recomendada: 15-30 min fuera de horario pico.

## Pre-requisitos

1. **Backup de DB**: `cp data/hoppiness.db data/hoppiness.db.backup-$(date +%Y%m%d-%H%M)`
2. **WAL checkpoint**: Asegurar que los archivos `.db-shm` y `.db-wal` estén sincronizados antes del backup.
3. **Frontend build** listo y testeado en staging.

## Pasos

### 1. Mantenimiento IN

Avisar al equipo y cerrar acceso al panel:
```bash
# Opcional: poner banner de mantenimiento en frontend
```

### 2. Detener el backend

```powershell
# En la terminal del backend (Ctrl+C si está corriendo con npm run dev)
# O en producción: pm2 stop hoppiness-backend
```

### 3. Correr las migraciones en orden

```powershell
cd "c:\Hoppiness Hub\hoppiness-hub-platform"

# Sprint 1: accounts, branches→locations, account_id, drop ambito
npm run db:migrate:tenancy-s1 -w @hoppiness/backend

# Sprint 2: product_location_presence
npm run db:migrate:tenancy-s2 -w @hoppiness/backend

# Sprint 3: capability permissions
npm run db:migrate:tenancy-s3 -w @hoppiness/backend

# Sprint 5: supplier liberation
npm run db:migrate:tenancy-s5 -w @hoppiness/backend
```

### 4. Verificar el DB

```powershell
# Abrir SQLite shell
sqlite3 packages/backend/data/hoppiness.db

# Verificar tablas críticas
.tables
SELECT COUNT(*) FROM locations;
SELECT COUNT(*) FROM accounts;
SELECT COUNT(*) FROM product_location_presence;
SELECT COUNT(*) FROM user_location_access;

# Verificar que no quedan suppliers sin account_id
SELECT COUNT(*) FROM suppliers WHERE account_id IS NULL;

# Verificar que branches fue renombrada (NO debe existir)
SELECT name FROM sqlite_master WHERE type='table' AND name='branches';
-- Debe devolver vacío
```

### 5. Reiniciar el backend

```powershell
npm run dev -w @hoppiness/backend
# O en producción: pm2 start hoppiness-backend
```

### 6. Verificar endpoints

```bash
# Health check
curl http://localhost:3001/api/health

# Locations (antes: /api/branches)
curl -H "Authorization: Bearer <token>" http://localhost:3001/api/branches/public

# My access
curl -H "Authorization: Bearer <token>" http://localhost:3001/api/permissions/my-access
```

### 7. Hacer deploy del frontend

Deploy el build del frontend que incluye:
- `CurrentLocationProvider`
- `LocationSwitcher`
- `useCurrentUserAccess`
- `ProductoDetailPage` con presencia por local

### 8. Smoke test

- [ ] Login funciona
- [ ] Menú del local carga correctamente
- [ ] POS puede tomar un pedido
- [ ] Panel de administración carga la carta
- [ ] (Si multi-location) LocationSwitcher aparece y cambia el contexto
- [ ] ProductoDetailPage muestra el panel de presencia

### 9. Mantenimiento OUT

Avisar al equipo que el sistema está disponible.

## Rollback

Si algo falla:
```powershell
# Parar el backend
# Restaurar el backup
cp data/hoppiness.db.backup-<fecha> data/hoppiness.db
# Hacer rollback del frontend (deploy del build anterior)
# Reiniciar el backend con el código anterior
```

## Riesgos conocidos

| Riesgo | Mitigación |
|--------|-----------|
| La tabla `branches` fue renombrada → routes que hardcodean `branches` en SQL raw | La migración crea `locations`; el schema usa alias `branches = locations`. Backend compilado usa Drizzle (no SQL raw). |
| `ambito` eliminado de suppliers | Backfill en la migración. El alias de scope backward-compat en `scoping.ts` cubre llamadas legacy. |
| `__marca_only__` en calls viejos del frontend cacheado | `parseScopeFromQuery` sigue mapeándolo a `{ type: 'account' }`. |
| Usuarios sin filas en `user_location_access` | Las rutas del legacy middleware siguen funcionando. Nuevas guards sólo se activan cuando se llaman explícitamente. |

## Post-cutover

1. Monitorear logs del backend por errores relacionados a `locations` o `accounts`.
2. Verificar que `product_location_presence` tenga filas para los productos exclusivos de cada local.
3. Planificar limpieza de código legacy (`ambito`, `__marca_only__`, alias `branches`) en el próximo sprint.

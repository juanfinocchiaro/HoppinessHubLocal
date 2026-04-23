# Hoppiness Hub Platform — Local Monorepo

Plataforma de gestión integral para Hoppiness Club. Corre 100% en tu PC, sin dependencias de servicios cloud.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui |
| Backend | Express + TypeScript + Socket.io |
| Base de datos | SQLite (via better-sqlite3 + Drizzle ORM) |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Storage | Filesystem local (multer) |
| Monorepo | npm workspaces |

## Estructura

```
packages/
  shared/      → Tipos y constantes compartidas
  backend/     → API Express + SQLite + Socket.io
  frontend/    → React SPA (Vite)
```

## Setup rápido

```bash
# 1. Instalar dependencias
npm install

# 2. Crear la base de datos
npx tsx packages/backend/src/db/setup.ts

# 3. Cargar datos iniciales
npm run db:seed

# 4. Levantar todo
npm run dev
```

Esto levanta:
- **Frontend** en `http://localhost:5173`
- **Backend** en `http://localhost:3001`
- **SQLite** en `packages/backend/data/hoppiness.db`

## Credenciales por defecto

Después de correr el seed:

- **Email:** `admin@hoppiness.com`
- **Password:** `admin123`
- **Rol:** Superadmin

## Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Levanta frontend + backend en paralelo |
| `npm run dev:frontend` | Solo el frontend |
| `npm run dev:backend` | Solo el backend |
| `npm run build` | Build de producción |
| `npm run db:seed` | Carga datos iniciales |

## Servicios externos (opcionales)

Estas integraciones necesitan internet. Cuando no hay conexión, la app funciona sin ellas:

- **MercadoPago** — Pagos online y Point
- **AFIP/ARCA** — Facturación electrónica
- **Resend** — Emails transaccionales
- **Google Maps** — Mapas y geolocalización
- **Web Push** — Notificaciones push

Configurar en `.env` (copiar desde `.env.example`).

## API

El backend expone endpoints REST bajo `/api/`:

| Ruta | Módulo |
|------|--------|
| `/api/auth` | Autenticación (login, signup, refresh) |
| `/api/branches` | Sucursales y configuración |
| `/api/menu` | Carta, recetas, insumos |
| `/api/orders` | Pedidos POS y webapp |
| `/api/hr` | Fichajes, horarios, RRHH |
| `/api/financial` | Finanzas, RDO, canon |
| `/api/coaching` | Coaching y competencias |
| `/api/meetings` | Reuniones |
| `/api/communications` | Comunicados |
| `/api/inspections` | Supervisiones |
| `/api/suppliers` | Proveedores |
| `/api/stock` | Stock |
| `/api/promotions` | Promociones y descuentos |
| `/api/webapp` | Webapp pública de pedidos |
| `/api/payments` | MercadoPago |
| `/api/fiscal` | AFIP/ARCA |
| `/api/storage` | Upload/download de archivos |
| `/api/delivery` | Delivery y zonas |

## Realtime

Socket.io corre en el mismo puerto que el backend (`:3001`). El frontend se conecta automáticamente via el proxy de Vite.

Canales disponibles:
- `branch:{branchId}` — Estado de sucursal
- `kitchen:{branchId}` — Pedidos de cocina
- `order:{orderId}` — Tracking de pedido

# QA Report — RestoStack Marketing Site

## Estado: Pre-launch checklist

> Este documento se completa antes de DNS cutover a `restostack.com`.

---

## Build & TypeScript

- [x] `npx next build` en `packages/marketing` → exit 0
- [x] TypeScript sin errores de compilación
- [x] 19 rutas estáticas / SSG generadas correctamente

## Rutas verificadas

| Ruta | Estado |
|------|--------|
| `/` | ✅ SSG |
| `/funciones` | ✅ SSG |
| `/precios` | ✅ SSG |
| `/para-chains` | ✅ SSG |
| `/clientes` | ✅ SSG |
| `/clientes/hoppiness` | ✅ SSG |
| `/contacto` | ✅ SSG |
| `/blog` | ✅ SSG |
| `/blog/como-calcular-el-costo-real-de-un-combo` | ✅ SSG |
| `/blog/por-que-multi-canal-no-es-lo-mismo-que-multi-pos` | ✅ SSG |
| `/blog/hoppiness-club-como-operamos-8-locales-con-un-solo-stack` | ✅ SSG |
| `/legal/terminos` | ✅ SSG |
| `/legal/privacidad` | ✅ SSG |
| `/legal/seguridad` | ✅ SSG |
| `/og` | ✅ Edge (dinámico) |
| `/sitemap.xml` | ✅ SSG |
| `/robots.txt` | ✅ SSG |

## Lighthouse (pendiente en preview deployment)

Objetivo: 95+ en todas las métricas.

| Página | Performance | Accessibility | Best Practices | SEO |
|--------|-------------|---------------|----------------|-----|
| `/` | — | — | — | — |
| `/funciones` | — | — | — | — |
| `/precios` | — | — | — | — |
| `/blog/[slug]` | — | — | — | — |

*Completar después del primer Vercel preview deploy.*

## Accessibility (pendiente)

- [ ] WAVE audit en `/`
- [ ] axe-core audit en rutas principales
- [ ] Focus visible en todos los interactive elements (outline var(--brasa) 2px)
- [ ] ARIA labels en nav, dialogs, accordions
- [ ] Contraste AA en todo texto sobre Carbón

## Cross-browser (pendiente en preview)

| Browser | Desktop | Mobile |
|---------|---------|--------|
| Chrome (latest) | — | — |
| Safari macOS | — | — |
| Safari iOS | — | — |
| Firefox | — | — |
| Edge | — | — |

## DNS/SSL (pendiente — con Juan)

- [ ] Registrar/transferir `restostack.com`
- [ ] Apuntar apex → Vercel (registro A o CNAME dependiendo del proveedor)
- [ ] Configurar `app.restostack.com` → el deployment de `packages/frontend`
- [ ] Configurar `api.restostack.com` → el deployment de `packages/backend`
- [ ] SSL automático via Vercel (Let's Encrypt)
- [ ] Verificar HSTS y headers de seguridad

## Redirects legacy (pendiente — cuando hoppinessclub.com esté activo)

- [ ] `https://hoppinessclub.com/` → `https://restostack.com/` (301)
- [ ] `https://hoppinessclub.com/franquicias` → `https://restostack.com/para-chains` (301)
- [ ] `https://hoppinessclub.com/contacto` → `https://restostack.com/contacto` (301)

## PostHog (pendiente configuración)

- [ ] Crear proyecto en app.posthog.com
- [ ] Obtener `NEXT_PUBLIC_POSTHOG_TOKEN` y agregar a Vercel env vars
- [ ] Verificar que eventos llegan: `landing_hero_cta_click`, `landing_section_view`, etc.
- [ ] Configurar funnels: hero → pricing → signup

## Variables de entorno requeridas (Vercel)

```
NEXT_PUBLIC_POSTHOG_TOKEN=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
NEXT_PUBLIC_API_URL=https://api.restostack.com
```

---

*Actualizar este documento al completar cada punto.*

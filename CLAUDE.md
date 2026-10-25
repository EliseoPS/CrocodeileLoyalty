# Tarjetas de Lealtad Digitales (Crocodeile Loyalty)

SaaS de tarjetas de lealtad digitales (Google Wallet en producción; Apple Wallet pendiente) para negocios en México. Multi-tenant: un negocio = un programa de lealtad con sus clientes, dispositivos de cajero y suscripción.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS, carpeta `src/`, desplegado como standalone en Docker.
- Supabase: Postgres + Auth + Storage. Cliente normal (`@/lib/supabase/server`, `@/lib/supabase/client`) respeta RLS; cliente admin (`@/lib/supabase/admin`, service role) salta RLS — usarlo solo donde no hay sesión de usuario (registro público por QR, escáner de cajero sin login, cron, lecturas públicas de negocio).
- Stripe: suscripciones mensuales, Checkout + Billing Portal + webhook (`/api/stripe/webhook`). Cliente perezoso en `src/lib/stripe.ts` (`getStripe()`) — nunca instanciar Stripe a nivel de módulo, rompe el build de Docker porque `STRIPE_SECRET_KEY` no existe en build time.
- Google Wallet API: `src/lib/google-wallet.ts`. `reviewStatus` SIEMPRE debe ser `'UNDER_REVIEW'` al crear/actualizar una Loyalty Class — nunca `'APPROVED'`, eso lo controla Google internamente y devuelve HTTP 400 si lo mandas tú (ya pasó una vez, no repetir el error).
- Sentry (monitoreo de errores) instalado vía wizard oficial — usa `instrumentation-client.ts` + `sentry.server.config.ts` + `sentry.edge.config.ts` + `instrumentation.ts`, con DSN hardcodeado en los tres (es público, no es secreto). `SENTRY_AUTH_TOKEN` sí es secreto (para subir source maps en CI).
- UptimeRobot monitorea solo `https://loyalty.crocodeile.com` (la home) — NUNCA una ruta de API protegida como `/api/cron/check-trials`, porque usa HEAD/GET sin auth y siempre dará error en rutas que solo aceptan POST con Bearer token.
- Despliegue: Droplet de DigitalOcean (imagen Docker) + Docker Compose + Caddy (HTTPS automático) en `loyalty.crocodeile.com`, subdominio de `crocodeile.com`. CI/CD con GitHub Actions (`.github/workflows/deploy.yml`): push a `master` → build de imagen → GHCR (minúsculas obligatorio en el nombre del repo) → SSH al droplet → `docker compose pull && docker compose up -d`.
- QR generado con la librería `qrcode` (server/client-side, data URLs) — nunca servicios externos tipo api.qrserver.com (migrado fuera por privacidad y dependencia externa).

## Arquitectura clave

- **Multi-tenant por `business_id`** en casi todas las tablas, con RLS para que un dueño solo vea lo suyo. El cliente admin se usa a propósito para saltarse RLS en los flujos sin sesión (filtrar manualmente por `business_id` ahí, nunca confiar en input del cliente).
- **Cajeros sin login**: `/scan/pair` vincula un dispositivo con un código de 6 caracteres (hash SHA-256 en `devices.pairing_code_hash`), genera un token (hash en `devices.token_hash`) guardado en cookie httpOnly `device_token`. `src/lib/device.ts` → `getDeviceBusinessId()` resuelve el negocio desde esa cookie en cada petición de `/scan`. Dispositivos revocables desde el dashboard (`devices.revoked_at`).
- **Ledger de transacciones**: `transactions` es append-only; `cards.balance` es un cache derivado, nunca la fuente de verdad.
- **Tipos de programa**: `stamps` (simple, con una meta y `program_tiers` de un solo nivel; o con niveles múltiples) y `cashback` (saldo en pesos, `earn_ratio` en `programs.rules`). `giveStamp`/`redeemReward` en `src/app/scan/actions.ts` manejan ambos, incluyendo cooldown anti-abuso y reinicio de ciclo (`programs.cycle_resets`).
- **Suspensión por falta de pago**: dos capas que se complementan. (1) Webhook de Stripe (`invoice.payment_failed`) pone `businesses.status = 'past_due'` + `grace_ends_at` = +5 días. (2) Cron diario (`/api/cron/check-trials`, protegido con `CRON_SECRET` vía `Authorization: Bearer <secret>`, configurado en `crontab -e` del droplet a las 3am) pasa a `suspended` lo que ya venció su gracia o su trial de 30 días (`trial_ends_at`). `giveStamp` rechaza si `status` es `suspended`/`canceled`; el canje de recompensas ya ganadas se dejó sin bloquear (decisión de producto).
- **Personalización de marca**: `businesses.brand.color` (hex) y `businesses.logo_url` (Supabase Storage, bucket público `business-logos`, máx 17MB, jpg/png/webp, validado en el navegador antes de subir). Se usan en la tarjeta web, el cartel de impresión, y se sincronizan a la Loyalty Class de Google Wallet vía `ensureLoyaltyClass` — si solo cambia el color y no el logo, se reutiliza `business.logo_url` existente en vez de caer al logo genérico (bug ya corregido, no reintroducirlo).
- **Google Wallet en producción**: `loyaltyPoints.balance` usa `{ string: "3/10" }` (fracción) para sellos o `{ string: "$45.00" }` para cashback, no un número suelto. `textModulesData` alterna entre "recompensa disponible" y "próximo premio: N sellos más".

## Diseño / sistema visual

- Paleta en `globals.css` `:root`: `--forest: #163a2e` (verde marca, navbar/botones primarios), `--moss: #2f6b4f` (acento/hover/éxito), `--paper: #f4f6f2` (fondo general), `--ink: #17241e` (texto), `--ink-soft: #5b6b63` (texto secundario), `--brick: #c1443b` (error/suspendido). `color-scheme: light` fijo para que los inputs no hereden dark mode del navegador (causaba texto invisible).
- Tipografías: `Space Grotesk` (display/headers, var `--font-display`) + `Inter` (texto/forms, var `--font-text`), cargadas en `layout.tsx` con `next/font/google`.
- Clases de botón reutilizables en `globals.css`: `.btn-primary` (verde sólido, hover a moss, con transición), `.btn-secondary` (outline blanco), `.btn-danger-text`, `.btn-logout` (gris, rojo-ladrillo al hover), `.nav-icon-btn` (navbar, iconos). Regla global `cursor: pointer` en botones/selects/checkboxes/labels no deshabilitados.
- `DashboardNavbar` (`src/app/dashboard/navbar.tsx`): logo + nombre del negocio + iconos de settings (engranaje) y logout, fondo `--forest`. Se reutiliza en `/dashboard`, `/dashboard/settings` (con botón "Volver al panel") y `/print/[slug]` (envuelta en `.no-print` para que no salga al imprimir).
- `/scan` y `/scan/pair` usan una navbar simple (solo logo, sin nombre de negocio porque el dispositivo aún no está vinculado en `/pair`, o sin acciones de dueño en `/scan`).
- Páginas ya rediseñadas con este sistema: `/login` (con animación de éxito con confeti en CSS puro — nunca `<style jsx>`, rompe hidratación con Turbopack — y checklist de requisitos de contraseña en vivo), `/onboarding` (con vista previa de tarjeta reactiva al color/logo/tipo de programa elegido), `/dashboard` + sub-secciones (billing, devices, registration-qr, settings), `/card/[serial]` (tarjeta con círculos de progreso tipo Apple Wallet, saludo y botón de Google Wallet fuera de la tarjeta), `/print/[slug]`, `/scan/pair`, `/scan`.
- Páginas que SIGUEN con estilos inline viejos (pendiente de rediseño): `/j/[slug]` (registro de cliente — el formulario que usa el cliente final), `/legal/privacidad`, `/legal/terminos`.

## Convenciones del proyecto (importante seguir)

- Server Actions devuelven `{ error: string }` o un objeto de éxito tipado (ej. `{ error: string } | { success: true }`) — usar un tipo con nombre y un campo discriminante compartido (`success`) en ambas variantes, no dos formas sin relación, o TypeScript no puede distinguirlas de forma segura en el cliente.
- Variables `NEXT_PUBLIC_*` nuevas requieren TRES lugares: `.env.local`, `.env.production` en el droplet (`/root/tarjetas-app/.env.production`), Y como `build-arg` en `.github/workflows/deploy.yml` + `ARG`/`ENV` correspondiente en `Dockerfile` (se hornean en build time del contenedor, no alcanza con solo runtime). Variables sin `NEXT_PUBLIC_` (secretos de servidor) solo necesitan `.env.local` + `.env.production` (se leen en runtime).
- Tokens/secretos de dispositivo (`devices.token`, `devices.pairing_code`) siempre se guardan hasheados con SHA-256 (`src/lib/hash.ts` → `hashToken()`), nunca en texto plano — columnas se llaman `token_hash` y `pairing_code_hash`.
- `useEffect` que llama `setState` síncronamente al inicio dispara el warning "cascading renders" de React — envolver la lógica en una función `async` interna con `await Promise.resolve()` como primera línea antes de cualquier `setState`.
- Nunca usar `<style jsx>` (styled-jsx) — genera hashes distintos en servidor/cliente con Turbopack y causa errores de hidratación. Todo CSS y `@keyframes` van en `globals.css`.
- Al editar un Server Component async en Next.js 15+, `params` es una `Promise` — siempre `const { x } = await params`.
- Anchos fijos en inputs: usar `style={{ width: N }}` en línea, no clases de Tailwind como `w-14` combinadas con `w-full` de un helper (`inputClass()`) — las utilidades de Tailwind pueden chocar entre sí según el orden de generación del CSS; el `style` en línea siempre gana sin ambigüedad.
- Rate limiting: middleware casero en memoria (`src/lib/rate-limit.ts`, `checkRateLimit()`) para `/scan/pair` (5/5min, anti fuerza bruta de código), `/scan` (30/min), `/j/[slug]` (10/min) — suficiente para una sola instancia; NO escalar a Upstash/Redis a menos que se despliegue en más de un droplet.
- Un Server Action llamado desde el cliente que es interceptado por el middleware con un `Response` no-JSON (ej. 429 de rate limit) llega al cliente como excepción de red, no como el objeto `{error}` esperado — siempre envolver la llamada en `try/catch` en el componente.

## Pendiente (en orden de prioridad aproximado)

1. Rediseñar `/j/[slug]` (registro de cliente final) y `/legal/*` con el sistema visual — son las últimas páginas con estilos inline viejos.
2. Confirmar Stripe en modo real completamente activado (CLABE, RFC, identidad) antes de cobrar al primer cliente de verdad.
3. Rellenar los placeholders (`[FECHA]`, `[tu correo]`, etc.) en `/legal/privacidad` y `/legal/terminos` con datos reales, y pasar por revisión de abogado antes de lanzar con cobros reales.
4. Apple Wallet (requiere cuenta Apple Developer — pendiente de primer cliente de pago, como estaba planeado).
5. Multisucursal real: tabla `locations` existe en el esquema pero sin UI ni lógica conectada (dispositivos no tienen `location_id` todavía, así que las transacciones no registran sucursal).
6. Diferenciación de planes (Esencial/Crecimiento) — no existe ninguna columna de plan ni límites aplicados todavía; todos los negocios tienen las mismas capacidades sin importar qué se les cobre. Haría falta una tabla/columna `plan` ligada al Price ID de Stripe usado, más validaciones en el código.
7. Panel de super-admin (ver todos los negocios sin entrar a Supabase directo).
8. PIN por cajero (auditoría de quién dio cada sello específicamente, no solo qué dispositivo).
9. Facturación automática (CFDI vía PAC) — por ahora manual, suficiente a bajo volumen.
10. Confirmar que Supabase esté en plan Pro (backups diarios automáticos) antes de escalar con varios clientes reales pagando — en plan Free no hay ningún backup automático.
11. Logo propio de Crocodeile — actualmente placeholder de un cuadro verde con "C" en navbar/onboarding/login, con comentario en el código marcando dónde reemplazar por `<img src="/logo.svg" />`.

## Dónde vive qué (referencia rápida)

- Auth/login: `src/app/login/` (actions.ts, page.tsx, forgot-password-actions.ts)
- Recuperar contraseña: `src/app/reset-password/`
- Alta de negocio: `src/app/onboarding/` (actions.ts, page.tsx, upload-logo.ts)
- Panel del dueño: `src/app/dashboard/` (page.tsx, navbar.tsx, registration-qr.tsx, billing/, devices/, settings/)
- Registro de cliente por QR: `src/app/j/[slug]/` (page.tsx, actions.ts, register-form.tsx) — pendiente de rediseño
- Tarjeta web del cliente: `src/app/card/[serial]/page.tsx`
- Cartel para imprimir: `src/app/print/[slug]/` (page.tsx, print-button.tsx)
- Escáner de cajero: `src/app/scan/` (page.tsx, scan-client.tsx, qr-scanner.tsx, actions.ts, pair/ para vincular dispositivo)
- Webhooks/cron: `src/app/api/stripe/webhook/route.ts`, `src/app/api/cron/check-trials/route.ts`
- Páginas legales: `src/app/legal/privacidad/`, `src/app/legal/terminos/` — pendientes de rediseño y datos reales
- Libs compartidas: `src/lib/` (supabase/server.ts, supabase/client.ts, supabase/admin.ts, supabase/middleware.ts, stripe.ts, google-wallet.ts, device.ts, hash.ts, rate-limit.ts)
- Middleware raíz: `src/middleware.ts` (sesión de Supabase en `/dashboard/*`, rate limiting en `/scan/*` y `/j/*`)
- Infraestructura: `Dockerfile`, `docker-compose.yml`, `Caddyfile`, `.github/workflows/deploy.yml`

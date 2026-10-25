@AGENTS.md

# Tarjetas de Lealtad Digitales (Crocodeile Loyalty)

SaaS de tarjetas de lealtad digitales (Google Wallet en producción; Apple Wallet pendiente) para negocios en México. Multi-tenant: un negocio = un programa de lealtad de sellos con sus clientes, dispositivos de cajero y suscripción.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4, carpeta `src/`, desplegado como standalone en Docker. `reactCompiler: true` (el lint de pureza marca `Date.now()` directo en el render: sacarlo a una función helper).
- Supabase: Postgres + Auth + Storage. Cliente normal (`@/lib/supabase/server`, `@/lib/supabase/client`) respeta RLS; cliente admin (`@/lib/supabase/admin`, service role) salta RLS — usarlo solo donde no hay sesión de usuario (registro público por QR, escáner de cajero sin login, cron, webhooks, lecturas públicas de tarjeta/negocio).
- **La BD de desarrollo ES la de producción**: `.env.local` apunta al mismo proyecto de Supabase que `loyalty.crocodeile.com`. Todo lo que se hace en `npm run dev` modifica datos reales. Antes de escribir en la BD o correr el cron desde local, revisar en solo lectura a quién afecta.
- Stripe: suscripciones mensuales, Checkout + Billing Portal + webhook (`/api/stripe/webhook`). Cliente perezoso en `src/lib/stripe.ts` (`getStripe()`) — nunca instanciar Stripe a nivel de módulo, rompe el build de Docker porque `STRIPE_SECRET_KEY` no existe en build time. Local usa llaves `sk_test` (cuenta "Crocodeile sandbox"); producción está en **live** y probada de punta a punta (pago, cancelación, reembolso).
- Google Wallet API: `src/lib/google-wallet.ts`. `reviewStatus` SIEMPRE debe ser `'UNDER_REVIEW'` al crear/actualizar una Loyalty Class — nunca `'APPROVED'`, eso lo controla Google internamente y devuelve HTTP 400 si lo mandas tú (ya pasó una vez, no repetir el error).
- Sentry (monitoreo de errores) instalado vía wizard oficial — usa `instrumentation-client.ts` + `sentry.server.config.ts` + `sentry.edge.config.ts` + `instrumentation.ts`, con DSN hardcodeado (es público, no es secreto). `SENTRY_AUTH_TOKEN` sí es secreto (para subir source maps en CI). Las páginas de ejemplo del wizard ya se borraron.
- UptimeRobot monitorea solo `https://loyalty.crocodeile.com` (la home) — NUNCA una ruta de API protegida como `/api/cron/check-trials`, porque usa HEAD/GET sin auth y siempre dará error en rutas que solo aceptan POST con Bearer token.
- Despliegue: Droplet de DigitalOcean (imagen Docker) + Docker Compose + Caddy (HTTPS automático) en `loyalty.crocodeile.com`, subdominio de `crocodeile.com`. CI/CD con GitHub Actions (`.github/workflows/deploy.yml`): push a `master` → build de imagen → GHCR (minúsculas obligatorio en el nombre del repo) → SSH al droplet → `docker compose pull && docker compose up -d`.
- QR generado con la librería `qrcode` (server/client-side, data URLs) — nunca servicios externos tipo api.qrserver.com (migrado fuera por privacidad y dependencia externa).
- Otras dependencias: `lucide-react` (todos los iconos de la UI), `libphonenumber-js` (validación de teléfonos MX, solo en servidor con `/max`).

## Arquitectura clave

- **Multi-tenant por `business_id`** en casi todas las tablas, con RLS para que un dueño solo vea lo suyo. El cliente admin se usa a propósito para saltarse RLS en los flujos sin sesión (filtrar manualmente por `business_id` ahí, nunca confiar en input del cliente: p. ej. `registerCustomer` verifica que el `programId` sea de ese `businessId` y esté activo).
- **Un dueño = un negocio**: `createBusiness` (onboarding) redirige al panel si el usuario ya tiene negocio, y si algo falla después de crear el negocio hace rollback (borra tiers, programa, membership y negocio). `src/app/onboarding/layout.tsx` (servidor) manda a `/login` sin sesión y a `/dashboard` si ya hay negocio. `business_members` tiene PK `(business_id, user_id)`, así que la BD SÍ permite varios negocios por usuario: todas las lecturas de membership usan `.order('created_at').limit(1).maybeSingle()`, nunca `.single()` (con dos filas `.single()` falla y causaba un ciclo de redirecciones dashboard↔onboarding).
- **Cajeros sin login**: `/scan/pair` vincula un dispositivo con un código de 6 caracteres (hash SHA-256 en `devices.pairing_code_hash`), genera un token (hash en `devices.token_hash`) guardado en cookie httpOnly `device_token`. `src/lib/device.ts` → `getDeviceBusinessId()` resuelve el negocio desde esa cookie en cada petición de `/scan` y actualiza `last_seen_at`. Dispositivos revocables desde el dashboard (`devices.revoked_at`).
- **Ledger de transacciones**: `transactions` es append-only; `cards.balance` es un cache derivado, nunca la fuente de verdad.
- **Solo programas de sellos**: simple (una meta 1–15 y un `program_tiers`) o con niveles (hasta 10 niveles, umbrales 1–99 únicos). **El cashback se eliminó por completo** (decisión de producto) — no reintroducir. Queda un programa legacy `type: 'cashback'` en el negocio de prueba "OXXO" que el código trata como sellos.
- **Recompensas acumulables** (`src/lib/rewards.ts`): nunca se pierden al dar otro sello. `cards.pending_reward` guarda una recompensa por línea (`\n`) y `cards.rewards_available` es el conteo; se canjean de una en una (la más antigua). Máximo `MAX_PENDING_REWARDS = 5`: el sello que completaría la sexta se rechaza hasta canjear una. Mostrar siempre con `formatPendingRewards()` ("2× Café gratis", "Café gratis + Postre"). El escáner muestra un aviso con "Canjear ahora" cuando hay pendientes.
- **Escáner** (`src/app/scan/actions.ts`): `giveStamp`/`redeemReward` devuelven uniones discriminadas (`success`), aplican cooldown anti-abuso y reinicio de ciclo (`programs.cycle_resets`), y actualizan la tarjeta **condicionado al valor leído** (`.eq('balance', …)` / `.eq('rewards_available', …)`) para que dobles toques o dos dispositivos no den dos sellos ni canjeen dos veces. `giveStamp` rechaza si el negocio está `suspended`/`canceled`; el canje de recompensas ya ganadas se dejó sin bloquear (decisión de producto).
- **Registro de cliente** (`src/app/j/[slug]/actions.ts`): teléfono 10 dígitos validado con `libphonenumber-js/max` (`isValidPhoneNumber(phone, 'MX')`). Teléfono ya registrado en ese negocio → error `code: 'duplicate'` (antes devolvía la tarjeta existente a quien escribiera el número: hueco de privacidad, no reintroducir). Negocio suspendido → no acepta registros (página y servidor).
- **Suspensión por falta de pago** (probado en test y live el 2026-10-24):
  - Webhook (`src/app/api/stripe/webhook/route.ts`) con eventos `checkout.session.completed`, `invoice.payment_failed`, `invoice.paid`, `customer.subscription.updated`, `customer.subscription.deleted` (configurados en el dashboard en ambos modos). Pago fallido → `past_due` + `grace_ends_at` = +5 días (los reintentos no reinician la gracia). `invoice.paid` o suscripción `active` → `active` y limpia la gracia (también reactiva un negocio ya suspendido). `unpaid`/`canceled`/`paused`/`deleted` → `suspended`.
  - **API de Stripe**: el endpoint de test usa `2026-08-26.dahlia` y el live `2026-09-30.endive`. En estas versiones la factura NO trae `invoice.subscription`; viene en `invoice.parent.subscription_details.subscription` (`getInvoiceSubscriptionId` lee ambas). Ese bug dejaba negocios en `past_due` sin gracia para siempre.
  - Idempotencia por `billing_events.stripe_event_id`, registrado **después** de procesar; si el handler falla responde 500 para que Stripe reintente.
  - Cron diario (`/api/cron/check-trials`, protegido con `CRON_SECRET` vía `Authorization: Bearer <secret>`, en `crontab -e` del droplet a las 3am): pasa a `suspended` trials vencidos (30 días, `trial_ends_at`) y gracias vencidas; red de seguridad que asigna gracia a `past_due` sin `grace_ends_at`. Suspende TODOS los negocios que califican, no solo uno.
- **Personalización de marca**: `businesses.brand.color` (hex) y `businesses.logo_url` (Supabase Storage, bucket público `business-logos`, máx 17MB, jpg/png/webp, validado en el navegador antes de subir). Se usan en la tarjeta web, el cartel de impresión, y se sincronizan a la Loyalty Class de Google Wallet vía `ensureLoyaltyClass` — si solo cambia el color y no el logo, se reutiliza `business.logo_url` existente en vez de caer al logo genérico (bug ya corregido, no reintroducirlo).
- **Vista de tarjeta compartida** (`src/lib/card-view.ts` → `loadCardView(serial)`): única fuente de datos para la tarjeta web, la imagen de Wallet y la sincronización del pase, para que siempre coincidan.
- **Google Wallet**:
  - Sincronización única en `src/lib/wallet-sync.ts` → `syncWalletPass(serial)` (registro, sello, canje y botón de guardar la usan). `loyaltyPoints.balance` usa `{ string: "3/10" }`. `textModulesData` alterna entre "Recompensa disponible" y "Próximo premio: N sellos más" (sin emojis).
  - `heroImage` por objeto: franja con círculos de sellos + "Powered by Crocodeile" generada con `ImageResponse` en `/api/wallet/strip/[serial]` (`src/lib/wallet-strip.tsx`, 1032×336). URL con `?v=<balance>-<goal>-<reward>` para romper la caché de Google. Solo se manda si `NEXT_PUBLIC_SITE_URL` es `https://` (en local con localhost se omite). Pendiente verificar en un pase real de producción.
  - El botón "Agregar a Google Wallet" apunta a `/api/wallet/save/[serial]`, que primero hace upsert del objeto y luego redirige al link de Google (antes, si el objeto nunca se creó, Google respondía "not a valid id").

## Diseño / sistema visual

- **Modo claro/oscuro automático** según `prefers-color-scheme`. Tokens en `globals.css` (`:root` + bloque dark):
  - Fondos de marca (iguales en ambos modos): `--forest: #163a2e` (navbar, botones primarios), `--moss: #2f6b4f` (hover/acento de fondo).
  - Superficies: `--paper` (fondo de página), `--surface` (tarjetas, inputs, modales; gris `#242a27` en oscuro).
  - Texto: `--ink`, `--ink-soft`, `--brand-text` y `--accent-text` (verdes para TEXTO/bordes/iconos, se aclaran en oscuro), `--brick` (error), `--warn` (ámbar).
  - Líneas y realces: `--line-soft`, `--line`, `--line-strong`, `--accent-soft`.
  - Utilidades Tailwind derivadas: `bg-surface`, `bg-paper`, `border-line`, `border-line-strong`, `border-line-soft`, `text-ink`.
  - `@media print` fuerza la paleta clara.
- Tipografías: `Space Grotesk` (display/headers, var `--font-display`) + `Inter` (texto/forms, var `--font-text`), cargadas en `layout.tsx` con `next/font/google`.
- Clases reutilizables en `globals.css`: `.btn-primary`, `.btn-secondary`, `.btn-danger-text`, `.btn-logout`, `.nav-icon-btn`, `.legal-prose` (texto de `/legal/*`), `.card-enter` (entrada de `/card`), `.no-wallet-dialog` (backdrop del `<dialog>`), `.success-pop`/`.check-circle-ring`/`.check-mark` (animación de éxito). Regla global `cursor: pointer` en botones/selects/checkboxes/labels no deshabilitados.
- **Logo**: componente `src/components/crocodeile-logo.tsx` con `public/logo-crocodeile.webp` (verde, para superficies claras) y `public/logo-crocodeile-light.webp` (blanco, para oscuras). `surface="dark"` (default, siempre blanco: navbars y paneles `--forest`) o `surface="auto"` (verde en claro, blanco en oscuro, vía `<picture>`).
- **Iconos**: solo `lucide-react` con `aria-hidden`. **Nunca emojis ni símbolos tipo ✓ ✕ ○ en la UI** (decisión del usuario).
- `DashboardNavbar` (`src/app/dashboard/navbar.tsx`): logo + nombre del negocio + settings y logout, fondo `--forest`. Se reutiliza en `/dashboard`, `/dashboard/settings` y `/print/[slug]` (envuelta en `.no-print`). `/scan`, `/scan/pair` y `/legal/*` (layout con botón "Volver al login") usan navbar simple con logo.
- **Todas las páginas ya usan el sistema visual**: `/login` (confeti CSS puro y checklist de contraseña), `/reset-password` (mismas reglas de contraseña vía `src/lib/password.ts`), `/onboarding` (vista previa reactiva), `/dashboard` + billing/devices/registration-qr/settings, `/j/[slug]` ("Regístrate ahora y gana:" + icono Gift), `/card/[serial]` (diseño tipo Apple Wallet: encabezado con logo, franja oscura con "3/10 SELLOS" y círculos, último punteado con regalo, MIEMBRO / PRÓXIMO PREMIO, QR en recuadro blanco, "Powered by Crocodeile", halo del color de marca, modal "¿No quieres usar tu Wallet?" con copiar/compartir el link `https://loyalty.crocodeile.com/card/<serial>`), `/print/[slug]`, `/scan/pair`, `/scan`, `/legal/*`.
- Los recuadros detrás de los QR se quedan `bg-white` a propósito en ambos modos (si no, el escáner podría no leerlos).

## Convenciones del proyecto (importante seguir)

- Server Actions devuelven uniones con nombre y discriminante `success` en ambas variantes (ej. `{ success: false; error: string } | { success: true; ... }`), no dos formas sin relación. Errores de BD: loguear con `console.error` y devolver un mensaje genérico, nunca `error.message` crudo al usuario.
- Colores: nunca `bg-white`, `border-black/*`, `rgba(0,0,0,…)` fijos ni `var(--forest)`/`var(--moss)` como color de TEXTO; usar los tokens (`bg-surface`, `border-line`, `var(--brand-text)`, `var(--accent-text)`). `--forest`/`--moss` solo como fondo.
- El query builder de Supabase es perezoso: sin `await` (o `.then`) la consulta NUNCA se ejecuta (así se perdía `last_seen_at`).
- Variables `NEXT_PUBLIC_*` nuevas requieren TRES lugares: `.env.local`, `.env.production` en el droplet (`/root/tarjetas-app/.env.production`), Y como `build-arg` en `.github/workflows/deploy.yml` + `ARG`/`ENV` correspondiente en `Dockerfile` (se hornean en build time). Variables sin `NEXT_PUBLIC_` (secretos de servidor) solo necesitan `.env.local` + `.env.production` (runtime).
- Tokens/secretos de dispositivo siempre hasheados con SHA-256 (`src/lib/hash.ts` → `hashToken()`), columnas `token_hash` y `pairing_code_hash`.
- `useEffect` que llama `setState` síncronamente dispara el error "cascading renders" del lint: diferir con `await Promise.resolve()` dentro de una función async interna, o `void Promise.resolve().then(fn)`.
- Nunca usar `<style jsx>` (styled-jsx) — rompe la hidratación con Turbopack. Todo CSS y `@keyframes` van en `globals.css`.
- En Server Components y Route Handlers, `params` y `searchParams` son `Promise` — siempre `const { x } = await params`.
- Anchos fijos en inputs: `style={{ width: N }}` en línea, no clases de Tailwind como `w-14` combinadas con `w-full` de `inputClass()`.
- Rate limiting: middleware casero en memoria (`src/lib/rate-limit.ts`) para `/scan/pair` (5/5min), `/scan` (30/min), `/j/[slug]` (10/min) — suficiente para una sola instancia; NO escalar a Upstash/Redis salvo que haya más de un droplet. `/api/*` no pasa por el middleware.
- Un Server Action interceptado por el middleware con un `Response` no-JSON (429) llega al cliente como excepción: siempre envolver la llamada en `try/catch` en el componente.
- Validar en servidor todo lo que tiene límites en el navegador (`maxLength`, rangos de sellos, teléfonos): los límites del input se pueden saltar.
- Probar Stripe: con la CLI (`C:\stripe_1.53.0_windows_x86_64\stripe.exe`, ya logueada al sandbox) → `stripe listen --forward-to localhost:3000/api/stripe/webhook` y poner temporalmente su `whsec_` en `.env.local` (respaldar y restaurar el original). Pago fallido: tarjeta `pm_card_chargeCustomerFail` + invoice item ligado a la suscripción + `stripe invoices pay`. Resetear el ciclo de facturación NO genera factura.

## Pendiente (en orden de prioridad aproximado)

Verificar en producción:
1. Que la franja de sellos (`heroImage`) aparezca en un pase real de Google Wallet tras dar un sello.
2. Limpiar datos de prueba en la BD real (PRUEBISH suspendido, "OXXO" con programa cashback, otros negocios de prueba).

Funciones (lo primero que pedirá un negocio real):
3. Editar el programa después del onboarding (nombre, meta, recompensa, niveles, cooldown) — settings solo cambia color y logo.
4. Lista de clientes en el panel: buscar, historial, corregir un sello dado por error, bloquear tarjeta (`cards.status` existe sin UI).
5. Recuperar la tarjeta si el cliente pierde el enlace (hoy el error de duplicado dice "pide ayuda en el negocio"). Idea: código por WhatsApp (Meta Cloud API), que también verificaría el teléfono.
6. Días de prueba restantes en el panel y aviso al volver de Stripe (`?checkout=success`).
7. Correos automáticos (prueba por vencer, pago fallido, suspensión).
8. Exportar clientes a CSV (lo prometen los Términos) y flujo para derechos ARCO.
9. Landing pública con precios (`/` redirige directo a `/login`), páginas 404/error con el diseño, `consent_collection` de Términos en el Checkout.

Infraestructura / negocio:
10. Supabase en plan Pro (backups diarios) — en Free no hay ningún backup.
11. Separar la BD de desarrollo de la de producción antes del primer cliente de pago.
12. Índices únicos en Supabase: `customers(business_id, phone)` y `cards(program_id, customer_id)` (contra carreras de registro; revisar duplicados existentes antes).
13. Revisión de abogado de `/legal/privacidad` y `/legal/terminos`; ligarlos en Stripe → Public business information.
14. Diferenciación de planes (Esencial/Crecimiento): no existe columna de plan ni límites.
15. Multisucursal (tabla `locations` existe sin UI; dispositivos sin `location_id`), PIN por cajero, panel de super-admin, facturación CFDI.
16. Apple Wallet (requiere cuenta Apple Developer — pendiente de primer cliente de pago).

## Dónde vive qué (referencia rápida)

- Auth/login: `src/app/login/` (actions.ts, page.tsx, forgot-password-actions.ts); reglas de contraseña en `src/lib/password.ts`
- Recuperar contraseña: `src/app/reset-password/page.tsx`
- Alta de negocio: `src/app/onboarding/` (layout.tsx guard, actions.ts, page.tsx, upload-logo.ts)
- Panel del dueño: `src/app/dashboard/` (page.tsx, navbar.tsx, registration-qr.tsx, billing/, devices/, settings/)
- Registro de cliente por QR: `src/app/j/[slug]/` (page.tsx, actions.ts, register-form.tsx)
- Tarjeta web del cliente: `src/app/card/[serial]/` (page.tsx, no-wallet-help.tsx)
- Cartel para imprimir: `src/app/print/[slug]/` (page.tsx, print-button.tsx)
- Escáner de cajero: `src/app/scan/` (page.tsx, scan-client.tsx, qr-scanner.tsx, actions.ts, pair/)
- Webhooks/cron: `src/app/api/stripe/webhook/route.ts`, `src/app/api/cron/check-trials/route.ts`
- Google Wallet: `src/lib/google-wallet.ts`, `src/lib/wallet-sync.ts`, `src/lib/wallet-strip.tsx`, rutas `src/app/api/wallet/strip/[serial]/` y `src/app/api/wallet/save/[serial]/`
- Páginas legales: `src/app/legal/` (layout.tsx, privacidad/, terminos/)
- Libs compartidas: `src/lib/` (supabase/*, stripe.ts, google-wallet.ts, wallet-sync.ts, wallet-strip.tsx, card-view.ts, rewards.ts, password.ts, device.ts, hash.ts, rate-limit.ts)
- Componentes: `src/components/crocodeile-logo.tsx`
- Middleware raíz: `src/middleware.ts` (sesión de Supabase en `/dashboard/*`, rate limiting en `/scan/*` y `/j/*`)
- Infraestructura: `Dockerfile`, `docker-compose.yml`, `Caddyfile`, `.github/workflows/deploy.yml`

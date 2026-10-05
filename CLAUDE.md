# CLAUDE.md — RE|CARS

This file guides Claude Code (or any other AI coding agent) working on the RE|CARS repository. It applies to the whole repo; each sub-project also has its own more detailed `CLAUDE.md`.

## 1. Project overview

RE|CARS is a full-stack vehicle-management and workshop-booking application, split into three independent codebases in this repo:

```
ReCars/
├── Progetto/
│   ├── Backend/     NestJS 11 REST API, Prisma ORM, PostgreSQL, Stripe, Nodemailer
│   └── Frontend/    Static HTML/CSS/vanilla JS website, no build step, no package.json
└── ReCars-mobile/   React Native app (Expo SDK 54, Expo Router, NativeWind/Tailwind)
```

Two end-user roles exist across all three clients: **utente** (private individual or company, owns vehicles) and **officina** (repair shop, manages bookings). Backend, frontend and mobile all talk to the same PostgreSQL database through the single NestJS backend — there is no separate API per client.

See each sub-project's own `CLAUDE.md` for controller/route-level detail:
- `Progetto/Backend/CLAUDE.md`
- `Progetto/Frontend/CLAUDE.md`
- `ReCars-mobile/CLAUDE.md`

## 2. Essential commands

### Backend (`Progetto/Backend`, package manager: **pnpm**)

```bash
pnpm install                 # install dependencies
pnpm start:dev                # dev server with watch mode, port 3000 (or $PORT)
pnpm start                     # dev server, no watch
pnpm build                      # nest build -> dist/
pnpm start:prod                  # node dist/main (production)
npx prisma generate               # regenerate Prisma client after schema.prisma changes
npx prisma migrate dev             # create/apply a migration in development
pnpm test                           # jest unit tests (src/**/*.spec.ts)
pnpm test:e2e                        # jest e2e tests (test/*.e2e-spec.ts)
```

### Frontend (`Progetto/Frontend`)

No package.json, no build step. Serve the folder with VS Code's **Live Server** extension (must be on port 5500 — the backend's CORS whitelist only allows `http://127.0.0.1:5500` / `http://localhost:5500`). Open `landing.html` as the entry point.

### Mobile (`ReCars-mobile`, package manager: **npm**, not pnpm)

```bash
npm install               # install dependencies
npx expo start              # start Metro bundler / dev server
npm run android               # expo start --android
npm run ios                     # expo start --ios (macOS only)
npm run web                       # expo start --web
npm run lint                        # expo lint
npx expo export                       # production export (static build, also used for web target)
```

No `eas.json` exists yet — `eas build:configure` is required before any `eas build`.

## 3. Environment variables (Backend only)

Frontend and mobile have no `.env` files — their API base URL is a hardcoded constant in source (see their own `CLAUDE.md`). Backend variables (see `Progetto/Backend/.env.example`):

| Variable | Description |
|---|---|
| `PORT` | Port the NestJS server listens on (default 3000) |
| `DATABASE_URL` | PostgreSQL connection string used by Prisma (`@prisma/adapter-pg`) |
| `JWT_SECRET` | Secret used to sign/verify JWTs |
| `BREVO_API_KEY` | Brevo API key: with it emails (registration code, booking confirmation) go through Brevo's HTTP API — required on Render free, which blocks SMTP. Backend only |
| `BREVO_MITTENTE` | Sender verified on Brevo (defaults to `MAIL_USER`) |
| `MAIL_USER` | Gmail SMTP account used by Nodemailer when `BREVO_API_KEY` is unset (local dev) |
| `MAIL_PASS` | Gmail App Password for `MAIL_USER` |
| `FRONTEND_BASE_URL` | Base URL used to build Stripe success/cancel redirect URLs |
| `STRIPE_SECRET_KEY` | Stripe secret API key (server-side SDK) |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (present in `.env`, currently unused by backend code) |
| `STRIPE_PRICE_PREMIUM` | Stripe Price ID for the user "premium" plan (9,99 €/month; the former "pro" price) |
| `STRIPE_PRICE_BUSINESS` | Stripe Price ID for the officina "business" plan |
| `STRIPE_PRICE_BUSINESS_PRO` | Stripe Price ID for the officina "business pro" plan |
| `STRIPE_WEBHOOK_SECRET` | Secret used to verify Stripe webhook signatures |
| `GEMINI_API_KEY` | Google Gemini API key (free tier) for the in-app assistant — backend only, never in the frontend or the repo |
| `GEMINI_MODEL` | Optional Gemini model (default `gemini-flash-lite-latest`) |
| `ASSISTENTE_LIMITE_MINUTO` / `ASSISTENTE_LIMITE_GIORNO` / `ASSISTENTE_LIMITE_GIORNO_GRATIS` | Optional per-user assistant limits (default 6/min; 50/day Premium, 10/day Gratis) |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | Web Push keys for PWA notifications (`npx web-push generate-vapid-keys`); without them notifications stay off |
| `NOTIFICHE_CRON_SECRET` | Shared secret for `POST /notifiche/controllo-giornaliero`, called daily by `.github/workflows/notifiche-giornaliere.yml` |

## 4. Architecture notes

**JWT authentication (dual transport).** The backend issues a JWT on register/login (`JwtService.sign`, payload `{ sub, email|partita_iva, tipo }`, valid 30 days like Kilo: `SESSIONE_JWT`/`SESSIONE_MS` in `src/auth-cookie.util.ts`, same max-age as the frontend's `rc_session` flag cookie, whose value `u`/`o` lets the middleware send an already-logged-in device from `/` and `/login` straight to its home) and accepts it two ways at once, via `ExtractJwt.fromExtractors` in `src/jwt.strategy.ts`:
1. an httpOnly cookie named `access_token` (`secure`, `sameSite: 'none'`) — used by the **web frontend**, which relies on `credentials: 'include'` on every `fetch`. Frontend-Next never calls the backend directly: the browser calls `/api/...` on the site's own domain and `next.config.ts` rewrites it to `NEXT_PUBLIC_API_URL`, so the cookie is first-party (Safari and other browsers that block third-party cookies dropped it when the backend was on another domain, and login bounced back to the landing page). Keep `api/` excluded from the middleware matcher. `GET /auth/me` returns the session's profile: `AuthContext` calls it when the `rc_session` cookie exists but no profile is saved (an iPhone home-screen app inherits Safari's cookies but not its localStorage);
2. an `Authorization: Bearer <token>` header — used by the **mobile app**, which stores the token in `AsyncStorage` (key `yd_access_token`) and injects the header via `apiFetch()` in `constants/api.ts`.

`JwtAuthGuard` is applied per-route (`@UseGuards(JwtAuthGuard)`), not globally — there is no `APP_GUARD`. Some routes are intentionally or accidentally unauthenticated (see Backend `CLAUDE.md` for the list); check guards explicitly before assuming a route is protected.

**Mobile vehicle switcher.** The mobile app mirrors the web frontend's "active vehicle" concept via `hooks/use-veicoli.ts`: it fetches `GET /veicolo/utente/:id`, keeps the selected vehicle id in `AsyncStorage` (`veicoloAttivoId`), and exposes `seleziona()`/`elimina()`. `components/utente/VeicoloSwitcher.tsx` is the UI on top of this hook. The web frontend has an equivalent but separately-implemented switcher in `functions-app.js` (global `veicoli[]` / `veicoloAttivoIndex`, `localStorage`) — the two are **not** shared code, keep them in sync manually when changing the underlying API contract.

**NestJS module structure.** Most domains have a dedicated `*.module.ts` (`officina`, `prenotazione`, `stripe`, `storico_interventi`), but `utente` and `veicolo` do **not** — their controllers/services/providers are registered directly in `AppModule`. `JwtModule.registerAsync` is configured redundantly in both `AppModule` and `OfficinaModule` (same secret). No global API prefix is set (`setGlobalPrefix` unused) — routes are "bare" (`/auth/...`, `/veicolo/...`, `/officina/...`, `/prenotazioni`, `/interventi/...`, `/abbonamento/...`).

**PWA and push notifications.** Frontend-Next is installable (`src/app/manifest.ts`, `public/sw.js`, icons in `public/icons/`). Users enable notifications per device from Account → "App e notifiche": the browser subscription is stored in `push_iscrizione`; the backend `NotificheModule` sends Web Push (VAPID) on booking status changes (officina confirm/cancel/complete) and in a daily check (deadlines at 30/7/1/0 days, reminder the day before an appointment), deduplicated through `notifica_inviata`. The middleware matcher must keep excluding the PWA files (`sw.js`, `manifest.webmanifest`, `icons/`, `offline.html`), otherwise they redirect to /login.

**User plans: Gratis and Premium.** `src/piano.ts` is the single source: `pianoUtente()` maps the active `abbonamento` to `'base'` (Gratis) or `'premium'` (the legacy `pro` and the azienda plans count as Premium; officina plans don't), `LIMITE_VEICOLI` is 1 / unlimited, `richiediPremium()` throws a 403 with a readable message. Premium-only in the backend: vehicle lookup/add by plate (`GET /veicolo/cerca/:targa`, `POST /veicolo`), `GET /carburanti/vicini`, the higher assistant daily cap. Premium-only in the UI only (computed in the browser): libretto OCR, costi di gestione, PDF report. The frontend reads the plan via `usePiano()`. The Premium price lives in Stripe (`STRIPE_PRICE_PREMIUM`), not in code; `STRIPE_PRICE_PRO` was removed (Premium now uses the former Pro price).

**Registration requires email verification.** `POST /auth/verifica-email { email, per: 'utente'|'officina' }` rejects placeholder/disposable addresses (`src/verifica-email/indirizzo.ts`) and domains without MX records, then mails a 6-digit code (in memory, 10 minutes, 5 attempts); `POST /auth/register` and `POST /officina/register` need `codice`. Web (`app/registrazione`) and mobile (`ReCars-mobile/app/(auth)/register.tsx`) both do the two steps. Needs working email: `BREVO_API_KEY` in production (Render free blocks SMTP), or `MAIL_USER`/`MAIL_PASS` locally.

**Vehicle deadlines come from the storico.** `src/veicolo/scadenze.ts` (pure, tested) computes bollo, assicurazione, revisione and tagliando: the dates saved at creation (plate dataset or manual form) are the baseline, and the latest storico intervento of type `Bollo`/`Assicurazione` (+1 year, the later date wins), `Revisione` (+2 years, overrides the immatricolazione rule) or `Tagliando` (+1 year) moves them. Nothing is written back to the DB: deleting the intervento restores the previous date. `GET /veicolo/utente/:id` and `GET /veicolo/:id` return `scadenze` (YYYY-MM-DD) and `manuale` (not in the mock dataset → editable via `PATCH /veicolo/:id`, plate excluded); the daily push check uses the same function. The manual form's optional "ultima revisione"/"ultimo tagliando" become the first storico rows. Kilometres are not tracked yet (needs a migration, postponed).

**Phone / installed app behaves like an app** (like Kilo): no zoom (viewport + `components/pwa/GestiApp.tsx` for Safari), no sideways scroll, no overscroll bounce, 16px inputs, `safe-area-inset-*` padding for header, overlays and auth pages (`styles/mobile.css`). Render's free instance sleeps: landing and login ping `/api/` to wake it and show a "server starting" hint; `.github/workflows/tieni-sveglio-backend.yml` pings it every 10 minutes during the day. The officina pages use the same look as the user side (dashboard built from the user dashboard classes in `app/officina/page.tsx`, Tabler icons) and, on phones, the same bottom bar (`BarraSchede` with `SCHEDE_OFFICINA`, rendered by `OfficinaLayout`).

**Stripe is fully server-driven.** Neither the web frontend nor the mobile app load the Stripe SDK/publishable key client-side. Both simply `POST /abbonamento/checkout` and redirect the browser/WebView to the returned Checkout Session URL. Subscriptions renew automatically every month on the saved card; the user can switch auto-renew off/on (`POST /abbonamento/rinnovo` → Stripe `cancel_at_period_end`), "Passa a Gratis" switches it off (Premium stays until the paid period ends), and `POST /abbonamento/portale` opens the Stripe billing portal (card, invoices). `abbonamento.data_fine` is set only when auto-renew is off (the day the user goes back to Gratis); the daily check marks past ones `scaduto` and sends push reminders at 7/1/0 days. Webhooks: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed` (all four must be enabled on the Stripe endpoint).

**Prisma foreign keys have no cascade.** Every relation in `prisma/schema.prisma` is `onDelete: NoAction, onUpdate: NoAction`. Cascading deletes (e.g. deleting an `officina` also removing its `abbonamento`/`prenotazione`) are implemented manually in the relevant `*.service.ts` — do not assume the database will clean up related rows for you.

## 5. Known constraints

- **Never use `localStorage` in the mobile app.** `localStorage` does not exist in React Native; the mobile codebase correctly uses `AsyncStorage` everywhere (verified: no occurrences of `localStorage` in `ReCars-mobile/`). Do not port web frontend code that touches `localStorage` into the mobile app without converting it to `AsyncStorage` (and making the calls `async`).
- **Never change `prisma/schema.prisma` without running a migration.** After editing the schema, always run `npx prisma migrate dev` (creates/applies a migration and regenerates the client) — never hand-edit the database to match the schema, and never run `npx prisma generate` alone expecting it to update the actual database.
- **Never change the JWT cookie contract without updating both backend and frontend together.** The cookie name (`access_token`), its flags (`httpOnly`, `secure`, `sameSite: 'none'`), and the CORS `credentials: true` + explicit origin whitelist in `Backend/src/main.ts` are interdependent. Changing any one of these (e.g. renaming the cookie, or changing `sameSite`) breaks the web frontend's session handling unless every `fetch` call and every cookie-setting call across the backend controllers (`utente`, `officina`) is updated consistently.
- **The backend's CORS whitelist is hardcoded** to `http://127.0.0.1:5500` and `http://localhost:5500` in `src/main.ts`. Deploying the frontend elsewhere (GitHub Pages, Render static site, etc.) requires updating this list — do not disable CORS or use a wildcard origin, since `credentials: true` is incompatible with `origin: '*'`.
- **The mobile app's API base URL is a single hardcoded constant** (`export const API = "..."` in `constants/api.ts`), currently pointed at an ngrok tunnel or a local IP depending on the developer's environment. There is no `.env`/`__DEV__` switching logic. Do not commit a change to this constant that only makes sense for one developer's local network without flagging it.
- **Expo SDK 54 is new relative to most training data.** `ReCars-mobile/AGENTS.md` explicitly warns to read https://docs.expo.dev/versions/v54.0.0/ before writing Expo/Expo Router code — APIs may have changed since older documentation or training data.
- Some backend endpoints are unauthenticated by current design/oversight (`GET /veicolo/:id`, the entire `interventi` controller). Do not assume every route is protected — check for `@UseGuards(JwtAuthGuard)` explicitly before treating a route as safe to expose more data through.

## 6. Testing

- **Backend**: Jest is configured. Unit tests: `pnpm test` (pattern `src/**/*.spec.ts`). E2E tests: `pnpm test:e2e` (pattern `test/*.e2e-spec.ts`). Coverage is currently minimal/smoke-level — most specs only assert the module compiles (`should be defined`) or that `GET /` returns "Hello World!". `utente`, `veicolo`, `stripe`, and `storico_interventi` have **no** test files at all.
- **Frontend**: no test setup exists (no package.json, no test runner).
- **Mobile**: no test setup exists (no test script in `package.json`, no test files found).

When adding new backend logic (business rules, guards, Stripe webhook handling), prefer adding real unit/e2e coverage rather than relying on the existing smoke tests, since none of the current specs actually exercise business logic.

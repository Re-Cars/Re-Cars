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
| `MAIL_USER` | Gmail SMTP account used by Nodemailer for booking-confirmation emails |
| `MAIL_PASS` | Gmail App Password for `MAIL_USER` |
| `FRONTEND_BASE_URL` | Base URL used to build Stripe success/cancel redirect URLs |
| `STRIPE_SECRET_KEY` | Stripe secret API key (server-side SDK) |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (present in `.env`, currently unused by backend code) |
| `STRIPE_PRICE_PREMIUM` | Stripe Price ID for the user "premium" plan |
| `STRIPE_PRICE_PRO` | Stripe Price ID for the user "pro" plan |
| `STRIPE_PRICE_BUSINESS` | Stripe Price ID for the officina "business" plan |
| `STRIPE_PRICE_BUSINESS_PRO` | Stripe Price ID for the officina "business pro" plan |
| `STRIPE_WEBHOOK_SECRET` | Secret used to verify Stripe webhook signatures |

## 4. Architecture notes

**JWT authentication (dual transport).** The backend issues a JWT on register/login (`JwtService.sign`, payload `{ sub, email|partita_iva, tipo }`, `expiresIn: '1h'`) and accepts it two ways at once, via `ExtractJwt.fromExtractors` in `src/jwt.strategy.ts`:
1. an httpOnly cookie named `access_token` (`secure`, `sameSite: 'none'`) — used by the **web frontend**, which relies on `credentials: 'include'` on every `fetch`;
2. an `Authorization: Bearer <token>` header — used by the **mobile app**, which stores the token in `AsyncStorage` (key `yd_access_token`) and injects the header via `apiFetch()` in `constants/api.ts`.

`JwtAuthGuard` is applied per-route (`@UseGuards(JwtAuthGuard)`), not globally — there is no `APP_GUARD`. Some routes are intentionally or accidentally unauthenticated (see Backend `CLAUDE.md` for the list); check guards explicitly before assuming a route is protected.

**Mobile vehicle switcher.** The mobile app mirrors the web frontend's "active vehicle" concept via `hooks/use-veicoli.ts`: it fetches `GET /veicolo/utente/:id`, keeps the selected vehicle id in `AsyncStorage` (`veicoloAttivoId`), and exposes `seleziona()`/`elimina()`. `components/utente/VeicoloSwitcher.tsx` is the UI on top of this hook. The web frontend has an equivalent but separately-implemented switcher in `functions-app.js` (global `veicoli[]` / `veicoloAttivoIndex`, `localStorage`) — the two are **not** shared code, keep them in sync manually when changing the underlying API contract.

**NestJS module structure.** Most domains have a dedicated `*.module.ts` (`officina`, `prenotazione`, `stripe`, `storico_interventi`), but `utente` and `veicolo` do **not** — their controllers/services/providers are registered directly in `AppModule`. `JwtModule.registerAsync` is configured redundantly in both `AppModule` and `OfficinaModule` (same secret). No global API prefix is set (`setGlobalPrefix` unused) — routes are "bare" (`/auth/...`, `/veicolo/...`, `/officina/...`, `/prenotazioni`, `/interventi/...`, `/abbonamento/...`).

**Stripe is fully server-driven.** Neither the web frontend nor the mobile app load the Stripe SDK/publishable key client-side. Both simply `POST /abbonamento/checkout` and redirect the browser/WebView to the returned Checkout Session URL. Subscription state changes only happen server-side via the `/abbonamento/webhook` endpoint (`checkout.session.completed`, `customer.subscription.deleted`).

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

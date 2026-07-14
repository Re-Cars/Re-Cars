# CLAUDE.md — Backend

NestJS 11 REST API for RE|CARS. Package manager: **pnpm**. ORM: Prisma 7 (`@prisma/adapter-pg`) against PostgreSQL. No global route prefix — routes are exactly as listed below.

See the root `CLAUDE.md` for cross-project context (JWT dual-transport, environment variables, known constraints).

## Commands

```bash
pnpm install
pnpm start:dev          # watch mode, port 3000 (or $PORT)
pnpm start                # no watch
pnpm build                  # nest build -> dist/
pnpm start:prod                # node dist/main
npx prisma generate               # regenerate client after schema.prisma edits
npx prisma migrate dev              # create + apply a dev migration
pnpm test                             # unit tests (src/**/*.spec.ts)
pnpm test:e2e                           # e2e tests (test/*.e2e-spec.ts)
pnpm lint                                 # eslint --fix
pnpm format                                # prettier --write
```

Bootstrap details (`src/main.ts`): `NestFactory.create(AppModule, { rawBody: true })` (raw body needed for Stripe webhook signature verification), global `cookie-parser()`, global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`, CORS hardcoded to `http://127.0.0.1:5500` / `http://localhost:5500` with `credentials: true`. Listens on `process.env.PORT ?? 3000`.

## Modules

| Module | Has dedicated `*.module.ts`? | Notes |
|---|---|---|
| `AppModule` | — | Root module; also directly declares `UtenteController`/`UtenteService` and `VeicoloController`/`VeicoloService` as controllers/providers (no separate module for either) |
| `officina` | yes | Own `JwtModule.registerAsync` (duplicated config, same `JWT_SECRET`) |
| `prenotazione` | yes | Depends on `AppMailerModule` for confirmation emails |
| `storico_interventi` (`StoricoModule`) | yes | |
| `stripe` (`StripeModule`) | yes | |
| `PrismaModule` / `PrismaService` | yes | Wraps `@prisma/adapter-pg`, reads `DATABASE_URL` |
| `AppMailerModule` (`mailer.module.ts`) | yes | Wraps `@nestjs-modules/mailer` + Nodemailer, reads `MAIL_USER`/`MAIL_PASS` |

No `APP_GUARD` is registered globally — every protected route opts in explicitly with `@UseGuards(JwtAuthGuard)`.

## JWT guards and authentication flow

- `JwtStrategy` (`src/jwt.strategy.ts`, `extends PassportStrategy(Strategy)` from `passport-jwt`) reads `JWT_SECRET` directly from `process.env` (throws at bootstrap if missing — not read via `ConfigService` here, unlike `AppModule`/`OfficinaModule`'s `JwtModule.registerAsync`).
- Token extraction order (`ExtractJwt.fromExtractors`): 1) httpOnly cookie `access_token`, 2) `Authorization: Bearer <token>` header (mobile fallback).
- `validate()` returns `{ sub, email, tipo }`, exposed as `req.user`.
- `JwtAuthGuard` (`src/jwt-auth.guard.ts`) is a plain `extends AuthGuard('jwt')`.
- Token payloads issued:
  - private/company user login: `{ sub: utente.id, email, tipo }`
  - company login by P.IVA: `{ sub: utente.id, partita_iva, tipo }`
  - officina login: `{ sub: officina.id, partita_iva, tipo: 'officina' }`
- Cookie set on every register/login response: `access_token`, `httpOnly: true, secure: true, sameSite: 'none', maxAge: 3600000`.
- There is no `@Roles`/`RolesGuard`/`@Public` decorator anywhere. Fine-grained authorization (e.g. "does this prenotazione belong to this officina") is done manually in service methods by comparing `req.user.sub` to the resource's owner id.
- **Unauthenticated routes to be aware of**: `GET /veicolo/:id` and the entire `StoricoController` (`/interventi/*`) have no guard applied — do not assume they are protected.

## Controllers and endpoints

No global prefix. `AppController` has no `@Controller()` path argument (root).

### `AppController` (`@Controller()`)
- `GET /` — health check ("Hello World!")
- `GET /citta?q=` — city autocomplete (min 2 chars, case-insensitive on `nome`/`sigla`, max 8 results)

### `UtenteController` (`@Controller('auth')`)
- `POST /auth/register` — register private/company user (`CreateUtenteDto`), bcrypt-hashes password, issues JWT + cookie
- `POST /auth/login` — email + password login (`LoginUtenteDto`)
- `POST /auth/login/azienda` — P.IVA + password login for `tipo: azienda` (`LoginAziendaDto`)
- `POST /auth/logout` — clears the `access_token` cookie
- `GET /auth/utente/:id` — `JwtAuthGuard` — user profile + most recent active `abbonamento`
- `PATCH /auth/utente/:id` — `JwtAuthGuard` — update profile (`UpdateUtenteDto`: username, email, cellulare, avatar, password)

### `VeicoloController` (`@Controller('veicolo')`, no dedicated module — declared in `AppModule`)
- `POST /veicolo` — `JwtAuthGuard` — looks up plate in mock dataset `data/veicoli.json`, enforces plan limits (base=1, premium=5, pro=unlimited), creates `veicolo` + `dati_generici` + `dati_specifici`
- `GET /veicolo/cerca/:targa` — `JwtAuthGuard` — plate lookup only (no persistence)
- `GET /veicolo/utente/:id` — `JwtAuthGuard` — list a user's vehicles with `dati_generici`/`dati_specifici`
- `GET /veicolo/:id` — **no guard** — vehicle detail by id
- `DELETE /veicolo/:id` — `JwtAuthGuard` — deletes vehicle and its `dati_generici`/`dati_specifici`

### `OfficinaController` (`@Controller('officina')`)
- `POST /officina/register` — checks P.IVA/email uniqueness, issues JWT + cookie
- `POST /officina/login` — P.IVA + password
- `POST /officina/logout`
- `GET /officina/dashboard` — `JwtAuthGuard` — today's bookings, weekly stats, active subscription, ponti disponibili
- `GET /officina/prenotazioni?stato=` — `JwtAuthGuard` — all bookings, optional status filter
- `PATCH /officina/prenotazioni/:id/stato` — `JwtAuthGuard` — update booking status (ownership-checked)
- `GET /officina/profilo` — `JwtAuthGuard` — profile + stats + active subscription
- `PATCH /officina/profilo` — `JwtAuthGuard` — update profile (body is untyped `any`)
- `PATCH /officina/abbonamento` — `JwtAuthGuard` — change plan by cancelling the active one and creating a new one **directly in the DB, bypassing Stripe**
- `DELETE /officina/abbonamento` — `JwtAuthGuard` — cancels active subscription (status → `annullato`)
- `DELETE /officina/profilo` — `JwtAuthGuard` — deletes officina, manually cascades subscriptions and bookings, clears cookie
- `GET /officina/agenda?anno=&mese=` — `JwtAuthGuard` — bookings for a given month (defaults to current)
- `GET /officina/all` — `JwtAuthGuard` — all officine, formatted for the frontend map (falls back to Milan coordinates when lat/long are missing)

### `PrenotazioniController` (`@Controller('prenotazioni')`)
- `POST /prenotazioni` — `JwtAuthGuard` — creates a booking (`CreatePrenotazioneDto`), sends a confirmation email with a `.ics` attachment via `MailerService`
- `GET /prenotazioni` — `JwtAuthGuard` — bookings for the logged-in user (includes officina data), ordered by date desc

### `StoricoController` (`@Controller('interventi')`) — **no guard applied anywhere** (`JwtAuthGuard` is commented out in source)
- `GET /interventi/veicolo/:id_veicolo` — interventions for a vehicle, ordered by date desc
- `POST /interventi` — create (`CreateInterventoDto`)
- `PUT /interventi/:id` — update (`UpdateInterventoDto`)
- `DELETE /interventi/:id`

### `StripeController` (`@Controller('abbonamento')`)
- `POST /abbonamento/checkout` — `JwtAuthGuard` — creates a Stripe Checkout Session (`mode: 'subscription'`) based on plan/user type, returns `{ url }`
- `POST /abbonamento/webhook` — public, verified via Stripe signature (`STRIPE_WEBHOOK_SECRET` + `rawBody`)
- `POST /abbonamento/disdici` — `JwtAuthGuard` — cancels active subscription **locally only**, does not call Stripe's API to actually cancel it

## Stripe webhooks

`StripeService.costruisciEvento(rawBody, signature)` → `stripe.webhooks.constructEvent(...)`. Returns 400 on signature failure. Handled event types:
- `checkout.session.completed` — reads `session.metadata` (`piano`, `tipo`, `id`), cancels any existing active subscription for that utente/officina, creates a new `abbonamento` row (`stato: 'attivo'`, `stripe_subscription_id: session.subscription`)
- `customer.subscription.deleted` — sets `stato: 'annullato'` on every `abbonamento` matching that `stripe_subscription_id`

Not handled: `invoice.payment_failed`, `customer.subscription.updated`, and others. Always responds `200 { received: true }` after processing.

Price resolution is a static map inside `StripeService`: `premium`→`STRIPE_PRICE_PREMIUM`, `pro`→`STRIPE_PRICE_PRO`, `officina_business`→`STRIPE_PRICE_BUSINESS`, `officina_business_pro`→`STRIPE_PRICE_BUSINESS_PRO`. `apiVersion: '2026-05-27.dahlia'` is pinned in the SDK client.

## Prisma schema quick reference

Models: `utente`, `officina`, `citta`, `veicolo`, `dati_generici`, `dati_specifici`, `storico_intervento`, `prenotazione`, `recensione`, `abbonamento`. Full description of fields/relations is in the root `README.md` §9 — read `prisma/schema.prisma` directly for exact types before writing migrations. All foreign keys are `onDelete: NoAction, onUpdate: NoAction` — cascades are manual, in the service layer.

## Testing

- Unit specs exist only for `app`, `officina`, `prenotazione` — and are smoke tests (`should be defined`) except `AppController`'s "Hello World!" check. `utente`, `veicolo`, `stripe`, `storico_interventi` have no specs.
- One e2e spec (`test/app.e2e-spec.ts`) checks `GET /` only.
- When touching business logic (plan limits, ownership checks, webhook handling), add real assertions — do not assume existing tests cover regressions.

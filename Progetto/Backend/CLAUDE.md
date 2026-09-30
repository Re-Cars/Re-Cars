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
| `assistente` (`AssistenteModule`) | yes | Gemini chat assistant (`GeminiClient`, REST + SSE, reads `GEMINI_API_KEY`/`GEMINI_MODEL`); per-user in-memory rate limit. Logs a warning at startup without the key, and Google's error message on failures ("Assistente non disponibile: HTTP 4xx: …") |
| `verifica-email` (`VerificaEmailModule`) | yes | Email verification codes for registration (imported by `AppModule` and `OfficinaModule`) |
| `notifiche` (`NotificheModule`) | yes | Web Push (VAPID, `web-push`): device subscriptions, daily deadlines/appointment reminders, booking status notifications; imported by `OfficinaModule`. Off without `VAPID_*` keys |
| `carburanti` (`CarburantiModule`) | yes | Fuel prices from MIMIT open data (two daily CSVs: stations + 8 a.m. prices), downloaded at startup and at most every 6 h, kept in memory (no DB tables). URLs overridable with `CARBURANTI_URL_ANAGRAFICA` / `CARBURANTI_URL_PREZZI` |
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
- Cookie set on every register/login response: `access_token`, `httpOnly: true, secure: true, sameSite: 'none', maxAge: SESSIONE_MS` (30 days, same as the JWT `expiresIn`, see `src/auth-cookie.util.ts`).
- There is no `@Roles`/`RolesGuard`/`@Public` decorator anywhere. Fine-grained authorization (e.g. "does this prenotazione belong to this officina") is done manually in service methods by comparing `req.user.sub` to the resource's owner id.
- **Unauthenticated routes to be aware of**: `GET /veicolo/:id` and the entire `StoricoController` (`/interventi/*`) have no guard applied — do not assume they are protected.

## Controllers and endpoints

No global prefix. `AppController` has no `@Controller()` path argument (root).

### `AppController` (`@Controller()`)
- `GET /` — health check ("Hello World!")
- `GET /citta?q=` — city autocomplete (min 2 chars, case-insensitive on `nome`/`sigla`, max 8 results)

### `UtenteController` (`@Controller('auth')`)
- `POST /auth/verifica-email` — public — body `{ email, per? }` (`RichiestaCodiceDto`) — checks the address (placeholder/disposable names, MX record, not already registered) and mails a 6-digit code (`VerificaEmailService`, in memory, 10 min, 5 attempts, 60 s between codes); 503 if the email cannot be sent
- `POST /auth/register` — register private/company user (`CreateUtenteDto` incl. `codice`), 409 if the email exists, bcrypt-hashes password, issues JWT + cookie
- `GET /auth/me` — `JwtAuthGuard` — `{ tipo: 'utente'|'officina', profilo }` of the current session (password omitted)
- `POST /auth/login` — email + password login (`LoginUtenteDto`)
- `POST /auth/login/azienda` — P.IVA + password login for `tipo: azienda` (`LoginAziendaDto`)
- `POST /auth/logout` — clears the `access_token` cookie
- `GET /auth/utente/:id` — `JwtAuthGuard` — user profile + most recent active `abbonamento`
- `PATCH /auth/utente/:id` — `JwtAuthGuard` — update profile (`UpdateUtenteDto`: username, email, cellulare, avatar, password)

### `VeicoloController` (`@Controller('veicolo')`, no dedicated module — declared in `AppModule`)
- `POST /veicolo` — `JwtAuthGuard`, Premium only — looks up plate in mock dataset `data/veicoli.json`, enforces plan limits (`LIMITE_VEICOLI` in `src/piano.ts`: Gratis 1, Premium unlimited), creates `veicolo` + `dati_generici` + `dati_specifici`
- `POST /veicolo/manuale` — `JwtAuthGuard`, users only — vehicle typed in by the user from the registration document (`CreateVeicoloManualeDto`: targa auto `AA123BB` or moto `AA12345`, tipo, marca ≤30, modello ≤40, dataimmatricolazione, optional alimentazione/cilindrata/potenza_kw/porte/assicurazione/scadenze); same plate-uniqueness and plan-limit checks as `POST /veicolo`, kW converted to CV, saved in a transaction
- `GET /veicolo/cerca/:targa` — `JwtAuthGuard`, Premium only (`richiediPremium`) — plate lookup only (no persistence). `POST /veicolo` (add by plate) is Premium only too; `POST /veicolo/manuale` is open to both plans, all within `LIMITE_VEICOLI`
- `GET /veicolo/utente/:id` — `JwtAuthGuard` — list a user's vehicles with `dati_generici`/`dati_specifici`
- `GET /veicolo/:id` — **no guard** — vehicle detail by id
- `DELETE /veicolo/:id` — `JwtAuthGuard` — deletes vehicle and its `dati_generici`/`dati_specifici`

### `OfficinaController` (`@Controller('officina')`)
- `POST /officina/register` — needs the email `codice` (see `/auth/verifica-email` with `per: 'officina'`), checks P.IVA/email uniqueness, issues JWT + cookie
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

### `NotificheController` (`@Controller('notifiche')`)
- `GET /notifiche/chiave-pubblica` — public — VAPID public key for `PushManager.subscribe` (503 if not configured)
- `POST /notifiche/iscrizione` / `DELETE /notifiche/iscrizione` — `JwtAuthGuard`, users only — save/remove this browser's push subscription (upsert by endpoint)
- `POST /notifiche/prova` — `JwtAuthGuard` — test notification to the user's devices
- `POST /notifiche/controllo-giornaliero` — header `x-cron-secret` = `NOTIFICHE_CRON_SECRET` (401 otherwise, 503 if unset) — sends today's deadline alerts, tomorrow's appointment reminders and Premium-ending reminders (7/1/0 days, auto-renew off); marks subscriptions past `data_fine` as `scaduto` (even with push off); idempotent thanks to `notifica_inviata`. Expired subscriptions (404/410 from the push service) are deleted.

### `CarburantiController` (`@Controller('carburanti')`)
- `GET /carburanti/vicini?lat=&lng=&carburante=benzina|gasolio|gpl|metano&raggio=5` — `JwtAuthGuard`, Premium only — up to 10 stations within the radius (1–30 km), cheapest first (self price when available, otherwise full service), with distance and MIMIT extraction date. 503 if the MIMIT data could not be downloaded and no previous copy is in memory.

### `StripeController` (`@Controller('abbonamento')`)
- `POST /abbonamento/checkout` — `JwtAuthGuard` — creates a Stripe Checkout Session (`mode: 'subscription'`, card saved, renews monthly), returns `{ url }`. A user who already has a Stripe subscription gets 409 (no double Premium)
- `GET /abbonamento/stato` — `JwtAuthGuard` — `{ piano, rinnovoAutomatico, dataFine, prossimoRinnovo, gestibile }`, read live from Stripe (falls back to the DB if Stripe is unreachable) and syncs `data_fine`
- `POST /abbonamento/rinnovo` — `JwtAuthGuard` — body `{ automatico: boolean }` (`RinnovoDto`) — sets Stripe `cancel_at_period_end`; off → `data_fine` = end of the paid period
- `POST /abbonamento/portale` — `JwtAuthGuard` — body `{ baseUrl? }` — Stripe billing portal URL (change card, invoices). Needs the portal configured once in the Stripe dashboard
- `POST /abbonamento/webhook` — public, verified via Stripe signature (`STRIPE_WEBHOOK_SECRET` + `rawBody`)
- `POST /abbonamento/disdici` — `JwtAuthGuard` — with a Stripe subscription it switches auto-renew off (still active until `data_fine`, no further charges); rows without a Stripe id are closed immediately

### `AssistenteController` (`@Controller('assistente')`)
- `POST /assistente/chat` — `JwtAuthGuard`, users only (`tipo === 'officina'` → 403) — body `{ messaggio, storico?, pagina? }`, answers as Server-Sent Events: `{type:'delta', text}` chunks, then `{type:'done', answer, actions, used_llm}`. Actions are validated against a page whitelist (`assistente.prompt.ts`); the model can only propose, never modify data. 429 + `Retry-After` over `ASSISTENTE_LIMITE_MINUTO` or the plan's daily cap (`ASSISTENTE_LIMITE_GIORNO` Premium, `ASSISTENTE_LIMITE_GIORNO_GRATIS` Gratis). Without `GEMINI_API_KEY`, or on Gemini quota errors, it still answers `done` with a fallback message.

## Stripe webhooks

`StripeService.costruisciEvento(rawBody, signature)` → `stripe.webhooks.constructEvent(...)`. Returns 400 on signature failure. Handled event types (enable all four on the Stripe endpoint):
- `checkout.session.completed` — reads `session.metadata` (`piano`, `tipo`, `id`), closes the previous active row (and its old Stripe subscription immediately, so an officina plan change is not billed twice), creates a new `abbonamento` row (`stato: 'attivo'`, `stripe_subscription_id`)
- `customer.subscription.updated` — syncs `data_fine` with `cancel_at_period_end`/`cancel_at` (also when changed from the billing portal); `canceled`/`unpaid`/`incomplete_expired` → `scaduto`
- `customer.subscription.deleted` — `stato: 'scaduto'` + push "Premium terminato"
- `invoice.payment_failed` — push "pagamento non riuscito" (deduplicated per period via `notifica_inviata`)

`statoRinnovo()` (pure, tested) reads renewal and dates from a subscription (period end is on the subscription item since API 2025). Price resolution: `premium`→`STRIPE_PRICE_PREMIUM`, `officina_business`→`STRIPE_PRICE_BUSINESS`, `officina_business_pro`→`STRIPE_PRICE_BUSINESS_PRO` (`pro` is no longer sold; legacy `pro` rows count as Premium). `apiVersion: '2026-05-27.dahlia'` is pinned in the SDK client.

Known gap: `PATCH`/`DELETE /officina/abbonamento` still change officina plans in the DB only, without touching Stripe.

## Prisma schema quick reference

Models: `utente`, `officina`, `citta`, `veicolo`, `dati_generici`, `dati_specifici`, `storico_intervento`, `prenotazione`, `recensione`, `abbonamento`. Full description of fields/relations is in the root `README.md` §9 — read `prisma/schema.prisma` directly for exact types before writing migrations. All foreign keys are `onDelete: NoAction, onUpdate: NoAction` — cascades are manual, in the service layer.

## Testing

- Unit specs for `app`, `officina`, `prenotazione` are smoke tests (`should be defined`) except `AppController`'s "Hello World!" check. `utente`, `veicolo`, `stripe`, `storico_interventi` have no specs.
- `carburanti` covers CSV parsing (both separators, BOM, bad rows), fuel mapping, radius/price ordering and the 503 path with a mocked `fetch`.
- `stripe` covers `statoRinnovo`, status/renewal/cancel endpoints, the 409 on a second Premium and the updated/deleted/payment_failed webhooks with a mocked `StripeService`.
- `notifiche` has real coverage: date logic in the Italian timezone, thresholds, reminders, revoked subscriptions, daily-check deduplication. `veicolo` covers the manual-entry DTO and service.
- `assistente` has real coverage: partial-JSON streaming, action whitelist, rate limit, fallback messages, and an integration spec of `POST /assistente/chat` with a mocked `fetch` (Gemini SSE).
- One e2e spec (`test/app.e2e-spec.ts`) checks `GET /` only.
- When touching business logic (plan limits, ownership checks, webhook handling), add real assertions — do not assume existing tests cover regressions.

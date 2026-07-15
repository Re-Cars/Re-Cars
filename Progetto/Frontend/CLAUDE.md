# CLAUDE.md — Frontend

Static HTML/CSS/vanilla JS website for RE|CARS. No `package.json`, no bundler, no framework — pages are served as-is. See the root `CLAUDE.md` for cross-project context (JWT dual-transport, environment variables, known constraints).

## Running locally

Open `landing.html` with the VS Code **Live Server** extension. It must run on port **5500** — the backend's CORS in `Backend/src/main.ts` only whitelists `http://127.0.0.1:5500` and `http://localhost:5500`. Any other static server (e.g. `python -m http.server`, `npx serve`) will be blocked by CORS unless that whitelist is updated. The backend must be running separately (`pnpm start:dev` in `Progetto/Backend`, default port 3000).

## File structure

- **Pages** (`*.html`) — one file per screen, no routing/SPA framework. Each pulls in its own `functions-*.js` file(s) plus shared ones (`functions-base.js`, and for user pages `functions-app.js`).
- **Scripts** (`functions-*.js`) — one file per functional domain, loaded via plain `<script>` tags, all operating on the global scope (no modules/bundler).
- **Styles** (`style-*.css`) — one file per area.
- **`assets-pdf.js`** — not application logic: base64-embedded logo PNG + Inter font TTFs, consumed by `functions-storico.js` for PDF generation.
- **`Img/`** — SVG logos and background images.

### What each `functions-*.js` file does

| File | Responsibility |
|---|---|
| `functions-base.js` | Shared utilities: `getData`/`setData` (localStorage wrapper), `getUtente()`, dark/light theme toggle, sidebar open/close, 3D tilt effect on subscription cards |
| `functions-app.js` | The largest shared file (loaded on almost every user page): logout, header avatar, the **vehicle switcher** (see below), active-vehicle info loading, plate search/add, plan-limit banner, homepage circular layout |
| `functions-auth.js` | Login/register step wizards (`landing.html`), city autocomplete for officina registration, landing page animations |
| `functions-account.js` | Account page: load/edit profile fields, avatar upload+crop (Cropper.js via CDN), account deletion |
| `functions-veicoli.js` | Vehicle list page (`veicoli.html`): renders all vehicles with bollo/RCA badges, per-vehicle detail fetch |
| `functions-abbonamenti.js` | User subscription plans + Stripe checkout redirect |
| `functions-abbonamenti-officina.js` | Officina subscription plans + Stripe checkout redirect (mirror of the above, different endpoints) |
| `functions-officina.js` | Officina dashboard (`officina.html`): stats, today's bookings, status updates |
| `functions-officina-agenda.js` | Officina agenda (`officina-agenda.html`): week/month calendar views |
| `functions-officina-common.js` | Shared by all officina pages: avatar menu, officina logout (`POST /officina/logout`) |
| `functions-prenotazioni-officina.js` | Full filterable bookings list (`prenotazioni-officina.html`) |
| `functions-profilo-officina.js` | Officina profile page: anagraphic data, service types, profile deletion |
| `functions-prenotazione-utente.js` | `prenotazioni.html`: officina search, Leaflet/OpenStreetMap map, Nominatim geocoding, booking modal |
| `functions-storico.js` | Vehicle service history CRUD + PDF report generation (jsPDF + jspdf-autotable, both from CDN) |

`recensioni.html` and `problemi.html` are UI-only mockups with no dedicated JS and no backend calls — do not assume they are wired up.

## API base URL

There is **no central config file**. Every `functions-*.js` file (except `functions-officina-common.js`, which reuses the `API` constant defined by whichever main file loaded first on the same page) independently declares:

```js
const API = 'http://localhost:3000';
```

Changing the backend URL for a deployment means editing this literal in ~12 files. There is no `.env`, no environment switching logic.

## Authentication (cookie-based, not header-based)

Every `fetch()` call to the backend passes `credentials: 'include'` so the browser sends/receives the httpOnly `access_token` cookie set by NestJS (`cookie-parser`). The frontend **never** sends an `Authorization: Bearer` header (unlike the mobile app). The recurring pattern for expired sessions is:
```js
if (response.status === 401) { alert(...); logout(); return; }
```
`localStorage` keys in use: `yd_utente_loggato` (serialized user/officina profile — this is **not** the JWT, the JWT only lives in the cookie), plus UI state: `veicoloAttivo`, `veicoloAttivoId`, `theme`, `storico_targhe`, `garage_animation`, `garage_limite_raggiunto`, `yd_avatar_img`.

## Vehicle switcher

Global state lives in `functions-app.js`:
```js
let veicoli = [];            // the user's vehicles
let veicoloAttivoIndex = 0;  // index of the active vehicle in `veicoli`
```
Key functions: `caricaVeicoli()` (`GET /veicolo/utente/:idUtente`, restores active index from `localStorage.veicoloAttivoId`), `getVeicoloAttivo()`, `renderVeicoloAttivo()` (updates header pill + persists to localStorage), `renderDropdown()` (builds the switcher dropdown), `selezionaVeicolo(index)` (switches active vehicle and, if the current page defines the right hooks, reloads page-specific data — e.g. calls `caricaInfoVeicolo()` if `#iv-tipo` exists, or `caricaInterventi()` if defined), `toggleSwitcher()`/`closeSwitcher()`, `mostraConfermaElimina()`/`eliminaVeicolo(id)` (`DELETE /veicolo/:id`).

Vehicle search/add (`cerca-veicolo.html`, in `functions-app.js`): `validaTarga()` validates against the Italian plate regex `^[A-Z]{2}[0-9]{3}[A-Z]{2}$`, keeps a 5-entry search history in `localStorage`, looks up via `GET /veicolo/cerca/:targa`, adds via `POST /veicolo` (handles `409` "already exists" and `403` "plan limit reached" → upsell banner to `abbonamenti.html`).

Tabs/pages listen for the browser `storage` event to stay in sync across multiple open tabs when the active vehicle changes.

## Subscriptions / Stripe

No Stripe.js is loaded client-side, no publishable key appears anywhere in the frontend — the integration is entirely server-driven:
1. `avviaCheckout(piano)` (in `functions-abbonamenti.js` / `functions-abbonamenti-officina.js`) does `POST /abbonamento/checkout` with `{ piano, id_utente, baseUrl }`.
2. The backend returns `{ url }` (a Stripe Checkout Session URL); the frontend does `window.location.href = data.url`.
3. Stripe redirects back to the static confirmation pages `pagamento.html` (user) / `pagamento-officina.html` (officina) after payment — these pages do **not** verify the payment outcome client-side; the actual subscription activation happens server-side via webhook.
4. `disdiciAbbonamento()` calls `POST /abbonamento/disdici`.

User plans: `base`, `premium`, `pro`. Officina plans: `officina_business`, `officina_business_pro`.

## Officina features

`officina.html`, `officina-agenda.html`, and `prenotazioni-officina.html` each render a near-identical booking detail modal and status badges independently (duplicated template-string HTML across three files) — when changing booking-detail UI, check all three. Note the endpoint inconsistency: `officina.html` calls `PATCH /prenotazioni/:id/stato`, while `prenotazioni-officina.html` calls `PATCH /officina/prenotazioni/:id/stato` — both exist on the backend, don't conflate them.

## Service history PDF generation

`functions-storico.js` handles CRUD for `storico_intervento` (`GET/POST/PUT/DELETE /interventi...`). PDF export (`openPdfModal()` → `costruisciDocumentoPdf()` → `scaricaPdf()`/`anteprimaPdf()`) uses jsPDF + jspdf-autotable (CDN) and pulls embedded logo/font assets from `assets-pdf.js`. Note: `caricaInfoVeicolo()` is defined both here and in `functions-app.js` with the same name — whichever script tag loads last wins; be careful when refactoring either.

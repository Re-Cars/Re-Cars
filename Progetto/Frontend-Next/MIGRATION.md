# MIGRATION.md — da Frontend vanilla a Frontend-Next

Port **completo** del frontend RE|CARS da HTML/CSS/JS vanilla (`Progetto/Frontend`)
a **Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4**.
L'estetica (palette, glassmorphism, animazioni, layout responsive) è replicata 1:1
riusando gli stessi nomi di classe CSS del sito originale (`src/app/globals.css`
per il core condiviso + `src/styles/*.css` per le aree officina/prenotazioni/
storico/FAQ).

## Avvio rapido

```bash
pnpm install
pnpm dev           # solo Next → http://localhost:3001
pnpm dev:all       # backend (porta 3000, via pnpm in ../Backend) + Next insieme
pnpm build         # build di produzione
pnpm start         # server di produzione su porta 3001
pnpm lint          # ESLint
```

> Package manager: **pnpm** (come `Progetto/Backend`). Vedi `README-DEV.md`.

Porte: backend **3000**, Next **3001**, vanilla su Live Server **5500** — i tre
servizi convivono senza conflitti (dettagli in `README-DEV.md`). La whitelist
CORS di `Backend/src/main.ts` include già 5500, 3001 e l'eventuale origine di
produzione via env `FRONTEND_ORIGIN`.

## Architettura

| Vanilla | Next.js |
|---|---|
| `const API = 'http://localhost:3000'` duplicata in ~12 file | `src/lib/api.ts`: `fetchApi()` unico + funzioni tipizzate per ogni endpoint, base URL da `NEXT_PUBLIC_API_URL` |
| `getData`/`setData` + accessi sparsi a localStorage | `src/lib/storage.ts`: accesso type-safe con le **stesse chiavi** (`yd_utente_loggato`, `veicoloAttivoId`, `theme`, `storico_targhe`, …) |
| logica login/logout copiata in ogni pagina | `src/lib/auth.ts` + `src/context/AuthContext.tsx` |
| vehicle switcher globale (`veicoli[]`, `veicoloAttivoIndex` in `functions-app.js`) ridisegnato a mano in ogni HTML | `AuthContext` (stato) + `src/components/VeicoloSwitcher.tsx` (UI), montato una sola volta dal `Layout` |
| header/sidebar/breadcrumb duplicati in ~15 file HTML | `Header.tsx`, `Sidebar.tsx`, `BreadCrumb.tsx`, composti da `Layout.tsx` |
| tema con `data-theme` sul `<body>` (`functions-base.js`) | `next-themes` con classe `dark` sull'`<html>`, `defaultTheme: system`, stessa chiave localStorage `theme` |
| Cropper.js 1.6 da CDN | `cropperjs@1.6` da npm (stessa API v1) |
| Font Awesome da CDN | invariato (CDN nel root layout), così le classi `fa-*` restano identiche |
| font Inter dichiarato ma mai caricato | Inter servito da `next/font/google` |

### Pagine

| Vanilla | Next | Note |
|---|---|---|
| `landing.html` (saracinesca + form nella stessa pagina) | `/` + `/login` + `/registrazione` | la saracinesca si solleva e naviga a `/login`; i form step-wizard sono identici |
| `homepage.html` | `/homepage` | card circolari, cerchi pulsanti, bottone Cerca, switcher fluttuante |
| `account.html` | `/account` | profilo, avatar + crop, modifica inline, abbonamento, zona pericolosa |
| `veicoli.html` | `/veicoli` | badge Bollo/RCA, azioni info/elimina |
| `cerca-veicolo.html` | `/cerca-veicolo` | validazione targa, storico 5 ricerche, gestione 409/403 |
| `abbonamenti.html` | `/abbonamenti` | card con tilt 3D, checkout Stripe server-driven, disdetta |
| `info-veicolo.html` | `/info-veicolo` | si ricarica al cambio veicolo dallo switcher |
| `pagamento.html` | `/pagamento` | legge `session_id` dall'URL e ricarica il piano dal backend |
| `prenotazioni.html` | `/prenotazioni` | ricerca officine, filtri categoria, mappa **Leaflet** (npm, import dinamico client-only) + geocodifica Nominatim, GPS, modal prenotazione con slot orari, "Le mie prenotazioni" |
| `storico-interventi.html` | `/storico-interventi` | CRUD interventi, filtri, riepilogo spese mese/anno, **report PDF** (jsPDF + jspdf-autotable da npm; font Inter e logo in `src/lib/pdf-assets.ts`, generazione in `src/lib/pdf-report.ts`, caricati lazy) |
| `recensioni.html` | `/recensioni` | mockup UI senza backend, come il vanilla (stelle interattive) |
| `problemi.html` | `/problemi` | mockup UI senza backend, come il vanilla |
| `info-domande.html` | `/info-domande` | FAQ accordion (apertura singola) |
| `termini-privacy.html` | `/termini-privacy` | contenuto statico |
| `officina.html` | `/officina` | dashboard: stats, switcher veicoli oggi, prenotazioni con conferma/annulla/completa |
| `prenotazioni-officina.html` | `/prenotazioni-officina` | lista completa con filtri per stato e contatori |
| `officina-agenda.html` | `/officina-agenda` | mini calendario, slot oggi, viste settimana/mese |
| `profilo-officina.html` | `/profilo-officina` | anagrafica modificabile, stats, servizi (pill toggle), zona pericolosa |
| `abbonamenti-officina.html` | `/abbonamenti-officina` | piani Business / Business Pro, checkout Stripe |
| `pagamento-officina.html` | `/pagamento-officina` | conferma pagamento Stripe lato officina |

L'area officina usa un layout dedicato (`src/components/officina/OfficinaLayout.tsx`,
logout via `POST /officina/logout`) e il modal "Dettaglio prenotazione" — che nel
vanilla era duplicato in tre file HTML — è un unico componente condiviso
(`DettaglioPrenotazioneModal.tsx`). Login e registrazione officina reindirizzano
a `/officina`. Restano intenzionalmente diversi i due endpoint di cambio stato
(`PATCH /prenotazioni/:id/stato` dalla dashboard, `PATCH /officina/prenotazioni/:id/stato`
dalla lista), come nel vanilla.

## Autenticazione e route protette

- Il JWT resta nel **cookie httpOnly `access_token`** del backend (invariato):
  ogni chiamata usa `credentials: 'include'`, nessun header Bearer.
- Il middleware Next (`src/middleware.ts`) non può leggere quel cookie (è
  httpOnly e sul dominio del backend), quindi `src/lib/auth.ts` imposta al
  login un cookie flag **`rc_session`** (non httpOnly, max-age 1h come il JWT)
  che il middleware usa per i redirect. Route pubbliche: `/`, `/login`,
  `/registrazione`; tutte le altre reindirizzano a `/login`.
- Il 401 (sessione scaduta) è gestito centralmente da `gestisci401` in
  `AuthContext`, replicando il pattern `alert + logout` del vanilla.
- **Perché Client Component + `useEffect` e non Server Component**: il cookie
  JWT `access_token` è impostato dal backend sul *suo* dominio (localhost:3000),
  quindi il browser non lo invia mai al server Next (3001) — un RSC non potrebbe
  inoltrarlo con `headers().get('cookie')` perché semplicemente non lo riceve.
  Tutte le pagine con dati autenticati sono quindi Client Component che chiamano
  il backend direttamente dal browser via `fetchApi` (`credentials: 'include'`).
- Nota: Next 16 segnala `middleware.ts` come convenzione deprecata a favore di
  `proxy.ts`; funziona regolarmente, la rinomina è un follow-up banale.

## Scelte e differenze intenzionali

- **CSS globale con i nomi classe originali** invece di riscrittura totale in
  utility Tailwind: garantisce fedeltà pixel-perfect di ~4.000 righe di CSS
  (conic-gradient animati, keyframes, media query). I token colore sono anche
  esposti come classi Tailwind (`bg-surface`, `text-accent-orange`, …) via
  `tailwind.config.ts` per il codice nuovo.
- Le variabili `--c-*` di `info-veicolo` erano **indefinite anche nel sito
  originale** (card trasparenti): comportamento mantenuto per fedeltà.
- Il tema di default è `system` (come richiesto); il vanilla forzava `dark`.
  La chiave localStorage `theme` è la stessa, quindi le preferenze salvate
  vengono rispettate.
- I 3 `<img>` residui (avatar header/account e sorgente del cropper) usano
  data-URI base64: `next/image` non li ottimizzerebbe, quindi restano `<img>`
  con eslint-disable motivato. Tutte le altre immagini usano `next/image`,
  tutti i link interni `next/link`.
- Le regole ESLint `react-hooks/set-state-in-effect` e `react-hooks/immutability`
  (nuove in react-hooks v6) sono disattivate nel config: segnalano come errori
  il pattern fetch-in-effect e l'assegnazione a `window.location.href` per il
  redirect Stripe, entrambi voluti.

## Deploy su Vercel

1. Push del repo su GitHub e import del progetto in Vercel con **Root
   Directory = `Progetto/Frontend-Next`** (framework rilevato: Next.js).
2. In *Settings → Environment Variables* impostare
   `NEXT_PUBLIC_API_URL=https://<url-pubblico-del-backend>`.
3. Aggiungere il dominio Vercel (`https://<progetto>.vercel.app`) alla
   whitelist CORS di `Backend/src/main.ts` e ricordare che il cookie
   `access_token` è `secure; sameSite: 'none'`, quindi il backend deve essere
   servito in HTTPS.
4. Aggiornare `FRONTEND_BASE_URL` nel backend se si vogliono redirect Stripe
   verso il dominio di produzione (il checkout usa anche il `baseUrl` inviato
   dal client, che in Next è `window.location.origin`).
5. Deploy: ogni push su `main` (o sul branch configurato) rideploya.

## Struttura del progetto

```
src/
├── middleware.ts            # route protette via cookie rc_session
├── app/
│   ├── layout.tsx           # Inter, ThemeProvider, AuthProvider, Font Awesome
│   ├── globals.css          # design system core (token light/dark + componenti condivisi)
│   ├── page.tsx             # landing (saracinesca animata)
│   ├── login/  registrazione/  homepage/  account/  veicoli/
│   ├── cerca-veicolo/  abbonamenti/  info-veicolo/  pagamento/
│   ├── prenotazioni/  storico-interventi/  recensioni/  problemi/
│   ├── info-domande/  termini-privacy/
│   ├── officina/  prenotazioni-officina/  officina-agenda/
│   ├── profilo-officina/  abbonamenti-officina/  pagamento-officina/
├── components/
│   ├── Layout.tsx  Header.tsx  Sidebar.tsx  BreadCrumb.tsx
│   ├── VeicoloSwitcher.tsx  AuthShell.tsx
│   └── officina/OfficinaLayout.tsx  officina/DettaglioPrenotazioneModal.tsx
├── context/AuthContext.tsx  # utente, veicoli, veicolo attivo, logout, 401
├── styles/                  # CSS di area portati 1:1 dal vanilla
│   ├── officina.css  officina-agenda.css  prenotazione-utente.css
│   ├── storico-intervento.css  infodomande.css
└── lib/
    ├── api.ts         # fetchApi + funzioni tipizzate per ogni endpoint (utente + officina)
    ├── auth.ts        # sessione (localStorage + cookie flag), logout utente e officina
    ├── storage.ts     # localStorage type-safe
    ├── types.ts       # tipi delle risposte backend
    ├── pdf-report.ts  # report PDF storico interventi (jsPDF, lazy)
    └── pdf-assets.ts  # logo PNG + font Inter base64 per il PDF
```

## Pagine portate nel secondo task di migrazione (22/07/2026)

`/prenotazioni`, `/storico-interventi`, `/recensioni`, `/problemi`,
`/info-domande`, `/termini-privacy`, `/officina`, `/prenotazioni-officina`,
`/officina-agenda`, `/profilo-officina`, `/abbonamenti-officina`,
`/pagamento-officina` — con relativi endpoint in `api.ts` (dashboard/agenda/
profilo/prenotazioni officina, catalogo officine, creazione prenotazione,
CRUD interventi, checkout Stripe officina, logout officina). La sidebar utente
ora replica tutte le voci del vanilla (Info e domande utili, Contatti, Termini
e privacy) e le card della homepage puntano tutte a pagine reali.

Nuove dipendenze: `leaflet` (+`@types/leaflet`), `jspdf`, `jspdf-autotable`,
`concurrently` (dev).

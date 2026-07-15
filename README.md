# RE|CARS

## 1. Descrizione del progetto

**RE|CARS** è un'applicazione full-stack per la gestione digitale di veicoli e per la prenotazione di interventi presso officine convenzionate. Il progetto è composto da un backend REST (NestJS), un frontend web (HTML/CSS/JS) e un'app mobile (React Native con Expo), pensati per lavorare insieme sullo stesso backend.

L'applicazione si rivolge a due profili utente distinti:

- **Utente privato / azienda** — proprietario di uno o più veicoli. Può registrare i propri veicoli (identificati tramite targa), consultarne i dati tecnici (alimentazione, cilindrata, cavalli, scadenze bollo/RCA), tenere uno storico degli interventi effettuati (con relativi costi), cercare officine convenzionate, prenotare appuntamenti e gestire un abbonamento a pagamento (piani Base, Premium, Pro) che determina, tra le altre cose, il numero massimo di veicoli registrabili.
- **Officina** (meccanica, carrozzeria, gommista, elettrauto, multimarca, concessionaria, tagliando, revisione) — gestisce la propria anagrafica, i tipi di servizio offerti, riceve e gestisce le prenotazioni dei clienti (conferma, annullamento, completamento), consulta un'agenda con vista settimanale/mensile e può sottoscrivere un proprio abbonamento (piani Business, Business Pro).

Entrambi i profili condividono lo stesso sistema di autenticazione JWT e lo stesso database.

## 2. Architettura generale

Il progetto è organizzato in tre applicazioni indipendenti che comunicano tutte con un unico backend tramite API REST:

```
┌─────────────────────┐        ┌──────────────────────┐        ┌─────────────────────┐
│   Frontend Web       │        │   Backend NestJS      │        │   App Mobile          │
│   (HTML/CSS/JS)       │        │                        │        │   (React Native/Expo) │
│   Progetto/Frontend/  │◄──────►│   Progetto/Backend/    │◄──────►│   ReCars-mobile/       │
│                       │  REST  │                        │  REST  │                       │
│  Autenticazione:      │  +JWT  │  - Prisma ORM          │  +JWT  │  Autenticazione:       │
│  cookie httpOnly       │  cookie│  - PostgreSQL          │ header │  header Authorization │
│  (credentials:include)│        │  - Stripe (pagamenti)   │        │  Bearer (AsyncStorage)│
└─────────────────────┘        │  - Nodemailer (email)   │        └─────────────────────┘
                                └──────────────────────┘
                                          │
                                          ▼
                                ┌──────────────────────┐
                                │   PostgreSQL           │
                                │   (Neon / locale)      │
                                └──────────────────────┘
```

Note sull'architettura:

- Il backend **non** ha un prefisso globale (`/api`): gli endpoint sono esposti "a nudo" (es. `/auth/login`, `/veicolo`, `/officina/dashboard`).
- L'autenticazione è basata su **JWT**, ma con due meccanismi di trasporto diversi a seconda del client:
  - il **frontend web** riceve il token in un cookie httpOnly (`access_token`, `secure`, `sameSite=none`) impostato dal backend al login/registrazione, e lo invia automaticamente ad ogni richiesta grazie a `credentials: 'include'`;
  - l'**app mobile** non può usare i cookie httpOnly in modo altrettanto naturale, quindi salva il token JWT in `AsyncStorage` e lo invia manualmente come header `Authorization: Bearer <token>` ad ogni chiamata (tramite la funzione `apiFetch`).
- Il backend accetta **entrambi** i meccanismi contemporaneamente: la strategia Passport-JWT prova prima ad estrarre il token dal cookie, poi in fallback dall'header `Authorization`.
- Il database è **PostgreSQL**, gestito tramite **Prisma ORM**. In produzione è pensato per puntare a un'istanza gestita (es. **Neon**), in locale a un'istanza PostgreSQL qualsiasi.
- I pagamenti degli abbonamenti sono gestiti interamente lato server tramite **Stripe Checkout** + **webhook**: né il frontend né il mobile caricano l'SDK Stripe lato client, si limitano a reindirizzare l'utente all'URL di Checkout Session restituito dal backend.

## 3. Prerequisiti

Versioni verificate nell'ambiente di sviluppo del progetto:

| Strumento | Versione utilizzata | Note |
|---|---|---|
| Node.js | v24.18.0 | Richiesto da NestJS 11 / Prisma 7 / Expo SDK 54. È accettabile anche una versione LTS recente (≥ 18), ma si consiglia di allinearsi alla versione usata in sviluppo. |
| pnpm | 11.10.0 | Package manager del **Backend** (`pnpm-lock.yaml`, `pnpm-workspace.yaml`) |
| npm | 11.16.0 | Package manager del progetto **mobile** (`package-lock.json`) |
| Expo CLI | 54.0.25 (eseguito via `npx expo`) | Nessuna installazione globale necessaria: viene risolto automaticamente da `npx` in base a `expo` nelle dipendenze (`~54.0.34`) |
| PostgreSQL | ≥ 14 (compatibile con Prisma 7 / `@prisma/adapter-pg`) | In locale, oppure istanza gestita come Neon |
| TypeScript | 5.9.x (backend), 5.9.x (mobile) | Installato come dev dependency in ciascun progetto, non serve installarlo globalmente |
| Estensione VSCode "Live Server" (consigliata) | — | Il backend ha il CORS whitelisted esplicitamente per `http://127.0.0.1:5500` e `http://localhost:5500`, le porte di default di Live Server. Servire il Frontend con un altro strumento richiede di modificare il CORS in `Backend/src/main.ts`. |

Per l'app mobile, il file `ReCars-mobile/AGENTS.md` segnala esplicitamente che l'app usa **Expo SDK 54**, che ha introdotto cambiamenti significativi rispetto alle versioni precedenti: prima di scrivere codice è consigliato consultare la documentazione versionata ufficiale (https://docs.expo.dev/versions/v54.0.0/).

## 4. Variabili d'ambiente

Le variabili d'ambiente sono necessarie solo per il **Backend** (frontend e mobile non usano file `.env`: la configurazione dell'endpoint API è hardcoded nel codice, vedi sezioni dedicate più sotto). Il file di riferimento è `Progetto/Backend/.env.example`.

| Variabile | Scopo | Esempio |
|---|---|---|
| `PORT` | Porta su cui il server NestJS resta in ascolto (default `3000` se non impostata) | `3000` |
| `DATABASE_URL` | Connection string PostgreSQL usata da Prisma (`@prisma/adapter-pg`) | `postgresql://user:password@localhost:5432/recars` |
| `JWT_SECRET` | Segreto usato per firmare e verificare i token JWT | `una-stringa-segreta-molto-lunga-e-casuale` |
| `MAIL_USER` | Utente SMTP (Gmail) usato da Nodemailer per l'invio delle email di conferma prenotazione | `nome.esempio@gmail.com` |
| `MAIL_PASS` | Password applicativa SMTP (Gmail App Password) associata a `MAIL_USER` | `xxxxxxxxxxxxxxxx` |
| `FRONTEND_BASE_URL` | Base URL del frontend, usata per costruire i `success_url`/`cancel_url` di Stripe Checkout (fallback: `http://127.0.0.1:5500/Frontend`) | `http://127.0.0.1:5500/Frontend` |
| `STRIPE_SECRET_KEY` | Chiave segreta dell'account Stripe, usata dall'SDK server-side | `sk_test_xxxxxxxxxxxxxxxxxxxxxxxx` |
| `STRIPE_PUBLISHABLE_KEY` | Chiave pubblica Stripe (presente in `.env`, non risulta consumata nel codice backend attuale) | `pk_test_xxxxxxxxxxxxxxxxxxxxxxxx` |
| `STRIPE_PRICE_PREMIUM` | Price ID Stripe del piano utente "Premium" | `price_xxxxxxxxxxxxxxxxxx` |
| `STRIPE_PRICE_PRO` | Price ID Stripe del piano utente "Pro" | `price_xxxxxxxxxxxxxxxxxx` |
| `STRIPE_PRICE_BUSINESS` | Price ID Stripe del piano officina "Business" | `price_xxxxxxxxxxxxxxxxxx` |
| `STRIPE_PRICE_BUSINESS_PRO` | Price ID Stripe del piano officina "Business Pro" | `price_xxxxxxxxxxxxxxxxxx` |
| `STRIPE_WEBHOOK_SECRET` | Secret usato per verificare la firma degli eventi webhook Stripe | `whsec_xxxxxxxxxxxxxxxxxxxxxxxx` |

> Il piano "Base" (utente) non richiede un `price` Stripe: è il piano gratuito di default.

## 5. Installazione da zero

Eseguire i comandi nell'ordine indicato, partendo dalla root del repository.

### 5.1 Backend

```bash
cd Progetto/Backend
pnpm install
cp .env.example .env        # poi compilare .env con i valori reali (vedi sezione 4)
npx prisma generate
npx prisma migrate dev      # crea/allinea le tabelle sul database indicato in DATABASE_URL
```

### 5.2 Frontend

Il frontend è puro HTML/CSS/JS statico: non richiede alcuna installazione di dipendenze (nessun `package.json`). È sufficiente aprire la cartella con un server statico (vedi sezione 6).

### 5.3 Mobile

```bash
cd ReCars-mobile
npm install
```

Prima di avviare l'app, verificare/aggiornare la costante `API` in `constants/api.ts` con l'URL raggiungibile del backend (vedi sezione 6 e il `CLAUDE.md` della cartella mobile per i dettagli).

## 6. Avvio in locale (sviluppo)

Avviare i tre progetti in terminali separati, in questo ordine:

### Backend — porta 3000 (default)

```bash
cd Progetto/Backend
pnpm start:dev      # modalità watch, riavvio automatico ad ogni modifica
# oppure
pnpm start          # senza watch
```

### Frontend — porta 5500

Aprire `Progetto/Frontend/landing.html` con l'estensione VSCode **Live Server** (porta di default `5500`), che è l'unica origine esplicitamente autorizzata dal CORS del backend (`http://127.0.0.1:5500` / `http://localhost:5500`). Usare un altro server statico richiede di aggiornare la configurazione CORS in `Backend/src/main.ts`.

### Mobile — Metro bundler (porta 8081 di default Expo)

```bash
cd ReCars-mobile
npx expo start           # avvia Metro e mostra il QR code per Expo Go / dev client
npm run android           # equivalente a `expo start --android`
npm run ios                # equivalente a `expo start --ios` (richiede macOS)
npm run web                  # equivalente a `expo start --web`
```

> Nota: se si esegue l'app mobile su un dispositivo fisico o su un emulatore diverso dal computer host, `localhost` non è raggiungibile: bisogna configurare `constants/api.ts` con l'IP LAN del computer che esegue il backend, oppure con un tunnel come ngrok.

## 7. Build per produzione

### Backend

```bash
cd Progetto/Backend
pnpm build          # esegue `nest build`, genera Progetto/Backend/dist
pnpm start:prod      # esegue `node dist/main`
```

### Mobile

```bash
cd ReCars-mobile
npx expo export       # esporta il bundle statico (usato anche per la build web, vedi app.json → web.output: "static")
```

Per generare pacchetti installabili (APK/IPA) è necessario **EAS Build**: al momento il progetto non include un file `eas.json`, quindi prima di una build cloud va eseguito `eas login` seguito da `eas build:configure`.

## 8. Deploy

### 8.1 Backend su Render

1. Creare un nuovo **Web Service** su Render collegato al repository, impostando come *Root Directory* `Progetto/Backend`.
2. Build command: `pnpm install && npx prisma generate && pnpm build`.
3. Start command: `pnpm start:prod` (ovvero `node dist/main`).
4. Nella sezione *Environment* del servizio Render, configurare tutte le variabili elencate nella sezione 4 (`DATABASE_URL`, `JWT_SECRET`, `MAIL_USER`, `MAIL_PASS`, `FRONTEND_BASE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_*`, `STRIPE_WEBHOOK_SECRET`). Render imposta automaticamente `PORT`: verificare che il codice la rispetti (lo fa già, tramite `process.env.PORT ?? 3000`).
5. Se il database è ospitato su **Neon**, usare la connection string fornita da Neon come `DATABASE_URL` (Render e Neon sono entrambi compatibili con connessioni SSL, verificare che la stringa includa `?sslmode=require` se richiesto da Neon).
6. Aggiornare l'URL del webhook Stripe (dashboard Stripe → Developers → Webhooks) puntandolo a `https://<nome-servizio>.onrender.com/abbonamento/webhook`, e copiare il nuovo signing secret nella variabile `STRIPE_WEBHOOK_SECRET` su Render.
7. Aggiornare il CORS in `Backend/src/main.ts` per includere l'origine reale del frontend deployato (attualmente è hardcoded solo per `localhost:5500`).

### 8.2 Frontend su GitHub Pages o Render Static Site

**Opzione A — GitHub Pages:**
1. Su GitHub, andare in *Settings → Pages* del repository e impostare come sorgente la cartella `Progetto/Frontend` (branch di produzione).
2. Aggiornare in tutti i file `functions-*.js` la costante `API`/`API_BASE` (attualmente `http://localhost:3000` hardcoded in ~12 file) con l'URL pubblico del backend deployato su Render.
3. Aggiungere l'origine `https://<utente>.github.io` alla whitelist CORS del backend.

**Opzione B — Render Static Site:**
1. Creare un nuovo **Static Site** su Render con *Root Directory* `Progetto/Frontend` e *Publish Directory* `.` (nessun build command necessario, è già statico).
2. Stesso aggiornamento della costante `API` e del CORS backend descritto sopra.

### 8.3 Mobile con Expo EAS Build

1. Installare EAS CLI (`npm install -g eas-cli`) ed effettuare il login (`eas login`).
2. Dalla cartella `ReCars-mobile`, eseguire `eas build:configure` per generare `eas.json` (non presente nel repository attuale).
3. Aggiornare `constants/api.ts` con l'URL pubblico e stabile del backend deployato (in produzione **non** usare ngrok: puntare direttamente all'URL Render).
4. Avviare la build:
   ```bash
   eas build --platform android
   eas build --platform ios
   ```
5. Distribuire con `eas submit` (richiede account developer Google Play / Apple).
6. Se servono variabili di configurazione per ambiente diverso, valutare l'introduzione di [Expo env vars](https://docs.expo.dev/guides/environment-variables/) o profili EAS multipli (`eas.json` → `build.<profile>.env`), dato che attualmente l'URL dell'API è hardcoded nel sorgente e va cambiato manualmente prima di ogni build.

## 9. Struttura del database

Il database è definito in `Progetto/Backend/prisma/schema.prisma` (PostgreSQL). Modelli principali:

- **`utente`** — account privato o azienda (campo `tipo`: `privato`/`azienda`). Contiene credenziali, dati di contatto e, per le aziende, ragione sociale/partita IVA/codice SDI. È collegato a più `veicolo`, `prenotazione` e `abbonamento`.
- **`officina`** — account dell'officina: anagrafica, geolocalizzazione (lat/long), ponti disponibili, orari di apertura, elenco tipi di servizio offerti (array enum `tipo_officina`). Collegata a `citta` (FK), e a più `prenotazione` e `abbonamento`.
- **`citta`** — anagrafica comuni (sigla provincia + nome), usata per l'autocomplete in fase di registrazione officina.
- **`veicolo`** — veicolo di proprietà di un `utente` (targa, marca, modello). Collegato 1:N a `dati_generici`, `dati_specifici` e `storico_intervento`.
- **`dati_generici`** — caratteristiche tecniche del veicolo (tipo veicolo, cavalli, numero porte, alimentazione, cilindrata, colore).
- **`dati_specifici`** — dati amministrativi del veicolo (data immatricolazione, assicurazione e relativa scadenza, bollo e relativa scadenza).
- **`storico_intervento`** — singolo intervento/spesa registrato su un veicolo, classificato per `categoria` (ordinario, straordinario, gestione, annotazioni), con costo e descrizione.
- **`prenotazione`** — appuntamento tra un `utente` e un'`officina`, con data, descrizione e stato (`in_attesa`, `confermata`, `annullata`, `completata`). Ha una relazione 1:1 opzionale verso `recensione`.
- **`recensione`** — recensione lasciata su una prenotazione completata (voto + messaggio).
- **`abbonamento`** — abbonamento attivo/scaduto/annullato, collegato in modo esclusivo o a un `utente` o a un'`officina`, con piano (`piano_abbonamento`), tipo (`tipo_abbonamento`) e riferimento alla subscription Stripe (`stripe_subscription_id`).

Tutte le foreign key sono definite con `onDelete: NoAction` / `onUpdate: NoAction`: eventuali cancellazioni a cascata (es. eliminazione di un profilo con i relativi abbonamenti e prenotazioni) sono gestite manualmente nel codice dei service, non dal database.

## 10. Integrazione Stripe

Il flusso di pagamento è interamente gestito dal backend (`Progetto/Backend/src/stripe/`):

1. **Checkout** — il client (frontend o mobile) chiama `POST /abbonamento/checkout` (autenticato) indicando il piano scelto. Il backend crea una **Stripe Checkout Session** in modalità `subscription`, con un solo `line_item` risolto da una mappa piano → `price` Stripe (dalle variabili `STRIPE_PRICE_*`), allegando in `metadata` piano, tipo (utente/officina) e id del richiedente. Il backend restituisce l'URL della sessione, e il client fa semplicemente redirect del browser a quell'URL (nessuna chiave pubblica Stripe è mai esposta al client).
2. **Webhook** — Stripe invia gli eventi a `POST /abbonamento/webhook` (endpoint pubblico, protetto dalla verifica della firma tramite `STRIPE_WEBHOOK_SECRET` e il `rawBody` della richiesta, abilitato esplicitamente in `main.ts`). Eventi gestiti:
   - `checkout.session.completed` — legge i `metadata` della sessione, annulla un eventuale abbonamento attivo preesistente per lo stesso utente/officina e crea un nuovo record `abbonamento` con stato `attivo` e il `stripe_subscription_id` della subscription appena creata.
   - `customer.subscription.deleted` — imposta a `annullato` lo stato di tutti gli `abbonamento` collegati a quella subscription.
   - Altri eventi (es. `invoice.payment_failed`, `customer.subscription.updated`) non sono attualmente gestiti.
3. **Disdetta** — `POST /abbonamento/disdici` (autenticato) imposta localmente l'abbonamento a `annullato`, ma **non chiama l'API Stripe** per cancellare effettivamente la subscription lato Stripe: da tenere presente come gap funzionale in caso di modifiche future.

## 11. Troubleshooting

- **Il frontend riceve errori CORS / le richieste non arrivano al backend** — il CORS del backend (`Backend/src/main.ts`) accetta esplicitamente solo `http://127.0.0.1:5500` e `http://localhost:5500`. Servire il frontend da una porta diversa (es. `python -m http.server 8000`) causerà un blocco CORS: usare Live Server sulla porta 5500, oppure aggiornare la whitelist nel codice.
- **Il cookie JWT non viene inviato / l'utente risulta sempre disconnesso sul frontend web** — verificare che ogni `fetch()` includa `credentials: 'include'` e che backend e frontend siano serviti da origini coerenti con la configurazione CORS (`credentials: true` richiede una whitelist esplicita, non è compatibile con `origin: '*'`).
- **L'app mobile non riesce a contattare il backend** — `constants/api.ts` contiene un URL hardcoded (`API`). Su emulatore Android, `localhost` del computer host va indirizzato come `10.0.2.2`; su dispositivo fisico serve l'IP LAN del computer o un tunnel (es. ngrok). Ricordarsi di aggiornare questa costante manualmente ad ogni cambio di ambiente.
- **`npx prisma migrate dev` fallisce con errore di connessione** — controllare che `DATABASE_URL` in `Progetto/Backend/.env` punti a un database PostgreSQL realmente raggiungibile e che l'utente indicato abbia i permessi per creare tabelle; se si usa Neon, verificare che la stringa includa i parametri SSL richiesti.
- **Le email di conferma prenotazione non vengono inviate** — richiede `MAIL_USER`/`MAIL_PASS` validi (account Gmail con **App Password**, non la password normale, dato che Gmail richiede l'autenticazione a due fattori per l'accesso SMTP applicativo). Senza queste variabili il modulo mailer viene comunque avviato ma l'invio fallirà silenziosamente/con errore in console.
- **Webhook Stripe che non aggiornano l'abbonamento in locale** — Stripe non può raggiungere `localhost` direttamente: usare la Stripe CLI (`stripe listen --forward-to localhost:3000/abbonamento/webhook`) per inoltrare gli eventi in sviluppo, e copiare il signing secret temporaneo restituito dalla CLI in `STRIPE_WEBHOOK_SECRET`.
- **Un veicolo non si aggiunge, errore "limite piano raggiunto"** — il numero massimo di veicoli registrabili dipende dal piano abbonamento dell'utente (Base = 1, Premium = 5, Pro = illimitati): verificare il piano attivo prima di considerarlo un bug.
- **Endpoint non protetti** — `GET /veicolo/:id` e l'intero controller `interventi` (`storico_interventi`) non richiedono autenticazione nell'implementazione attuale: da tenere presente come nota di sicurezza prima di esporre il backend pubblicamente.
- **Incoerenza tra endpoint di cambio stato prenotazione** — `officina.html` usa `PATCH /prenotazioni/:id/stato`, mentre `prenotazioni-officina.html` usa `PATCH /officina/prenotazioni/:id/stato`: entrambi gli endpoint esistono lato backend, ma è bene non confonderli quando si estende la funzionalità.

# DEBUG.md — Connessione Frontend Next ↔ Backend NestJS

## Problema

Login e registrazione dal frontend Next (`http://localhost:3001`) sembravano
completarsi con successo (risposta 200/201, dati utente ricevuti, nessun
errore in console), ma ogni pagina protetta successiva reindirizzava
comunque a `/login` e ogni chiamata autenticata falliva con 401 — come se la
sessione non fosse mai stata creata.

## Causa radice

In `Progetto/Backend/src/utente/utente.controller.ts` e
`Progetto/Backend/src/officina/officina.controller.ts`, il cookie
`access_token` veniva impostato in **8 punti diversi** (register/login/login-
azienda/logout per l'utente, register/login/logout/eliminaProfilo per
l'officina) con opzioni hardcoded:

```ts
response.cookie('access_token', access_token, {
  httpOnly: true,
  secure: true,      // ← sempre true, anche in sviluppo
  sameSite: 'none',  // ← richiede secure:true per essere accettato
  maxAge: 3600000,
});
```

`secure: true` dice al browser "invia/accetta questo cookie solo su HTTPS".
In sviluppo locale sia il backend (`http://localhost:3000`) sia il frontend
(`http://localhost:3001`) girano su HTTP semplice, quindi **il browser
scartava silenziosamente l'header `Set-Cookie`** — nessun errore visibile,
nessun avviso in console, la risposta HTTP restava 200/201 con i dati utente
corretti. Il backend "pensava" di aver autenticato l'utente; il browser non
salvava mai la sessione.

È lo stesso motivo per cui, testando con `curl -i`, il primo sintomo visibile
sarebbe stato notare che l'header `Set-Cookie` conteneva `Secure; SameSite=None`
— innocuo per `curl` (che salva comunque il cookie a prescindere dal flag
`Secure`), ma fatale per un vero browser su HTTP.

## Soluzione applicata

Creato `Progetto/Backend/src/auth-cookie.util.ts`, un helper condiviso che
sceglie le opzioni del cookie in base all'ambiente:

```ts
export function authCookieOptions(maxAgeMs?: number): CookieOptions {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    ...(maxAgeMs !== undefined ? { maxAge: maxAgeMs } : {}),
  };
}
```

- **In produzione** (`NODE_ENV=production`, HTTPS reale, frontend e backend
  su domini diversi): `secure: true` + `sameSite: 'none'` — invariato rispetto
  a prima, necessario per l'invio cross-site del cookie.
- **In sviluppo** (default se `NODE_ENV` non è impostato): `secure: false` +
  `sameSite: 'lax'`. `SameSite=Lax` funziona perché `localhost:3000` e
  `localhost:3001` sono la stessa *site* (il concetto di "site" per i cookie
  ignora la porta) pur essendo origin diverse — quindi il cookie viaggia
  normalmente sulle richieste `fetch` con `credentials: 'include'`.

Tutti gli 8 punti nei due controller ora chiamano `authCookieOptions(...)`
invece di ripetere l'oggetto inline. Nessun'altra logica del backend è stata
toccata.

### Altre verifiche fatte (già corrette, nessuna modifica necessaria)

- **CORS** (`Progetto/Backend/src/main.ts`): `origin` include già
  `http://localhost:3001` e `http://127.0.0.1:3001` insieme a 5500 (vanilla)
  e un'origine di produzione opzionale via `FRONTEND_ORIGIN`; `credentials: true`;
  metodi `GET,POST,PUT,PATCH,DELETE,OPTIONS`; header
  `Content-Type,Authorization`. `enableCors()` è chiamato prima di
  `app.listen()`. Nessun middleware `helmet` o simile nel progetto che possa
  bloccare le richieste cross-origin.
  - Nota: l'header `Cookie` **non va aggiunto** a `allowedHeaders` — è gestito
    automaticamente dal browser, non è mai un header che il codice client
    imposta esplicitamente via `fetch(..., { headers })`; includerlo nella
    whitelist CORS non ha effetto e non serve.
- **`src/lib/api.ts`**: `NEXT_PUBLIC_API_URL` letto con fallback esplicito a
  `http://localhost:3000`; `fetchApi()` centralizza `credentials: 'include'`
  su *ogni* chiamata e imposta `Content-Type: application/json` quando c'è un
  body; controlla `response.ok` prima di considerare valida la risposta;
  nessuna fetch diretta fuori da questo layer nel resto del progetto (verificato
  con grep).
- **`.env.local`**: `NEXT_PUBLIC_API_URL=http://localhost:3000` (senza slash
  finale), `PORT=3001` — corretti, nessuna modifica necessaria.
- **Cookie `rc_session`** (`src/lib/auth.ts`, `src/middleware.ts`): è un
  secondo cookie, distinto da `access_token`, impostato dal *frontend* stesso
  (`document.cookie`, dominio `localhost:3001`, `samesite=lax`, non-secure)
  perché il middleware Next non può leggere il cookie httpOnly del backend
  (appartiene a un'origine diversa). Era già configurato correttamente e non
  c'entra con il bug: il problema era solo lato backend.

### Logging errori (irrobustito)

Aggiunta `logApiError()` in `src/lib/api.ts`: distingue un `ApiError` (risposta
HTTP ricevuta dal backend, es. credenziali sbagliate) da un errore di rete/CORS
vero e proprio (`TypeError: Failed to fetch`, nessuna risposta arrivata) e
logga sempre `name`/`message`/`stack` in console. Usata nei blocchi `catch`
di `src/app/login/page.tsx` e `src/app/registrazione/page.tsx`, che prima
mostravano solo "Errore di connessione al server" senza loggare nulla —
rendendo impossibile distinguere, dalla sola UI, un 401 da un blocco CORS o da
un backend spento.

## Verifica

### Diagnosi (prima della fix)
- `curl -i -X POST http://localhost:3000/auth/login ...`: risposta 201 con
  `Set-Cookie: access_token=...; Secure; SameSite=None` — valido per `curl`,
  scartato da un vero browser su HTTP.

### Dopo la fix
```
$ curl -i -X POST http://localhost:3000/auth/login \
    -H "Content-Type: application/json" -H "Origin: http://localhost:3001" \
    -d '{"email":"...","password":"..."}'

HTTP/1.1 201 Created
Access-Control-Allow-Origin: http://localhost:3001
Access-Control-Allow-Credentials: true
Set-Cookie: access_token=eyJ...; Max-Age=3600; Path=/; HttpOnly; SameSite=Lax
```
`Secure` non è più presente in sviluppo, `SameSite=Lax` invece di `None`.

Test end-to-end completo con `curl` e cookie jar (`-c`/`-b`), a conferma del
ciclo reale che farebbe un browser:
1. `POST /auth/register` → 201, cookie salvato
2. `POST /auth/login` → 201, nuovo cookie salvato
3. `GET /auth/utente/:id` **con** cookie → 200 + dati profilo
4. `GET /auth/utente/:id` **senza** cookie → 401 Unauthorized
5. `GET /veicolo/utente/:id` con cookie → 200 + `[]`

Verificato anche il middleware Next dal vivo (`npm run dev:all` attivo):
- `GET /homepage` senza cookie `rc_session` → 307 redirect a `/login`
- `GET /homepage` con cookie `rc_session` → 200
- `GET /login` sempre raggiungibile (route pubblica)

`npm run build` e `npm run lint` in `Frontend-Next`: nessun errore.

> **Limite di questa verifica**: l'ambiente sandbox non ha un browser headless
> installabile (mancano permessi `sudo` per le dipendenze di sistema di
> Chromium/Playwright), quindi il flusso non è stato testato cliccando
> realmente nel browser. Il test con `curl` + cookie jar replica fedelmente
> il comportamento di invio/ricezione cookie di un browser reale (stesso
> meccanismo `Set-Cookie` → `Cookie` header), ma non verifica il redirect
> lato client (`router.push("/homepage")` in `login/page.tsx`) né l'eventuale
> comportamento di un browser specifico verso `SameSite=Lax` cross-porta.
> Si raccomanda una verifica manuale rapida nel browser prima di considerare
> il problema definitivamente chiuso.

### Utenti di test creati durante il debug
Due utenti di test sono rimasti nel database locale di sviluppo (nessun
endpoint `DELETE /auth/utente/:id` esiste nel backend per rimuoverli via API):
- `debugtest<timestamp>@example.com`
- `e2etest<timestamp>@example.com`

Entrambi con password `Password123!`, chiaramente etichettati e innocui in
locale; da rimuovere manualmente dal DB se necessario.

## Come avviare correttamente l'ambiente di sviluppo

```bash
cd Progetto/Frontend-Next
npm run dev:all
```

Avvia in parallelo (via `concurrently --kill-others-on-fail`):
- **backend** → `pnpm start:dev` in `Progetto/Backend`, porta **3000**
- **next** → `next dev --port 3001`, porta **3001**

Se uno dei due fallisce all'avvio, l'altro viene terminato automaticamente
(niente processi orfani). Prerequisiti: `Backend/.env` configurato
(`DATABASE_URL`, `JWT_SECRET`, ecc.) e `pnpm install` già eseguito in
`Progetto/Backend`.

In alternativa, due terminali separati:
```bash
# terminale 1
cd Progetto/Backend && pnpm start:dev

# terminale 2
cd Progetto/Frontend-Next && npm run dev
```

Frontend: http://localhost:3001 — Backend: http://localhost:3000.

### Se il login continua a non funzionare
1. Apri DevTools → Application → Cookies su `localhost:3000` dopo il login:
   deve comparire `access_token` con `HttpOnly` ✓, `Secure` **non** spuntato,
   `SameSite=Lax`. Se manca del tutto, il problema è di nuovo lato backend
   (verificare `NODE_ENV` non sia impostato a `production` per errore in dev).
2. Su `localhost:3001` deve comparire `rc_session` (non httpOnly). Se manca,
   il problema è che `salvaSessione()` non viene chiamata — controllare il
   flusso in `login/page.tsx` → `aggiornaUtente()` → `AuthContext`.
3. Controlla la console del browser: gli errori ora sono loggati per esteso
   da `logApiError()` (status, message, o stack completo per errori di rete).
4. Verifica CORS: `curl -i -X OPTIONS http://localhost:3000/auth/login -H
   "Origin: http://localhost:3001" -H "Access-Control-Request-Method: POST"`
   deve rispondere 204 con `Access-Control-Allow-Origin: http://localhost:3001`.

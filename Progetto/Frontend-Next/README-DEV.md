# README-DEV — Sviluppo locale RE|CARS

Tre servizi convivono su porte diverse:

| Servizio | Porta | URL |
|---|---|---|
| Backend NestJS (`Progetto/Backend`) | **3000** | http://localhost:3000 |
| Frontend Next.js (`Progetto/Frontend-Next`) | **3001** | http://localhost:3001 |
| Frontend vanilla (`Progetto/Frontend`, Live Server) | **5500** | http://localhost:5500/landing.html |

La whitelist CORS del backend (`Backend/src/main.ts`) accetta già le origini
5500 (vanilla) e 3001 (Next), più l'eventuale dominio di produzione via
variabile d'ambiente `FRONTEND_ORIGIN`.

## Solo frontend Next

```bash
cd Progetto/Frontend-Next
npm install        # solo la prima volta
npm run dev        # → http://localhost:3001
```

Il backend deve girare a parte (vedi sotto), altrimenti le chiamate API falliscono.

## Backend + frontend Next insieme

```bash
cd Progetto/Frontend-Next
npm run dev:all
```

Usa `concurrently` per avviare in parallelo:
- **backend** → `pnpm start:dev` dentro `Progetto/Backend` (porta 3000, watch mode)
- **next** → `next dev --port 3001`

I log dei due processi sono prefissati `[backend]` / `[next]`. `Ctrl+C` ferma entrambi.

Prerequisiti backend: `pnpm install` già eseguito in `Progetto/Backend` e file
`.env` configurato (vedi `Backend/.env.example`: `DATABASE_URL`, `JWT_SECRET`, Stripe, ecc.).

## Solo backend

```bash
cd Progetto/Backend
pnpm start:dev     # → http://localhost:3000
```

## Vecchio frontend vanilla

Aprire `Progetto/Frontend/landing.html` con l'estensione **Live Server** di VS Code
(click destro → "Open with Live Server"). Deve girare sulla porta **5500**:
è l'unica whitelistata storicamente e il default di Live Server.

Vanilla e Next possono girare contemporaneamente: condividono lo stesso backend
e lo stesso cookie httpOnly `access_token` (dominio localhost:3000), ma hanno
ciascuno il proprio stato in localStorage per origine.

## Variabili d'ambiente del frontend Next

- `.env.local` (sviluppo): `PORT=3001`, `NEXT_PUBLIC_API_URL=http://localhost:3000`
- `.env.production` (build di produzione): `NEXT_PUBLIC_API_URL=https://tuo-backend.onrender.com`
  (placeholder da sostituire con l'URL reale del backend al deploy)

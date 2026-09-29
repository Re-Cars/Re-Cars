import type { CookieOptions } from 'express';

/**
 * Durata dell'accesso: come in Kilo, dopo il login il dispositivo resta
 * collegato per 30 giorni senza richiedere di nuovo email e password.
 * Stessa durata per il JWT (expiresIn), il cookie access_token e il cookie
 * flag rc_session del frontend (src/lib/auth.ts).
 */
export const SESSIONE_GIORNI = 30;
export const SESSIONE_MS = SESSIONE_GIORNI * 24 * 60 * 60 * 1000;
export const SESSIONE_JWT = `${SESSIONE_GIORNI}d` as const;

/**
 * Opzioni del cookie httpOnly `access_token`, sensibili all'ambiente.
 *
 * In produzione (HTTPS reale) serve `secure: true` + `sameSite: 'none'` per
 * permettere l'invio cross-site del cookie tra frontend e backend su domini
 * diversi. In sviluppo locale (HTTP) `secure: true` fa sì che il browser
 * scarti sempre il cookie in modo silenzioso: il login risulta riuscito
 * (200 + dati utente) ma nessuna sessione viene mai salvata, quindi ogni
 * richiesta successiva torna 401. `sameSite: 'lax'` con `secure: false`
 * funziona su localhost anche tra porte diverse (es. 3000 e 3001), perché
 * "localhost" è lo stesso site indipendentemente dalla porta.
 */
export function authCookieOptions(maxAgeMs?: number): CookieOptions {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    ...(maxAgeMs !== undefined ? { maxAge: maxAgeMs } : {}),
  };
}

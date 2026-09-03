import type { CookieOptions } from 'express';

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

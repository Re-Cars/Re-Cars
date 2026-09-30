/**
 * Controlli sull'indirizzo prima di mandare il codice (funzioni pure):
 * forma dell'indirizzo, nomi segnaposto ("email@", "test@"...) e domini
 * di prova o usa-e-getta. Che la casella esista davvero lo dimostra solo
 * il codice ricevuto: questi controlli fermano prima gli indirizzi finti
 * più comuni.
 */

/** Parti prima della @ che non sono una persona o un'azienda. */
const NOMI_SEGNAPOSTO = new Set([
  'email',
  'e-mail',
  'mail',
  'test',
  'testing',
  'prova',
  'prove',
  'esempio',
  'example',
  'user',
  'utente',
  'nome',
  'name',
  'cognome',
  'nomecognome',
  'nome.cognome',
  'tuonome',
  'tuaemail',
  'asd',
  'asdf',
  'qwerty',
  'abc',
  'xxx',
  'aaa',
  'foo',
  'bar',
  'noreply',
  'no-reply',
  'fake',
  'finto',
]);

/** Domini riservati agli esempi o usa-e-getta. */
const DOMINI_VIETATI = new Set([
  'example.com',
  'example.org',
  'example.net',
  'example.it',
  'esempio.it',
  'test.com',
  'test.it',
  'prova.it',
  'email.com',
  'mail.test',
  'localhost',
  'mailinator.com',
  'yopmail.com',
  'guerrillamail.com',
  'sharklasers.com',
  '10minutemail.com',
  'temp-mail.org',
  'tempmail.com',
  'trashmail.com',
  'getnada.com',
  'dispostable.com',
  'maildrop.cc',
  'throwawaymail.com',
]);

const FORMA = /^[a-z0-9._%+-]+@([a-z0-9-]+\.)+[a-z]{2,}$/;

export function normalizzaEmail(email: string): string {
  return (email ?? '').trim().toLowerCase();
}

/** null se l'indirizzo può ricevere il codice, altrimenti il motivo da mostrare. */
export function motivoEmailNonValida(email: string): string | null {
  const e = normalizzaEmail(email);
  if (!FORMA.test(e)) return 'Scrivi un indirizzo email valido.';
  const [locale, dominio] = e.split('@');
  const nome = locale.replace(/\d+$/, '');
  if (NOMI_SEGNAPOSTO.has(locale) || NOMI_SEGNAPOSTO.has(nome)) {
    return 'Usa il tuo indirizzo email reale: ti mandiamo un codice per confermarlo.';
  }
  if (DOMINI_VIETATI.has(dominio)) {
    return 'Questo dominio non è accettato: usa il tuo indirizzo email personale o aziendale.';
  }
  return null;
}

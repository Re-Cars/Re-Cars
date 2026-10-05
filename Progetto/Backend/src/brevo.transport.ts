/**
 * Trasporto Nodemailer che manda le email con l'API HTTP di Brevo invece
 * che via SMTP. Render gratuito blocca le porte SMTP (25/465/587), quindi
 * in produzione le email (codice di registrazione, conferma prenotazione)
 * partono solo così. I servizi continuano a usare MailerService.sendMail:
 * cambia solo il trasporto scelto in mailer.module.ts.
 *
 * Il mittente deve essere un indirizzo verificato su Brevo (Senders,
 * Domains & Dedicated IPs → Senders): BREVO_MITTENTE, altrimenti MAIL_USER.
 */

const URL_BREVO = 'https://api.brevo.com/v3/smtp/email';

type Indirizzo = string | { name?: string; address: string };

/** Campi di `mail.data` di Nodemailer che servono qui. */
export interface DatiEmail {
  to?: Indirizzo | Indirizzo[];
  subject?: string;
  html?: string | Buffer;
  text?: string | Buffer;
  attachments?: {
    filename?: string | false;
    content?: string | Buffer;
  }[];
}

interface Contatto {
  email: string;
  name?: string;
}

/** "Mario <mario@x.it>", "mario@x.it" o { name, address } → contatto Brevo. */
function contatto(a: Indirizzo): Contatto {
  if (typeof a !== 'string') {
    return a.name ? { email: a.address, name: a.name } : { email: a.address };
  }
  const m = a.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (!m) return { email: a.trim() };
  return m[1] ? { email: m[2].trim(), name: m[1] } : { email: m[2].trim() };
}

const testo = (v: string | Buffer | undefined) =>
  v === undefined ? undefined : Buffer.isBuffer(v) ? v.toString('utf8') : v;

/** Corpo della richiesta a Brevo (funzione pura, testata). */
export function corpoBrevo(dati: DatiEmail, mittente: Contatto) {
  const destinatari = ([] as Indirizzo[]).concat(dati.to ?? []).map(contatto);
  if (!destinatari.length) throw new Error('Email senza destinatario');
  const allegati = (dati.attachments ?? [])
    .filter((a) => a.content !== undefined)
    .map((a) => ({
      name: a.filename || 'allegato',
      content: Buffer.from(a.content as string | Buffer).toString('base64'),
    }));
  return {
    sender: mittente,
    to: destinatari,
    subject: dati.subject ?? '',
    ...(dati.html !== undefined && { htmlContent: testo(dati.html) }),
    ...(dati.text !== undefined && { textContent: testo(dati.text) }),
    ...(allegati.length && { attachment: allegati }),
  };
}

export class BrevoTransport {
  readonly name = 'brevo';
  readonly version = '1';

  constructor(
    private readonly chiave: string,
    private readonly mittente: Contatto,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  /** Interfaccia dei trasporti di Nodemailer. */
  send(
    mail: { data: DatiEmail },
    fatto: (err: Error | null, info?: { messageId?: string }) => void,
  ): void {
    this.invia(mail.data).then(
      (info) => fatto(null, info),
      (err: unknown) =>
        fatto(err instanceof Error ? err : new Error(String(err))),
    );
  }

  private async invia(dati: DatiEmail): Promise<{ messageId?: string }> {
    const risposta = await this.fetchFn(URL_BREVO, {
      method: 'POST',
      headers: {
        'api-key': this.chiave,
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify(corpoBrevo(dati, this.mittente)),
      signal: AbortSignal.timeout(15_000),
    });
    if (!risposta.ok) {
      // Brevo spiega l'errore nel corpo (mittente non verificato, chiave errata...)
      const dettaglio = await risposta.text().catch(() => '');
      throw new Error(
        `Brevo HTTP ${risposta.status}: ${dettaglio.slice(0, 300)}`,
      );
    }
    return (await risposta.json().catch(() => ({}))) as { messageId?: string };
  }
}

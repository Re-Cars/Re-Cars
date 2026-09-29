/**
 * Calcolo delle notifiche programmate (funzioni pure, senza database):
 * scadenze di bollo, assicurazione e revisione e promemoria del giorno
 * prima di un appuntamento. Le date sono confrontate come giorni del
 * calendario italiano, indipendentemente dal fuso del server (Render è
 * in UTC).
 */

export interface Notifica {
  titolo: string;
  testo: string;
  /** Pagina da aprire al tocco sulla notifica. */
  url: string;
  /** Notifiche con lo stesso tag si sostituiscono invece di accumularsi. */
  tag?: string;
}

export interface NotificaProgrammata extends Notifica {
  /** Identifica l'avviso: con notifica_inviata impedisce i doppioni. */
  chiave: string;
}

/** Giorni prima della scadenza in cui si avvisa (0 = il giorno stesso). */
export const GIORNI_AVVISO = [30, 7, 1, 0];

const MS_GIORNO = 86_400_000;

/** "AAAA-MM-GG" di oggi in Italia. */
export function oggiInItalia(adesso = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
  }).format(adesso);
}

/** Giorni da `oggi` (AAAA-MM-GG) a una data salvata come DATE (mezzanotte UTC). */
export function giorniA(data: Date, oggi: string): number {
  return Math.round(
    (Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate()) -
      Date.parse(`${oggi}T00:00:00Z`)) /
      MS_GIORNO,
  );
}

/** Prima revisione a 4 anni dall'immatricolazione, poi ogni 2 anni. */
export function prossimaRevisione(immatricolazione: Date, oggi: string): Date {
  const r = new Date(immatricolazione.getTime());
  r.setUTCFullYear(r.getUTCFullYear() + 4);
  while (giorniA(r, oggi) < 0) r.setUTCFullYear(r.getUTCFullYear() + 2);
  return r;
}

const dataIt = (d: Date) =>
  `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;

const quando = (giorni: number) =>
  giorni === 0 ? 'oggi' : giorni === 1 ? 'domani' : `tra ${giorni} giorni`;

export interface VeicoloPerAvvisi {
  id: number;
  targa: string | null;
  marca: string | null;
  modello: string | null;
  dati_specifici: {
    dataimmatricolazione: Date | null;
    datascadenzabollo: Date | null;
    datascadenzarca: Date | null;
  }[];
}

const NOMI = {
  bollo: 'Bollo',
  assicurazione: 'Assicurazione',
  revisione: 'Revisione',
} as const;

/** Avvisi di scadenza da mandare oggi per un veicolo. */
export function scadenzeDaAvvisare(
  v: VeicoloPerAvvisi,
  oggi: string,
): NotificaProgrammata[] {
  const ds = v.dati_specifici[0];
  if (!ds) return [];
  const nome =
    `${v.marca ?? ''} ${v.modello ?? ''}`.trim() || v.targa || 'Veicolo';
  const date: [keyof typeof NOMI, Date | null][] = [
    ['bollo', ds.datascadenzabollo],
    ['assicurazione', ds.datascadenzarca],
    [
      'revisione',
      ds.dataimmatricolazione
        ? prossimaRevisione(ds.dataimmatricolazione, oggi)
        : null,
    ],
  ];
  const avvisi: NotificaProgrammata[] = [];
  for (const [tipo, data] of date) {
    if (!data) continue;
    const giorni = giorniA(data, oggi);
    if (!GIORNI_AVVISO.includes(giorni)) continue;
    const iso = data.toISOString().slice(0, 10);
    avvisi.push({
      chiave: `${tipo}:${v.id}:${iso}:${giorni}`,
      titolo: `${NOMI[tipo]} in scadenza ${quando(giorni)}`,
      testo: `${nome}${v.targa ? ` (${v.targa})` : ''}: scade il ${dataIt(data)}.`,
      url: '/homepage',
      tag: `${tipo}-${v.id}`,
    });
  }
  return avvisi;
}

export interface PrenotazionePerAvvisi {
  id: number;
  dataprenotazione: Date;
  descrizione: string | null;
  officina: { nome: string } | null;
}

/**
 * `dataprenotazione` è un TIMESTAMP senza fuso salvato con l'ora locale
 * scelta dall'utente: data e ora si leggono così come sono.
 */
const giornoPren = (p: PrenotazionePerAvvisi) =>
  p.dataprenotazione.toISOString().slice(0, 10);
const oraPren = (p: PrenotazionePerAvvisi) =>
  p.dataprenotazione.toISOString().slice(11, 16);
const servizio = (p: PrenotazionePerAvvisi) =>
  p.descrizione?.match(/^Servizio: (.*?)(?: - Note:|$)/)?.[1] ?? 'Appuntamento';

/** Promemoria del giorno prima dell'appuntamento. */
export function promemoriaPrenotazione(
  p: PrenotazionePerAvvisi,
  oggi: string,
): NotificaProgrammata | null {
  const domani = new Date(Date.parse(`${oggi}T00:00:00Z`) + MS_GIORNO)
    .toISOString()
    .slice(0, 10);
  if (giornoPren(p) !== domani) return null;
  return {
    chiave: `prenotazione:${p.id}:promemoria`,
    titolo: 'Appuntamento domani',
    testo: `Alle ${oraPren(p)} da ${p.officina?.nome ?? "l'officina"} · ${servizio(p)}`,
    url: '/prenotazioni',
    tag: `prenotazione-${p.id}`,
  };
}

const TITOLO_STATO: Record<string, string> = {
  confermata: 'Prenotazione confermata',
  annullata: "Prenotazione annullata dall'officina",
  completata: 'Intervento completato',
};

/** Avviso all'utente quando l'officina cambia lo stato della prenotazione. */
export function avvisoCambioStato(
  p: PrenotazionePerAvvisi,
  stato: string,
): Notifica | null {
  const titolo = TITOLO_STATO[stato];
  if (!titolo) return null;
  const [a, m, g] = giornoPren(p).split('-');
  return {
    titolo,
    testo: `${p.officina?.nome ?? 'Officina'} · ${g}/${m}/${a} alle ${oraPren(p)} · ${servizio(p)}`,
    url: '/prenotazioni',
    tag: `prenotazione-${p.id}`,
  };
}

/** Giorni prima della fine di un abbonamento senza rinnovo automatico. */
export const GIORNI_AVVISO_ABBONAMENTO = [7, 1, 0];

/**
 * Premium con rinnovo automatico spento: avviso a 7, 1 e 0 giorni dalla
 * fine, con l'invito a riattivarlo (altrimenti si torna a Gratis).
 */
export function avvisoFineAbbonamento(
  abbonamento: { id: number; data_fine: Date | null },
  oggi: string,
): NotificaProgrammata | null {
  if (!abbonamento.data_fine) return null;
  const giorni = giorniA(abbonamento.data_fine, oggi);
  if (!GIORNI_AVVISO_ABBONAMENTO.includes(giorni)) return null;
  return {
    chiave: `abbonamento:${abbonamento.id}:fine:${giorni}`,
    titolo:
      giorni === 0
        ? 'Il tuo Premium scade oggi'
        : `Premium in scadenza ${quando(giorni)}`,
    testo: `Il rinnovo automatico è spento: dal ${dataIt(abbonamento.data_fine)} torni al piano Gratis. Riattivalo da Abbonamenti per non perdere le funzioni Premium.`,
    url: '/abbonamenti',
    tag: `abbonamento-${abbonamento.id}`,
  };
}

/** Avvisi mandati dal webhook di Stripe (una volta per abbonamento e periodo). */
export function avvisoAbbonamento(
  tipo: 'pagamento_fallito' | 'terminato',
  idAbbonamento: number,
  periodo: string,
): NotificaProgrammata {
  return tipo === 'pagamento_fallito'
    ? {
        chiave: `abbonamento:${idAbbonamento}:pagamento:${periodo}`,
        titolo: 'Pagamento del rinnovo non riuscito',
        testo:
          'Non siamo riusciti ad addebitare il rinnovo di Premium. Aggiorna la carta da Abbonamenti → Gestisci pagamento: Stripe riprova nei prossimi giorni.',
        url: '/abbonamenti',
        tag: `abbonamento-${idAbbonamento}`,
      }
    : {
        chiave: `abbonamento:${idAbbonamento}:terminato`,
        titolo: 'Premium terminato',
        testo:
          "Sei tornato al piano Gratis: veicoli e storico restano, le funzioni Premium si sbloccano riattivando l'abbonamento.",
        url: '/abbonamenti',
        tag: `abbonamento-${idAbbonamento}`,
      };
}

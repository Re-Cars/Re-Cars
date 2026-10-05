/**
 * Scadenze di un veicolo (funzioni pure, senza database). Il punto di
 * partenza sono le date salvate alla creazione del veicolo (dataset della
 * targa o modulo manuale); lo storico interventi le aggiorna: un bollo o
 * un'assicurazione pagati spostano la scadenza di un anno, una revisione
 * di due, un tagliando di un anno. Cancellando l'intervento la scadenza
 * torna quella di prima, perché nel database non si riscrive nulla.
 *
 * Le date sono DATE di Postgres (mezzanotte UTC) e `oggi` è il giorno
 * italiano in formato AAAA-MM-GG (vedi notifiche/promemoria.ts).
 */

export type TipoScadenza =
  | 'bollo'
  | 'assicurazione'
  | 'revisione'
  | 'tagliando';

/** Tipo dell'intervento nello storico (come nel frontend) → scadenza. */
export const INTERVENTI_SCADENZA: Record<string, TipoScadenza> = {
  Bollo: 'bollo',
  Assicurazione: 'assicurazione',
  Revisione: 'revisione',
  Tagliando: 'tagliando',
};

/** Anni di validità dopo l'intervento. */
const VALIDITA: Record<TipoScadenza, number> = {
  bollo: 1,
  assicurazione: 1,
  revisione: 2,
  tagliando: 1,
};

export interface DatiScadenze {
  dataimmatricolazione: Date | null;
  datascadenzabollo: Date | null;
  datascadenzarca: Date | null;
}

export interface InterventoScadenza {
  tipo: string;
  data: Date;
}

export type Scadenze = Record<TipoScadenza, Date | null>;

const MS_GIORNO = 86_400_000;

const giorni = (data: Date, oggi: string) =>
  Math.round(
    (Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate()) -
      Date.parse(`${oggi}T00:00:00Z`)) /
      MS_GIORNO,
  );

const piuAnni = (data: Date, anni: number) => {
  const d = new Date(data.getTime());
  d.setUTCFullYear(d.getUTCFullYear() + anni);
  return d;
};

const piuRecente = (a: Date | null, b: Date | null) =>
  !a ? b : !b ? a : a > b ? a : b;

/** Prima revisione a 4 anni dall'immatricolazione, poi ogni 2 anni. */
export function prossimaRevisione(immatricolazione: Date, oggi: string): Date {
  const r = piuAnni(immatricolazione, 4);
  while (giorni(r, oggi) < 0) r.setUTCFullYear(r.getUTCFullYear() + 2);
  return r;
}

/** Ultimo intervento di ogni tipo che conta per le scadenze. */
function ultimiInterventi(storico: InterventoScadenza[]) {
  const ultimi: Partial<Record<TipoScadenza, Date>> = {};
  for (const i of storico) {
    const tipo = INTERVENTI_SCADENZA[i.tipo.trim()];
    if (!tipo) continue;
    const data = new Date(i.data);
    if (!ultimi[tipo] || data > ultimi[tipo]) ultimi[tipo] = data;
  }
  return ultimi;
}

export function calcolaScadenze(
  ds: DatiScadenze | undefined,
  storico: InterventoScadenza[],
  oggi: string,
): Scadenze {
  const ultimi = ultimiInterventi(storico);
  const dopo = (tipo: TipoScadenza) =>
    ultimi[tipo] ? piuAnni(ultimi[tipo], VALIDITA[tipo]) : null;
  return {
    // vale la più lontana: la data salvata o quella data dall'ultimo pagamento
    bollo: piuRecente(ds?.datascadenzabollo ?? null, dopo('bollo')),
    assicurazione: piuRecente(
      ds?.datascadenzarca ?? null,
      dopo('assicurazione'),
    ),
    // una revisione registrata vale più del calcolo dall'immatricolazione
    revisione:
      dopo('revisione') ??
      (ds?.dataimmatricolazione
        ? prossimaRevisione(ds.dataimmatricolazione, oggi)
        : null),
    // senza tagliandi nello storico non c'è una data da proporre
    tagliando: dopo('tagliando'),
  };
}

/** Scadenze in AAAA-MM-GG per le risposte JSON (niente sorprese di fuso). */
export function scadenzeJson(s: Scadenze): Record<TipoScadenza, string | null> {
  const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
  return {
    bollo: iso(s.bollo),
    assicurazione: iso(s.assicurazione),
    revisione: iso(s.revisione),
    tagliando: iso(s.tagliando),
  };
}

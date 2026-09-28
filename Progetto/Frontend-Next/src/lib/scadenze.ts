import type { VeicoloDettaglio } from "./types";

/**
 * Calcolo dello stato di salute dei veicoli, condiviso tra la rail del
 * garage in homepage e VeicoloInfoCard (dettaglio bollo/assicurazione).
 */

export type SaluteVeicolo = "ok" | "attenzione" | "urgente";

const MS_GIORNO = 86_400_000;

/** Giorni interi da oggi (mezzanotte) alla data indicata; negativi se passata. */
export function giorniAllaData(data: string | Date): number | null {
  const d = new Date(data);
  if (Number.isNaN(d.getTime())) return null;
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - oggi.getTime()) / MS_GIORNO);
}

export function nomeVeicolo(v: VeicoloDettaglio): string {
  return `${v.marca ?? ""} ${v.modello ?? ""}`.trim() || v.targa;
}

/**
 * Badge salute della card garage: rosso se bollo e assicurazione sono
 * entrambi scaduti, arancione se uno è scaduto o scade entro 30 giorni,
 * verde altrimenti (dati mancanti = nessun allarme).
 */
export function calcolaSalute(v: VeicoloDettaglio): SaluteVeicolo {
  const ds = v.dati_specifici[0];
  if (!ds) return "ok";

  const giorniBollo = ds.datascadenzabollo ? giorniAllaData(ds.datascadenzabollo) : null;
  const giorniRca = ds.datascadenzarca ? giorniAllaData(ds.datascadenzarca) : null;

  const bolloScaduto = ds.isbolloattivo === false || (giorniBollo !== null && giorniBollo < 0);
  const rcaScaduta = ds.isinsured === false || (giorniRca !== null && giorniRca < 0);
  const inScadenza =
    (giorniBollo !== null && giorniBollo >= 0 && giorniBollo <= 30) ||
    (giorniRca !== null && giorniRca >= 0 && giorniRca <= 30);

  if (bolloScaduto && rcaScaduta) return "urgente";
  if (bolloScaduto || rcaScaduta || inScadenza) return "attenzione";
  return "ok";
}

/**
 * Prossima revisione ministeriale: 4 anni dall'immatricolazione, poi ogni
 * 2 anni. Il backend non registra le revisioni effettuate, quindi si
 * restituisce sempre la prima scadenza futura.
 */
export function prossimaRevisione(dataimmatricolazione: string): Date | null {
  const imm = new Date(dataimmatricolazione);
  if (Number.isNaN(imm.getTime())) return null;
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);
  const scadenza = new Date(imm);
  scadenza.setFullYear(scadenza.getFullYear() + 4);
  while (scadenza < oggi) scadenza.setFullYear(scadenza.getFullYear() + 2);
  return scadenza;
}

/** rossa = scaduta, arancione = entro 30 giorni, gialla = entro 90 giorni, ok oltre. */
export type LivelloScadenza = "rossa" | "arancione" | "gialla" | "ok";

export interface ScadenzaDettaglio {
  tipo: "bollo" | "assicurazione" | "revisione";
  data: Date | null;
  giorni: number | null;
  livello: LivelloScadenza;
}

function livello(giorni: number | null, attivo?: boolean | null): LivelloScadenza {
  if (attivo === false) return "rossa";
  if (giorni === null) return "ok";
  if (giorni < 0) return "rossa";
  if (giorni <= 30) return "arancione";
  if (giorni <= 90) return "gialla";
  return "ok";
}

/**
 * Bollo, assicurazione e revisione di un singolo veicolo per la scheda
 * "Stato monitoraggio" della dashboard. Stessa regola di calcolaSalute:
 * conta la data, e un flag esplicitamente `false` forza "scaduta".
 */
export function scadenzeVeicolo(v: VeicoloDettaglio): ScadenzaDettaglio[] {
  const ds = v.dati_specifici[0];
  const voce = (
    tipo: ScadenzaDettaglio["tipo"],
    raw: string | Date | null | undefined,
    attivo?: boolean | null,
  ): ScadenzaDettaglio => {
    const data = raw ? new Date(raw) : null;
    const valida = data && !Number.isNaN(data.getTime()) ? data : null;
    const giorni = valida ? giorniAllaData(valida) : null;
    return { tipo, data: valida, giorni, livello: livello(giorni, attivo) };
  };
  return [
    voce("bollo", ds?.datascadenzabollo, ds?.isbolloattivo),
    voce("assicurazione", ds?.datascadenzarca, ds?.isinsured),
    voce("revisione", ds?.dataimmatricolazione ? prossimaRevisione(ds.dataimmatricolazione) : null),
  ];
}

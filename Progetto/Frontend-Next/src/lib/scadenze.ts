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

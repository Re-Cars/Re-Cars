import type { VeicoloDettaglio } from "./types";

/**
 * Calcolo di scadenze (bollo / assicurazione / revisione) e stato di
 * salute dei veicoli, condiviso tra la card garage e il pannello
 * "Scadenze e avvisi" della homepage.
 */

export type TipoScadenza = "bollo" | "assicurazione" | "revisione";

/** rossa = scaduta, arancione = 0–30 giorni, gialla = 31–90 giorni */
export type LivelloScadenza = "rossa" | "arancione" | "gialla";

export interface ScadenzaVeicolo {
  /** Chiave stabile per il render (id veicolo + tipo). */
  chiave: string;
  tipo: TipoScadenza;
  veicoloId: number;
  veicoloNome: string;
  giorniRimanenti: number;
  livello: LivelloScadenza;
}

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
 * Prossima revisione ministeriale: 4 anni dall'immatricolazione, poi ogni
 * 2 anni. Il backend non registra le revisioni effettuate, quindi si
 * restituisce sempre la prima scadenza futura (mai "scaduta").
 */
export function prossimaRevisione(dataimmatricolazione: string): Date | null {
  const imm = new Date(dataimmatricolazione);
  if (Number.isNaN(imm.getTime())) return null;
  const oggi = new Date();
  const scadenza = new Date(imm);
  scadenza.setFullYear(scadenza.getFullYear() + 4);
  while (scadenza < oggi) scadenza.setFullYear(scadenza.getFullYear() + 2);
  return scadenza;
}

function livelloDaGiorni(giorni: number): LivelloScadenza | null {
  if (giorni < 0) return "rossa";
  if (giorni <= 30) return "arancione";
  if (giorni <= 90) return "gialla";
  return null;
}

/**
 * Scadenze entro 90 giorni (o già scadute) di tutti i veicoli,
 * ordinate dalla più urgente alla meno urgente.
 */
export function calcolaScadenze(veicoli: VeicoloDettaglio[]): ScadenzaVeicolo[] {
  const scadenze: ScadenzaVeicolo[] = [];

  for (const v of veicoli) {
    const ds = v.dati_specifici[0];
    if (!ds) continue;
    const nome = nomeVeicolo(v);

    const voci: Array<{ tipo: TipoScadenza; data: string | Date | null | undefined }> = [
      { tipo: "bollo", data: ds.datascadenzabollo },
      { tipo: "assicurazione", data: ds.datascadenzarca },
      { tipo: "revisione", data: ds.dataimmatricolazione ? prossimaRevisione(ds.dataimmatricolazione) : null },
    ];

    for (const { tipo, data } of voci) {
      if (!data) continue;
      const giorni = giorniAllaData(data);
      if (giorni === null) continue;
      const livello = livelloDaGiorni(giorni);
      if (!livello) continue;
      scadenze.push({
        chiave: `${v.id}-${tipo}`,
        tipo,
        veicoloId: v.id,
        veicoloNome: nome,
        giorniRimanenti: giorni,
        livello,
      });
    }
  }

  return scadenze.sort((a, b) => a.giorniRimanenti - b.giorniRimanenti);
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

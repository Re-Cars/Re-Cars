"use client";

import Link from "next/link";

import { nomeVeicolo, scadenzeVeicolo, type ScadenzaDettaglio } from "@/lib/scadenze";
import type { VeicoloDettaglio } from "@/lib/types";

interface AzioniRapideProps {
  /** Spesa dell'anno in corso su tutto il garage (null finché non calcolata). */
  speseAnno: number | null;
  veicoli: VeicoloDettaglio[];
  /** Porta un veicolo nella scheda della dashboard. */
  onSeleziona: (id: number) => void;
}

const NOME_SCADENZA: Record<ScadenzaDettaglio["tipo"], string> = {
  bollo: "Bollo",
  assicurazione: "Assicurazione",
  revisione: "Revisione",
};

/**
 * La scadenza più urgente di tutto il garage: prima quelle scadute o non
 * attive, poi la più vicina. La scheda del veicolo mostra solo il veicolo
 * selezionato, questa card guarda tutti i veicoli insieme.
 */
function scadenzaPiuVicina(veicoli: VeicoloDettaglio[]) {
  let migliore: { veicolo: VeicoloDettaglio; scadenza: ScadenzaDettaglio } | null = null;
  const peso = (s: ScadenzaDettaglio) => (s.livello === "rossa" ? -Infinity : (s.giorni ?? Infinity));
  for (const veicolo of veicoli) {
    for (const scadenza of scadenzeVeicolo(veicolo)) {
      if (scadenza.giorni === null && scadenza.livello !== "rossa") continue;
      if (!migliore || peso(scadenza) < peso(migliore.scadenza)) migliore = { veicolo, scadenza };
    }
  }
  return migliore;
}

function quando(s: ScadenzaDettaglio): string {
  if (s.livello === "rossa") return s.giorni !== null && s.giorni < 0 ? "Scaduta" : "Non attiva";
  if (s.giorni === 0) return "Oggi";
  if (s.giorni === 1) return "Domani";
  return `Tra ${s.giorni} giorni`;
}

/**
 * Le tre azioni rapide della dashboard: storico (con la spesa dell'anno),
 * prenotazioni e la prossima scadenza del garage. Le prime due coincidono
 * con le voci della Sidebar (tenerle allineate a mano).
 */
export default function AzioniRapide({ speseAnno, veicoli, onSeleziona }: AzioniRapideProps) {
  const anno = new Date().getFullYear();
  const prossima = scadenzaPiuVicina(veicoli);

  return (
    <nav className="dash-azioni" aria-label="Azioni rapide">
      <div className="dash-azioni-title">
        <i className="ti ti-bolt" />
        Azioni rapide
      </div>

      <Link href="/storico-interventi" className="dash-az">
        <span className="dash-az-ic"><i className="ti ti-history" /></span>
        <span className="dash-az-txt">
          <span className="dash-az-t">Storico interventi</span>
          <span className="dash-az-d">
            {speseAnno !== null
              ? `Spesi nel ${anno}: € ${speseAnno.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : "Interventi e costi di gestione dei tuoi veicoli"}
          </span>
        </span>
        <i className="ti ti-chevron-right dash-az-go" />
      </Link>

      <Link href="/prenotazioni" className="dash-az">
        <span className="dash-az-ic"><i className="ti ti-calendar-event" /></span>
        <span className="dash-az-txt">
          <span className="dash-az-t">Prenota officina</span>
          <span className="dash-az-d">Trova un&apos;officina e fissa un appuntamento</span>
        </span>
        <i className="ti ti-chevron-right dash-az-go" />
      </Link>

      <button
        type="button"
        className={`dash-az lv-${prossima?.scadenza.livello ?? "ok"}`}
        disabled={!prossima}
        onClick={() => prossima && onSeleziona(prossima.veicolo.id)}
        title={prossima ? `Mostra ${nomeVeicolo(prossima.veicolo)} nella scheda` : undefined}
      >
        <span className="dash-az-ic"><i className="ti ti-alarm" /></span>
        <span className="dash-az-txt">
          <span className="dash-az-t">
            Prossima scadenza
            <span className="dash-az-kpi dash-az-kpi--lv">{prossima ? quando(prossima.scadenza) : "Nessuna"}</span>
          </span>
          <span className="dash-az-d">
            {prossima
              ? `${NOME_SCADENZA[prossima.scadenza.tipo]} · ${nomeVeicolo(prossima.veicolo)}`
              : "Bollo, assicurazione e revisione sotto controllo"}
          </span>
        </span>
        {prossima && <i className="ti ti-chevron-right dash-az-go" />}
      </button>
    </nav>
  );
}

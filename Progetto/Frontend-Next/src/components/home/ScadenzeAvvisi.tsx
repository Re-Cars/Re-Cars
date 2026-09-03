"use client";

import { calcolaScadenze, type LivelloScadenza, type TipoScadenza } from "@/lib/scadenze";
import type { VeicoloDettaglio } from "@/lib/types";

const ICONA_TIPO: Record<TipoScadenza, string> = {
  assicurazione: "ti-shield",
  bollo: "ti-receipt-2",
  revisione: "ti-tools",
};

const NOME_TIPO: Record<TipoScadenza, string> = {
  assicurazione: "Assicurazione",
  bollo: "Bollo",
  revisione: "Revisione",
};

const ICONA_LIVELLO: Record<LivelloScadenza, string> = {
  rossa: "ti-alert-circle",
  arancione: "ti-clock",
  gialla: "ti-calendar",
};

/**
 * "Scadenze e avvisi": righe generate dai dati di bollo, assicurazione e
 * revisione di tutti i veicoli, ordinate dalla più urgente (rossa =
 * scaduta, arancione = entro 30 giorni, gialla = entro 90 giorni).
 */
export default function ScadenzeAvvisi({ veicoli }: { veicoli: VeicoloDettaglio[] }) {
  const scadenze = calcolaScadenze(veicoli);

  return (
    <section className="hp-scadenze">
      <h2 className="hp-section-title">
        <i className="ti ti-bell" />
        Scadenze e avvisi
      </h2>

      <div className="scadenze-list">
        {scadenze.length === 0 ? (
          <div className="scadenze-vuoto">
            <i className="ti ti-circle-check" />
            <span>Tutto in regola</span>
          </div>
        ) : (
          scadenze.map((s) => (
            <div key={s.chiave} className={`scadenza-row ${s.livello}`}>
              <div className="scadenza-icona">
                <i className={`ti ${ICONA_TIPO[s.tipo]}`} />
              </div>
              <div className="scadenza-info">
                <span className="scadenza-tipo">{NOME_TIPO[s.tipo]}</span>
                <span className="scadenza-veicolo">{s.veicoloNome}</span>
              </div>
              <span className={`scadenza-stato ${s.livello}`}>
                <i className={`ti ${ICONA_LIVELLO[s.livello]}`} />
                {s.livello === "rossa"
                  ? "Scaduta"
                  : `Scade tra ${s.giorniRimanenti} giorn${s.giorniRimanenti === 1 ? "o" : "i"}`}
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

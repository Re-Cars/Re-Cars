"use client";

import { useTilt } from "@/hooks/useTilt";
import { calcolaSalute, nomeVeicolo, type SaluteVeicolo } from "@/lib/scadenze";
import type { VeicoloDettaglio } from "@/lib/types";

const BADGE_SALUTE: Record<SaluteVeicolo, { icona: string; testo: string }> = {
  ok: { icona: "ti-circle-check", testo: "In buono stato" },
  attenzione: { icona: "ti-alert-triangle", testo: "Richiede attenzione" },
  urgente: { icona: "ti-alert-circle", testo: "Intervento urgente" },
};

interface VeicoloCardProps {
  veicolo: VeicoloDettaglio;
  attivo: boolean;
  onClick: () => void;
}

/** Card veicolo del garage (homepage e pagina lista-veicoli). */
export function VeicoloCard({ veicolo, attivo, onClick }: VeicoloCardProps) {
  const salute = calcolaSalute(veicolo);
  const badge = BADGE_SALUTE[salute];
  const tilt = useTilt<HTMLDivElement>();

  // stesso confronto di info-veicolo/page.tsx: le due pagine restano coerenti
  const isMoto = (veicolo.dati_generici?.[0]?.tipo_veicolo ?? "").toLowerCase() === "moto";
  const tipo = isMoto ? "moto" : "auto";
  const iconaTipo = isMoto ? "ti-motorbike" : "ti-car";

  return (
    <div
      className={`veicolo-card${attivo ? " attivo" : ""}`}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      onMouseMove={tilt.onMouseMove}
      onMouseLeave={tilt.onMouseLeave}
    >
      <div className={`veicolo-card-placeholder ${tipo}`}>
        <span className="veicolo-tipo-chip">
          <i className={`ti ${iconaTipo}`} />
          {isMoto ? "Moto" : "Auto"}
        </span>
        <i className={`ti ${iconaTipo} veicolo-tipo-watermark`} />
      </div>
      <span className="targa-pill">{veicolo.targa}</span>
      <p className="veicolo-card-nome">{nomeVeicolo(veicolo)}</p>
      {/* niente chilometraggio: il backend non gestisce il dato (nessun campo km) */}
      <span className={`badge-salute ${salute}`}>
        <i className={`ti ${badge.icona}`} />
        {badge.testo}
      </span>
    </div>
  );
}

/** Card tratteggiata "Aggiungi un veicolo" che apre l'overlay di ricerca targa. */
export function AggiungiVeicoloCard({ onClick }: { onClick: () => void }) {
  return (
    <div
      className="aggiungi-card"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      <div className="aggiungi-plus">
        <i className="ti ti-plus" />
      </div>
      <span className="aggiungi-label">Aggiungi un veicolo</span>
    </div>
  );
}

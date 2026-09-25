"use client";

import { calcolaSalute, nomeVeicolo, type SaluteVeicolo } from "@/lib/scadenze";
import type { VeicoloDettaglio } from "@/lib/types";

const ETICHETTA_SALUTE: Record<SaluteVeicolo, string> = {
  ok: "In regola",
  attenzione: "Da monitorare",
  urgente: "Urgente",
};

export function isMoto(v: VeicoloDettaglio): boolean {
  return (v.dati_generici[0]?.tipo_veicolo ?? "").toLowerCase() === "moto";
}

interface VeicoloChipProps {
  veicolo: VeicoloDettaglio;
  attivo: boolean;
  onSeleziona: () => void;
  /** Assente nella finestra di ricerca: lì si cerca soltanto. */
  onElimina?: () => void;
}

/**
 * Voce della lista garage: avatar tipo-aware con pallino di stato
 * (l'etichetta testuale sta solo nella scheda info a fianco), nome, targa
 * e cestino sul bordo destro — mai sovrapposto al pallino.
 */
export default function VeicoloChip({ veicolo, attivo, onSeleziona, onElimina }: VeicoloChipProps) {
  const salute = calcolaSalute(veicolo);
  const moto = isMoto(veicolo);
  return (
    <div
      className={`garage-chip${attivo ? " attivo" : ""}`}
      role="button"
      tabIndex={0}
      aria-pressed={attivo}
      onClick={onSeleziona}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSeleziona();
        }
      }}
    >
      <span className={`garage-chip-av tipo-${moto ? "moto" : "auto"}`}>
        <i className={`ti ${moto ? "ti-motorbike" : "ti-car"}`} />
        <span className={`garage-chip-dot salute-${salute}`} title={ETICHETTA_SALUTE[salute]} />
      </span>
      <span className="garage-chip-txt">
        <span className="garage-chip-nome">{nomeVeicolo(veicolo)}</span>
        <span className="garage-chip-targa">{veicolo.targa}</span>
      </span>
      {onElimina ? (
        <button
          type="button"
          className="garage-chip-del"
          title="Elimina veicolo"
          aria-label={`Elimina ${nomeVeicolo(veicolo)}`}
          onClick={(e) => {
            e.stopPropagation();
            onElimina();
          }}
        >
          <i className="ti ti-trash" />
        </button>
      ) : (
        <i className="ti ti-chevron-right garage-chip-go" />
      )}
    </div>
  );
}

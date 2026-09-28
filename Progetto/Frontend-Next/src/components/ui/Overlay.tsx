"use client";

import { useEffect, type ReactNode } from "react";

interface OverlayProps {
  onChiudi: () => void;
  titolo: string;
  /** Classe Tabler dell'icona del titolo, es. "ti-car". */
  icona: string;
  sottotitolo?: ReactNode;
  /** Contenuto: facoltativo per le semplici conferme (titolo + sottotitolo). */
  children?: ReactNode;
  /** Riga in fondo: nota a sinistra e bottoni a destra. */
  piede?: ReactNode;
  /** Larghezza massima in px (default 720). */
  larghezza?: number;
  /** true durante un salvataggio: niente chiusura con Esc o click fuori. */
  bloccato?: boolean;
}

/**
 * Guscio comune degli overlay (aggiungi veicolo, prenotazione, intervento,
 * PDF): sfondo sfocato, card con bordo arancione, titolo con icona,
 * contenuto che scorre se non ci sta e piede fisso. Si chiude con Esc, con
 * la X o cliccando fuori. Classi .ov-* in globals.css.
 */
export default function Overlay({
  onChiudi,
  titolo,
  icona,
  sottotitolo,
  children,
  piede,
  larghezza = 720,
  bloccato = false,
}: OverlayProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !bloccato && onChiudi();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onChiudi, bloccato]);

  return (
    <div className="ov-overlay" onMouseDown={(e) => e.target === e.currentTarget && !bloccato && onChiudi()}>
      <div className="ov-modal" role="dialog" aria-modal="true" aria-label={titolo} style={{ maxWidth: larghezza }}>
        <button type="button" className="ov-close" aria-label="Chiudi" disabled={bloccato} onClick={onChiudi}>
          <i className="ti ti-x" />
        </button>
        <div className="ov-head">
          <h3>
            <i className={`ti ${icona}`} />
            {titolo}
          </h3>
          {sottotitolo && <p>{sottotitolo}</p>}
        </div>
        {children && <div className="ov-body">{children}</div>}
        {piede && <div className="ov-foot">{piede}</div>}
      </div>
    </div>
  );
}

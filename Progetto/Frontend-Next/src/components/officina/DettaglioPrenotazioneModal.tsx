"use client";

import type { PrenotazioneOfficina } from "@/lib/types";

export const STATO_LABEL: Record<string, string> = {
  in_attesa: "In attesa",
  confermata: "Confermata",
  annullata: "Annullata",
  completata: "Completata",
};

export function iconaVeicoloPrenotazione(p: PrenotazioneOfficina): string {
  const tipo = p.utente?.veicolo?.[0]?.dati_generici?.[0]?.tipo_veicolo;
  return tipo === "Moto" || tipo === "Scooter" ? "fa-motorcycle" : "fa-car";
}

export function nomeVeicoloPrenotazione(p: PrenotazioneOfficina): string {
  const v = p.utente?.veicolo?.[0];
  return v ? `${v.marca ?? ""} ${v.modello ?? ""}`.trim() : "Veicolo sconosciuto";
}

export function formattaDataOra(iso: string): string {
  return new Date(iso).toLocaleString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface DettaglioPrenotazioneModalProps {
  prenotazione: PrenotazioneOfficina | null;
  onClose: () => void;
  /** Se presente mostra i bottoni Conferma/Annulla/Completa (dashboard e lista, non agenda). */
  onAggiornaStato?: (id: number, stato: string) => void;
}

/**
 * Modal "Dettaglio prenotazione" condiviso: nel vanilla era duplicato in
 * officina.html, prenotazioni-officina.html e officina-agenda.html.
 */
export default function DettaglioPrenotazioneModal({
  prenotazione: p,
  onClose,
  onAggiornaStato,
}: DettaglioPrenotazioneModalProps) {
  if (!p) return null;

  const v = p.utente?.veicolo?.[0];
  const dg = v?.dati_generici?.[0];
  const ds = v?.dati_specifici?.[0];

  const nomeVeicolo = v ? `${v.marca ?? ""} ${v.modello ?? ""}`.trim() : "—";
  const targa = v?.targa ?? "—";
  const tipo = dg?.tipo_veicolo ?? "—";
  const anno = ds?.dataimmatricolazione ? new Date(ds.dataimmatricolazione).getFullYear() : "—";
  const icona = iconaVeicoloPrenotazione(p);

  const nomeUtente = p.utente?.username ?? "—";
  const clienteSub = [p.utente?.email, p.utente?.cellulare].filter(Boolean).join(" · ");

  return (
    <div
      className="oc-detail-overlay open"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="oc-new-modal">
        <div className="oc-new-modal-header">
          <div className="oc-new-modal-title">
            <i className="fa-solid fa-calendar-check" />
            Dettaglio prenotazione
          </div>
          <div className="oc-new-modal-header-right">
            <span className={`oc-stato ${p.stato}`}>{STATO_LABEL[p.stato] ?? p.stato}</span>
            <button type="button" className="oc-detail-close" onClick={onClose}>
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        </div>

        <div className="oc-new-modal-body">
          <div className="oc-new-hero">
            <div className="oc-new-car-icon">
              <i className={`fa-solid ${icona}`} />
            </div>
            <div>
              <div className="oc-new-car-name">{nomeVeicolo}</div>
              <div className="oc-new-car-sub">
                <span className="oc-new-targa">{targa}</span>
                {tipo !== "—" && (
                  <span>
                    {tipo} · {anno}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="oc-new-chips">
            <div className="oc-new-chip ora">
              <i className="fa-solid fa-clock" /> {formattaDataOra(p.dataprenotazione)}
            </div>
            {p.servizio && (
              <div className="oc-new-chip">
                <i className="fa-solid fa-screwdriver-wrench" /> {p.servizio}
              </div>
            )}
          </div>

          {p.descrizione && (
            <div className="oc-new-nota">
              <div className="oc-new-nota-label">
                <i className="fa-solid fa-note-sticky" /> Note
              </div>
              <div className="oc-new-nota-text">{p.descrizione}</div>
            </div>
          )}

          <div className="oc-new-divider" />

          <div className="oc-new-client">
            <div className="oc-new-avatar">{nomeUtente.charAt(0).toUpperCase()}</div>
            <div>
              <div className="oc-new-client-name">{nomeUtente}</div>
              <div className="oc-new-client-sub">{clienteSub || "—"}</div>
            </div>
          </div>
        </div>

        <div className="oc-new-modal-footer">
          {onAggiornaStato && p.stato === "in_attesa" && (
            <>
              <button
                type="button"
                className="oc-new-btn conferma"
                onClick={() => onAggiornaStato(p.id, "confermata")}
              >
                <i className="fa-solid fa-check" /> Conferma
              </button>
              <button
                type="button"
                className="oc-new-btn annulla"
                onClick={() => onAggiornaStato(p.id, "annullata")}
              >
                <i className="fa-solid fa-ban" /> Annulla
              </button>
            </>
          )}
          {onAggiornaStato && p.stato === "confermata" && (
            <>
              <button
                type="button"
                className="oc-new-btn conferma"
                onClick={() => onAggiornaStato(p.id, "completata")}
              >
                <i className="fa-solid fa-square-check" /> Completa
              </button>
              <button
                type="button"
                className="oc-new-btn annulla"
                onClick={() => onAggiornaStato(p.id, "annullata")}
              >
                <i className="fa-solid fa-ban" /> Annulla
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

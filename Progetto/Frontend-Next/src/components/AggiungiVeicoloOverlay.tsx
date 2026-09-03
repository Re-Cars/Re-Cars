"use client";

import { useEffect, useState, type FormEvent } from "react";

import { useAuth } from "@/context/AuthContext";
import { aggiungiVeicolo, ApiError, cercaVeicoloPerTarga } from "@/lib/api";
import { getStoricoTarghe, rimuoviStoricoTarga, salvaStoricoTarga } from "@/lib/storage";
import type { RisultatoRicercaVeicolo } from "@/lib/types";

/** Stessa regex targa italiana di functions-app.js (validaTarga). */
const REGEX_TARGA = /^[A-Z]{2}[0-9]{3}[A-Z]{2}$/;

type ValiditaTarga = "vuota" | "valida" | "invalida";

function validaTarga(valore: string): ValiditaTarga {
  if (valore.length === 0) return "vuota";
  return REGEX_TARGA.test(valore) ? "valida" : "invalida";
}

interface AggiungiVeicoloOverlayProps {
  aperto: boolean;
  onChiudi: () => void;
  /** Chiamata dopo un'aggiunta andata a buon fine (ricarica il garage). */
  onAggiunto: () => Promise<void> | void;
}

/**
 * Overlay riutilizzabile (homepage + lista-veicoli) di ricerca targa e
 * aggiunta al garage. Logica identica a prima; l'aspetto riusa lo stile
 * della pagina /cerca-veicolo (.cerca-hero, .cerca-targa-wrap,
 * .cerca-features, .vehicle-result-card, .cerca-storico-tag) più il bordo
 * animato conic-gradient già usato dalla card "Aggiungi un veicolo"
 * (--ag-angle / ag-trace), così i due punti d'ingresso alla stessa
 * funzionalità hanno la stessa identità visiva.
 */
export default function AggiungiVeicoloOverlay({
  aperto,
  onChiudi,
  onAggiunto,
}: AggiungiVeicoloOverlayProps) {
  const { utente, gestisci401 } = useAuth();

  const [targa, setTarga] = useState("");
  const [storico, setStorico] = useState<string[]>([]);
  const [inRicerca, setInRicerca] = useState(false);
  const [inAggiunta, setInAggiunta] = useState(false);
  const [risultato, setRisultato] = useState<RisultatoRicercaVeicolo | null>(null);
  const [nonTrovato, setNonTrovato] = useState(false);
  const [errore, setErrore] = useState("");

  // reset dello stato a ogni apertura + lettura storico da localStorage
  useEffect(() => {
    if (!aperto) return;
    setTarga("");
    setRisultato(null);
    setNonTrovato(false);
    setErrore("");
    setStorico(getStoricoTarghe());
  }, [aperto]);

  const validita = validaTarga(targa);

  const cerca = async (e?: FormEvent, targaDiretta?: string) => {
    e?.preventDefault();
    const plate = (targaDiretta ?? targa).trim().toUpperCase();
    if (!plate || inRicerca) return;

    setInRicerca(true);
    setRisultato(null);
    setNonTrovato(false);
    setErrore("");
    try {
      const data = await cercaVeicoloPerTarga(plate);
      setStorico(salvaStoricoTarga(plate));
      setRisultato(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNonTrovato(true);
      } else {
        setErrore(err instanceof ApiError ? err.message : "Errore di connessione al server.");
      }
    } finally {
      setInRicerca(false);
    }
  };

  const aggiungiAlGarage = async () => {
    if (!risultato || !utente || inAggiunta) return;
    setInAggiunta(true);
    try {
      await aggiungiVeicolo(risultato.targa, utente.id);
      await onAggiunto();
      onChiudi();
    } catch (err) {
      if (gestisci401(err)) return;
      if (err instanceof ApiError && err.status === 409) {
        setErrore("Veicolo già presente nel tuo garage.");
      } else if (err instanceof ApiError && err.status === 403) {
        setErrore("Hai raggiunto il limite di veicoli del tuo piano.");
      } else {
        setErrore("Errore durante l'aggiunta del veicolo.");
      }
    } finally {
      setInAggiunta(false);
    }
  };

  if (!aperto) return null;

  return (
    <div className="av-overlay" onClick={onChiudi}>
      <div className="av-modal-wrap" onClick={(e) => e.stopPropagation()}>
        <div className="av-modal">
          <button type="button" className="av-close" aria-label="Chiudi" onClick={onChiudi}>
            <i className="ti ti-x" />
          </button>

          <h3 className="cerca-hero-title av-title">
            <i className="ti ti-car" />
            Aggiungi un veicolo
          </h3>
          <p className="cerca-hero-sub">
            Inserisci la targa: recuperiamo marca, modello e stato dei documenti, poi lo aggiungi
            al tuo garage con un click.
          </p>

          <div className="cerca-features">
            <div className="cerca-feat">
              <div className="cerca-feat-icon blu">
                <i className="ti ti-database" />
              </div>
              <span className="cerca-feat-label">Dati automatici</span>
            </div>
            <div className="cerca-feat">
              <div className="cerca-feat-icon ora">
                <i className="ti ti-history" />
              </div>
              <span className="cerca-feat-label">Storico incluso</span>
            </div>
            <div className="cerca-feat">
              <div className="cerca-feat-icon ver">
                <i className="ti ti-bolt" />
              </div>
              <span className="cerca-feat-label">Verifica istantanea</span>
            </div>
          </div>

          <form className="cerca-input-row" onSubmit={(e) => void cerca(e)}>
            <div className="cerca-targa-wrap">
              <i className="ti ti-car" />
              <input
                type="text"
                placeholder="Es. AA123BB"
                maxLength={7}
                value={targa}
                className={validita === "valida" ? "valid" : validita === "invalida" ? "invalid" : ""}
                onChange={(e) => setTarga(e.target.value.toUpperCase())}
              />
              <i
                className={`ti ti-circle-check cerca-valid-icon ok${validita === "valida" ? " show" : ""}`}
              />
              <i
                className={`ti ti-circle-x cerca-valid-icon ko${validita === "invalida" ? " show" : ""}`}
              />
            </div>
            <button type="submit" className="btn-info-veicolo" disabled={inRicerca}>
              <div className="btn-icon-circle">
                <i className="ti ti-search" />
              </div>
              Cerca
            </button>
          </form>

          <div className={`cerca-loading${inRicerca ? " show" : ""}`}>
            <div className="cerca-dots">
              <div className="cerca-dot" />
              <div className="cerca-dot" />
              <div className="cerca-dot" />
            </div>
            <div className="cerca-loading-text">Ricerca in corso...</div>
          </div>

          <div className="vehicle-result-wrap">
            {errore && <p className="vehicle-result-error">{errore}</p>}

            {nonTrovato && (
              <div className="av-non-trovato">
                <i className="ti ti-car-off" />
                <span className="av-non-trovato-titolo">Veicolo non trovato</span>
                <span className="av-non-trovato-sub">
                  Controlla la targa inserita e riprova.
                </span>
              </div>
            )}

            {risultato && (
              <div className="vehicle-result-card">
                <div className="vehicle-result-header">
                  <div className="vehicle-result-targa">{risultato.targa}</div>
                  <div className="vehicle-result-nome">
                    {`${risultato.marca ?? ""} ${risultato.modello ?? ""}`.trim() || "Veicolo"}
                  </div>
                </div>
                <div className="vehicle-result-divider" />
                <div className="vehicle-result-body">
                  <div className="vehicle-result-field">
                    <span className="vehicle-result-label">Alimentazione</span>
                    <span className="vehicle-result-value">{risultato.alimentazione ?? "—"}</span>
                  </div>
                  <div className="vehicle-result-field">
                    <span className="vehicle-result-label">Cavalli</span>
                    <span className="vehicle-result-value">
                      {risultato.cavalli ? `${risultato.cavalli} CV` : "—"}
                    </span>
                  </div>
                  <div className="vehicle-result-field">
                    <span className="vehicle-result-label">Anno</span>
                    <span className="vehicle-result-value">{risultato.anno ?? "—"}</span>
                  </div>
                  <div className="vehicle-result-field">
                    <span className="vehicle-result-label">Tipo</span>
                    <span className="vehicle-result-value">{risultato.tipo_veicolo ?? "—"}</span>
                  </div>
                  <div className="vehicle-result-field">
                    <span className="vehicle-result-label">Bollo</span>
                    <div className={`vehicle-result-status ${risultato.isbolloattivo ? "ok" : "ko"}`}>
                      <div className={`vehicle-result-dot ${risultato.isbolloattivo ? "ok" : "ko"}`} />
                      {risultato.isbolloattivo ? "Attivo" : "Scaduto"}
                    </div>
                  </div>
                  <div className="vehicle-result-field">
                    <span className="vehicle-result-label">Assicurazione</span>
                    <div className={`vehicle-result-status ${risultato.isinsured ? "ok" : "ko"}`}>
                      <div className={`vehicle-result-dot ${risultato.isinsured ? "ok" : "ko"}`} />
                      {risultato.isinsured ? "Attiva" : "Scaduta"}
                    </div>
                  </div>
                </div>
                <div className="vehicle-result-footer">
                  <button
                    type="button"
                    className="btn-aggiungi-garage"
                    disabled={inAggiunta}
                    onClick={() => void aggiungiAlGarage()}
                  >
                    <div className="btn-icon-circle">
                      <i className="ti ti-car-garage" />
                    </div>
                    {inAggiunta ? "Aggiunta in corso..." : "Aggiungi al garage"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {storico.length > 0 && (
            <div className="cerca-storico">
              <div className="cerca-storico-label">Cercate di recente</div>
              <div className="cerca-storico-tags">
                {storico.map((t) => (
                  <span key={t} className="cerca-storico-tag">
                    <span
                      onClick={() => {
                        setTarga(t);
                        void cerca(undefined, t);
                      }}
                    >
                      {t}
                    </span>
                    <div
                      className="x-circle"
                      onClick={(e) => {
                        e.stopPropagation();
                        setStorico(rimuoviStoricoTarga(t));
                      }}
                    >
                      <i className="ti ti-x" />
                    </div>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

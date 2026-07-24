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
 * aggiunta al garage: replica di cerca-veicolo.html — validazione live con
 * regex italiana e indicatore a destra del campo, stato di caricamento,
 * storico ultime 5 targhe in localStorage con X di rimozione, box risultato
 * con dati veicolo e badge bollo/assicurazione, gestione veicolo non trovato.
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
    <div className="hp-modal-overlay" onClick={onChiudi}>
      <div className="hp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="hp-modal-head">
          <h3 className="hp-modal-title">Aggiungi un veicolo</h3>
          <button type="button" className="hp-modal-close" aria-label="Chiudi" onClick={onChiudi}>
            <i className="ti ti-x" />
          </button>
        </div>

        <form onSubmit={(e) => void cerca(e)}>
          <div className="hp-targa-wrap">
            <i className="ti ti-car hp-targa-icona" />
            <input
              type="text"
              placeholder="Es. AA123BB"
              maxLength={7}
              value={targa}
              onChange={(e) => setTarga(e.target.value.toUpperCase())}
            />
            {validita === "valida" && <i className="ti ti-check hp-targa-valida" />}
            {validita === "invalida" && <i className="ti ti-x hp-targa-invalida" />}
          </div>

          <button type="submit" className="hp-btn-arancione" disabled={inRicerca}>
            {inRicerca ? "Ricerca in corso..." : "Cerca targa"}
          </button>
        </form>

        {errore && <p className="hp-modal-errore">{errore}</p>}

        {nonTrovato && (
          <div className="hp-non-trovato">
            <i className="ti ti-search-off" />
            <span>Veicolo non trovato</span>
          </div>
        )}

        {risultato && (
          <div className="hp-risultato">
            <span className="targa-pill">{risultato.targa}</span>
            <p className="hp-risultato-nome">
              {`${risultato.marca ?? ""} ${risultato.modello ?? ""}`.trim() || "Veicolo"}
            </p>
            <div className="hp-risultato-grid">
              <div className="hp-risultato-campo">
                <span className="hp-risultato-label">Alimentazione</span>
                <span className="hp-risultato-valore">{risultato.alimentazione ?? "—"}</span>
              </div>
              <div className="hp-risultato-campo">
                <span className="hp-risultato-label">CV</span>
                <span className="hp-risultato-valore">
                  {risultato.cavalli ? `${risultato.cavalli} CV` : "—"}
                </span>
              </div>
              <div className="hp-risultato-campo">
                <span className="hp-risultato-label">Anno</span>
                <span className="hp-risultato-valore">{risultato.anno ?? "—"}</span>
              </div>
              <div className="hp-risultato-campo">
                <span className="hp-risultato-label">Tipo</span>
                <span className="hp-risultato-valore">{risultato.tipo_veicolo ?? "—"}</span>
              </div>
            </div>
            <div className="hp-risultato-badges">
              <span className={`hp-badge ${risultato.isbolloattivo ? "ok" : "ko"}`}>
                <i className={`ti ${risultato.isbolloattivo ? "ti-circle-check" : "ti-alert-circle"}`} />
                Bollo {risultato.isbolloattivo ? "attivo" : "scaduto"}
              </span>
              <span className={`hp-badge ${risultato.isinsured ? "ok" : "ko"}`}>
                <i className={`ti ${risultato.isinsured ? "ti-circle-check" : "ti-alert-circle"}`} />
                Assicurazione {risultato.isinsured ? "attiva" : "scaduta"}
              </span>
            </div>
            <button
              type="button"
              className="hp-btn-arancione"
              disabled={inAggiunta}
              onClick={() => void aggiungiAlGarage()}
            >
              {inAggiunta ? "Aggiunta in corso..." : "Aggiungi al garage"}
            </button>
          </div>
        )}

        {storico.length > 0 && (
          <div className="hp-recenti">
            <p className="hp-recenti-label">Ricercate di recente</p>
            <div className="hp-recenti-lista">
              {storico.map((t) => (
                <span
                  key={t}
                  className="hp-recente-pill"
                  onClick={() => {
                    setTarga(t);
                    void cerca(undefined, t);
                  }}
                >
                  {t}
                  <button
                    type="button"
                    className="hp-recente-x"
                    aria-label={`Rimuovi ${t}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setStorico(rimuoviStoricoTarga(t));
                    }}
                  >
                    <i className="ti ti-x" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

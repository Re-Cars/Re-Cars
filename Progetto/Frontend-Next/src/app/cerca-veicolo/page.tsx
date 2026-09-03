"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { aggiungiVeicolo, ApiError, cercaVeicoloPerTarga } from "@/lib/api";
import {
  getStoricoTarghe,
  rimuoviStoricoTarga,
  salvaStoricoTarga,
  setGarageAnimation,
  setGarageLimiteRaggiunto,
} from "@/lib/storage";
import type { RisultatoRicercaVeicolo } from "@/lib/types";

const REGEX_TARGA = /^[A-Z]{2}[0-9]{3}[A-Z]{2}$/;

type ValiditaTarga = "vuota" | "parziale" | "valida" | "invalida";

function validaTarga(valore: string): ValiditaTarga {
  if (valore.length === 0) return "vuota";
  if (valore.length < 7) return "parziale";
  return REGEX_TARGA.test(valore) ? "valida" : "invalida";
}

/**
 * Cerca e aggiungi veicolo: campo targa con validazione live, storico
 * delle ultime 5 ricerche, risultato con dati veicolo e aggiunta al garage.
 */
export default function CercaVeicoloPage() {
  const router = useRouter();
  const { utente, gestisci401 } = useAuth();

  const [targa, setTarga] = useState("");
  const [storico, setStorico] = useState<string[]>([]);
  const [inRicerca, setInRicerca] = useState(false);
  const [risultato, setRisultato] = useState<RisultatoRicercaVeicolo | null>(null);
  const [erroreRicerca, setErroreRicerca] = useState("");

  useEffect(() => {
    setStorico(getStoricoTarghe());
  }, []);

  const validita = validaTarga(targa);

  const cerca = async (e?: FormEvent) => {
    e?.preventDefault();
    const plate = targa.trim().toUpperCase();
    if (!plate || inRicerca) return;
    if (!utente) {
      alert("Devi effettuare il login.");
      return;
    }

    setInRicerca(true);
    setRisultato(null);
    setErroreRicerca("");
    try {
      const data = await cercaVeicoloPerTarga(plate);
      setStorico(salvaStoricoTarga(plate));
      setRisultato(data);
    } catch (err) {
      setErroreRicerca(err instanceof ApiError ? err.message : "Errore di connessione al server.");
    } finally {
      setInRicerca(false);
    }
  };

  const aggiungiAlGarage = async () => {
    if (!risultato || !utente) return;
    try {
      await aggiungiVeicolo(risultato.targa, utente.id);
      setGarageAnimation();
      router.push("/homepage");
    } catch (err) {
      if (gestisci401(err)) return;
      if (err instanceof ApiError && err.status === 409) {
        alert("Veicolo già esistente nel garage!");
        return;
      }
      if (err instanceof ApiError && err.status === 403) {
        setGarageLimiteRaggiunto();
        router.push("/homepage");
        return;
      }
      alert("Errore durante l'aggiunta del veicolo.");
    }
  };

  return (
    <Layout breadcrumb="Cerca e Aggiungi Veicolo">
      <section className="section">
        <div className="cerca-hero">
          <div className="cerca-hero-title">
            <i className="fa-solid fa-magnifying-glass" />
            Cerca il tuo veicolo
          </div>
          <p className="cerca-hero-sub">
            Inserisci la targa per visualizzare i dati e aggiungere il veicolo al tuo garage
          </p>

          <div className="cerca-features">
            <div className="cerca-feat">
              <div className="cerca-feat-icon blu">
                <i className="fa-solid fa-car" />
              </div>
              <span className="cerca-feat-label">Marca e modello</span>
            </div>
            <div className="cerca-feat">
              <div className="cerca-feat-icon ora">
                <i className="fa-solid fa-gas-pump" />
              </div>
              <span className="cerca-feat-label">Alimentazione e cavalli</span>
            </div>
            <div className="cerca-feat">
              <div className="cerca-feat-icon ver">
                <i className="fa-solid fa-calendar-check" />
              </div>
              <span className="cerca-feat-label">Bollo e assicurazione</span>
            </div>
          </div>

          <form className="cerca-input-row" onSubmit={(e) => void cerca(e)}>
            <div className="cerca-targa-wrap">
              <i className="fa-solid fa-car" />
              <input
                type="text"
                placeholder="Es. AA123BB"
                maxLength={7}
                value={targa}
                className={
                  validita === "valida" ? "valid" : validita === "invalida" ? "invalid" : ""
                }
                onChange={(e) => setTarga(e.target.value.toUpperCase())}
              />
              <i
                className={`fa-solid fa-circle-check cerca-valid-icon ok${validita === "valida" ? " show" : ""}`}
              />
              <i
                className={`fa-solid fa-circle-xmark cerca-valid-icon ko${validita === "invalida" ? " show" : ""}`}
              />
            </div>
            <button type="submit" className="btn-info-veicolo">
              <div className="btn-icon-circle">
                <i className="fa-solid fa-magnifying-glass" />
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
            {erroreRicerca && <p className="vehicle-result-error">{erroreRicerca}</p>}
            {risultato && (
              <div className="vehicle-result-card">
                <div className="vehicle-result-header">
                  <div className="vehicle-result-targa">{risultato.targa}</div>
                  <div className="vehicle-result-nome">
                    {risultato.marca} {risultato.modello}
                  </div>
                </div>
                <div className="vehicle-result-divider" />
                <div className="vehicle-result-body">
                  <div className="vehicle-result-field">
                    <span className="vehicle-result-label">Alimentazione</span>
                    <span className="vehicle-result-value">{risultato.alimentazione ?? "-"}</span>
                  </div>
                  <div className="vehicle-result-field">
                    <span className="vehicle-result-label">Cavalli</span>
                    <span className="vehicle-result-value">
                      {risultato.cavalli ? `${risultato.cavalli} CV` : "-"}
                    </span>
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
                    onClick={() => void aggiungiAlGarage()}
                  >
                    <div className="btn-icon-circle">
                      <i className="fa-solid fa-warehouse" />
                    </div>
                    Aggiungi al garage
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
                    <span onClick={() => setTarga(t)}>{t}</span>
                    <div
                      className="x-circle"
                      onClick={(e) => {
                        e.stopPropagation();
                        setStorico(rimuoviStoricoTarga(t));
                      }}
                    >
                      <i className="fa-solid fa-xmark" />
                    </div>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}

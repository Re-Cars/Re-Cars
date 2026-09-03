"use client";

import { useEffect, useState } from "react";

import DettaglioPrenotazioneModal, {
  formattaDataOra,
  iconaVeicoloPrenotazione,
  nomeVeicoloPrenotazione,
  STATO_LABEL,
} from "@/components/officina/DettaglioPrenotazioneModal";
import OfficinaLayout from "@/components/officina/OfficinaLayout";
import { useAuth } from "@/context/AuthContext";
import { aggiornaStatoPrenotazioneOfficina, getPrenotazioniOfficina } from "@/lib/api";
import type { PrenotazioneOfficina } from "@/lib/types";

type Filtro = "all" | "in_attesa" | "confermata" | "completata" | "annullata";

const FILTRI: { id: Filtro; label: string; dot?: string }[] = [
  { id: "all", label: "Tutte" },
  { id: "in_attesa", label: "In attesa", dot: "oc-dot-attesa" },
  { id: "confermata", label: "Confermate", dot: "oc-dot-confermata" },
  { id: "completata", label: "Completate", dot: "oc-dot-completata" },
  { id: "annullata", label: "Annullate", dot: "oc-dot-annullata" },
];

/** Elenco completo prenotazioni officina con filtri per stato e azioni. */
export default function PrenotazioniOfficinaPage() {
  const { utente } = useAuth();
  const [prenotazioni, setPrenotazioni] = useState<PrenotazioneOfficina[]>([]);
  const [filtro, setFiltro] = useState<Filtro>("all");
  const [selezionata, setSelezionata] = useState<PrenotazioneOfficina | null>(null);

  useEffect(() => {
    getPrenotazioniOfficina()
      .then(setPrenotazioni)
      .catch((err) => console.error("Errore caricamento prenotazioni:", err));
  }, []);

  const filtrate = filtro === "all" ? prenotazioni : prenotazioni.filter((p) => p.stato === filtro);

  const conteggio = (f: Filtro) =>
    f === "all" ? prenotazioni.length : prenotazioni.filter((p) => p.stato === f).length;

  const aggiornaStato = async (id: number, stato: string) => {
    try {
      await aggiornaStatoPrenotazioneOfficina(id, stato);
      setSelezionata(null);
      setPrenotazioni((lista) => lista.map((p) => (p.id === id ? { ...p, stato } : p)));
    } catch (err) {
      console.error("Errore aggiornamento stato:", err);
    }
  };

  const azioniRapide = (p: PrenotazioneOfficina) => {
    if (p.stato === "in_attesa") {
      return (
        <div className="oc-action-row">
          <button
            type="button"
            className="oc-action-btn conferma"
            title="Conferma"
            onClick={(e) => {
              e.stopPropagation();
              void aggiornaStato(p.id, "confermata");
            }}
          >
            <i className="fa-solid fa-check" />
          </button>
          <button
            type="button"
            className="oc-action-btn annulla"
            title="Annulla"
            onClick={(e) => {
              e.stopPropagation();
              void aggiornaStato(p.id, "annullata");
            }}
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      );
    }
    if (p.stato === "confermata") {
      return (
        <div className="oc-action-row">
          <button
            type="button"
            className="oc-action-btn completa"
            title="Completa"
            onClick={(e) => {
              e.stopPropagation();
              void aggiornaStato(p.id, "completata");
            }}
          >
            <i className="fa-solid fa-square-check" />
          </button>
        </div>
      );
    }
    return null;
  };

  return (
    <OfficinaLayout briciole={[{ label: "Prenotazioni" }]}>
      <div className="oc-intro">
        <div className="oc-intro-left">
          <div className="oc-office-avatar">
            <i className="fa-solid fa-calendar-check" />
          </div>
          <div>
            <div className="oc-office-name">Prenotazioni</div>
            <div className="oc-office-sub">
              <i className="fa-solid fa-building-user" />
              <span>{utente?.nome ?? utente?.ragione_sociale ?? "—"}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="oc-filters-wrapper">
        <div className="oc-filters">
          <span className="oc-filter-label">Filtra</span>
          {FILTRI.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`oc-filter-btn${filtro === f.id ? ` active-${f.id}` : ""}`}
              onClick={() => setFiltro(f.id)}
            >
              {f.dot && <span className={`oc-filter-dot ${f.dot}`} />} {f.label}{" "}
              <span className="oc-filter-count">{conteggio(f.id) || ""}</span>
            </button>
          ))}
          <span className="oc-count-pill oc-count-pill-right">{filtrate.length} prenotazioni</span>
        </div>
      </div>

      <div className="oc-prenotazioni-list">
        {filtrate.map((p) => {
          const v = p.utente?.veicolo?.[0];
          const ds = v?.dati_specifici?.[0];
          const anno = ds?.dataimmatricolazione
            ? new Date(ds.dataimmatricolazione).getFullYear()
            : "—";
          const tipo = v?.dati_generici?.[0]?.tipo_veicolo ?? "—";
          return (
            <div key={p.id} className="oc-pren-card-wrap">
              <div className="oc-prenotazione-card" onClick={() => setSelezionata(p)}>
                <div className="oc-veicolo-icon">
                  <i className={`fa-solid ${iconaVeicoloPrenotazione(p)}`} />
                </div>
                <div className="oc-veicolo-info">
                  <div className="oc-veicolo-nome">
                    {nomeVeicoloPrenotazione(p)}
                    <span className="oc-targa-pill">{v?.targa ?? "—"}</span>
                  </div>
                  <div className="oc-veicolo-sub">
                    <i className="fa-regular fa-calendar" /> {formattaDataOra(p.dataprenotazione)}
                  </div>
                  <div className="oc-utente-row">
                    <i className="fa-solid fa-user" />
                    <span>
                      {p.utente?.username ?? "—"}
                      {p.utente?.email ? ` · ${p.utente.email}` : ""}
                    </span>
                  </div>
                </div>
                <div className="oc-pren-right">
                  <span className={`oc-stato ${p.stato}`}>{STATO_LABEL[p.stato] ?? p.stato}</span>
                  {azioniRapide(p)}
                </div>
              </div>
              <div className="oc-pren-card-bottom">
                <div className="oc-pren-card-bottom-item">
                  <i className="fa-solid fa-car" />
                  <strong>{tipo}</strong> · {anno}
                </div>
                {p.servizio && (
                  <div className="oc-pren-card-bottom-item">
                    <i className="fa-solid fa-screwdriver-wrench" />
                    {p.servizio}
                  </div>
                )}
                {p.utente?.cellulare && (
                  <div className="oc-pren-card-bottom-item">
                    <i className="fa-solid fa-phone" />
                    {p.utente.cellulare}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {filtrate.length === 0 && (
        <div className="oc-empty-state oc-empty-state-outer" style={{ display: "flex" }}>
          <i className="fa-solid fa-calendar-xmark" />
          <span>Nessuna prenotazione trovata</span>
        </div>
      )}

      <DettaglioPrenotazioneModal
        prenotazione={selezionata}
        onClose={() => setSelezionata(null)}
        onAggiornaStato={(id, stato) => void aggiornaStato(id, stato)}
      />
    </OfficinaLayout>
  );
}

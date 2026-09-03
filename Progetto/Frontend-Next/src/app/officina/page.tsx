"use client";

import { useCallback, useEffect, useState } from "react";

import DettaglioPrenotazioneModal, {
  iconaVeicoloPrenotazione,
  nomeVeicoloPrenotazione,
  STATO_LABEL,
} from "@/components/officina/DettaglioPrenotazioneModal";
import OfficinaLayout from "@/components/officina/OfficinaLayout";
import { useAuth } from "@/context/AuthContext";
import { aggiornaStatoPrenotazione, getDashboardOfficina } from "@/lib/api";
import type { DashboardOfficina, PrenotazioneOfficina } from "@/lib/types";

/**
 * Dashboard officina: stats (oggi/settimana/ponti), badge abbonamento,
 * switcher dei veicoli in officina oggi e lista prenotazioni con azioni.
 */
export default function OfficinaDashboardPage() {
  const { utente } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardOfficina | null>(null);
  const [selezionata, setSelezionata] = useState<PrenotazioneOfficina | null>(null);
  const [switcherAperto, setSwitcherAperto] = useState(false);

  const prenotazioniOggi = dashboard?.prenotazioniOggi ?? [];

  const carica = useCallback(async () => {
    try {
      setDashboard(await getDashboardOfficina());
    } catch (err) {
      console.error("Errore caricamento dashboard:", err);
    }
  }, []);

  useEffect(() => {
    void carica();
  }, [carica]);

  const aggiornaStato = async (id: number, stato: string) => {
    try {
      await aggiornaStatoPrenotazione(id, stato);
      setSelezionata(null);
      setDashboard((d) =>
        d
          ? {
              ...d,
              prenotazioniOggi: (d.prenotazioniOggi ?? []).map((p) =>
                p.id === id ? { ...p, stato } : p,
              ),
            }
          : d,
      );
    } catch (err) {
      console.error("Errore aggiornamento stato:", err);
    }
  };

  const azioniRapide = (p: PrenotazioneOfficina) => {
    if (p.stato === "in_attesa") {
      return (
        <>
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
        </>
      );
    }
    if (p.stato === "confermata") {
      return (
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
      );
    }
    return null;
  };

  const pianoBadge = dashboard?.abbonamento?.piano?.replace("_", " ") ?? "—";

  return (
    <OfficinaLayout>
      <div className="oc-intro">
        <div className="oc-intro-left">
          <div className="oc-office-avatar">
            <i className="fa-solid fa-building-user" />
          </div>
          <div>
            <div className="oc-office-name">{utente?.nome ?? utente?.ragione_sociale ?? "—"}</div>
            <div className="oc-office-sub">
              <i className="fa-solid fa-location-dot" />
              <span>{(utente as { sigla_citta?: string } | null)?.sigla_citta ?? ""}</span>
              <span className="oc-abbonamento-badge">
                <i className="fa-solid fa-crown" />
                <span>{pianoBadge}</span>
              </span>
            </div>
          </div>
        </div>
        <div className="veicolo-switcher">
          <button
            type="button"
            className="switcher-btn"
            onClick={() => setSwitcherAperto((v) => !v)}
          >
            <span>
              <i className="fa-solid fa-car" /> {prenotazioniOggi.length} veicoli oggi
            </span>
            <i
              className="fa-solid fa-chevron-down"
              style={{ transform: switcherAperto ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </button>
          <div
            className="switcher-dropdown"
            style={{ display: switcherAperto ? "block" : "none" }}
          >
            {prenotazioniOggi.length === 0 ? (
              <div style={{ padding: 14, fontSize: 13, color: "var(--muted)", textAlign: "center" }}>
                Nessun veicolo oggi
              </div>
            ) : (
              prenotazioniOggi.map((p) => (
                <div
                  key={p.id}
                  className="switcher-item"
                  onClick={() => {
                    setSelezionata(p);
                    setSwitcherAperto(false);
                  }}
                >
                  <i className={`fa-solid ${iconaVeicoloPrenotazione(p)}`} />
                  <div>
                    <div>
                      {nomeVeicoloPrenotazione(p)} · {p.utente?.veicolo?.[0]?.targa ?? "—"}
                    </div>
                    <div className="sw-sub">
                      {STATO_LABEL[p.stato] ?? p.stato} · {p.utente?.username ?? "—"}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="oc-stats-grid">
        <div className="oc-stat-card">
          <div className="oc-stat-accent oc-accent-orange" />
          <div className="oc-stat-icon">
            <i className="fa-solid fa-calendar-day" />
          </div>
          <div className="oc-stat-label">Prenotazioni oggi</div>
          <div className="oc-stat-value">{dashboard?.oggiTotale ?? "—"}</div>
          <div className="oc-stat-sub">
            <span className="oc-stat-dot" style={{ background: "#22c55e" }} />
            {dashboard?.oggiConfermate ?? 0} confermate
          </div>
        </div>
        <div className="oc-stat-card">
          <div className="oc-stat-accent oc-accent-blue" />
          <div className="oc-stat-icon oc-stat-icon-blue">
            <i className="fa-solid fa-calendar-week" />
          </div>
          <div className="oc-stat-label">Questa settimana</div>
          <div className="oc-stat-value">{dashboard?.settimanaT ?? "—"}</div>
          <div className="oc-stat-sub">
            <span className="oc-stat-dot" style={{ background: "#fbbf24" }} />
            {dashboard?.settimanaAttesa ?? 0} in attesa
          </div>
        </div>
        <div className="oc-stat-card">
          <div className="oc-stat-accent oc-accent-muted" />
          <div className="oc-stat-icon oc-stat-icon-muted">
            <i className="fa-solid fa-car-on" />
          </div>
          <div className="oc-stat-label">Ponti disponibili</div>
          <div className="oc-stat-value">
            {dashboard?.pontiOccupati ?? 0}/
            {(utente as { ponti_disponibili?: number } | null)?.ponti_disponibili ?? "—"}
          </div>
          <div className="oc-stat-sub">
            <span className="oc-stat-dot" style={{ background: "#f97316" }} />
            {dashboard?.pontiOccupati ?? 0} occupati
          </div>
        </div>
      </div>

      <div className="oc-section-header">
        <span className="oc-section-title">Veicoli in officina oggi</span>
        <span className="oc-count-pill">{prenotazioniOggi.length} veicoli</span>
      </div>

      <div className="oc-prenotazioni-list">
        {prenotazioniOggi.map((p) => {
          const targa = p.utente?.veicolo?.[0]?.targa ?? "—";
          const ora = new Date(p.dataprenotazione).toLocaleTimeString("it-IT", {
            hour: "2-digit",
            minute: "2-digit",
          });
          return (
            <div key={p.id} className="oc-prenotazione-card" onClick={() => setSelezionata(p)}>
              <div className="oc-veicolo-icon">
                <i className={`fa-solid ${iconaVeicoloPrenotazione(p)}`} />
              </div>
              <div className="oc-veicolo-info">
                <div className="oc-veicolo-nome">
                  {nomeVeicoloPrenotazione(p)}
                  <span className="oc-targa-pill">{targa}</span>
                </div>
                <div className="oc-veicolo-sub">
                  Ore {ora}
                  {p.descrizione ? ` · ${p.descrizione}` : ""}
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
          );
        })}
        {prenotazioniOggi.length === 0 && (
          <div className="oc-empty-state" style={{ display: "flex" }}>
            <i className="fa-solid fa-calendar-xmark" />
            <span>Nessun veicolo in officina oggi</span>
          </div>
        )}
      </div>

      <DettaglioPrenotazioneModal
        prenotazione={selezionata}
        onClose={() => setSelezionata(null)}
        onAggiornaStato={(id, stato) => void aggiornaStato(id, stato)}
      />
    </OfficinaLayout>
  );
}

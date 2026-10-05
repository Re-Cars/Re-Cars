"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import DettaglioPrenotazioneModal, {
  iconaVeicoloPrenotazione,
  nomeVeicoloPrenotazione,
  STATO_LABEL,
} from "@/components/officina/DettaglioPrenotazioneModal";
import OfficinaLayout from "@/components/officina/OfficinaLayout";
import { useAuth } from "@/context/AuthContext";
import { aggiornaStatoPrenotazioneOfficina, getDashboardOfficina, getPrenotazioniOfficina } from "@/lib/api";
import type { DashboardOfficina, PrenotazioneOfficina } from "@/lib/types";

/** Stato della prenotazione → livello colore delle card scadenze (lato utente). */
const LIVELLO_STATO: Record<string, string> = {
  confermata: "ok",
  in_attesa: "arancione",
  completata: "nd",
  annullata: "rossa",
};

const ora = (iso: string) => new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
const giorno = (iso: string) =>
  new Date(iso).toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" });
const targaDi = (p: PrenotazioneOfficina) => p.utente?.veicolo?.[0]?.targa ?? null;
const servizioDi = (p: PrenotazioneOfficina) =>
  p.descrizione?.match(/^Servizio: (.*?)(?: - Note:|$)/)?.[1] ?? p.servizio ?? "Intervento";
const nomePiano = (piano?: string | null) =>
  piano ? piano.replace(/^officina_/, "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : null;

function Targa({ targa }: { targa: string | null }) {
  if (!targa) return null;
  return (
    <span className="targa-it targa-it--mini">
      <span className="targa-it-eu">I</span>
      <span className="targa-it-num">{targa}</span>
    </span>
  );
}

/**
 * Dashboard officina con lo stesso linguaggio della home utente: hero blu
 * con nome e piano, numeri chiave nelle card "spec", richieste da
 * confermare (accetta/rifiuta senza aprire Prenotazioni), gli appuntamenti
 * di oggi come card colorate per stato e le azioni rapide.
 */
export default function OfficinaDashboardPage() {
  const { utente } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardOfficina | null>(null);
  const [daConfermare, setDaConfermare] = useState<PrenotazioneOfficina[]>([]);
  const [selezionata, setSelezionata] = useState<PrenotazioneOfficina | null>(null);
  const [inAggiornamento, setInAggiornamento] = useState<number | null>(null);

  const carica = useCallback(async () => {
    try {
      const [d, tutte] = await Promise.all([getDashboardOfficina(), getPrenotazioniOfficina()]);
      setDashboard(d);
      const adesso = Date.now() - 60 * 60 * 1000;
      setDaConfermare(
        tutte
          .filter((p) => p.stato === "in_attesa" && new Date(p.dataprenotazione).getTime() >= adesso)
          .sort((a, b) => a.dataprenotazione.localeCompare(b.dataprenotazione)),
      );
    } catch (err) {
      console.error("Errore caricamento dashboard:", err);
    }
  }, []);

  useEffect(() => {
    void carica();
  }, [carica]);

  // stesso endpoint della pagina Prenotazioni: controlla che la prenotazione
  // sia dell'officina e manda la notifica push all'utente
  const aggiornaStato = async (id: number, stato: string) => {
    setInAggiornamento(id);
    try {
      await aggiornaStatoPrenotazioneOfficina(id, stato);
      setSelezionata(null);
      await carica();
    } catch (err) {
      console.error("Errore aggiornamento stato:", err);
    } finally {
      setInAggiornamento(null);
    }
  };

  const oggi = dashboard?.prenotazioniOggi ?? [];
  const ponti = dashboard?.pontiDisponibili ?? null;
  const occupati = dashboard?.pontiOccupati ?? 0;
  const piano = nomePiano(dashboard?.abbonamento?.piano);
  const nome = utente?.nome ?? utente?.ragione_sociale ?? "La tua officina";

  return (
    <OfficinaLayout>
      <main className="od">
        <div className="od-principale">
          <section className="panel dash-hero od-hero" aria-label="La tua officina">
            <div className="dash-hero-top">
              <span className={`dash-pill-stato ${daConfermare.length ? "salute-attenzione" : ""}`}>
                <span className="dash-pill-dot" />
                {daConfermare.length
                  ? `${daConfermare.length} da confermare`
                  : "Tutto confermato"}
              </span>
              {piano && (
                <span className="dash-pill-stato od-pill-piano">
                  <i className="ti ti-crown" />
                  {piano}
                </span>
              )}
            </div>
            <div className="dash-hero-name">
              <div className="dash-hero-brand">Officina</div>
              <div className="dash-hero-model">{nome}</div>
            </div>
            <div className="dash-hero-meta">
              <span className="dash-hero-since">
                <i className="ti ti-calendar" />
                {new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}
              </span>
            </div>
            <div className="dash-hero-actions">
              <Link href="/officina-agenda" className="btn-dash btn-dash-primary">
                <i className="ti ti-calendar-event" />
                Apri agenda
              </Link>
              <Link href="/profilo-officina" className="btn-dash od-btn-vetro">
                <i className="ti ti-settings" />
                Profilo
              </Link>
            </div>
          </section>

          <div className="od-kpi dash-specs">
            <div className="dash-spec dash-spec--key">
              <span className="dash-spec-ic"><i className="ti ti-calendar-check" /></span>
              <span className="dash-spec-txt">
                <span className="dash-spec-lbl">Oggi</span>
                <span className="dash-spec-val">
                  {dashboard?.oggiTotale ?? "—"}
                  <small>{dashboard?.oggiConfermate ?? 0} confermate</small>
                </span>
              </span>
            </div>
            <div className="dash-spec dash-spec--key">
              <span className="dash-spec-ic"><i className="ti ti-calendar-week" /></span>
              <span className="dash-spec-txt">
                <span className="dash-spec-lbl">Settimana</span>
                <span className="dash-spec-val">
                  {dashboard?.settimanaT ?? "—"}
                  <small>{dashboard?.settimanaAttesa ?? 0} in attesa</small>
                </span>
              </span>
            </div>
            <div className="dash-spec">
              <span className="dash-spec-ic"><i className="ti ti-car-garage" /></span>
              <span className="dash-spec-txt">
                <span className="dash-spec-lbl">Ponti liberi</span>
                <span className="dash-spec-val">
                  {ponti !== null ? `${Math.max(0, ponti - occupati)}/${ponti}` : "—"}
                  <small>{occupati} occupati</small>
                </span>
              </span>
            </div>
            <div className="dash-spec">
              <span className="dash-spec-ic"><i className="ti ti-list-check" /></span>
              <span className="dash-spec-txt">
                <span className="dash-spec-lbl">Da confermare</span>
                <span className="dash-spec-val">{dashboard ? daConfermare.length : "—"}</span>
              </span>
            </div>
          </div>
        </div>

        <section className="panel od-richieste" aria-label="Richieste da confermare">
          <div className="od-head">
            <h2 className="dash-title">
              <i className="ti ti-list-check" />
              Da confermare
            </h2>
            <span className="od-conta">{daConfermare.length}</span>
          </div>
          {daConfermare.length === 0 ? (
            <p className="od-vuoto">
              <i className="ti ti-circle-check" />
              Nessuna richiesta in attesa
            </p>
          ) : (
            <div className="od-lista">
              {daConfermare.map((p) => (
                <article key={p.id} className="od-req">
                  <button type="button" className="od-req-top" onClick={() => setSelezionata(p)}>
                    <span className="dash-spec-ic"><i className={`ti ${iconaVeicoloPrenotazione(p)}`} /></span>
                    <span className="od-req-txt">
                      <b>{nomeVeicoloPrenotazione(p)}</b>
                      <small>
                        {servizioDi(p)} · {p.utente?.username ?? "cliente"}
                      </small>
                    </span>
                    <Targa targa={targaDi(p)} />
                  </button>
                  <div className="od-req-when">
                    <span><i className="ti ti-calendar" />{giorno(p.dataprenotazione)}</span>
                    <span><i className="ti ti-clock" />{ora(p.dataprenotazione)}</span>
                  </div>
                  <div className="od-req-bt">
                    <button
                      type="button"
                      className="btn-dash od-ok"
                      disabled={inAggiornamento === p.id}
                      onClick={() => void aggiornaStato(p.id, "confermata")}
                    >
                      <i className="ti ti-check" />
                      Conferma
                    </button>
                    <button
                      type="button"
                      className="btn-dash od-no"
                      disabled={inAggiornamento === p.id}
                      onClick={() => void aggiornaStato(p.id, "annullata")}
                    >
                      <i className="ti ti-x" />
                      Rifiuta
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="panel od-oggi" aria-label="Oggi in officina">
          <div className="od-head">
            <h2 className="dash-title">
              <i className="ti ti-car-garage" />
              Oggi in officina
            </h2>
            <span className="od-conta">{oggi.length === 1 ? "1 veicolo" : `${oggi.length} veicoli`}</span>
          </div>
          {oggi.length === 0 ? (
            <p className="od-vuoto">
              <i className="ti ti-calendar-x" />
              Nessun appuntamento oggi
            </p>
          ) : (
            <div className="od-slot-grid">
              {oggi.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`dash-scad od-slot lv-${LIVELLO_STATO[p.stato] ?? "nd"}`}
                  onClick={() => setSelezionata(p)}
                >
                  <span className="dash-scad-days">{ora(p.dataprenotazione)}</span>
                  <span className="od-slot-auto">
                    <b>{nomeVeicoloPrenotazione(p)}</b>
                    <Targa targa={targaDi(p)} />
                  </span>
                  <small>
                    {servizioDi(p)} · {p.utente?.username ?? "cliente"}
                  </small>
                  <span className="od-slot-stato">
                    <i />
                    {STATO_LABEL[p.stato] ?? p.stato}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        <nav className="dash-azioni od-azioni" aria-label="Azioni rapide">
          <div className="dash-azioni-title">
            <i className="ti ti-bolt" />
            Azioni rapide
          </div>
          <Link href="/officina-agenda" className="dash-az">
            <span className="dash-az-ic"><i className="ti ti-calendar-event" /></span>
            <span className="dash-az-txt">
              <span className="dash-az-t">Agenda</span>
              <span className="dash-az-d">Settimana e mese, slot liberi</span>
            </span>
            <i className="ti ti-chevron-right dash-az-go" />
          </Link>
          <Link href="/prenotazioni-officina" className="dash-az">
            <span className="dash-az-ic"><i className="ti ti-list-details" /></span>
            <span className="dash-az-txt">
              <span className="dash-az-t">Prenotazioni</span>
              <span className="dash-az-d">Tutte, filtrate per stato</span>
            </span>
            <i className="ti ti-chevron-right dash-az-go" />
          </Link>
          <Link href="/abbonamenti-officina" className="dash-az">
            <span className="dash-az-ic"><i className="ti ti-crown" /></span>
            <span className="dash-az-txt">
              <span className="dash-az-t">Abbonamento</span>
              <span className="dash-az-d">{piano ? `Piano ${piano}` : "Scegli il piano dell'officina"}</span>
            </span>
            <i className="ti ti-chevron-right dash-az-go" />
          </Link>
        </nav>
      </main>

      <DettaglioPrenotazioneModal
        prenotazione={selezionata}
        onClose={() => setSelezionata(null)}
        onAggiornaStato={(id, stato) => void aggiornaStato(id, stato)}
      />
    </OfficinaLayout>
  );
}

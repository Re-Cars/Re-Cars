"use client";

import { useCallback, useEffect, useState } from "react";

import DettaglioPrenotazioneModal, {
  nomeVeicoloPrenotazione,
} from "@/components/officina/DettaglioPrenotazioneModal";
import OfficinaLayout from "@/components/officina/OfficinaLayout";
import { getAgendaOfficina } from "@/lib/api";
import type { PrenotazioneOfficina } from "@/lib/types";
import "@/styles/officina-agenda.css";

const ORE = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];
const GIORNI_NOMI = ["L", "M", "M", "G", "V", "S", "D"];
const MESI_NOMI = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
const SLOT_OGGI = ["09:00", "11:00", "14:00", "16:00"];

function stessoGiorno(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

/**
 * Agenda officina: mini calendario + slot di oggi + legenda a sinistra,
 * vista settimana (griglia oraria) o mese a destra.
 */
export default function OfficinaAgendaPage() {
  const [prenotazioni, setPrenotazioni] = useState<PrenotazioneOfficina[]>([]);
  const [vista, setVista] = useState<"settimana" | "mese">("settimana");
  const [dataCorrente, setDataCorrente] = useState(() => new Date());
  const [selezionata, setSelezionata] = useState<PrenotazioneOfficina | null>(null);

  const carica = useCallback(async (data: Date) => {
    try {
      setPrenotazioni(await getAgendaOfficina(data.getFullYear(), data.getMonth() + 1));
    } catch (err) {
      console.error("Errore caricamento agenda:", err);
    }
  }, []);

  useEffect(() => {
    void carica(dataCorrente);
    // ricarica solo al cambio di mese/anno (il backend filtra per mese)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataCorrente.getFullYear(), dataCorrente.getMonth(), carica]);

  const oggi = new Date();

  const cambiaVista = (direzione: number) => {
    const nuova = new Date(dataCorrente);
    if (vista === "settimana") nuova.setDate(nuova.getDate() + direzione * 7);
    else nuova.setMonth(nuova.getMonth() + direzione);
    setDataCorrente(nuova);
  };

  const selezionaGiorno = (anno: number, mese: number, giorno: number) => {
    setDataCorrente(new Date(anno, mese, giorno));
    setVista("settimana");
  };

  /* ---------- mini calendario ---------- */
  const renderMiniCal = () => {
    const anno = dataCorrente.getFullYear();
    const mese = dataCorrente.getMonth();
    const ultimoGiorno = new Date(anno, mese + 1, 0);
    let offset = new Date(anno, mese, 1).getDay();
    if (offset === 0) offset = 7;
    offset--;

    const giorniConEventi = new Set(
      prenotazioni.map((p) => new Date(p.dataprenotazione).getDate()),
    );

    const celle = [];
    for (let i = 0; i < offset; i++) {
      celle.push(<div key={`v${i}`} className="ag-mini-day altro-mese" />);
    }
    for (let g = 1; g <= ultimoGiorno.getDate(); g++) {
      const isOggi = g === oggi.getDate() && mese === oggi.getMonth() && anno === oggi.getFullYear();
      const haEventi = giorniConEventi.has(g);
      celle.push(
        <div
          key={g}
          className={`ag-mini-day${isOggi ? " oggi" : ""}${haEventi && !isOggi ? " ha-eventi" : ""}`}
          onClick={() => selezionaGiorno(anno, mese, g)}
        >
          {g}
        </div>,
      );
    }
    return celle;
  };

  /* ---------- slot oggi ---------- */
  const prenotazioniOggi = prenotazioni.filter((p) => stessoGiorno(new Date(p.dataprenotazione), oggi));

  const renderSlotsOggi = () =>
    SLOT_OGGI.map((ora) => {
      const h = Number(ora.split(":")[0]);
      const prenSlot = prenotazioniOggi.find((p) => new Date(p.dataprenotazione).getHours() === h);
      const occupato =
        prenSlot !== undefined && (prenSlot.stato === "confermata" || prenSlot.stato === "in_attesa");
      return (
        <div key={ora} className="ag-slot-row">
          <span className="ag-slot-time">{ora}</span>
          <div className={`ag-slot-bar ${occupato ? "ag-slot-occupato" : "ag-slot-libero"}`}>
            {occupato ? (prenSlot?.utente?.username ?? "Occupato") : "Libero"}
          </div>
        </div>
      );
    });

  /* ---------- vista settimana ---------- */
  const lunedi = new Date(dataCorrente);
  const giornoSettimana = lunedi.getDay();
  lunedi.setDate(lunedi.getDate() + (giornoSettimana === 0 ? -6 : 1 - giornoSettimana));
  const giorniSettimana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunedi);
    d.setDate(d.getDate() + i);
    return d;
  });

  const titolo =
    vista === "settimana"
      ? `${lunedi.getDate()} ${MESI_NOMI[lunedi.getMonth()]} — ${giorniSettimana[6].getDate()} ${MESI_NOMI[giorniSettimana[6].getMonth()]} ${giorniSettimana[6].getFullYear()}`
      : `${MESI_NOMI[dataCorrente.getMonth()]} ${dataCorrente.getFullYear()}`;

  const renderSettimana = () => (
    <>
      <div className="ag-week-header">
        <div />
        {giorniSettimana.map((d) => (
          <div key={d.toISOString()} className="ag-week-day-col">
            <div className="ag-week-day-name">{GIORNI_NOMI[d.getDay() === 0 ? 6 : d.getDay() - 1]}</div>
            <div className={`ag-week-day-num${stessoGiorno(d, oggi) ? " oggi" : ""}`}>{d.getDate()}</div>
          </div>
        ))}
      </div>
      <div className="ag-week-grid">
        <div className="ag-time-col">
          {ORE.map((ora) => (
            <div key={ora} className="ag-time-slot">
              <span className="ag-time-label">{ora}</span>
            </div>
          ))}
        </div>
        {giorniSettimana.map((d) => {
          const prenGiorno = prenotazioni.filter((p) => stessoGiorno(new Date(p.dataprenotazione), d));
          return (
            <div key={d.toISOString()} className={`ag-day-col${stessoGiorno(d, oggi) ? " oggi" : ""}`}>
              {ORE.map((ora) => {
                const h = Number(ora.split(":")[0]);
                const pren = prenGiorno.find((p) => new Date(p.dataprenotazione).getHours() === h);
                return (
                  <div key={ora} className="ag-day-cell">
                    {pren && (
                      <div
                        className={`ag-grid-event ag-grid-${pren.stato}`}
                        title={`${nomeVeicoloPrenotazione(pren)} · ${pren.utente?.username ?? ""}`}
                        onClick={() => setSelezionata(pren)}
                      >
                        <span className="ag-event-nome">{nomeVeicoloPrenotazione(pren) || "—"}</span>
                        <span className="ag-event-sub">{pren.utente?.username ?? ""}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </>
  );

  /* ---------- vista mese ---------- */
  const renderMese = () => {
    const anno = dataCorrente.getFullYear();
    const mese = dataCorrente.getMonth();
    const ultimoGiorno = new Date(anno, mese + 1, 0);
    let offset = new Date(anno, mese, 1).getDay();
    if (offset === 0) offset = 7;
    offset--;

    const celle = [];
    for (let i = 0; i < offset; i++) {
      celle.push(<div key={`v${i}`} className="ag-month-cell altro-mese" />);
    }
    for (let g = 1; g <= ultimoGiorno.getDate(); g++) {
      const dataGiorno = new Date(anno, mese, g);
      const prenGiorno = prenotazioni.filter((p) =>
        stessoGiorno(new Date(p.dataprenotazione), dataGiorno),
      );
      celle.push(
        <div
          key={g}
          className={`ag-month-cell${stessoGiorno(dataGiorno, oggi) ? " oggi" : ""}`}
          onClick={() => selezionaGiorno(anno, mese, g)}
        >
          <div className="ag-month-cell-num">{g}</div>
          {prenGiorno.slice(0, 2).map((p) => (
            <div
              key={p.id}
              className={`ag-month-event ag-ev-${p.stato}`}
              onClick={(e) => {
                e.stopPropagation();
                setSelezionata(p);
              }}
            >
              {nomeVeicoloPrenotazione(p) || p.utente?.username || "—"}
            </div>
          ))}
          {prenGiorno.length > 2 && (
            <div className="ag-month-more">+{prenGiorno.length - 2} altri</div>
          )}
        </div>,
      );
    }

    return (
      <>
        <div className="ag-month-header">
          {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((g) => (
            <div key={g} className="ag-month-day-name">
              {g}
            </div>
          ))}
        </div>
        <div className="ag-month-grid">{celle}</div>
      </>
    );
  };

  return (
    <OfficinaLayout briciole={[{ label: "Agenda" }]}>
      <div className="ag-layout">
        <div className="ag-sidebar">
          <div className="ag-mini-cal">
            <div className="ag-mini-cal-header">
              <button type="button" className="ag-nav-btn" onClick={() => cambiaVista(-1)}>
                <i className="fa-solid fa-chevron-left" />
              </button>
              <span>
                {MESI_NOMI[dataCorrente.getMonth()]} {dataCorrente.getFullYear()}
              </span>
              <button type="button" className="ag-nav-btn" onClick={() => cambiaVista(1)}>
                <i className="fa-solid fa-chevron-right" />
              </button>
            </div>
            <div className="ag-mini-grid">
              {GIORNI_NOMI.map((g, i) => (
                <div key={`${g}${i}`} className="ag-mini-day-name">
                  {g}
                </div>
              ))}
            </div>
            <div className="ag-mini-grid">{renderMiniCal()}</div>
          </div>

          <div className="ag-slots-section">
            <div className="ag-slots-title">Slot oggi</div>
            <div>{renderSlotsOggi()}</div>
          </div>

          <div className="ag-legenda">
            <div className="ag-legenda-title">Legenda</div>
            <div className="ag-legenda-item">
              <span className="ag-legenda-dot ag-ev-in_attesa" /> In attesa
            </div>
            <div className="ag-legenda-item">
              <span className="ag-legenda-dot ag-ev-confermata" /> Confermata
            </div>
            <div className="ag-legenda-item">
              <span className="ag-legenda-dot ag-ev-completata" /> Completata
            </div>
            <div className="ag-legenda-item">
              <span className="ag-legenda-dot ag-ev-annullata" /> Annullata
            </div>
          </div>
        </div>

        <div className="ag-main">
          <div className="ag-main-header">
            <div className="ag-main-title">{titolo}</div>
            <div className="ag-main-header-right">
              <button type="button" className="ag-oggi-btn" onClick={() => setDataCorrente(new Date())}>
                <i className="fa-solid fa-calendar-day" /> Oggi
              </button>
              <div className="ag-view-toggle">
                <button
                  type="button"
                  className={`ag-view-btn${vista === "settimana" ? " active" : ""}`}
                  onClick={() => setVista("settimana")}
                >
                  Settimana
                </button>
                <button
                  type="button"
                  className={`ag-view-btn${vista === "mese" ? " active" : ""}`}
                  onClick={() => setVista("mese")}
                >
                  Mese
                </button>
              </div>
            </div>
          </div>

          <div>{vista === "settimana" ? renderSettimana() : renderMese()}</div>
        </div>
      </div>

      {/* nell'agenda il dettaglio è in sola lettura (nessuna azione, come nel vanilla) */}
      <DettaglioPrenotazioneModal prenotazione={selezionata} onClose={() => setSelezionata(null)} />
    </OfficinaLayout>
  );
}

"use client";

import type * as Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import { useCallback, useEffect, useRef, useState } from "react";

import Layout from "@/components/Layout";
import {
  aggiornaStatoPrenotazione,
  creaPrenotazione,
  getOfficineCatalogo,
  getPrenotazioniUtente,
  type PrenotazioneUtente,
} from "@/lib/api";
import { distanzaKm, formattaKm } from "@/lib/geo";
import type { OfficinaCatalogo } from "@/lib/types";
import "@/styles/prenotazione-utente.css";

const SLOT_ORARI = ["08:00", "09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"];
const COLORI_AVATAR = ["#f97316", "#ea580c", "#d97706", "#16a34a", "#1e3a8a", "#7c3aed", "#0891b2"];
const ICONE_CATEGORIA: Record<string, string> = {
  Meccanica: "fa-screwdriver-wrench",
  Carrozzeria: "fa-car-burst",
  Elettrico: "fa-bolt",
};

/** Officina normalizzata come in functions-prenotazione-utente.js. */
interface Officina {
  id: number;
  nome: string;
  specialita: string;
  categoria: string;
  stelle: number;
  recensioni: number;
  /* niente distanza_km: il backend non la restituisce, si calcola a runtime
     dalle coordinate dell'officina e dalla posizione GPS dell'utente */
  aperta: boolean;
  orario: string;
  disponibilita: string;
  indirizzo: string;
  telefono: string;
  lat: number;
  lng: number;
  servizi: string[];
}

function normalizzaOfficina(o: OfficinaCatalogo): Officina {
  return {
    id: o.id,
    nome: o.nome ?? "Officina senza nome",
    specialita: o.specialita ?? "Meccanica Generale",
    categoria: o.categoria ?? "Meccanica",
    stelle: parseFloat(String(o.stelle ?? 4.5)),
    recensioni: parseInt(String(o.recensioni ?? 12), 10),
    aperta: o.aperta !== undefined ? o.aperta : true,
    orario: o.orario ?? "08:00 - 18:00",
    disponibilita: o.disponibilita ?? "Immediata",
    indirizzo: o.indirizzo ?? "Indirizzo non specificato",
    telefono: o.telefono ?? "",
    lat: parseFloat(String(o.latitude ?? o.lat ?? 45.4642)),
    lng: parseFloat(String(o.longitude ?? o.lng ?? 9.19)),
    servizi: Array.isArray(o.servizi)
      ? o.servizi
      : o.servizi
        ? String(o.servizi).split(",")
        : ["Riparazione", "Tagliando"],
  };
}

/* ---------- prenotazioni utente: helper ---------- */

const STATO_LABEL: Record<string, string> = {
  in_attesa: "In attesa",
  confermata: "Confermata",
  annullata: "Annullata",
  completata: "Completata",
};

const STATO_ICONA: Record<string, string> = {
  in_attesa: "ti-clock",
  confermata: "ti-check",
  annullata: "ti-x",
  completata: "ti-circle-check",
};

/** Estrae servizio e note da "Servizio: X - Note: Y" (formato del backend). */
function parseDescrizione(descrizione?: string | null): { servizio: string; note: string } {
  if (!descrizione) return { servizio: "Servizio non specificato", note: "" };
  const match = descrizione.match(/^Servizio:\s*(.*?)(?:\s*-\s*Note:\s*([\s\S]*))?$/);
  if (!match) return { servizio: descrizione, note: "" };
  return { servizio: match[1] || "Servizio non specificato", note: match[2] ?? "" };
}

function formattaDataOra(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toLocaleDateString("it-IT")} · ${d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`;
}

/** Sequenza degli stati attraversati, per lo storico nell'overlay dettagli. */
function storicoStati(stato?: string): string[] {
  switch (stato) {
    case "confermata":
      return ["in_attesa", "confermata"];
    case "completata":
      return ["in_attesa", "confermata", "completata"];
    case "annullata":
      return ["in_attesa", "annullata"];
    default:
      return ["in_attesa"];
  }
}

function Stelle({ valore }: { valore: number }) {
  return (
    <>
      {[1, 2, 3, 4, 5].map((i) => (
        <i
          key={i}
          className={
            valore >= i
              ? "fa-solid fa-star"
              : valore >= i - 0.5
                ? "fa-solid fa-star-half-stroke"
                : "fa-regular fa-star"
          }
        />
      ))}
    </>
  );
}

type StatoLista = "skeleton" | "lista" | "vuoto" | "errore";

/**
 * Cerca Officina: ricerca testuale + GPS, filtri per categoria, lista con
 * rating e distanza, mappa Leaflet/OpenStreetMap, dettaglio con prenotazione
 * (modal servizio/data/slot orario) e lista "Le mie prenotazioni".
 */
export default function PrenotazioniPage() {
  const [officine, setOfficine] = useState<Officina[]>([]);
  const [statoLista, setStatoLista] = useState<StatoLista>("skeleton");
  const [ricerca, setRicerca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [selezionata, setSelezionata] = useState<Officina | null>(null);
  const [prenotazioniUtente, setPrenotazioniUtente] = useState<PrenotazioneUtente[] | null>(null);
  /** Posizione GPS dell'utente: null finché non concessa/rilevata. */
  const [posUtente, setPosUtente] = useState<{ lat: number; lng: number } | null>(null);

  // modal prenotazione
  const [modalAperto, setModalAperto] = useState(false);
  const [servizio, setServizio] = useState("");
  const [dataPren, setDataPren] = useState("");
  const [slot, setSlot] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [feedbackModal, setFeedbackModal] = useState<{ testo: string; errore: boolean } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // overlay dettagli prenotazione
  const [dettaglioPren, setDettaglioPren] = useState<PrenotazioneUtente | null>(null);
  const [inAnnullamento, setInAnnullamento] = useState(false);

  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const markerRef = useRef<Leaflet.Marker | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);

  const mostraToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  /* ---------- caricamento dati ---------- */
  const caricaOfficine = useCallback(async () => {
    setStatoLista("skeleton");
    try {
      const data = await getOfficineCatalogo();
      const normalizzate = data.map(normalizzaOfficina);
      setOfficine(normalizzate);
      setStatoLista(normalizzate.length > 0 ? "lista" : "vuoto");
      if (normalizzate.length > 0) setSelezionata(normalizzate[0]);
    } catch (err) {
      console.error("Errore caricamento officine dal database:", err);
      setStatoLista("errore");
    }
  }, []);

  useEffect(() => {
    void caricaOfficine();
    getPrenotazioniUtente()
      .then(setPrenotazioniUtente)
      .catch(() => setPrenotazioniUtente([]));
  }, [caricaOfficine]);

  // tentativo automatico di geolocalizzazione: se negato o non supportato si
  // resta senza distanze (nessun "0 km" finto) finché non si preme GPS
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setPosUtente({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => undefined,
      { timeout: 10000 },
    );
  }, []);

  /* ---------- mappa Leaflet (import dinamico, client-only) ---------- */
  useEffect(() => {
    let smontato = false;

    const aggiorna = async () => {
      if (!selezionata || !mapDivRef.current) return;
      if (!leafletRef.current) {
        leafletRef.current = await import("leaflet");
      }
      if (smontato) return;
      const L = leafletRef.current;

      let { lat, lng } = selezionata;
      if (!lat || !lng) {
        // geocodifica Nominatim come nel vanilla
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(selezionata.indirizzo)}&limit=1`,
          );
          const data: { lat: string; lon: string }[] = await res.json();
          if (data.length > 0) {
            lat = parseFloat(data[0].lat);
            lng = parseFloat(data[0].lon);
          }
        } catch {
          lat = 45.4642;
          lng = 9.19;
        }
      }
      if (smontato) return;

      if (!mapRef.current) {
        mapRef.current = L.map(mapDivRef.current, { zoomControl: true, scrollWheelZoom: false }).setView(
          [lat, lng],
          14,
        );
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap contributors",
          maxZoom: 19,
        }).addTo(mapRef.current);
      } else {
        mapRef.current.setView([lat, lng], 14, { animate: true });
      }

      markerRef.current?.remove();
      const icona = L.divIcon({
        className: "",
        html: `<div style="width:36px;height:36px;background:#f97316;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:1rem;box-shadow:0 0 0 3px rgba(249,115,22,0.3);border:2px solid #fff;">${selezionata.nome.charAt(0)}</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -20],
      });
      markerRef.current = L.marker([lat, lng], { icon: icona })
        .addTo(mapRef.current)
        .bindPopup(`<strong>${selezionata.nome}</strong><br><small>${selezionata.indirizzo}</small>`)
        .openPopup();
    };

    void aggiorna();
    return () => {
      smontato = true;
    };
  }, [selezionata]);

  // distruggi la mappa allo smontaggio della pagina
  useEffect(
    () => () => {
      mapRef.current?.remove();
      mapRef.current = null;
    },
    [],
  );

  /* ---------- distanza ---------- */
  /** Distanza officina-utente in km, null senza posizione GPS. */
  const distanzaDi = (o: Officina): number | null =>
    posUtente ? distanzaKm(posUtente.lat, posUtente.lng, o.lat, o.lng) : null;

  /** Etichetta distanza: mai "0 km" quando la posizione non è disponibile. */
  const etichettaDistanza = (o: Officina, assente: string): string => {
    const km = distanzaDi(o);
    return km === null ? assente : formattaKm(km);
  };

  /* ---------- filtri / ordinamento ---------- */
  const categorie = [...new Set(officine.map((o) => o.categoria).filter(Boolean))];
  const q = ricerca.toLowerCase().trim();
  const visibili = officine
    .filter((o) => {
      const matchCat = !filtroCategoria || o.categoria === filtroCategoria;
      const matchQ =
        !q ||
        o.nome.toLowerCase().includes(q) ||
        o.specialita.toLowerCase().includes(q) ||
        o.servizi.some((s) => s.toLowerCase().includes(q));
      return matchCat && matchQ;
    })
    .sort((a, b) => {
      // senza posizione non c'è un criterio: si mantiene l'ordine del backend
      const da = distanzaDi(a);
      const db = distanzaDi(b);
      if (da === null || db === null) return 0;
      return sortAsc ? da - db : db - da;
    });

  /* ---------- GPS ---------- */
  const usaGps = () => {
    if (!navigator.geolocation) {
      mostraToast("GPS non supportato dal browser");
      return;
    }
    mostraToast("Localizzazione in corso...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosUtente({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        mapRef.current?.setView([pos.coords.latitude, pos.coords.longitude], 13, { animate: true });
        mostraToast("Posizione rilevata!");
      },
      () => mostraToast("Impossibile rilevare la posizione"),
    );
  };

  /* ---------- prenotazione ---------- */
  const apriModal = () => {
    if (!selezionata) return;
    const oggi = new Date().toISOString().split("T")[0];
    setServizio("");
    setDataPren(oggi);
    setSlot(null);
    setNote("");
    setFeedbackModal(null);
    setModalAperto(true);
  };

  const confermaPrenotazione = async () => {
    if (!selezionata) return;
    if (!servizio || !dataPren || !slot) {
      setFeedbackModal({
        testo: "Errore: Compila tutti i campi obbligatori (Servizio, Data, Orario).",
        errore: true,
      });
      return;
    }
    try {
      await creaPrenotazione({
        officinaId: selezionata.id,
        servizio,
        data: `${dataPren}T${slot}:00`,
        orario: slot,
        note,
      });
      mostraToast("Prenotazione confermata con successo!");
      setModalAperto(false);
      getPrenotazioniUtente()
        .then(setPrenotazioniUtente)
        .catch(() => undefined);
    } catch (err) {
      console.error("Errore durante l'invio della prenotazione:", err);
      setFeedbackModal({ testo: "Impossibile elaborare la prenotazione. Riprova più tardi.", errore: true });
    }
  };

  const annullaPrenotazione = async (p: PrenotazioneUtente) => {
    if (inAnnullamento) return;
    setInAnnullamento(true);
    try {
      await aggiornaStatoPrenotazione(p.id, "annullata");
      mostraToast("Prenotazione annullata");
      setDettaglioPren(null);
      getPrenotazioniUtente()
        .then(setPrenotazioniUtente)
        .catch(() => undefined);
    } catch (err) {
      console.error("Errore durante l'annullamento della prenotazione:", err);
      mostraToast("Impossibile annullare la prenotazione");
    } finally {
      setInAnnullamento(false);
    }
  };

  return (
    <Layout breadcrumb="Cerca Officine" mostraSwitcher={false}>
      <main className="section section-no-top">
        <div className="page-hero">
          <h1 className="section-title-page">
            <i className="fa-solid fa-magnifying-glass" /> Cerca Officina
          </h1>
          <p className="section-subtitle">Trova la migliore officina vicino a te</p>
        </div>

        <div className="search-container">
          <div className="input-group search-bar-wrapper">
            <i className="fa-solid fa-magnifying-glass" style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Tipo di servizio, nome officina..."
              value={ricerca}
              onChange={(e) => setRicerca(e.target.value)}
            />
            <button type="button" className="btn-info-veicolo btn-gps-spec" onClick={usaGps}>
              <i className="fa-solid fa-location-crosshairs" /> GPS
            </button>
          </div>

          <div className="categories-wrapper">
            {categorie.map((cat) => {
              const attivo = filtroCategoria === cat;
              return (
                <span
                  key={cat}
                  className="cerca-storico-tag"
                  style={{
                    cursor: "pointer",
                    background: attivo ? "rgba(249,115,22,0.25)" : undefined,
                    color: attivo ? "#f97316" : undefined,
                  }}
                  onClick={() => setFiltroCategoria(attivo ? null : cat)}
                >
                  <i className={`fa-solid ${ICONE_CATEGORIA[cat] ?? "fa-wrench"}`} /> {cat}
                </span>
              );
            })}
          </div>
        </div>

        <div className="main-grid">
          {/* Colonna sinistra: lista */}
          <div className="left-column">
            <div className="list-meta">
              <span>
                {visibili.length} risultat{visibili.length === 1 ? "o" : "i"}
              </span>
              <span onClick={() => setSortAsc((v) => !v)} style={{ cursor: "pointer" }}>
                {sortAsc ? "Più vicine" : "Più lontane"}{" "}
                <i className={`fa-solid fa-chevron-${sortAsc ? "down" : "up"}`} />
              </span>
            </div>

            {statoLista === "lista" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {visibili.map((o) => {
                  const attiva = selezionata?.id === o.id;
                  const colore = COLORI_AVATAR[o.nome.charCodeAt(0) % COLORI_AVATAR.length];
                  return (
                    <div
                      key={o.id}
                      className="vehicle-result-card"
                      style={{
                        marginTop: 0,
                        cursor: "pointer",
                        transition: "0.2s",
                        background: attiva ? "rgba(249,115,22,0.08)" : "var(--surface)",
                        border: `1px solid ${attiva ? "rgba(249,115,22,0.4)" : "var(--border)"}`,
                      }}
                      onClick={() => setSelezionata(o)}
                    >
                      <div style={{ padding: 16, display: "flex", gap: 14 }}>
                        <div
                          style={{
                            width: 45,
                            height: 45,
                            background: colore,
                            borderRadius: 10,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fff",
                            fontWeight: 800,
                            fontSize: "1.2rem",
                            flexShrink: 0,
                          }}
                        >
                          {o.nome.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 4 }}>
                            <h3
                              style={{
                                margin: 0,
                                fontSize: "0.95rem",
                                color: "var(--text)",
                                fontWeight: 700,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {o.nome}
                            </h3>
                            <span
                              style={{
                                background: o.aperta ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.15)",
                                color: o.aperta ? "#22c55e" : "#f87171",
                                fontSize: "0.7rem",
                                padding: "2px 6px",
                                borderRadius: 4,
                                fontWeight: 700,
                              }}
                            >
                              • {o.aperta ? "Aperta" : "Chiusa"}
                            </span>
                          </div>
                          <p style={{ margin: "2px 0 6px 0", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            {o.specialita}
                          </p>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              fontSize: "0.75rem",
                            }}
                          >
                            <span style={{ color: "#fbbf24" }}>
                              <Stelle valore={o.stelle} />
                              <strong style={{ color: "var(--text)", marginLeft: 2 }}>{o.stelle}</strong>
                              <span style={{ color: "var(--text-muted)" }}>({o.recensioni})</span>
                            </span>
                            <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>
                              {etichettaDistanza(o, "Distanza n.d.")}
                            </span>
                          </div>
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 8 }}>
                            {o.servizi.slice(0, 3).map((s) => (
                              <span
                                key={s}
                                style={{
                                  fontSize: "0.65rem",
                                  background: "var(--surface-2)",
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  color: "var(--text)",
                                }}
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {statoLista === "skeleton" && (
              <div className="skeleton-list-container" style={{ display: "flex" }}>
                <div className="skeleton" style={{ height: 90 }} />
                <div className="skeleton" style={{ height: 90 }} />
                <div className="skeleton" style={{ height: 90 }} />
              </div>
            )}

            {(statoLista === "vuoto" || (statoLista === "lista" && visibili.length === 0)) && (
              <div className="stato-box">
                <i className="fa-solid fa-magnifying-glass" />
                <p style={{ margin: 0 }}>Nessuna officina trovata</p>
              </div>
            )}

            {statoLista === "errore" && (
              <div className="stato-box">
                <i className="fa-solid fa-triangle-exclamation" style={{ color: "#f87171" }} />
                <p style={{ margin: 0, color: "#f87171" }}>Impossibile caricare le officine</p>
                <button type="button" className="btn-info-veicolo btn-retry" onClick={() => void caricaOfficine()}>
                  <i className="fa-solid fa-rotate-right" /> Riprova
                </button>
              </div>
            )}
          </div>

          {/* Colonna destra: mappa + dettaglio */}
          <div className="right-column">
            <div style={{ position: "relative" }}>
              <div id="mappa-leaflet" ref={mapDivRef} />
              <button
                type="button"
                className="btn-open-map"
                onClick={() => {
                  if (!selezionata) return;
                  window.open(
                    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selezionata.indirizzo)}`,
                    "_blank",
                  );
                }}
              >
                <i className="fa-solid fa-arrow-up-right-from-square" style={{ color: "#f97316" }} /> Apri Mappa
              </button>
            </div>

            {selezionata ? (
              <div className="card show detail-box-actual" style={{ display: "flex" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: "1.4rem", color: "var(--text)", fontWeight: 800 }}>
                      {selezionata.nome}
                    </h2>
                    <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                      {selezionata.specialita}
                    </p>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginTop: 6,
                        fontSize: "0.85rem",
                        color: "#fbbf24",
                      }}
                    >
                      <Stelle valore={selezionata.stelle} />
                      <strong style={{ color: "var(--text)", marginLeft: 2 }}>{selezionata.stelle}</strong>
                      <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
                        · {selezionata.recensioni} recensioni
                      </span>
                    </div>
                  </div>
                  <span
                    style={{
                      background: selezionata.aperta ? "rgba(74,222,128,0.12)" : "rgba(248,113,113,0.12)",
                      color: selezionata.aperta ? "#22c55e" : "#f87171",
                      border: `1px solid ${selezionata.aperta ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)"}`,
                      fontSize: "0.75rem",
                      padding: "4px 10px",
                      borderRadius: 6,
                      fontWeight: 700,
                    }}
                  >
                    {selezionata.aperta ? "Aperta ora" : "Chiusa"}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
                  {[
                    { icona: "fa-regular fa-clock", label: "Orario", valore: selezionata.orario },
                    {
                      icona: "fa-solid fa-location-dot",
                      label: "Distanza",
                      valore: etichettaDistanza(selezionata, "Non disponibile"),
                    },
                    { icona: "fa-solid fa-hourglass-half", label: "Disponibilità", valore: selezionata.disponibilita },
                  ].map((box) => (
                    <div
                      key={box.label}
                      style={{
                        background: "var(--surface-2)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        padding: 12,
                        textAlign: "center",
                      }}
                    >
                      <i className={box.icona} style={{ color: "#f97316", fontSize: "1.1rem", marginBottom: 6 }} />
                      <span
                        style={{
                          display: "block",
                          fontSize: "0.6rem",
                          color: "var(--text-muted)",
                          textTransform: "uppercase",
                          fontWeight: 700,
                          letterSpacing: 0.5,
                        }}
                      >
                        {box.label}
                      </span>
                      <span style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text)", marginTop: 2 }}>
                        {box.valore}
                      </span>
                    </div>
                  ))}
                </div>

                <div>
                  <h4
                    style={{
                      margin: "0 0 10px 0",
                      fontSize: "0.75rem",
                      textTransform: "uppercase",
                      color: "var(--text-muted)",
                      letterSpacing: 0.5,
                      fontWeight: 700,
                    }}
                  >
                    Servizi Offerti
                  </h4>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {selezionata.servizi.map((s) => (
                      <span
                        key={s}
                        style={{
                          fontSize: "0.75rem",
                          background: "rgba(249,115,22,0.1)",
                          border: "1px solid rgba(249,115,22,0.2)",
                          padding: "4px 10px",
                          borderRadius: 6,
                          color: "var(--text)",
                        }}
                      >
                        <i className="fa-solid fa-check" style={{ color: "#f97316", marginRight: 4 }} />
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 5 }}>
                  <button
                    type="button"
                    className="btn-aggiungi-garage"
                    style={{ flex: 1, padding: 14 }}
                    onClick={apriModal}
                  >
                    <i className="fa-solid fa-calendar-check" /> Prenota Appuntamento
                  </button>
                  <button
                    type="button"
                    className="btn-landing"
                    title="Chiama"
                    style={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      width: 48,
                      height: 48,
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 12,
                    }}
                    onClick={() => {
                      if (selezionata.telefono) window.location.href = `tel:${selezionata.telefono}`;
                    }}
                  >
                    <i className="fa-solid fa-phone" style={{ color: "#f97316" }} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="card show skeleton-detail-box" style={{ display: "flex" }}>
                <div className="skeleton" style={{ height: 28, width: "60%" }} />
                <div className="skeleton" style={{ height: 16, width: "40%" }} />
                <div className="skeleton-grid-3">
                  <div className="skeleton" style={{ height: 70, borderRadius: 12 }} />
                  <div className="skeleton" style={{ height: 70, borderRadius: 12 }} />
                  <div className="skeleton" style={{ height: 70, borderRadius: 12 }} />
                </div>
                <div className="skeleton" style={{ height: 40 }} />
                <div className="skeleton" style={{ height: 48, borderRadius: 12 }} />
              </div>
            )}
          </div>

          {/* Colonna prenotazioni utente: card minimali, dettagli nell'overlay */}
          <div className="bookings-column">
            <h3 className="bookings-title"> Le mie Prenotazioni</h3>
            <div className="pb-lista">
              {prenotazioniUtente === null ? (
                <div className="stato-box">Caricamento...</div>
              ) : prenotazioniUtente.length === 0 ? (
                <div className="stato-box">Nessuna prenotazione</div>
              ) : (
                prenotazioniUtente.map((p) => {
                  const { servizio: servizioPren } = parseDescrizione(p.descrizione);
                  const stato = p.stato ?? "in_attesa";
                  return (
                    <div
                      key={p.id}
                      className="pb-card"
                      role="button"
                      tabIndex={0}
                      onClick={() => setDettaglioPren(p)}
                      onKeyDown={(e) => e.key === "Enter" && setDettaglioPren(p)}
                    >
                      <span className={`pb-badge pb-badge-${stato}`}>
                        {STATO_LABEL[stato] ?? stato}
                      </span>
                      <p className="pb-officina">{p.officina?.nome ?? "Officina"}</p>
                      <p className="pb-riga">
                        <i className="ti ti-calendar" /> {formattaDataOra(p.dataprenotazione)}
                      </p>
                      <p className="pb-riga">
                        <i className="ti ti-tool" /> {servizioPren}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modal prenotazione */}
      {modalAperto && (
        <div
          id="modal-prenotazione"
          style={{ display: "flex" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalAperto(false);
          }}
        >
          <div className="modal-box">
            <button type="button" className="btn-modal-close" onClick={() => setModalAperto(false)}>
              <i className="fa-solid fa-xmark" />
            </button>

            <div>
              <h2 className="modal-title">
                <i className="fa-solid fa-calendar-check" style={{ color: "#f97316", marginRight: 8 }} />
                Prenota Appuntamento
              </h2>
              <p className="modal-subtitle">{selezionata?.nome}</p>
            </div>

            <div>
              <label className="modal-label">Servizio</label>
              <div className="input-group" style={{ border: "1px solid var(--border)" }}>
                <i className="fa-solid fa-screwdriver-wrench" />
                <select value={servizio} onChange={(e) => setServizio(e.target.value)}>
                  <option value="">Seleziona un servizio...</option>
                  {selezionata?.servizi.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="modal-label">Data</label>
              <div className="input-group" style={{ border: "1px solid var(--border)" }}>
                <i className="fa-regular fa-calendar" />
                <input
                  type="date"
                  value={dataPren}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setDataPren(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="modal-label">Orario</label>
              <div className="modal-slots-container">
                {SLOT_ORARI.map((orario) => (
                  <button
                    key={orario}
                    type="button"
                    className={`slot-btn${slot === orario ? " attivo" : ""}`}
                    onClick={() => setSlot(orario)}
                  >
                    {orario}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="modal-label">Note (opzionale)</label>
              <div className="input-group input-group-textarea" style={{ border: "1px solid var(--border)" }}>
                <i className="fa-regular fa-comment" />
                <textarea
                  rows={2}
                  placeholder="Es. portare a freddo, problema ai freni..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>

            {feedbackModal && (
              <div
                style={{
                  display: "block",
                  padding: "10px 12px",
                  borderRadius: 10,
                  fontSize: "0.85rem",
                  background: feedbackModal.errore ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.15)",
                  color: feedbackModal.errore ? "#f87171" : "#4ade80",
                }}
              >
                {feedbackModal.testo}
              </div>
            )}

            <button
              type="button"
              className="btn-aggiungi-garage btn-confirm-booking"
              onClick={() => void confermaPrenotazione()}
            >
              <i className="fa-solid fa-check" /> Conferma Prenotazione
            </button>
          </div>
        </div>
      )}

      {/* Overlay dettagli prenotazione */}
      {dettaglioPren &&
        (() => {
          const { servizio: servizioPren, note: notePren } = parseDescrizione(dettaglioPren.descrizione);
          const stato = dettaglioPren.stato ?? "in_attesa";
          const annullabile = stato === "in_attesa" || stato === "confermata";
          return (
            <div className="pb-overlay" onClick={() => setDettaglioPren(null)}>
              <div className="pb-modal" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="pb-modal-close"
                  aria-label="Chiudi"
                  onClick={() => setDettaglioPren(null)}
                >
                  <i className="ti ti-x" />
                </button>

                <div className="pb-modal-head">
                  <h3 className="pb-modal-nome">{dettaglioPren.officina?.nome ?? "Officina"}</h3>
                  <span className={`pb-badge pb-badge-${stato}`}>{STATO_LABEL[stato] ?? stato}</span>
                </div>

                <div className="pb-modal-info">
                  {dettaglioPren.officina?.indirizzo && (
                    <p className="pb-riga">
                      <i className="ti ti-map-pin" /> {dettaglioPren.officina.indirizzo}
                    </p>
                  )}
                  <p className="pb-riga">
                    <i className="ti ti-calendar" /> {formattaDataOra(dettaglioPren.dataprenotazione)}
                  </p>
                  <p className="pb-riga">
                    <i className="ti ti-tool" /> {servizioPren}
                  </p>
                  {notePren && (
                    <p className="pb-riga">
                      <i className="ti ti-note" /> {notePren}
                    </p>
                  )}
                </div>

                <div className="pb-storico">
                  <p className="pb-storico-label">Storico stato</p>
                  {storicoStati(stato).map((s) => (
                    <div key={s} className="pb-storico-step">
                      <span className={`pb-storico-icona pb-badge-${s}`}>
                        <i className={`ti ${STATO_ICONA[s] ?? "ti-clock"}`} />
                      </span>
                      <span>{STATO_LABEL[s] ?? s}</span>
                    </div>
                  ))}
                </div>

                {annullabile && (
                  <div className="pb-modal-btns">
                    <button
                      type="button"
                      className="pb-btn-annulla"
                      disabled={inAnnullamento}
                      onClick={() => void annullaPrenotazione(dettaglioPren)}
                    >
                      {inAnnullamento ? "Annullamento..." : "Annulla prenotazione"}
                    </button>
                    <button
                      type="button"
                      className="pb-btn-chiudi"
                      onClick={() => setDettaglioPren(null)}
                    >
                      Chiudi
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

      {toast && (
        <div id="toast" style={{ display: "block", background: "#22c55e" }}>
          {toast}
        </div>
      )}
    </Layout>
  );
}

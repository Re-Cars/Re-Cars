"use client";

import type * as Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  Meccanica: "ti-tool",
  Carrozzeria: "ti-car-crash",
  Elettrico: "ti-bolt",
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

const STATO_LABEL_PLURALE: Record<string, string> = {
  in_attesa: "In attesa",
  confermata: "Confermate",
  annullata: "Annullate",
  completata: "Completate",
};

/** Colori di stato: ambra in attesa, verde confermata, azzurro completata, rosso annullata. */
const COLORE_STATO: Record<string, string> = {
  in_attesa: "#f59e0b",
  confermata: "#22c55e",
  completata: "#38a3d1",
  annullata: "#ef4444",
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

type Vista = "prenotazioni" | "officine";
type FiltroStato = "tutte" | "in_attesa" | "confermata" | "completata" | "annullata";

const MESI_BREVI = ["GEN", "FEB", "MAR", "APR", "MAG", "GIU", "LUG", "AGO", "SET", "OTT", "NOV", "DIC"];
const GIORNI_BREVI = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
const STATI_FILTRO: FiltroStato[] = ["in_attesa", "confermata", "completata", "annullata"];

/** Giorni interi da oggi alla data (negativi se passata). */
function giorniDa(iso: string): number {
  const d = new Date(iso);
  const oggi = new Date();
  d.setHours(0, 0, 0, 0);
  oggi.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - oggi.getTime()) / 86_400_000);
}

function etichettaTra(giorni: number): string {
  if (giorni === 0) return "oggi";
  if (giorni === 1) return "domani";
  return `tra ${giorni} giorni`;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

/** File .ics di un appuntamento (durata indicativa di un'ora), scaricato dal browser. */
function scaricaIcs(p: PrenotazioneUtente, servizio: string) {
  const inizio = new Date(p.dataprenotazione);
  const fine = new Date(inizio.getTime() + 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const esc = (s: string) => s.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//RE|CARS//Prenotazioni//IT",
    "BEGIN:VEVENT",
    `UID:recars-prenotazione-${p.id}@recars`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(inizio)}`,
    `DTEND:${fmt(fine)}`,
    `SUMMARY:${esc(`${servizio} · ${p.officina?.nome ?? "Officina"}`)}`,
    p.officina?.indirizzo ? `LOCATION:${esc(p.officina.indirizzo)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `recars-prenotazione-${p.id}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

const urlIndicazioni = (indirizzo: string) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(indirizzo)}`;

/**
 * Prenotazioni: hero con contatori e le due viste della pagina,
 * "Le mie prenotazioni" (mappa con gli appuntamenti + prossimo appuntamento
 * e lista compatta per stato) e "Trova officina" (ricerca, GPS con distanza
 * reale, mappa + scheda dell'officina selezionata e prenotazione).
 */
export default function PrenotazioniPage() {
  const [vista, setVista] = useState<Vista>("prenotazioni");
  const [officine, setOfficine] = useState<Officina[]>([]);
  const [statoLista, setStatoLista] = useState<StatoLista>("skeleton");
  const [ricerca, setRicerca] = useState("");
  const [ricercaPren, setRicercaPren] = useState("");
  const [filtroStato, setFiltroStato] = useState<FiltroStato>("tutte");
  const [filtroCategoria, setFiltroCategoria] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [selezionata, setSelezionata] = useState<Officina | null>(null);
  const [prenSelezionataId, setPrenSelezionataId] = useState<number | null>(null);
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
  const livelloRef = useRef<Leaflet.LayerGroup | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const [mappaPronta, setMappaPronta] = useState(false);

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

  const caricaPrenotazioni = useCallback(() => {
    getPrenotazioniUtente()
      .then(setPrenotazioniUtente)
      .catch(() => setPrenotazioniUtente((p) => p ?? []));
  }, []);

  useEffect(() => {
    void caricaOfficine();
    caricaPrenotazioni();
  }, [caricaOfficine, caricaPrenotazioni]);

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

  /* ---------- distanza ---------- */
  /** Distanza officina-utente in km, null senza posizione GPS. */
  const distanzaDi = useCallback(
    (o: Officina): number | null => (posUtente ? distanzaKm(posUtente.lat, posUtente.lng, o.lat, o.lng) : null),
    [posUtente],
  );

  /** Etichetta distanza: mai "0 km" quando la posizione non è disponibile. */
  const etichettaDistanza = (o: Officina, assente: string): string => {
    const km = distanzaDi(o);
    return km === null ? assente : formattaKm(km);
  };

  /* ---------- prenotazioni: ordinamento, filtri, prossimo appuntamento ---------- */
  const tutte = useMemo(
    () =>
      [...(prenotazioniUtente ?? [])].sort(
        (a, b) => new Date(a.dataprenotazione).getTime() - new Date(b.dataprenotazione).getTime(),
      ),
    [prenotazioniUtente],
  );
  const contaStato = (s: string) => tutte.filter((p) => (p.stato ?? "in_attesa") === s).length;
  const future = tutte.filter(
    (p) => giorniDa(p.dataprenotazione) >= 0 && p.stato !== "annullata" && p.stato !== "completata",
  );
  const prossima =
    future.find((p) => p.stato === "confermata") ?? future.find((p) => p.stato === "in_attesa") ?? null;

  const qPren = ricercaPren.toLowerCase().trim();
  const prenFiltrate = tutte
    .filter((p) => filtroStato === "tutte" || (p.stato ?? "in_attesa") === filtroStato)
    .filter(
      (p) =>
        !qPren ||
        [p.officina?.nome, p.officina?.indirizzo, parseDescrizione(p.descrizione).servizio].some((t) =>
          t?.toLowerCase().includes(qPren),
        ),
    );
  const prenProssime = prenFiltrate.filter((p) => giorniDa(p.dataprenotazione) >= 0);
  // le passate dalla più recente
  const prenPassate = prenFiltrate.filter((p) => giorniDa(p.dataprenotazione) < 0).reverse();

  const inEvidenza =
    tutte.find((p) => p.id === prenSelezionataId) ?? prossima ?? tutte[tutte.length - 1] ?? null;

  /* ---------- officine: filtri / ordinamento ---------- */
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

  /* ---------- mappa Leaflet (import dinamico, client-only) ---------- */
  useEffect(() => {
    let smontato = false;
    void (async () => {
      if (!mapDivRef.current || mapRef.current) return;
      leafletRef.current ??= await import("leaflet");
      if (smontato || !mapDivRef.current) return;
      const L = leafletRef.current;
      mapRef.current = L.map(mapDivRef.current, { zoomControl: true, scrollWheelZoom: false }).setView(
        [41.9, 12.5],
        6,
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(mapRef.current);
      livelloRef.current = L.layerGroup().addTo(mapRef.current);
      setMappaPronta(true);
    })();
    return () => {
      smontato = true;
    };
  }, []);

  // distruggi la mappa allo smontaggio della pagina
  useEffect(
    () => () => {
      mapRef.current?.remove();
      mapRef.current = null;
    },
    [],
  );

  // la mappa si ridisegna quando cambiano gli id mostrati, non a ogni array ricreato dal render
  const idPrenMostrate = prenFiltrate.map((p) => p.id).join(",");
  const idOfficineMostrate = visibili.map((o) => o.id).join(",");

  // pin: appuntamenti (colore dello stato, giorno del mese) oppure officine
  useEffect(() => {
    const L = leafletRef.current;
    const mappa = mapRef.current;
    const livello = livelloRef.current;
    if (!mappaPronta || !L || !mappa || !livello) return;
    livello.clearLayers();

    const pin = (colore: string, testo: string, grande: boolean) =>
      L.divIcon({
        className: "",
        html: `<div class="pr-pin${grande ? " grande" : ""}" style="--c:${colore}"><b>${escapeHtml(testo)}</b></div>`,
        iconSize: grande ? [44, 44] : [34, 34],
        iconAnchor: grande ? [22, 44] : [17, 34],
        popupAnchor: [0, grande ? -44 : -34],
      });

    // centra il punto a destra della scheda flottante (in basso a sinistra), non sotto
    const centraAccanto = (lat: number, lng: number, zoom: number) => {
      mappa.setView([lat, lng], zoom, { animate: false });
      const w = mappa.getSize().x;
      if (w > 700) mappa.panBy([-Math.min(230, w / 5), 60], { animate: false });
    };

    const punti: [number, number][] = [];
    if (posUtente) {
      L.marker([posUtente.lat, posUtente.lng], {
        icon: L.divIcon({ className: "", html: '<div class="pr-io"></div>', iconSize: [16, 16], iconAnchor: [8, 8] }),
        title: "La tua posizione",
      }).addTo(livello);
    }

    if (vista === "prenotazioni") {
      for (const p of prenFiltrate) {
        const o = officine.find((x) => x.id === p.id_officina);
        if (!o) continue;
        const stato = p.stato ?? "in_attesa";
        const grande = p.id === inEvidenza?.id;
        L.marker([o.lat, o.lng], {
          icon: pin(COLORE_STATO[stato] ?? "#f97316", String(new Date(p.dataprenotazione).getDate()), grande),
          zIndexOffset: grande ? 1000 : 0,
        })
          .on("click", () => setPrenSelezionataId(p.id))
          .addTo(livello);
        punti.push([o.lat, o.lng]);
      }
      const o = inEvidenza ? officine.find((x) => x.id === inEvidenza.id_officina) : null;
      if (o) centraAccanto(o.lat, o.lng, 13);
      else if (punti.length) mappa.fitBounds(punti, { padding: [40, 40], maxZoom: 13 });
    } else {
      for (const o of visibili) {
        const grande = o.id === selezionata?.id;
        L.marker([o.lat, o.lng], {
          icon: pin("#f97316", o.nome.charAt(0).toUpperCase(), grande),
          zIndexOffset: grande ? 1000 : 0,
        })
          .on("click", () => setSelezionata(o))
          .addTo(livello);
      }
      if (selezionata) centraAccanto(selezionata.lat, selezionata.lng, 14);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mappaPronta, vista, officine, posUtente, selezionata?.id, inEvidenza?.id, idPrenMostrate, idOfficineMostrate]);

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
      caricaPrenotazioni();
      setVista("prenotazioni");
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
      caricaPrenotazioni();
    } catch (err) {
      console.error("Errore durante l'annullamento della prenotazione:", err);
      mostraToast("Impossibile annullare la prenotazione");
    } finally {
      setInAnnullamento(false);
    }
  };

  /* ---------- sottoviste ---------- */
  const rigaPrenotazione = (p: PrenotazioneUtente) => {
    const stato = p.stato ?? "in_attesa";
    const d = new Date(p.dataprenotazione);
    const giorni = giorniDa(p.dataprenotazione);
    const { servizio: servizioPren } = parseDescrizione(p.descrizione);
    const ora = d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
    return (
      <article
        key={p.id}
        className={`pr-row${giorni < 0 ? " passata" : ""}${p.id === inEvidenza?.id ? " attiva" : ""}`}
        style={{ ["--c" as string]: COLORE_STATO[stato] ?? "#f97316" }}
        role="button"
        tabIndex={0}
        onClick={() => setPrenSelezionataId(p.id)}
        onKeyDown={(e) => e.key === "Enter" && setPrenSelezionataId(p.id)}
      >
        <div className="pr-data">
          <span>{MESI_BREVI[d.getMonth()]}</span>
          <b>{String(d.getDate()).padStart(2, "0")}</b>
        </div>
        <div className="pr-main">
          <div className="pr-nome">{p.officina?.nome ?? "Officina"}</div>
          <div className="pr-sub">
            {servizioPren} · {ora}
          </div>
          <div className="pr-meta">
            <span className="pr-stato">
              <i className={`ti ${STATO_ICONA[stato] ?? "ti-clock"}`} />
              {STATO_LABEL[stato] ?? stato}
            </span>
            {giorni >= 0 && stato !== "annullata" && <span className="pr-tra">{etichettaTra(giorni)}</span>}
          </div>
        </div>
        <button
          type="button"
          className="pr-mini-btn"
          onClick={(e) => {
            e.stopPropagation();
            setDettaglioPren(p);
          }}
        >
          Dettagli
        </button>
      </article>
    );
  };

  const schedaInEvidenza = () => {
    if (!inEvidenza) return null;
    const stato = inEvidenza.stato ?? "in_attesa";
    const d = new Date(inEvidenza.dataprenotazione);
    const giorni = giorniDa(inEvidenza.dataprenotazione);
    const { servizio: servizioPren } = parseDescrizione(inEvidenza.descrizione);
    const o = officine.find((x) => x.id === inEvidenza.id_officina);
    const km = o ? distanzaDi(o) : null;
    const quando = `${GIORNI_BREVI[d.getDay()]} ${d.getDate()} ${MESI_BREVI[d.getMonth()].toLowerCase()} alle ${d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`;
    return (
      <div className="pr-float">
        <div className="pr-float-top">
          <span className="pr-float-lbl">
            {inEvidenza.id === prossima?.id ? "Prossimo appuntamento" : "Prenotazione selezionata"}
          </span>
          <span className="pr-stato" style={{ ["--c" as string]: COLORE_STATO[stato] ?? "#f97316" }}>
            <i className={`ti ${STATO_ICONA[stato] ?? "ti-clock"}`} />
            {STATO_LABEL[stato] ?? stato}
          </span>
        </div>
        {giorni >= 0 ? (
          <div className="pr-countdown">
            <b>{giorni === 0 ? "Oggi" : giorni}</b>
            <span>{giorni === 0 ? quando : `${giorni === 1 ? "giorno" : "giorni"} · ${quando}`}</span>
          </div>
        ) : (
          <div className="pr-countdown passato">
            <span>{quando}</span>
          </div>
        )}
        <h3>{inEvidenza.officina?.nome ?? "Officina"}</h3>
        <div className="pr-float-riga">
          <i className="ti ti-tool" />
          {servizioPren}
        </div>
        {inEvidenza.officina?.indirizzo && (
          <div className="pr-float-riga">
            <i className="ti ti-map-pin" />
            <span className="pr-ellissi">
              {inEvidenza.officina.indirizzo}
              {km !== null ? ` · ${formattaKm(km)}` : ""}
            </span>
          </div>
        )}
        <div className="pr-float-btns">
          {giorni >= 0 && stato !== "annullata" && (
            <button type="button" className="btn-dash btn-dash-ghost" onClick={() => scaricaIcs(inEvidenza, servizioPren)}>
              <i className="ti ti-calendar-plus" />
              <span>Calendario</span>
            </button>
          )}
          {inEvidenza.officina?.telefono && (
            <a className="btn-dash btn-dash-ghost" href={`tel:${inEvidenza.officina.telefono}`}>
              <i className="ti ti-phone" />
              <span>Chiama</span>
            </a>
          )}
          {inEvidenza.officina?.indirizzo && (
            <a
              className="btn-dash btn-dash-primary"
              href={urlIndicazioni(inEvidenza.officina.indirizzo)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="ti ti-route" />
              <span>Indicazioni</span>
            </a>
          )}
        </div>
      </div>
    );
  };

  const schedaOfficina = () => {
    if (!selezionata) return null;
    return (
      <div className="pr-float">
        <div className="pr-float-top">
          <span className="pr-float-lbl">{selezionata.specialita}</span>
          <span className="pr-stato" style={{ ["--c" as string]: selezionata.aperta ? "var(--iv-ok)" : "var(--iv-bad)" }}>
            {selezionata.aperta ? "Aperta ora" : "Chiusa"}
          </span>
        </div>
        <h3>{selezionata.nome}</h3>
        <div className="pr-stelle">
          <Stelle valore={selezionata.stelle} />
          <b>{selezionata.stelle}</b>
          <span>· {selezionata.recensioni} recensioni</span>
        </div>
        <div className="pr-float-riga">
          <i className="ti ti-map-pin" />
          <span className="pr-ellissi">
            {selezionata.indirizzo} · {etichettaDistanza(selezionata, "distanza non disponibile")}
          </span>
        </div>
        <div className="pr-float-riga">
          <i className="ti ti-clock" />
          {selezionata.orario} · disponibilità {selezionata.disponibilita.toLowerCase()}
        </div>
        <div className="pr-servizi">
          {selezionata.servizi.slice(0, 6).map((s) => (
            <span key={s}>{s}</span>
          ))}
        </div>
        <div className="pr-float-btns">
          {selezionata.telefono && (
            <a className="btn-dash btn-dash-ghost" href={`tel:${selezionata.telefono}`}>
              <i className="ti ti-phone" />
              <span>Chiama</span>
            </a>
          )}
          <button type="button" className="btn-dash btn-dash-primary" onClick={apriModal}>
            <i className="ti ti-calendar-plus" />
            <span>Prenota</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <Layout breadcrumb="Prenotazioni">
      <main className="pg pren">
        <section className="pg-hero">
          <div className="pg-hero-ttl">
            <h1>
              <i className="ti ti-calendar-event" />
              {vista === "prenotazioni" ? "Le mie prenotazioni" : "Trova officina"}
            </h1>
            <div className="pr-stats">
              <span style={{ ["--c" as string]: "var(--accent)" }}>
                <b>{future.length}</b> in programma
              </span>
              <span style={{ ["--c" as string]: COLORE_STATO.in_attesa }}>
                <b>{contaStato("in_attesa")}</b> in attesa di conferma
              </span>
              <span style={{ ["--c" as string]: COLORE_STATO.completata }}>
                <b>{contaStato("completata")}</b> completate
              </span>
            </div>
          </div>
          <div className="pg-hero-cta">
            {vista === "prenotazioni" ? (
              <button type="button" className="btn-dash btn-dash-primary" onClick={() => setVista("officine")}>
                <i className="ti ti-plus" />
                Nuova prenotazione
              </button>
            ) : (
              <button type="button" className="btn-dash btn-dash-glass" onClick={() => setVista("prenotazioni")}>
                <i className="ti ti-list-details" />
                Le mie prenotazioni
              </button>
            )}
          </div>
        </section>

        {vista === "prenotazioni" ? (
          <div className="pr-toolbar">
            <div className="pg-search">
              <i className="ti ti-search" />
              <input
                value={ricercaPren}
                onChange={(e) => setRicercaPren(e.target.value)}
                placeholder="Cerca officina, servizio o indirizzo…"
              />
            </div>
            <div className="pr-chips">
              <button
                type="button"
                className={`pg-chip${filtroStato === "tutte" ? " on" : ""}`}
                onClick={() => setFiltroStato("tutte")}
              >
                <i className="ti ti-filter" />
                Tutte <small>{tutte.length}</small>
              </button>
              {STATI_FILTRO.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`pg-chip${filtroStato === s ? " on" : ""}`}
                  style={{ ["--c" as string]: COLORE_STATO[s] }}
                  onClick={() => setFiltroStato(s)}
                >
                  <span className="pg-dot" />
                  {STATO_LABEL_PLURALE[s]} <small>{contaStato(s)}</small>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="pr-toolbar">
            <div className="pg-search">
              <i className="ti ti-search" />
              <input
                value={ricerca}
                onChange={(e) => setRicerca(e.target.value)}
                placeholder="Tipo di servizio, nome officina…"
              />
            </div>
            <div className="pr-chips">
              <button type="button" className="pg-chip" onClick={usaGps}>
                <i className="ti ti-current-location" />
                {posUtente ? "Aggiorna posizione" : "Usa la mia posizione"}
              </button>
              {categorie.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`pg-chip${filtroCategoria === cat ? " on" : ""}`}
                  onClick={() => setFiltroCategoria(filtroCategoria === cat ? null : cat)}
                >
                  <i className={`ti ${ICONE_CATEGORIA[cat] ?? "ti-tool"}`} />
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="pr-grid">
          <section className="pr-mapbox">
            <div ref={mapDivRef} className="pr-map" />
            {vista === "prenotazioni" ? schedaInEvidenza() : schedaOfficina()}
            {vista === "prenotazioni" && prenotazioniUtente !== null && tutte.length === 0 && (
              <div className="pr-vuoto">
                <i className="ti ti-calendar-plus" />
                <h2>Nessuna prenotazione, per ora</h2>
                <p>Quando prenoti un intervento lo trovi qui, con lo stato aggiornato dall&apos;officina.</p>
                <button type="button" className="btn-dash btn-dash-primary" onClick={() => setVista("officine")}>
                  <i className="ti ti-map-pin" />
                  Trova un&apos;officina vicina
                </button>
              </div>
            )}
          </section>

          <aside className="pg-card pr-lista">
            {vista === "prenotazioni" ? (
              <>
                <div className="pg-card-h">
                  <h2 className="dash-title">
                    <i className="ti ti-list-details" />
                    Prenotazioni
                  </h2>
                  <span className="dash-count">{prenFiltrate.length}</span>
                </div>
                <div className="pr-lista-body">
                  {prenotazioniUtente === null && <div className="pr-nores">Caricamento…</div>}
                  {prenProssime.length > 0 && (
                    <>
                      <div className="pr-gruppo">Prossime · {prenProssime.length}</div>
                      {prenProssime.map(rigaPrenotazione)}
                    </>
                  )}
                  {prenPassate.length > 0 && (
                    <>
                      <div className="pr-gruppo">Passate · {prenPassate.length}</div>
                      {prenPassate.map(rigaPrenotazione)}
                    </>
                  )}
                  {prenotazioniUtente !== null && prenFiltrate.length === 0 && (
                    <div className="pr-nores">
                      {tutte.length === 0 ? "Ancora nessuna prenotazione." : "Nessuna prenotazione corrisponde ai filtri."}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="pg-card-h">
                  <h2 className="dash-title">
                    <i className="ti ti-building-store" />
                    Officine
                  </h2>
                  <span className="dash-count">{visibili.length}</span>
                  {posUtente && (
                    <button type="button" className="pr-ordina" onClick={() => setSortAsc((v) => !v)}>
                      <i className={`ti ${sortAsc ? "ti-sort-ascending" : "ti-sort-descending"}`} />
                      {sortAsc ? "Più vicine" : "Più lontane"}
                    </button>
                  )}
                </div>
                <div className="pr-lista-body">
                  {statoLista === "skeleton" &&
                    [0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 14, marginBottom: 8 }} />)}
                  {statoLista === "errore" && (
                    <div className="pr-nores">
                      Impossibile caricare le officine.{" "}
                      <button type="button" className="pr-mini-btn" onClick={() => void caricaOfficine()}>
                        Riprova
                      </button>
                    </div>
                  )}
                  {(statoLista === "vuoto" || (statoLista === "lista" && visibili.length === 0)) && (
                    <div className="pr-nores">Nessuna officina trovata.</div>
                  )}
                  {statoLista === "lista" &&
                    visibili.map((o) => (
                      <article
                        key={o.id}
                        className={`pr-off${selezionata?.id === o.id ? " attiva" : ""}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelezionata(o)}
                        onKeyDown={(e) => e.key === "Enter" && setSelezionata(o)}
                      >
                        <span className="pr-off-av" style={{ background: COLORI_AVATAR[o.nome.charCodeAt(0) % COLORI_AVATAR.length] }}>
                          {o.nome.charAt(0).toUpperCase()}
                        </span>
                        <div className="pr-main">
                          <div className="pr-nome">{o.nome}</div>
                          <div className="pr-sub">{o.specialita}</div>
                          <div className="pr-meta">
                            <span className="pr-stelline">
                              <i className="ti ti-star-filled" />
                              {o.stelle} ({o.recensioni})
                            </span>
                            <span className="pr-km">{etichettaDistanza(o, "distanza n.d.")}</span>
                          </div>
                        </div>
                      </article>
                    ))}
                </div>
              </>
            )}
          </aside>
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

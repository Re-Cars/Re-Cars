"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import Layout from "@/components/Layout";
import VeicoloPicker from "@/components/VeicoloPicker";
import { useAuth } from "@/context/AuthContext";
import {
  aggiornaIntervento,
  ApiError,
  cercaCitta,
  creaIntervento,
  eliminaIntervento,
  getInterventiVeicolo,
  getVeicolo,
} from "@/lib/api";
import { catLabel, costruisciDocumentoPdf, type PdfPeriodo } from "@/lib/pdf-report";
import type { CategoriaIntervento, Citta, Intervento, VeicoloDettaglio } from "@/lib/types";
import "@/styles/storico-intervento.css";

const TIPI_INTERVENTO: Record<CategoriaIntervento, string[]> = {
  ordinario: ["Benzina", "Cambio olio", "Cambio tergicristalli", "Gomme", "Batteria", "Controllo livelli", "Pastiglie freni", "Liquido freni", "Liquido raffreddamento", "Filtri motore", "Pulizia iniettori", "Tagliando", "Altro"],
  straordinario: ["Cinghia distribuzione", "Carrozzeria", "Riparazioni", "Impianto elettrico", "Luci", "Frizione", "Ammortizzatori", "Radiatore", "Sensori", "Compressore clima", "Marmitta", "Altro"],
  gestione: ["Assicurazione", "Bollo", "Revisione", "Multa", "Pedaggi", "Parcheggio"],
  annotazioni: ["Problemi", "luci", "motore", "elettrico", "rumori", "altro"],
};

const FILTRI: { id: string; label: string; dot?: string; classe: string }[] = [
  { id: "all", label: "Tutti", classe: "active-all" },
  { id: "ordinario", label: "Ordinario", dot: "#2b88b8", classe: "active-ordinario" },
  { id: "straordinario", label: "Straordinario", dot: "#ef4444", classe: "active-straordinario" },
  { id: "annotazioni", label: "Annotazione problemi", dot: "#f8782f", classe: "active-annotazioni" },
  { id: "gestione", label: "Spese di gestione", dot: "#22c55e", classe: "active-gestione" },
];

interface FormIntervento {
  data: string;
  categoria: CategoriaIntervento | "";
  tipo: string;
  descrizione: string;
  mediante: string;
  costo: string;
  /** Nome della città (facoltativa), scelto dai suggerimenti di GET /citta. */
  citta: string;
}

const FORM_VUOTO: FormIntervento = {
  data: "",
  categoria: "",
  tipo: "",
  descrizione: "",
  mediante: "",
  costo: "",
  citta: "",
};

const MESI_BREVI = ["G", "F", "M", "A", "M", "G", "L", "A", "S", "O", "N", "D"];
const NOMI_MESI = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
const COLORE_CATEGORIA: Record<CategoriaIntervento, string> = {
  ordinario: "#2b88b8",
  straordinario: "#ef4444",
  annotazioni: "#f8782f",
  gestione: "#22c55e",
};

const euro = (n: number) =>
  `€ ${n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Storico interventi del veicolo attivo: tabella con filtri per categoria,
 * CRUD (aggiungi/modifica/elimina), riepilogo spese mese/anno e report PDF.
 */
export default function StoricoInterventiPage() {
  const { veicoloAttivo, gestisci401 } = useAuth();
  const [interventi, setInterventi] = useState<Intervento[]>([]);
  const [filtro, setFiltro] = useState("all");
  const [ricerca, setRicerca] = useState("");
  const [annoCosti, setAnnoCosti] = useState(String(new Date().getFullYear()));
  const [cittaSuggerite, setCittaSuggerite] = useState<Citta[]>([]);
  const costiRef = useRef<HTMLElement>(null);
  const [dettaglioVeicolo, setDettaglioVeicolo] = useState<VeicoloDettaglio | null>(null);

  // modali
  const [modalNuovo, setModalNuovo] = useState(false);
  const [form, setForm] = useState<FormIntervento>(FORM_VUOTO);
  const [idInModifica, setIdInModifica] = useState<number | null>(null);
  const [modalPdf, setModalPdf] = useState(false);
  const [pdfAnno, setPdfAnno] = useState(String(new Date().getFullYear()));
  const [pdfMese, setPdfMese] = useState<PdfPeriodo>("all");
  const [pdfFiltro, setPdfFiltro] = useState("all");
  const [pdfInfoVeicolo, setPdfInfoVeicolo] = useState(true);
  const [pdfCostoGenerale, setPdfCostoGenerale] = useState(true);
  const [pdfCronologia, setPdfCronologia] = useState(true);

  /* ---------- caricamento (si ripete al cambio veicolo dallo switcher) ---------- */
  const carica = useCallback(async () => {
    if (!veicoloAttivo) return;
    try {
      const [dataInterventi, dataVeicolo] = await Promise.all([
        getInterventiVeicolo(veicoloAttivo.id),
        getVeicolo(veicoloAttivo.id),
      ]);
      setInterventi(dataInterventi.map((i) => ({ ...i, data: i.data.substring(0, 10) })));
      setDettaglioVeicolo(dataVeicolo);
    } catch (err) {
      if (!gestisci401(err)) console.error("Errore caricamento interventi:", err);
    }
  }, [veicoloAttivo, gestisci401]);

  useEffect(() => {
    void carica();
  }, [carica]);

  // la card "Costi di gestione" della dashboard porta qui con #costi
  useEffect(() => {
    if (interventi.length && window.location.hash === "#costi") {
      costiRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [interventi.length]);

  const q = ricerca.trim().toLowerCase();
  const filtrati = interventi
    .filter((i) => filtro === "all" || i.categoria === filtro)
    .filter(
      (i) =>
        !q ||
        [i.tipo, i.descrizione, i.mediante, i.citta?.nome].some((t) => t?.toLowerCase().includes(q)),
    );

  /* ---------- riepilogo spese ---------- */
  const oggi = new Date();
  let totMese = 0;
  let totAnno = 0;
  for (const item of interventi) {
    const costo = Number(item.costo) || 0;
    if (!costo) continue;
    const [anno, mese] = item.data.split("-").map(Number);
    if (anno === oggi.getFullYear()) {
      totAnno += costo;
      if (mese - 1 === oggi.getMonth()) totMese += costo;
    }
  }

  /* ---------- CRUD ---------- */
  const apriNuovo = () => {
    setIdInModifica(null);
    setForm({ ...FORM_VUOTO, data: new Date().toISOString().split("T")[0] });
    setModalNuovo(true);
  };

  const apriModifica = (item: Intervento) => {
    setIdInModifica(item.id);
    setForm({
      data: item.data,
      categoria: item.categoria,
      tipo: item.tipo,
      descrizione: item.descrizione ?? "",
      mediante: item.mediante ?? "",
      costo: item.costo ? String(item.costo) : "",
      citta: item.citta?.nome ?? "",
    });
    setModalNuovo(true);
  };

  const salva = async () => {
    if (!form.data || !form.categoria || !form.tipo) {
      alert("Data, categoria e tipo intervento sono obbligatori.");
      return;
    }
    if (!veicoloAttivo) {
      alert("Nessun veicolo attivo selezionato.");
      return;
    }
    // la città è facoltativa, ma se scritta deve essere una di quelle in anagrafica
    let siglaCitta: string | null = null;
    const nomeCitta = form.citta.trim().toLowerCase();
    if (nomeCitta) {
      let trovata = cittaSuggerite.find((c) => c.nome.toLowerCase() === nomeCitta);
      if (!trovata && nomeCitta.length >= 2) {
        try {
          trovata = (await cercaCitta(nomeCitta)).find((c) => c.nome.toLowerCase() === nomeCitta);
        } catch {
          /* gestito sotto come città non valida */
        }
      }
      if (!trovata) {
        alert("Città non riconosciuta: sceglila dall'elenco dei suggerimenti.");
        return;
      }
      siglaCitta = trovata.sigla;
    }
    const payload = {
      data: form.data,
      categoria: form.categoria,
      tipo: form.tipo,
      descrizione: form.descrizione || null,
      mediante: form.mediante || null,
      costo: Number.parseFloat(form.costo) || null,
      sigla_citta: siglaCitta,
    };
    try {
      if (idInModifica === null) {
        const nuovo = await creaIntervento({ ...payload, id_veicolo: veicoloAttivo.id });
        setInterventi((lista) => [{ ...nuovo, data: nuovo.data.substring(0, 10) }, ...lista]);
      } else {
        const aggiornato = await aggiornaIntervento(idInModifica, payload);
        setInterventi((lista) =>
          lista.map((i) =>
            i.id === idInModifica ? { ...aggiornato, data: aggiornato.data.substring(0, 10) } : i,
          ),
        );
      }
      setModalNuovo(false);
    } catch (err) {
      if (gestisci401(err)) return;
      alert(err instanceof ApiError ? err.message : "Errore durante il salvataggio. Riprova.");
    }
  };

  const elimina = async (id: number) => {
    if (!confirm("Eliminare questo intervento?")) return;
    try {
      await eliminaIntervento(id);
      setInterventi((lista) => lista.filter((i) => i.id !== id));
    } catch (err) {
      if (!gestisci401(err)) alert("Errore durante l'eliminazione. Riprova.");
    }
  };

  /* ---------- PDF ---------- */
  const anniDisponibili = [
    ...new Set([...interventi.map((i) => i.data.substring(0, 4)), String(oggi.getFullYear())]),
  ].sort((a, b) => Number(b) - Number(a));

  const generaPdf = async (anteprima: boolean) => {
    const { doc, nomeFile } = await costruisciDocumentoPdf(interventi, {
      anno: pdfAnno,
      mese: pdfMese,
      filtroCategoria: pdfFiltro,
      includiInfoVeicolo: pdfInfoVeicolo,
      includiCostoGenerale: pdfCostoGenerale,
      includiCronologia: pdfCronologia,
      nomeVeicolo: veicoloAttivo?.nome ?? "—",
      targa: veicoloAttivo?.targa ?? "—",
      veicolo: dettaglioVeicolo,
    });
    if (anteprima) {
      const finestra = window.open(doc.output("bloburl"), "_blank");
      if (!finestra) {
        alert("Il browser ha bloccato l'apertura dell'anteprima. Consenti i popup per questo sito e riprova.");
      }
    } else {
      doc.save(nomeFile);
      setModalPdf(false);
    }
  };

  const nomiForm = form.categoria ? TIPI_INTERVENTO[form.categoria] : [];

  /* ---------- KPI e costi di gestione ---------- */
  const annoCorrente = oggi.getFullYear();
  const interventiAnno = interventi.filter((i) => i.data.startsWith(String(annoCorrente))).length;
  const totAnnoPrec = interventi
    .filter((i) => i.data.startsWith(String(annoCorrente - 1)))
    .reduce((somma, i) => somma + (Number(i.costo) || 0), 0);
  const variazione = totAnnoPrec > 0 ? Math.round(((totAnno - totAnnoPrec) / totAnnoPrec) * 100) : null;
  const mediaMese = totAnno / (oggi.getMonth() + 1);

  const costiAnno = interventi.filter((i) => i.data.startsWith(annoCosti) && Number(i.costo) > 0);
  const perMese = Array.from({ length: 12 }, (_, m) =>
    costiAnno
      .filter((i) => Number(i.data.split("-")[1]) - 1 === m)
      .reduce((somma, i) => somma + Number(i.costo), 0),
  );
  const massimoMese = Math.max(...perMese, 1);
  const totaleCosti = perMese.reduce((a, b) => a + b, 0);
  const perCategoria = (Object.keys(COLORE_CATEGORIA) as CategoriaIntervento[])
    .map((c) => ({
      categoria: c,
      totale: costiAnno.filter((i) => i.categoria === c).reduce((somma, i) => somma + Number(i.costo), 0),
    }))
    .filter((c) => c.totale > 0);

  // gruppi per mese (lista già ordinata per data decrescente dal backend)
  const gruppi: { chiave: string; etichetta: string; voci: Intervento[] }[] = [];
  for (const item of filtrati) {
    const [a, m] = item.data.split("-");
    const chiave = `${a}-${m}`;
    let gruppo = gruppi.find((g) => g.chiave === chiave);
    if (!gruppo) {
      gruppo = { chiave, etichetta: `${NOMI_MESI[Number(m) - 1]} ${a}`, voci: [] };
      gruppi.push(gruppo);
    }
    gruppo.voci.push(item);
  }

  const onCittaInput = async (valore: string) => {
    setForm((f) => ({ ...f, citta: valore }));
    if (valore.trim().length < 2) {
      setCittaSuggerite([]);
      return;
    }
    try {
      setCittaSuggerite(await cercaCitta(valore.trim()));
    } catch {
      setCittaSuggerite([]);
    }
  };

  return (
    <Layout breadcrumb="Storico Interventi">
      <main className="pg">
        <section className="pg-hero">
          <div className="pg-hero-ttl">
            <h1>
              <i className="ti ti-history" />
              Storico interventi
            </h1>
            <p>Manutenzioni, riparazioni e spese del veicolo selezionato.</p>
          </div>
          <VeicoloPicker />
          <div className="pg-hero-cta">
            <button type="button" className="btn-dash btn-dash-glass" onClick={() => setModalPdf(true)}>
              <i className="ti ti-file-type-pdf" />
              Genera PDF
            </button>
            <button type="button" className="btn-dash btn-dash-primary" onClick={apriNuovo}>
              <i className="ti ti-plus" />
              Aggiungi intervento
            </button>
          </div>
        </section>

        <div className="pg-kpis">
          <div className="pg-kpi">
            <span className="pg-kpi-ic"><i className="ti ti-calendar" /></span>
            <span className="pg-kpi-txt"><small>Spese questo mese</small><b>{euro(totMese)}</b></span>
          </div>
          <div className="pg-kpi">
            <span className="pg-kpi-ic"><i className="ti ti-currency-euro" /></span>
            <span className="pg-kpi-txt">
              <small>Spese {annoCorrente}</small>
              <b>{euro(totAnno)}</b>
              {variazione !== null && (
                <em className={`st-var ${variazione > 0 ? "su" : "giu"}`}>
                  {variazione > 0 ? "+" : ""}
                  {variazione}% vs {annoCorrente - 1}
                </em>
              )}
            </span>
          </div>
          <div className="pg-kpi" style={{ ["--c" as string]: "#60b8e0" }}>
            <span className="pg-kpi-ic"><i className="ti ti-tool" /></span>
            <span className="pg-kpi-txt"><small>Interventi {annoCorrente}</small><b>{interventiAnno}</b></span>
          </div>
          <div className="pg-kpi" style={{ ["--c" as string]: "var(--iv-ok)" }}>
            <span className="pg-kpi-ic"><i className="ti ti-gauge" /></span>
            <span className="pg-kpi-txt"><small>Media al mese</small><b>{euro(mediaMese)}</b></span>
          </div>
        </div>

        <div className="st-grid">
          <section className="pg-card">
            <div className="pg-card-h">
              <h2 className="dash-title">
                <i className="ti ti-list-details" />
                Interventi
              </h2>
              <span className="dash-count">{filtrati.length}</span>
            </div>
            <div className="st-tools">
              <div className="pg-search">
                <i className="ti ti-search" />
                <input
                  value={ricerca}
                  onChange={(e) => setRicerca(e.target.value)}
                  placeholder="Cerca per tipo, descrizione, fornitore o città…"
                />
              </div>
            </div>
            <div className="st-chips">
              {FILTRI.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`pg-chip${filtro === f.id ? " on" : ""}`}
                  style={f.dot ? { ["--c" as string]: f.dot } : undefined}
                  onClick={() => setFiltro(f.id)}
                >
                  {f.dot ? <span className="pg-dot" /> : <i className="ti ti-filter" />}
                  {f.label}
                  <small>
                    {f.id === "all" ? interventi.length : interventi.filter((i) => i.categoria === f.id).length}
                  </small>
                </button>
              ))}
            </div>

            <div className="st-lista">
              {gruppi.map((g) => {
                const totGruppo = g.voci.reduce((somma, i) => somma + (Number(i.costo) || 0), 0);
                return (
                  <div key={g.chiave}>
                    <div className="st-mese">
                      <span>{g.etichetta}</span>
                      {totGruppo > 0 && <b>{euro(totGruppo)}</b>}
                    </div>
                    {g.voci.map((item) => {
                      const [, mese, giorno] = item.data.split("-");
                      return (
                        <article
                          key={item.id}
                          className="st-row"
                          style={{ ["--c" as string]: COLORE_CATEGORIA[item.categoria] }}
                        >
                          <div className="st-data">
                            <b>{giorno}</b>
                            <span>{NOMI_MESI[Number(mese) - 1].slice(0, 3).toUpperCase()}</span>
                          </div>
                          <div className="st-main">
                            <div className="st-tipo">
                              {item.tipo}
                              <span className="st-cat">{catLabel(item.categoria)}</span>
                            </div>
                            <div className="st-meta">
                              {item.descrizione && <span>{item.descrizione}</span>}
                              {item.mediante && (
                                <span><i className="ti ti-tool" />{item.mediante}</span>
                              )}
                              {item.citta?.nome && (
                                <span><i className="ti ti-map-pin" />{item.citta.nome}</span>
                              )}
                            </div>
                          </div>
                          <div className="st-costo">{item.costo ? euro(Number(item.costo)) : "—"}</div>
                          <div className="st-azioni">
                            <button type="button" className="pg-row-btn" title="Modifica" onClick={() => apriModifica(item)}>
                              <i className="ti ti-pencil" />
                            </button>
                            <button
                              type="button"
                              className="pg-row-btn del"
                              title="Elimina"
                              onClick={() => void elimina(item.id)}
                            >
                              <i className="ti ti-trash" />
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                );
              })}
              {filtrati.length === 0 && (
                <div className="st-vuoto">
                  <i className="ti ti-clipboard-list" />
                  {interventi.length === 0
                    ? "Nessun intervento registrato per questo veicolo."
                    : "Nessun intervento corrisponde ai filtri."}
                </div>
              )}
            </div>
          </section>

          <aside className="st-side">
            <section id="costi" ref={costiRef} className="pg-card st-costi">
              <div className="pg-card-h">
                <h2 className="dash-title">
                  <i className="ti ti-currency-euro" />
                  Costi di gestione
                </h2>
                <select className="st-anno" value={annoCosti} onChange={(e) => setAnnoCosti(e.target.value)}>
                  {anniDisponibili.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <div className="st-costi-tot">
                <b>{euro(totaleCosti)}</b>
                <span>nel {annoCosti}{veicoloAttivo ? ` · ${veicoloAttivo.nome}` : ""}</span>
              </div>
              <div className="st-chart" role="img" aria-label={`Spese mensili ${annoCosti}`}>
                {perMese.map((v, m) => (
                  <div key={m} title={`${NOMI_MESI[m]}: ${euro(v)}`}>
                    <i className={v ? "" : "zero"} style={{ height: v ? `${(v / massimoMese) * 100}%` : undefined }} />
                    <span>{MESI_BREVI[m]}</span>
                  </div>
                ))}
              </div>
              {perCategoria.length > 0 && (
                <div className="st-split">
                  <div className="st-split-bar">
                    {perCategoria.map((c) => (
                      <i key={c.categoria} style={{ flex: c.totale, background: COLORE_CATEGORIA[c.categoria] }} />
                    ))}
                  </div>
                  <div className="st-legenda">
                    {perCategoria.map((c) => (
                      <div key={c.categoria}>
                        <span style={{ ["--c" as string]: COLORE_CATEGORIA[c.categoria] }}>{catLabel(c.categoria)}</span>
                        <b>{euro(c.totale)}</b>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <button type="button" className="pg-card st-pdf" onClick={() => setModalPdf(true)}>
              <span className="pg-kpi-ic"><i className="ti ti-file-type-pdf" /></span>
              <span className="st-pdf-txt">
                <b>Report PDF del veicolo</b>
                <span>Dati tecnici, cronologia e riepilogo costi, per mese o anno.</span>
              </span>
              <i className="ti ti-arrow-right" />
            </button>
          </aside>
        </div>
      </main>

      {/* Modal nuovo/modifica intervento */}
      {modalNuovo && (
        <div
          className="modal-overlay open"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalNuovo(false);
          }}
        >
          <div className="modal">
            <div className="modal-title">
              <i className={`fa-solid ${idInModifica === null ? "fa-plus" : "fa-pen"}`} style={{ color: "#f97316" }} />{" "}
              {idInModifica === null ? "Nuovo intervento" : "Modifica intervento"}
            </div>
            <div className="form-grid">
              <div className="form-row">
                <label>Data</label>
                <input
                  type="date"
                  value={form.data}
                  onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))}
                />
              </div>
              <div className="form-row">
                <label>Categoria</label>
                <select
                  value={form.categoria}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      categoria: e.target.value as CategoriaIntervento | "",
                      tipo: "",
                    }))
                  }
                >
                  <option value="">Seleziona...</option>
                  <option value="ordinario">Ordinario</option>
                  <option value="straordinario">Straordinario</option>
                  <option value="gestione">Spese di gestione</option>
                  <option value="annotazioni">Annotazioni</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <label>Tipo intervento</label>
              <select value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}>
                {form.categoria === "" ? (
                  <option value="">Prima seleziona categoria...</option>
                ) : (
                  <>
                    <option value="">Seleziona...</option>
                    {nomiForm.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>
            <div className="form-row">
              <label>Descrizione (opzionale)</label>
              <input
                type="text"
                placeholder="es. cambio olio motore 5W30"
                value={form.descrizione}
                onChange={(e) => setForm((f) => ({ ...f, descrizione: e.target.value }))}
              />
            </div>
            <div className="form-grid">
              <div className="form-row">
                <label>Fornitore/Mediante (opzionale)</label>
                <input
                  type="text"
                  placeholder="es. officina/benzinaio/negozio"
                  value={form.mediante}
                  onChange={(e) => setForm((f) => ({ ...f, mediante: e.target.value }))}
                />
              </div>
              <div className="form-row">
                <label>Costo (opzionale)</label>
                <input
                  type="number"
                  placeholder="€ 0.00"
                  step="0.01"
                  value={form.costo}
                  onChange={(e) => setForm((f) => ({ ...f, costo: e.target.value }))}
                />
              </div>
            </div>
            <div className="form-row">
              <label>Città (opzionale)</label>
              <input
                type="text"
                list="storico-citta"
                placeholder="es. Trapani"
                autoComplete="off"
                value={form.citta}
                onChange={(e) => void onCittaInput(e.target.value)}
              />
              <datalist id="storico-citta">
                {cittaSuggerite.map((c) => (
                  <option key={c.sigla} value={c.nome} />
                ))}
              </datalist>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-cancel" onClick={() => setModalNuovo(false)}>
                Cancella
              </button>
              <button type="button" className="btn-save" onClick={() => void salva()}>
                {idInModifica === null ? "Salva" : "Salva modifiche"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal genera PDF */}
      {modalPdf && (
        <div
          className="modal-overlay open"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalPdf(false);
          }}
        >
          <div className="modal modal-pdf">
            <div className="modal-title">
              <i className="fa-solid fa-file-pdf" style={{ color: "#f97316" }} /> Genera PDF
            </div>

            <div className="form-grid">
              <div className="form-row">
                <label>Anno</label>
                <select value={pdfAnno} onChange={(e) => setPdfAnno(e.target.value)}>
                  {anniDisponibili.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <label>Periodo</label>
                <select value={pdfMese} onChange={(e) => setPdfMese(e.target.value as PdfPeriodo)}>
                  <option value="all">Tutti i mesi</option>
                  <option value="sem1">Gennaio - Giugno</option>
                  <option value="sem2">Luglio - Dicembre</option>
                  {["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"].map(
                    (m, i) => (
                      <option key={m} value={String(i)}>
                        {m}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </div>

            <div className="form-row">
              <label>Tipologia</label>
              <div className="pdf-filters">
                {FILTRI.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={`filter-btn${pdfFiltro === f.id ? ` ${f.classe}` : ""}`}
                    onClick={() => setPdfFiltro(f.id)}
                  >
                    {f.dot && <span className="dot" style={{ background: f.dot }} />} {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-row">
              <label>Anteprima</label>
              <div className="pdf-anteprima">
                <label className="pdf-check">
                  <input
                    type="checkbox"
                    checked={pdfInfoVeicolo}
                    onChange={(e) => setPdfInfoVeicolo(e.target.checked)}
                  />{" "}
                  Info generali veicolo
                </label>
                <label className="pdf-check">
                  <input
                    type="checkbox"
                    checked={pdfCostoGenerale}
                    onChange={(e) => setPdfCostoGenerale(e.target.checked)}
                  />{" "}
                  Tabella costo generale
                </label>
                <label className="pdf-check">
                  <input
                    type="checkbox"
                    checked={pdfCronologia}
                    onChange={(e) => setPdfCronologia(e.target.checked)}
                  />{" "}
                  Tabella cronologia interventi
                </label>
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-cancel" onClick={() => setModalPdf(false)}>
                Cancella
              </button>
              <button type="button" className="btn-preview" onClick={() => void generaPdf(true)}>
                <i className="fa-solid fa-eye" /> Anteprima
              </button>
              <button type="button" className="btn-save" onClick={() => void generaPdf(false)}>
                <i className="fa-solid fa-download" /> Download
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

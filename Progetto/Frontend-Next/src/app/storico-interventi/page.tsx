"use client";

import { useCallback, useEffect, useState } from "react";

import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import {
  aggiornaIntervento,
  ApiError,
  creaIntervento,
  eliminaIntervento,
  getInterventiVeicolo,
  getVeicolo,
} from "@/lib/api";
import { catLabel, costruisciDocumentoPdf, type PdfPeriodo } from "@/lib/pdf-report";
import type { CategoriaIntervento, Intervento, VeicoloDettaglio } from "@/lib/types";
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
  nome: string;
  descrizione: string;
  mediante: string;
  costo: string;
}

const FORM_VUOTO: FormIntervento = {
  data: "",
  categoria: "",
  nome: "",
  descrizione: "",
  mediante: "",
  costo: "",
};

/**
 * Storico interventi del veicolo attivo: tabella con filtri per categoria,
 * CRUD (aggiungi/modifica/elimina), riepilogo spese mese/anno e report PDF.
 */
export default function StoricoInterventiPage() {
  const { veicoloAttivo, gestisci401 } = useAuth();
  const [interventi, setInterventi] = useState<Intervento[]>([]);
  const [filtro, setFiltro] = useState("all");
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

  const filtrati = filtro === "all" ? interventi : interventi.filter((i) => i.categoria === filtro);

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
      nome: item.nome,
      descrizione: item.descrizione ?? "",
      mediante: item.mediante ?? "",
      costo: item.costo ? String(item.costo) : "",
    });
    setModalNuovo(true);
  };

  const salva = async () => {
    if (!form.data || !form.categoria || !form.nome) {
      alert("Data, categoria e tipo intervento sono obbligatori.");
      return;
    }
    if (!veicoloAttivo) {
      alert("Nessun veicolo attivo selezionato.");
      return;
    }
    const payload = {
      data: form.data,
      categoria: form.categoria,
      nome: form.nome,
      descrizione: form.descrizione || null,
      mediante: form.mediante || null,
      costo: Number.parseFloat(form.costo) || null,
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

  return (
    <Layout breadcrumb="Storico Interventi">
      <section className="iv-dashboard">
        {/* Card: barra + filtri + tabella */}
        <div className="iv-section-card" style={{ animationDelay: "0.05s" }}>
          <div className="iv-section-bar2">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="section-title">Storico Interventi</span>
              <span className="count-badge">{filtrati.length} interventi</span>
            </div>
            <button type="button" className="aggiungi-btn" onClick={apriNuovo}>
              <i className="fa-solid fa-plus" />
              Aggiungi intervento
            </button>
          </div>

          <div className="filters">
            <span className="filter-label">
              <b>Filtra:</b>
            </span>
            {FILTRI.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`filter-btn${filtro === f.id ? ` ${f.classe}` : ""}`}
                onClick={() => setFiltro(f.id)}
              >
                {f.dot && <span className="dot" style={{ background: f.dot }} />} {f.label}
              </button>
            ))}
          </div>

          <div className="table-wrap">
            <div className="table-head">
              <div>Data</div>
              <div>Categoria</div>
              <div>Descrizione</div>
              <div>Fornitore/Mediante</div>
              <div>Costo</div>
              <div />
            </div>
            <div className="table-body">
              {filtrati.map((item, idx) => (
                <div key={item.id} className="table-row" style={{ animationDelay: `${idx * 0.05}s` }}>
                  <div className="date-cell">
                    <span className={`cat-dot ${item.categoria}`} />
                    {item.data.split("-").reverse().join("/")}
                  </div>
                  <div>
                    <span className={`cat-badge ${item.categoria}`}>{catLabel(item.categoria)}</span>
                  </div>
                  <div className="desc-cell">
                    <div>{item.nome}</div>
                    {item.descrizione && <div className="desc-sub">{item.descrizione}</div>}
                  </div>
                  <div className="mediante-cell">{item.mediante ?? "—"}</div>
                  <div className={`costo-cell${item.costo ? "" : " vuoto"}`}>
                    {item.costo ? `${Number(item.costo).toFixed(2)} €` : "—"}
                  </div>
                  <div className="actions">
                    <button
                      type="button"
                      className="action-btn edit-btn"
                      title="Modifica"
                      onClick={() => apriModifica(item)}
                    >
                      <i className="fa-solid fa-pen" />
                    </button>
                    <button
                      type="button"
                      className="action-btn del-btn"
                      title="Elimina"
                      onClick={() => void elimina(item.id)}
                    >
                      <i className="fa-solid fa-trash" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className={`empty-state${filtrati.length === 0 ? " visible" : ""}`}>
              Nessun intervento trovato per questa categoria.
            </div>
          </div>
        </div>

        {/* Card: riepilogo spese + PDF */}
        <div className="iv-section-card" style={{ animationDelay: "0.1s" }}>
          <div className="iv-section-bar2">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="section-title">Riepilogo Spese</span>
            </div>
          </div>
          <div className="spese-dashboard">
            <div className="spesa-box">
              <div className="spesa-icon">
                <i className="fa-solid fa-calendar-day" />
              </div>
              <div className="spesa-info">
                <span className="spesa-label">Spese questo mese</span>
                <span className="spesa-value">{totMese.toFixed(2)} €</span>
              </div>
            </div>
            <div className="spesa-box">
              <div className="spesa-icon">
                <i className="fa-solid fa-calendar" />
              </div>
              <div className="spesa-info">
                <span className="spesa-label">Spese quest&apos;anno</span>
                <span className="spesa-value">{totAnno.toFixed(2)} €</span>
              </div>
            </div>
            <button type="button" className="pdf-btn" onClick={() => setModalPdf(true)}>
              <i className="fa-solid fa-file-pdf" />
              Genera PDF
            </button>
          </div>
        </div>
      </section>

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
                      nome: "",
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
              <select value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}>
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

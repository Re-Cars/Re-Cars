import type { jsPDF } from "jspdf";

import type { Intervento, VeicoloDettaglio } from "./types";

/**
 * Generazione del report PDF dello storico interventi.
 * Port di costruisciDocumentoPdf() da functions-storico.js: jsPDF +
 * jspdf-autotable con font Inter e logo PNG embedded (pdf-assets.ts).
 * Le librerie e gli asset (~280KB base64) sono importati dinamicamente
 * solo alla prima generazione.
 */

export type PdfPeriodo = "all" | "sem1" | "sem2" | `${number}`;

export interface OpzioniPdf {
  anno: string;
  mese: PdfPeriodo;
  filtroCategoria: string;
  includiInfoVeicolo: boolean;
  includiCostoGenerale: boolean;
  includiCronologia: boolean;
  nomeVeicolo: string;
  targa: string;
  veicolo: VeicoloDettaglio | null;
}

const NOMI_MESI = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

export function catLabel(cat: string): string {
  if (cat === "gestione") return "Spese di gestione";
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

export function descrizionePeriodo(mese: PdfPeriodo): string {
  if (mese === "all") return "Tutti i mesi";
  if (mese === "sem1") return "Gennaio - Giugno";
  if (mese === "sem2") return "Luglio - Dicembre";
  return NOMI_MESI[Number(mese)] ?? "Tutti i mesi";
}

function filtraPerMese(dati: Intervento[], mese: PdfPeriodo): Intervento[] {
  if (mese === "all") return dati;
  const meseDi = (i: Intervento) => Number(i.data.split("-")[1]) - 1;
  if (mese === "sem1") return dati.filter((i) => meseDi(i) >= 0 && meseDi(i) <= 5);
  if (mese === "sem2") return dati.filter((i) => meseDi(i) >= 6 && meseDi(i) <= 11);
  return dati.filter((i) => meseDi(i) === Number(mese));
}

function formattaData(valore: string | null | undefined): string {
  if (!valore) return "__/__/____";
  const parti = String(valore).substring(0, 10).split("-");
  if (parti.length === 3) return parti.reverse().join("/");
  return String(valore);
}

function statoDaBooleano(valore: boolean | undefined, ok: string, ko: string): string {
  if (valore === true) return ok;
  if (valore === false) return ko;
  return "da verificare";
}

interface ParteTesto {
  text: string;
  bold: boolean;
}

function scriviTestoMisto(
  doc: jsPDF,
  parti: ParteTesto[],
  x: number,
  y: number,
  fontSize: number,
  fontFamily: string,
): void {
  let cursoreX = x;
  for (const p of parti) {
    doc.setFont(fontFamily, p.bold ? "bold" : "normal");
    doc.setFontSize(fontSize);
    doc.text(p.text, cursoreX, y);
    cursoreX += doc.getTextWidth(p.text);
  }
}

export async function costruisciDocumentoPdf(
  interventi: Intervento[],
  opzioni: OpzioniPdf,
): Promise<{ doc: jsPDF; nomeFile: string }> {
  const [{ jsPDF: JsPdf }, autoTableModule, assets] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
    import("./pdf-assets"),
  ]);
  const autoTable = autoTableModule.default;
  const doc = new JsPdf();

  // registrazione font Inter (fallback Helvetica se gli asset mancano)
  let fontBase = "helvetica";
  let fontTitolo = "helvetica";
  if (assets.PDF_FONT_INTER_400_BASE64) {
    doc.addFileToVFS("Inter-400.ttf", assets.PDF_FONT_INTER_400_BASE64);
    doc.addFont("Inter-400.ttf", "Inter", "normal");
    doc.addFileToVFS("Inter-700.ttf", assets.PDF_FONT_INTER_700_BASE64);
    doc.addFont("Inter-700.ttf", "Inter", "bold");
    doc.addFileToVFS("Inter-800.ttf", assets.PDF_FONT_INTER_800_BASE64);
    doc.addFont("Inter-800.ttf", "InterExtraBold", "normal");
    fontBase = "Inter";
    fontTitolo = "InterExtraBold";
  }

  const { anno, mese } = opzioni;
  let dati = interventi.filter((i) => i.data.substring(0, 4) === anno);
  dati = filtraPerMese(dati, mese);
  if (opzioni.filtroCategoria !== "all") {
    dati = dati.filter((i) => i.categoria === opzioni.filtroCategoria);
  }

  const margineSx = 14;
  const margineDx = 196;
  const arancio: [number, number, number] = [249, 115, 22];
  const grigioTesto: [number, number, number] = [55, 65, 81];
  const grigioMuto: [number, number, number] = [110, 110, 110];

  let y = 20;

  /* ---------- header: logo + titolo ---------- */
  if (assets.PDF_LOGO_PNG_BASE64) {
    const larghezza = 16;
    const altezza = larghezza * (285 / 400);
    doc.addImage(assets.PDF_LOGO_PNG_BASE64, "PNG", margineSx, y + 2 - altezza + 5.5, larghezza, altezza);
  }

  doc.setFont(fontTitolo, "normal");
  doc.setFontSize(20);
  doc.setTextColor(...arancio);
  doc.text("RE|CARS", margineSx + 22, y + 2);

  doc.setFont(fontBase, "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...grigioMuto);
  doc.text("Report Interventi", margineSx + 22, y + 8);

  y += 14;
  doc.setDrawColor(...arancio);
  doc.setLineWidth(0.9);
  doc.line(margineSx, y, margineDx, y);
  y += 2.2;
  doc.setLineWidth(0.35);
  doc.line(margineSx, y, margineDx, y);
  y += 9;

  /* ---------- box info veicolo ---------- */
  if (opzioni.includiInfoVeicolo) {
    const dg = opzioni.veicolo?.dati_generici?.[0] ?? {};
    const ds = opzioni.veicolo?.dati_specifici?.[0] ?? {};

    const xBox = margineSx + 6;
    const larghezzaBox = margineDx - margineSx;
    const larghezzaTesto = larghezzaBox - 12;

    interface RigaBox {
      testo?: string;
      misto?: ParteTesto[];
      bold?: boolean;
      size: number;
      spazioDopo: number;
    }

    const righe: RigaBox[] = [];
    righe.push({ testo: "Info generali veicolo", bold: true, size: 10.5, spazioDopo: 8 });
    righe.push({
      misto: [
        { text: "Veicolo: ", bold: true }, { text: `${opzioni.nomeVeicolo}   |   `, bold: false },
        { text: "Targa: ", bold: true }, { text: `${opzioni.targa}   |   `, bold: false },
        { text: "Anno di riferimento: ", bold: true }, { text: anno, bold: false },
      ],
      size: 9.5,
      spazioDopo: 10,
    });
    righe.push({ testo: "Caratteristiche tecniche:", bold: true, size: 9.5, spazioDopo: 6 });
    righe.push({ testo: `Alimentazione: ${dg.alimentazione ?? "____________"}`, size: 9.5, spazioDopo: 5.5 });
    righe.push({ testo: `Cilindrata: ${dg.cilindrata ? `${dg.cilindrata} cc` : "__________ cc"}`, size: 9.5, spazioDopo: 5.5 });
    righe.push({
      testo: `Potenza: ${dg.cavalli ? `${dg.cavalli} CV` : "____________"}`,
      size: 9.5,
      spazioDopo: opzioni.veicolo?.marca ? 5.5 : 9,
    });
    if (opzioni.veicolo?.marca) {
      righe.push({ testo: `Marca: ${opzioni.veicolo.marca}`, size: 9.5, spazioDopo: 9 });
    }
    righe.push({ testo: "Mantenimento", bold: true, size: 9.5, spazioDopo: 6 });
    righe.push({
      testo: `Bollo: ${statoDaBooleano(ds.isbolloattivo, "Attivo", "Non attivo")} · scadenza ${formattaData(ds.datascadenzabollo)}`,
      size: 9.5,
      spazioDopo: 5.5,
    });

    doc.setFont(fontBase, "normal");
    doc.setFontSize(9.5);
    const assicurazioneLabel = `Assicurazione: ${ds.nomeassicurazione ? `${ds.nomeassicurazione} · ` : ""}${statoDaBooleano(ds.isinsured, "Attiva", "Non attiva")} · scadenza ${formattaData(ds.datascadenzarca)}`;
    const righeAssicurazione = doc.splitTextToSize(assicurazioneLabel, larghezzaTesto) as string[];
    righeAssicurazione.forEach((riga, idx) => {
      righe.push({ testo: riga, size: 9.5, spazioDopo: idx === righeAssicurazione.length - 1 ? 8 : 5 });
    });

    const altezzaBox = righe.reduce((tot, r) => tot + r.spazioDopo, 0) + 4;

    doc.setFillColor(253, 231, 211);
    doc.roundedRect(margineSx, y, larghezzaBox, altezzaBox, 3, 3, "F");

    let yBox = y + 8;
    for (const r of righe) {
      if (r.misto) {
        scriviTestoMisto(doc, r.misto, xBox, yBox, r.size, fontBase);
      } else if (r.testo) {
        doc.setFont(fontBase, r.bold ? "bold" : "normal");
        doc.setFontSize(r.size);
        doc.setTextColor(...grigioTesto);
        doc.text(r.testo, xBox, yBox);
      }
      yBox += r.spazioDopo;
    }

    y += altezzaBox + 8;
  }

  /* ---------- riga riferimento report ---------- */
  doc.setFont(fontBase, "normal");
  doc.setFontSize(9);
  doc.setTextColor(...grigioMuto);
  const tipologiaLabel = opzioni.filtroCategoria === "all" ? "Tutte" : catLabel(opzioni.filtroCategoria);
  doc.text(
    `Riferimento Report Interventi | Anno: ${anno} | Mese: ${descrizionePeriodo(mese)} | Tipologia Report: ${tipologiaLabel}`,
    margineSx,
    y,
  );
  y += 11;

  const docConTabelle = doc as jsPDF & { lastAutoTable?: { finalY: number } };

  /* ---------- tabella costo generale ---------- */
  if (opzioni.includiCostoGenerale) {
    doc.setFont(fontBase, "bold");
    doc.setFontSize(11.5);
    doc.setTextColor(...grigioTesto);
    doc.text("Tabella costo generale", margineSx, y);
    y += 4;

    const categorie = ["ordinario", "straordinario", "gestione", "annotazioni"];
    const totaleComplessivo = dati.reduce((s, i) => s + (Number(i.costo) || 0), 0);
    const bodyCosti = categorie.map((cat) => {
      const tot = dati
        .filter((i) => i.categoria === cat)
        .reduce((s, i) => s + (Number(i.costo) || 0), 0);
      return [catLabel(cat), `${tot.toFixed(2)} €`];
    });
    bodyCosti.push(["Totale complessivo", `${totaleComplessivo.toFixed(2)} €`]);

    autoTable(doc, {
      startY: y,
      head: [["Categoria", "Totale"]],
      body: bodyCosti,
      theme: "grid",
      styles: { font: fontBase, fontSize: 9.5, cellPadding: 3, lineColor: [230, 230, 230], lineWidth: 0.2 },
      headStyles: { fillColor: arancio, textColor: 255, fontStyle: "bold", halign: "left" },
      bodyStyles: { textColor: grigioTesto },
      alternateRowStyles: { fillColor: [255, 255, 255] },
      margin: { left: margineSx, right: 210 - margineDx },
    });

    y = (docConTabelle.lastAutoTable?.finalY ?? y) + 10;
  }

  /* ---------- tabella cronologia ---------- */
  if (opzioni.includiCronologia) {
    doc.setFont(fontBase, "bold");
    doc.setFontSize(11.5);
    doc.setTextColor(...grigioTesto);
    doc.text("Tabella cronologia interventi", margineSx, y);
    y += 4;

    const bodyCronologia = dati
      .slice()
      .sort((a, b) => a.data.localeCompare(b.data))
      .map((i) => [
        i.data.split("-").reverse().join("/"),
        catLabel(i.categoria),
        i.nome + (i.descrizione ? ` - ${i.descrizione}` : ""),
        i.mediante ?? "—",
        i.costo ? `${Number(i.costo).toFixed(2)} €` : "—",
      ]);

    autoTable(doc, {
      startY: y,
      head: [["Data", "Categoria", "Descrizione", "Fornitore", "Costo"]],
      body: bodyCronologia.length
        ? bodyCronologia
        : [["—", "—", "Nessun intervento nel periodo selezionato", "—", "—"]],
      theme: "grid",
      styles: { font: fontBase, fontSize: 9, cellPadding: 3, lineColor: [230, 230, 230], lineWidth: 0.2 },
      headStyles: { fillColor: arancio, textColor: 255, fontStyle: "bold", halign: "left" },
      bodyStyles: { textColor: grigioTesto },
      alternateRowStyles: { fillColor: [255, 255, 255] },
      margin: { left: margineSx, right: 210 - margineDx },
      columnStyles: { 2: { cellWidth: 60 } },
    });
  }

  const suffissoPeriodo =
    mese === "all"
      ? ""
      : `-${mese === "sem1" ? "gen-giu" : mese === "sem2" ? "lug-dic" : NOMI_MESI[Number(mese)].toLowerCase()}`;

  return { doc, nomeFile: `recars-report-interventi-${anno}${suffissoPeriodo}.pdf` };
}

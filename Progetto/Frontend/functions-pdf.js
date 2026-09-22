let currentPdfFilter = 'all';
 
/*----------------------------------------------------
RIEPILOGO SPESE (mese corrente / anno corrente)
----------------------------------------------------*/
function calcolaTotali() {
  const oggi = new Date();
  const meseCorrente = oggi.getMonth();
  const annoCorrente = oggi.getFullYear();
 
  let totMese = 0;
  let totAnno = 0;
 
  interventi.forEach(item => {
    const costo = Number(item.costo) || 0;
    if (!costo) return;
 
    const [anno, mese] = item.data.split('-').map(Number);
 
    if (anno === annoCorrente) {
      totAnno += costo;
      if (mese - 1 === meseCorrente) {
        totMese += costo;
      }
    }
  });
 
  const elMese = document.getElementById('totaleMese');
  const elAnno = document.getElementById('totaleAnno');
  if (elMese) elMese.textContent = totMese.toFixed(2) + ' €';
  if (elAnno) elAnno.textContent = totAnno.toFixed(2) + ' €';
}
 
/*----------------------------------------------------
MODAL GENERA PDF
----------------------------------------------------*/
function popolaAnniPdf() {
  const sel = document.getElementById('pdfAnno');
  if (!sel) return;
 
  const anniSet = new Set(interventi.map(i => i.data.substring(0, 4)));
  anniSet.add(String(new Date().getFullYear()));
 
  const anni = Array.from(anniSet).sort((a, b) => b - a);
  sel.innerHTML = anni.map(a => `<option value="${a}">${a}</option>`).join('');
}
 
function setPdfFilter(f, btn) {
  currentPdfFilter = f;
  document.querySelectorAll('#pdfFiltri .filter-btn').forEach(b => b.className = 'filter-btn');
  if      (f === 'all')           btn.classList.add('active-all');
  else if (f === 'ordinario')     btn.classList.add('active-ordinario');
  else if (f === 'straordinario') btn.classList.add('active-straordinario');
  else if (f === 'annotazioni')   btn.classList.add('active-annotazioni');
  else                            btn.classList.add('active-gestione');
}
 
function openPdfModal() {
  popolaAnniPdf();
  const selMese = document.getElementById('pdfMese');
  if (selMese) selMese.value = 'all';
  document.getElementById('modalPdfOverlay').classList.add('open');
}
 
const nomiMesi = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
 
function descrizionePeriodo(meseSel) {
  if (meseSel === 'all')  return 'Tutti i mesi';
  if (meseSel === 'sem1') return 'Gennaio - Giugno';
  if (meseSel === 'sem2') return 'Luglio - Dicembre';
  return nomiMesi[Number(meseSel)] || 'Tutti i mesi';
}
 
function filtraPerMese(dati, meseSel) {
  if (meseSel === 'all') return dati;
 
  if (meseSel === 'sem1') {
    return dati.filter(i => {
      const m = Number(i.data.split('-')[1]) - 1;
      return m >= 0 && m <= 5;
    });
  }
  if (meseSel === 'sem2') {
    return dati.filter(i => {
      const m = Number(i.data.split('-')[1]) - 1;
      return m >= 6 && m <= 11;
    });
  }
 
  const meseNum = Number(meseSel);
  return dati.filter(i => Number(i.data.split('-')[1]) - 1 === meseNum);
}
 
function closePdfModal() {
  document.getElementById('modalPdfOverlay').classList.remove('open');
}
 
document.getElementById('modalPdfOverlay').addEventListener('click', function (e) {
  if (e.target === this) closePdfModal();
});
 
/*----------------------------------------------------
SUPPORTO GRAFICO: registrazione font  + logo reale
----------------------------------------------------*/
function registraFontPdf(doc) {
  if (typeof PDF_FONT_INTER_400_BASE64 === 'undefined') return;
 
  doc.addFileToVFS('Inter-400.ttf', PDF_FONT_INTER_400_BASE64);
  doc.addFont('Inter-400.ttf', 'Inter', 'normal');
 
  doc.addFileToVFS('Inter-700.ttf', PDF_FONT_INTER_700_BASE64);
  doc.addFont('Inter-700.ttf', 'Inter', 'bold');
 
  doc.addFileToVFS('Inter-800.ttf', PDF_FONT_INTER_800_BASE64);
  doc.addFont('Inter-800.ttf', 'InterExtraBold', 'normal');
 
  // Necessario per poter usare fontBase con stile 'italic' nella colonna
  doc.addFileToVFS('Inter-400.ttf', PDF_FONT_INTER_400_BASE64);
  doc.addFont('Inter-400.ttf', 'Inter', 'italic');
}
 
function fontBaseDisponibile() {
  return (typeof PDF_FONT_INTER_400_BASE64 !== 'undefined') ? 'Inter' : 'helvetica';
}
function fontTitoloDisponibile() {
  return (typeof PDF_FONT_INTER_800_BASE64 !== 'undefined') ? 'InterExtraBold' : 'helvetica';
}
 
function disegnaLogoRecars(doc, x, y) {
  if (typeof PDF_LOGO_PNG_BASE64 !== 'undefined') {
    const larghezza = 16;
    const altezza = larghezza * (285 / 400);
    doc.addImage(PDF_LOGO_PNG_BASE64, 'PNG', x, y - altezza + 5.5, larghezza, altezza);
    return;
  }
 
  const arancio = [249, 115, 22];
  doc.setFillColor(...arancio);
  doc.setDrawColor(...arancio);
  doc.roundedRect(x + 3, y - 3, 9, 4, 1.5, 1.5, 'F');
  doc.roundedRect(x, y, 17, 5.5, 2, 2, 'F');
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.6);
  doc.circle(x + 4, y + 6, 1.8, 'FD');
  doc.circle(x + 13, y + 6, 1.8, 'FD');
}
 
function scriviTestoMisto(doc, parti, x, y, fontSize = 9, fontFamily = 'helvetica') {
  let cursoreX = x;
  parti.forEach(p => {
    doc.setFont(fontFamily, p.bold ? 'bold' : 'normal');
    doc.setFontSize(fontSize);
    doc.text(p.text, cursoreX, y);
    cursoreX += doc.getTextWidth(p.text);
  });
}
 
function costruisciDocumentoPdf() {
  if (!window.jspdf) {
    alert('Libreria PDF non ancora caricata, riprova tra un istante.');
    return null;
  }
 
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
 
  registraFontPdf(doc);
  const fontBase   = fontBaseDisponibile();
  const fontTitolo = fontTitoloDisponibile();
 
  const anno    = document.getElementById('pdfAnno').value;
  const meseSel = document.getElementById('pdfMese').value;
 
  let dati = interventi.filter(i => i.data.substring(0, 4) === anno);
  dati = filtraPerMese(dati, meseSel);
  if (currentPdfFilter !== 'all') {
    dati = dati.filter(i => i.categoria === currentPdfFilter);
  }
 
  const margineSx = 14;
  const margineDx = 196;
  const arancio = [249, 115, 22];
  const grigioTesto = [55, 65, 81];
  const grigioMuto = [110, 110, 110];
 
  let y = 20;
 
  disegnaLogoRecars(doc, margineSx, y + 2);
 
  doc.setFont(fontTitolo, 'normal');
  doc.setFontSize(20);
  doc.setTextColor(...arancio);
  doc.text('RE', margineSx + 22, y + 2);
  let xCursore = margineSx + 22 + doc.getTextWidth('RE');
  doc.setTextColor(...arancio);
  doc.text('|', xCursore, y + 2);
  xCursore += doc.getTextWidth('|');
  doc.setTextColor(...arancio);
  doc.text('CARS', xCursore, y + 2);
 
  doc.setFont(fontBase, 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(...grigioMuto);
  doc.text('Report Interventi', margineSx + 22, y + 8);
 
  y += 14;
 
  doc.setDrawColor(...arancio);
  doc.setLineWidth(0.9);
  doc.line(margineSx, y, margineDx, y);
  y += 2.2;
  doc.setLineWidth(0.35);
  doc.line(margineSx, y, margineDx, y);
  y += 9;
 
  if (document.getElementById('pdfInfoVeicolo').checked) {
    const nomeVeicolo = document.getElementById('nome-veicolo-attivo')?.textContent?.trim() || '—';
    const targa       = document.getElementById('targa-veicolo-attivo')?.textContent?.trim() || '—';
 
    const alimentazione = campoVeicolo(['alimentazione', 'carburante']);
    const cilindrata     = campoVeicolo(['cilindrata', 'cc']);
    const potenza         = campoVeicolo(['potenza', 'cavalli', 'cv']);
    const marca             = campoVeicolo(['marca']);
 
    const bolloData   = campoVeicolo([
      'bollo_data', 'bollo_scadenza', 'bolloData', 'bolloScadenza', 'dataScadenzaBollo',
      'databollo', 'scadenzabollo', 'datascadenzabollo', 'bolloscadenza',
    ]);
    const bolloStato = campoVeicolo(['bollo_stato', 'bolloStato'])
                        || statoDaBooleano(campoVeicolo(['isbolloattivo']), 'Attivo', 'Non attivo')
                        || 'da verificare';
 
    const assCompagnia = campoVeicolo([
      'assicurazione_compagnia', 'assicurazioneCompagnia', 'compagniaAssicurativa',
      'compagniaassicurazione', 'compagnia', 'compagniarca', 'rcacompagnia',
    ]);
    const assData       = campoVeicolo([
      'assicurazione_data', 'assicurazione_scadenza', 'assicurazioneData', 'assicurazioneScadenza',
      'dataassicurazione', 'scadenzaassicurazione', 'datascadenzaassicurazione', 'assicurazionescadenza',
      'rca', 'scadenzarca', 'datarca', 'datascadenzarca', 'rcascadenza', 'datainsured', 'scadenzainsured',
    ]);
    const assStato = campoVeicolo(['assicurazione_stato', 'assicurazioneStato'])
                        || statoDaBooleano(campoVeicolo(['isinsured']), 'Attiva', 'Non attiva')
                        || 'da verificare';
 
    console.log('🔎 Campi disponibili per il PDF (veicoloAttivoInfo):', veicoloAttivoInfo);
 
    const xBox = margineSx + 6;
    const larghezzaBox = margineDx - margineSx;
    const larghezzaTesto = larghezzaBox - 12;
 
    const righe = [];
    righe.push({ testo: 'Info generali veicolo', bold: true, size: 10.5, spazioDopo: 8 });
    righe.push({
      misto: [
        { text: 'Veicolo: ', bold: true }, { text: nomeVeicolo + '   |   ', bold: false },
        { text: 'Targa: ', bold: true }, { text: targa + '   |   ', bold: false },
        { text: 'Anno di riferimento: ', bold: true }, { text: anno, bold: false },
      ],
      size: 9.5, spazioDopo: 10,
    });
 
    righe.push({ testo: 'Caratteristiche tecniche:', bold: true, size: 9.5, spazioDopo: 6 });
    righe.push({ testo: `Alimentazione: ${alimentazione || '____________'}`, bold: false, size: 9.5, spazioDopo: 5.5 });
    righe.push({ testo: `Cilindrata: ${cilindrata ? cilindrata + ' cc' : '__________ cc'}`, bold: false, size: 9.5, spazioDopo: 5.5 });
    righe.push({ testo: `Potenza: ${potenza ? potenza + ' CV' : '____________'}`, bold: false, size: 9.5, spazioDopo: marca ? 5.5 : 9 });
    if (marca) {
      righe.push({ testo: `Marca: ${marca}`, bold: false, size: 9.5, spazioDopo: 9 });
    }
 
    righe.push({ testo: 'Mantenimento', bold: true, size: 9.5, spazioDopo: 6 });
    righe.push({ testo: `Bollo: ${bolloStato} · scadenza ${formattaData(bolloData)}`, bold: false, size: 9.5, spazioDopo: 5.5 });
 
    doc.setFont(fontBase, 'normal');
    doc.setFontSize(9.5);
    const assicurazioneLabel = `Assicurazione: ${assCompagnia ? assCompagnia + ' · ' : ''}${assStato} · scadenza ${formattaData(assData)}`;
    const righeAssicurazione = doc.splitTextToSize(assicurazioneLabel, larghezzaTesto);
    righeAssicurazione.forEach((rigaTesto, idx) => {
      righe.push({ testo: rigaTesto, bold: false, size: 9.5, spazioDopo: idx === righeAssicurazione.length - 1 ? 8 : 5 });
    });
 
    const altezzaBox = righe.reduce((tot, r) => tot + r.spazioDopo, 0) + 4;
 
    doc.setFillColor(253, 231, 211);
    doc.roundedRect(margineSx, y, larghezzaBox, altezzaBox, 3, 3, 'F');
 
    let yBox = y + 8;
    righe.forEach(r => {
      if (r.misto) {
        scriviTestoMisto(doc, r.misto, xBox, yBox, r.size, fontBase);
      } else {
        doc.setFont(fontBase, r.bold ? 'bold' : 'normal');
        doc.setFontSize(r.size);
        doc.setTextColor(...grigioTesto);
        doc.text(r.testo, xBox, yBox);
      }
      yBox += r.spazioDopo;
    });
 
    y += altezzaBox + 8;
  }
 
  doc.setFont(fontBase, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...grigioMuto);
  const tipologiaLabel = currentPdfFilter === 'all' ? 'Tutte' : catLabel(currentPdfFilter);
  doc.text(
    `Riferimento Report Interventi | Anno: ${anno} | Mese: ${descrizionePeriodo(meseSel)} | Tipologia Report: ${tipologiaLabel}`,
    margineSx, y
  );
  y += 11;
 
  /* ---------- TABELLA COSTO GENERALE ---------- */
  if (document.getElementById('pdfCostoGenerale').checked) {
    doc.setFont(fontBase, 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(...grigioTesto);
    doc.text('Tabella costo generale', margineSx, y);
    y += 4;
 
    const categorie = ['ordinario', 'straordinario', 'gestione', 'annotazioni'];
    const totaleComplessivo = dati.reduce((s, i) => s + (Number(i.costo) || 0), 0);
 
    const bodyCosti = categorie.map(cat => {
      const tot = dati.filter(i => i.categoria === cat)
                      .reduce((s, i) => s + (Number(i.costo) || 0), 0);
      return [catLabel(cat), tot.toFixed(2) + ' €'];
    });
    bodyCosti.push(['Totale complessivo', totaleComplessivo.toFixed(2) + ' €']);
 
  
    doc.autoTable({
      startY: y,
      head: [['Categoria', 'Totale']],
      body: bodyCosti,
      theme: 'grid',
      styles: { font: fontBase, fontSize: 8, cellPadding: 2.5, lineColor: [230, 230, 230], lineWidth: 0.2 },
      headStyles: { fillColor: arancio, textColor: 255, fontStyle: 'bold', halign: 'left', fontSize: 8 },
      bodyStyles: { textColor: grigioTesto },
      alternateRowStyles: { fillColor: [255, 255, 255] },
      margin: { left: margineSx, right: 210 - margineDx },
    });
 
    y = doc.lastAutoTable.finalY + 10;
  }
 
  /* ---------- TABELLA CRONOLOGIA INTERVENTI ----------
  ---------------------------------------------------- */
  if (document.getElementById('pdfCronologia').checked) {
    doc.setFont(fontBase, 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(...grigioTesto);
    doc.text('Tabella cronologia interventi', margineSx, y);
    y += 4;
 
    // Ordino una volta sola e tengo l'array a portata di mano con
    // rendering manuale in didDrawCell, che lo referenzia tramite l'indice di riga (data.row.index).
    const cronologiaOrdinata = dati
      .slice()
      .sort((a, b) => a.data.localeCompare(b.data));
 
    const bodyCronologia = cronologiaOrdinata.map(i => [
      i.data.split('-').reverse().join('/'),
      catLabel(i.categoria),
      // Il testo con \n serve solo a far calcolare ad autoTable un'altezza di riga 
      i.tipo + (i.descrizione ? '\n' + i.descrizione : ''),
      i.mediante || '—',
      i.citta?.nome || '—',
      i.costo ? Number(i.costo).toFixed(2) + ' €' : '—',
    ]);
 
    // Riga finale con il totale complessivo del periodo filtrato
    if (bodyCronologia.length) {
      const totaleCronologia = dati.reduce((s, i) => s + (Number(i.costo) || 0), 0);
      bodyCronologia.push([
        {
          content: 'Totale',
          colSpan: 5,
          styles: { halign: 'right', fontStyle: 'bold', textColor: grigioTesto },
        },
        {
          content: totaleCronologia.toFixed(2) + ' €',
          styles: { fontStyle: 'bold', textColor: grigioTesto },
        },
      ]);
    }
 
    doc.autoTable({
      startY: y,
      head: [['Data', 'Categoria', 'Tipo e descrizione', 'Fornitore', 'Città', 'Costo']],
      body: bodyCronologia.length ? bodyCronologia : [['—', '—', 'Nessun intervento nel periodo selezionato', '—', '—', '—']],
      theme: 'grid',
      styles: { font: fontBase, fontSize: 8, cellPadding: 2.5, lineColor: [230, 230, 230], lineWidth: 0.2 },
      headStyles: { fillColor: arancio, textColor: 255, fontStyle: 'bold', halign: 'left', fontSize: 8 },
      bodyStyles: { textColor: grigioTesto },
      alternateRowStyles: { fillColor: [255, 255, 255] },
      margin: { left: margineSx, right: 210 - margineDx },
      columnStyles: { 2: { cellWidth: 60, valign: 'top' } },
 
      // Sopprime il disegno automatico del testo solo per la colonna 2
      // (Tipo e descrizione) nel corpo della tabella. Nella riga del totale
      // quella colonna non esiste come cella singola (è dentro il colSpan),
      // quindi lì questo hook non interviene.
      willDrawCell: function (data) {
        if (data.section === 'body' && data.column.index === 2) {
          data.cell.text = [];
        }
      },
 
      didDrawCell: function (data) {
        if (data.section !== 'body' || data.column.index !== 2) return;
 
        const item = cronologiaOrdinata[data.row.index];
        if (!item) return; // riga del totale: qui non c'è nulla da disegnare
 
        const x = data.cell.x + data.cell.padding('left');
        const maxWidth = data.cell.width - data.cell.padding('left') - data.cell.padding('right');
        let curY = data.cell.y + data.cell.padding('top') + 2.6;
 
        // Tipo intervento
        doc.setFont(fontBase, 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...grigioTesto);
        const tipoLines = doc.splitTextToSize(item.tipo, maxWidth);
        tipoLines.forEach(line => {
          doc.text(line, x, curY);
          curY += 3.5;
        });
 
        // Descrizione: a capo, più piccola e in corsivo
        if (item.descrizione) {
          doc.setFont(fontBase, 'italic');
          doc.setFontSize(6.8);
          doc.setTextColor(...grigioMuto);
          const descLines = doc.splitTextToSize(item.descrizione, maxWidth);
          descLines.forEach(line => {
            doc.text(line, x, curY);
            curY += 3;
          });
        }
      },
    });
  }
 
  const suffissoPeriodo = meseSel === 'all' ? '' : `-${meseSel === 'sem1' ? 'gen-giu' : meseSel === 'sem2' ? 'lug-dic' : nomiMesi[Number(meseSel)].toLowerCase()}`;
  const nomeFile = `recars-report-interventi-${anno}${suffissoPeriodo}.pdf`;
 
  return { doc, nomeFile };
}
 
function scaricaPdf() {
  const risultato = costruisciDocumentoPdf();
  if (!risultato) return;
 
  risultato.doc.save(risultato.nomeFile);
  closePdfModal();
}
 
function anteprimaPdf() {
  const risultato = costruisciDocumentoPdf();
  if (!risultato) return;
 
  const url = risultato.doc.output('bloburl');
  const finestra = window.open(url, '_blank');
 
  if (!finestra) {
    alert('Il browser ha bloccato l\'apertura dell\'anteprima. Consenti i popup per questo sito e riprova.');
  }
}
 
// Aggancio calcolaTotali() a renderRows() (definita in functions-app.js):
// ogni volta che la tabella dello storico viene ridisegnata (filtro, ricerca,
// CRUD...), i totali "questo mese"/"quest'anno" restano aggiornati.
// Wrappata così invece di modificare direttamente renderRows() in functions-app.js,
// per mantenere quel file indipendente dal PDF (funziona anche se questo
// script non viene caricato affatto).
(function agganciaCalcoloTotali() {
  const renderRowsOriginale = renderRows;
  renderRows = function () {
    renderRowsOriginale.apply(this, arguments);
    calcolaTotali();
  };
})();
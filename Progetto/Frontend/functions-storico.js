/* ---------------------------------------------------- 
 come chiamare dati reali al backend
----------------------------------------------------*/

const API_BASE = 'http://localhost:3000';

const tipiIntervento = {
  /*ordinario:     ['Benzina','Cambio olio','Cambio tergicristalli','Gomme','Batteria','Controllo livelli','Pastiglie freni','Liquido freni','Liquido raffreddamento','Filtri motore','Pulizia iniettori','Altro'],*/
  ordinario:      ['Benzina','Rifornimento','Cambio', 'Controllo', 'Pulizia','Aggiunta','Altro'],
  /*straordinario: ['Cinghia distribuzione','Carrozzeria','Riparazioni','Impianto elettrico','Luci','Frizione','Ammortizzatori','Radiatore','Sensori','Compressore clima','Marmitta','Altro'],*/
  straordinario:   ['Tagliando', 'Revisione', 'Riparazione', 'Controllo', 'Modifica veicolo'], 
  gestione:      ['Assicurazione','Bollo','Revisione','Tagliando','Multa','Pedaggi','Parcheggio'],
  /*annotazioni:   ['Problemi','luci','motore','elettrico','rumori','altro'],*/
  annotazioni:   ['Problemi', 'Altro']
};

let interventi = [];
let currentFilter = 'all';
let veicoloAttivoInfo = {}; // dati generali veicolo (alimentazione, cilindrata, bollo, assicurazione...) per il PDF

/*---------------------------------------------------
  ---------------- UTILITY
----------------------------------------------------*/
function catLabel(cat) {
  if (cat === 'gestione') return 'Spese di gestione';
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

function getVeicoloAttivoId() {
  const id = localStorage.getItem('veicoloAttivoId');
  if (!id) {
    console.warn('Nessun veicolo attivo trovato nel localStorage');
    return null;
  }
  return parseInt(id);
}

/* ----------------------------------------------------
CARICAMENTO DATI GENERALI VEICOLO (per il PDF)
----------------------------------------------------*/
async function caricaInfoVeicolo() {
  const idVeicolo = getVeicoloAttivoId();
  if (!idVeicolo) return;

  try {
    // Endpoint corretto (singolare, come in functions-app.js: /veicolo/:id)
    const res = await fetch(`${API_BASE}/veicolo/${idVeicolo}`, {
      credentials: 'include',
    });

    if (!res.ok) throw new Error('Errore nel caricamento dei dati veicolo');

    const v = await res.json();

    // Stessa struttura usata in caricaDettagliVeicolo(): array con un solo elemento
    const dg = (v.dati_generici && v.dati_generici[0]) || {};
    const ds = (v.dati_specifici && v.dati_specifici[0]) || {};

    // Unisco tutto in un unico oggetto comodo da leggere con campoVeicolo(),
    // tenendo anche i due gruppi separati nel caso servano campi con lo stesso nome
    veicoloAttivoInfo = { ...dg, ...ds, _generici: dg, _specifici: ds, _root: v };
  } catch (err) {
    console.error('Errore caricaInfoVeicolo:', err);
    veicoloAttivoInfo = {};
  }
}

// Carico i dati generali veicolo appena la pagina è pronta (in aggiunta, non al posto di, caricaInterventi)
document.addEventListener('DOMContentLoaded', () => {
  caricaInfoVeicolo();
});

// Ricarico anche questi dati quando l'utente cambia veicolo attivo
window.addEventListener('storage', (e) => {
  if (e.key === 'veicoloAttivoId') {
    caricaInfoVeicolo();
  }
});

/*----------------------------------------------------
UTILITY: legge un campo dal veicolo provando più nomi possibili
----------------------------------------------------*/
function campoVeicolo(chiavi) {
  for (const k of chiavi) {
    const v = veicoloAttivoInfo?.[k];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return null;
}

/*----------------------------------------------------
UTILITY: converte un flag booleano (es. isbolloattivo) in testo leggibile
----------------------------------------------------*/
function statoDaBooleano(valore, testoSiTrueVal = 'Attivo', testoNoFalseVal = 'Non attivo') {
  if (valore === true)  return testoSiTrueVal;
  if (valore === false) return testoNoFalseVal;
  return null;
}

/*----------------------------------------------------
UTILITY: formatta una data ISO (YYYY-MM-DD) in gg/mm/aaaa
----------------------------------------------------*/
function formattaData(valore) {
  if (!valore) return '__/__/____';
  const str = String(valore);
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return str; // già in formato italiano
  const parti = str.substring(0, 10).split('-');
  if (parti.length === 3) return parti.reverse().join('/');
  return str;
}

/* ----------------------------------------------------
CARICAMENTO INIZIALE 
----------------------------------------------------*/
async function caricaInterventi() {
  const idVeicolo = getVeicoloAttivoId();
  if (!idVeicolo) return;

  try {
    const res = await fetch(`${API_BASE}/interventi/veicolo/${idVeicolo}`, {
      credentials: 'include',
    });

    if (res.status === 401) {
      logout();
      return;
    }

    if (!res.ok) throw new Error('Errore nel caricamento degli interventi');

    const data = await res.json();

    // Normalizzazione dei date: dal DB arriva ISO completo,con date"
    interventi = data.map(item => ({
      ...item,
      data: item.data.substring(0, 10),
    }));

    renderRows();
  } catch (err) {
    console.error('Errore caricaInterventi:', err);
  }
}

/*----------------------------------------------------
 RENDER TABELLA 
----------------------------------------------------*/

function renderRows() {
  const body  = document.getElementById('tableBody');
  const empty = document.getElementById('emptyState');
  const filtered = currentFilter === 'all'
    ? interventi
    : interventi.filter(i => i.categoria === currentFilter);

  document.getElementById('countBadge').textContent = filtered.length + ' interventi';

  if (filtered.length === 0) {
    body.innerHTML = '';
    empty.classList.add('visible');
    return;
  }
  empty.classList.remove('visible');

  body.innerHTML = filtered.map((item, idx) => `
    <div class="table-row" style="animation-delay:${idx * 0.05}s">

    <div class="date-cell">
      <span class="cat-dot ${item.categoria}"></span>
      ${item.data.split('-').reverse().join('/')}
    </div>

      <div>
        <span class="cat-badge ${item.categoria}">${catLabel(item.categoria)}</span>
      </div>

      <div class="desc-cell">
        <div><b>${item.nome}</b></div>
        ${item.descrizione ? `<div class="desc-sub">${item.descrizione}</div>` : ''}
      </div>

      <div class="mediante-cell">${item.mediante || '—'}</div>
      <div class="citta-cell">${item.citta || '—'}</div>


      <div class="costo-cell ${item.costo ? '' : 'vuoto'}">
        ${item.costo ? Number(item.costo).toFixed(2) + ' €' : '—'}
      </div>

      <div class="actions">
        <button class="action-btn edit-btn" title="Modifica" onclick="openEditModal(${item.id})">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button class="action-btn del-btn" title="Elimina" onclick="deleteRow(${item.id})">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>

    </div>
  `).join('');
}

/* ---------------------------------------------------- 
FILTRI 
----------------------------------------------------*/

function setFilter(f, btn) {
  currentFilter = f;
  document.querySelectorAll('.filter-btn').forEach(b => b.className = 'filter-btn');
  if      (f === 'all')           btn.classList.add('active-all');
  else if (f === 'ordinario')     btn.classList.add('active-ordinario');
  else if (f === 'straordinario') btn.classList.add('active-straordinario');
  else if (f === 'annotazioni')   btn.classList.add('active-annotazioni');
  else                            btn.classList.add('active-gestione');
  renderRows();
}

/*----------------------------------------------------
comando per il DELETE 
----------------------------------------------------*/
async function deleteRow(id) {
  if (!confirm('Eliminare questo intervento?')) return;

  try {
    const res = await fetch(`${API_BASE}/interventi/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (res.status === 401) { logout(); return; }
    if (!res.ok) throw new Error('Errore eliminazione');

    // Rimuovi dall'array locale e aggiorna la UI senza ricaricare
    interventi = interventi.filter(i => i.id !== id);
    renderRows();
  } catch (err) {
    console.error('Errore deleteRow:', err);
    alert('Errore durante l\'eliminazione. Riprova.');
  }
}

/*----------------------------------------------------
MODAL NUOVO INTERVENTO 
----------------------------------------------------*/

function openModal() {
  document.getElementById('modalOverlay').classList.add('open');
  document.getElementById('inputData').value = new Date().toISOString().split('T')[0];
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.getElementById('inputCategoria').value = '';
  document.getElementById('inputNome').innerHTML = '<option value="">Prima seleziona categoria...</option>';
  document.getElementById('inputDescrizione').value = '';
  document.getElementById('inputMediante').value = '';
  document.getElementById('inputCosto').value = '';
}

function updateNomi() {
  const cat = document.getElementById('inputCategoria').value;
  const sel = document.getElementById('inputNome');
  if (!cat) {
    sel.innerHTML = '<option value="">Prima seleziona categoria...</option>';
    return;
  }
  const nomi = tipiIntervento[cat] || [];
  sel.innerHTML = nomi.map(n => `<option value="${n}">${n}</option>`).join('');
}

async function saveIntervento() {
  const data = document.getElementById('inputData').value;
  const cat  = document.getElementById('inputCategoria').value;
  const nome = document.getElementById('inputNome').value;

  if (!data || !cat || !nome) {
    alert('Data, categoria e tipo intervento sono obbligatori.');
    return;
  }

  const idVeicolo = getVeicoloAttivoId();
  if (!idVeicolo) {
    alert('Nessun veicolo attivo selezionato.');
    return;
  }

  const payload = {
    id_veicolo:  idVeicolo,
    data,
    categoria:   cat,
    nome,
    descrizione: document.getElementById('inputDescrizione').value || null,
    mediante:    document.getElementById('inputMediante').value    || null,
    costo:       parseFloat(document.getElementById('inputCosto').value) || null,
  };

  try {
    console.log('📤 Payload inviato:', JSON.stringify(payload));

    const res = await fetch(`${API_BASE}/interventi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    console.log('📥 Status risposta:', res.status);

    if (res.status === 401) { logout(); return; }

    if (!res.ok) {
      const errBody = await res.text();
      console.error('❌ Errore dal server:', errBody);
      alert('Errore ' + res.status + ': ' + errBody);
      return;
    }

    const nuovoIntervento = await res.json();
    nuovoIntervento.data = nuovoIntervento.data.substring(0, 10);

    interventi.unshift(nuovoIntervento);
    closeModal();
    renderRows();
  } catch (err) {
    console.error('❌ Errore saveIntervento:', err);
    alert('Errore durante il salvataggio. Riprova.');
  }
}

// Chiudi modal cliccando fuori
document.getElementById('modalOverlay').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

/*----------------------------------------------------
MODIFICA STORICO 
----------------------------------------------------*/

function updateEditNomi() {
  const cat = document.getElementById('editCategoria').value;
  const sel = document.getElementById('editNome');
  if (!cat) {
    sel.innerHTML = '<option value="">Prima seleziona categoria...</option>';
    return;
  }
  const nomi = tipiIntervento[cat] || [];
  sel.innerHTML = nomi.map(n => `<option value="${n}">${n}</option>`).join('');
}

function openEditModal(id) {
  const item = interventi.find(i => i.id === id);
  if (!item) return;

  document.getElementById('editId').value            = item.id;
  document.getElementById('editData').value          = item.data;
  document.getElementById('editCategoria').value     = item.categoria;
  updateEditNomi();
  document.getElementById('editNome').value          = item.nome;
  document.getElementById('editDescrizione').value   = item.descrizione || '';
  document.getElementById('editMediante').value      = item.mediante    || '';
  document.getElementById('editCosto').value         = item.costo       || '';

  document.getElementById('modalEditOverlay').classList.add('open');
}

function closeEditModal() {
  document.getElementById('modalEditOverlay').classList.remove('open');
}

async function saveEdit() {
  const id   = parseInt(document.getElementById('editId').value);
  const data = document.getElementById('editData').value;
  const cat  = document.getElementById('editCategoria').value;
  const nome = document.getElementById('editNome').value;

  if (!data || !cat || !nome) {
    alert('Data, categoria e tipo intervento sono obbligatori.');
    return;
  }

  const payload = {
    data,
    categoria:   cat,
    nome,
    descrizione: document.getElementById('editDescrizione').value || null,
    mediante:    document.getElementById('editMediante').value    || null,
    costo:       parseFloat(document.getElementById('editCosto').value) || null,
  };

  try {
    const res = await fetch(`${API_BASE}/interventi/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    if (res.status === 401) { logout(); return; }
    if (!res.ok) throw new Error('Errore aggiornamento');

    const aggiornato = await res.json();
    aggiornato.data = aggiornato.data.substring(0, 10);

    // Aggiorna nell'array locale
    const idx = interventi.findIndex(i => i.id === id);
    if (idx !== -1) interventi[idx] = aggiornato;

    closeEditModal();
    renderRows();
  } catch (err) {
    console.error('Errore saveEdit:', err);
    alert('Errore durante la modifica. Riprova.');
  }
}

// Chiudi cliccando fuori
document.getElementById('modalEditOverlay').addEventListener('click', function(e) {
  if (e.target === this) closeEditModal();
});

// ─── AVVIO ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  caricaInterventi();
});

// Ricarica gli interventi quando l'utente cambia veicolo attivo
window.addEventListener('storage', (e) => {
  if (e.key === 'veicoloAttivoId') {
    caricaInterventi();
  }
});


/* ====== CODICE AGGIUNTO  ==================================================
   Riepilogo spese (mese/anno) + Genera PDF
   Nessuna funzione esistente sopra è stata modificata: qui sotto vengono solo
   aggiunte nuove funzioni e, alla fine, un piccolo "hook" che richiama
   calcolaTotali() ogni volta che renderRows() viene eseguita, così i totali
   restano sempre aggiornati senza toccare la funzione originale.
   ========================================================================== */

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

    // item.data è nel formato "YYYY-MM-DD"
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

/*--------------------------------------------------------
UTILITY: etichetta leggibile del periodo scelto
--------------------------------------------------------*/
const nomiMesi = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

function descrizionePeriodo(meseSel) {
  if (meseSel === 'all')  return 'Tutti i mesi';
  if (meseSel === 'sem1') return 'Gennaio - Giugno';
  if (meseSel === 'sem2') return 'Luglio - Dicembre';
  return nomiMesi[Number(meseSel)] || 'Tutti i mesi';
}

/*----------------------------------------------------
FILTRO PER MESE / SEMESTRE
----------------------------------------------------*/
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

// Chiudi modal PDF cliccando fuori
document.getElementById('modalPdfOverlay').addEventListener('click', function (e) {
  if (e.target === this) closePdfModal();
});

/*----------------------------------------------------
SUPPORTO GRAFICO: registrazione font  + logo reale
----------------------------------------------------*/
function registraFontPdf(doc) {
  if (typeof PDF_FONT_INTER_400_BASE64 === 'undefined') return; // se l' asset non carica, si userà Helvetica di fallback

  doc.addFileToVFS('Inter-400.ttf', PDF_FONT_INTER_400_BASE64);
  doc.addFont('Inter-400.ttf', 'Inter', 'normal');

  doc.addFileToVFS('Inter-700.ttf', PDF_FONT_INTER_700_BASE64);
  doc.addFont('Inter-700.ttf', 'Inter', 'bold');

  doc.addFileToVFS('Inter-800.ttf', PDF_FONT_INTER_800_BASE64);
  doc.addFont('Inter-800.ttf', 'InterExtraBold', 'normal');
}

// Font "logico" da usare nel documento: Inter se disponibile, altrimenti Helvetica
function fontBaseDisponibile() {
  return (typeof PDF_FONT_INTER_400_BASE64 !== 'undefined') ? 'Inter' : 'helvetica';
}
function fontTitoloDisponibile() {
  return (typeof PDF_FONT_INTER_800_BASE64 !== 'undefined') ? 'InterExtraBold' : 'helvetica';
}

function disegnaLogoRecars(doc, x, y) {
  // Logo reale (PNG arancione ricavato dal file SVG ufficiale), se disponibile
  if (typeof PDF_LOGO_PNG_BASE64 !== 'undefined') {
    const larghezza = 16;
    const altezza = larghezza * (285 / 400); // stesso rapporto usato nel render PNG
    doc.addImage(PDF_LOGO_PNG_BASE64, 'PNG', x, y - altezza + 5.5, larghezza, altezza);
    return;
  }

  // Fallback: piccolo logo disegnato a vettori se l'asset non è disponibile - funziona anche senza 
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

/*----------------------------------------------------
SUPPORTO GRAFICO: testo con parti in grassetto/normale sulla stessa riga
----------------------------------------------------*/
function scriviTestoMisto(doc, parti, x, y, fontSize = 9, fontFamily = 'helvetica') {
  let cursoreX = x;
  parti.forEach(p => {
    doc.setFont(fontFamily, p.bold ? 'bold' : 'normal');
    doc.setFontSize(fontSize);
    doc.text(p.text, cursoreX, y);
    cursoreX += doc.getTextWidth(p.text);
  });
}

/*----------------------------------------------------
COSTRUZIONE DEL PDF (jsPDF + autotable)
Restituisce il documento pronto, senza scaricarlo:
lo riusano sia scaricaPdf() che anteprimaPdf()
----------------------------------------------------*/
function costruisciDocumentoPdf() {
  if (!window.jspdf) {
    alert('Libreria PDF non ancora caricata, riprova tra un istante.');
    return null;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  registraFontPdf(doc);
  const fontBase   = fontBaseDisponibile();   // 'Inter' oppure fallback 'helvetica'
  const fontTitolo = fontTitoloDisponibile(); // 'InterExtraBold' oppure fallback 'helvetica'

  const anno    = document.getElementById('pdfAnno').value;
  const meseSel = document.getElementById('pdfMese').value;

  let dati = interventi.filter(i => i.data.substring(0, 4) === anno);
  dati = filtraPerMese(dati, meseSel);
  if (currentPdfFilter !== 'all') {
    dati = dati.filter(i => i.categoria === currentPdfFilter);
  }

  const margineSx = 14;
  const margineDx = 196; // A4 = 210mm, margine destro 14mm
  const arancio = [249, 115, 22];
  const grigioTesto = [55, 65, 81];
  const grigioMuto = [110, 110, 110];

  let y = 20;

  /* ---------- HEADER: logo + titolo + sottotitolo ---------- */
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

  // doppia linea arancione sotto l'header
  doc.setDrawColor(...arancio);
  doc.setLineWidth(0.9);
  doc.line(margineSx, y, margineDx, y);
  y += 2.2;
  doc.setLineWidth(0.35);
  doc.line(margineSx, y, margineDx, y);
  y += 9;

  /* ---------- BOX INFO VEICOLO ---------- */
  if (document.getElementById('pdfInfoVeicolo').checked) {
    const nomeVeicolo = document.getElementById('nome-veicolo-attivo')?.textContent?.trim() || '—';
    const targa       = document.getElementById('targa-veicolo-attivo')?.textContent?.trim() || '—';

    // Campi presi dal backend (provo più nomi possibili per ogni campo, incluso lo stile
    // "tuttoattaccato" già confermato da isbolloattivo/isinsured/dataimmatricolazione)
    const alimentazione = campoVeicolo(['alimentazione', 'carburante']);
    const cilindrata     = campoVeicolo(['cilindrata', 'cc']);
    const potenza         = campoVeicolo(['potenza', 'cavalli', 'cv']);
    const marca             = campoVeicolo(['marca']);

    const bolloData   = campoVeicolo([
      'bollo_data', 'bollo_scadenza', 'bolloData', 'bolloScadenza', 'dataScadenzaBollo',
      'databollo', 'scadenzabollo', 'datascadenzabollo', 'bolloscadenza',
    ]);
    // Fonte confermata: campo booleano isbolloattivo (visto in caricaDettagliVeicolo).
    // Se in futuro il backend aggiunge anche un testo esplicito (es. bollo_stato), quello ha la precedenza.
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
      // "rca" = Responsabilità Civile Auto, termine tecnico spesso usato al posto di "assicurazione"
      'rca', 'scadenzarca', 'datarca', 'datascadenzarca', 'rcascadenza', 'datainsured', 'scadenzainsured',
    ]);
    // Fonte confermata: campo booleano isinsured (visto in caricaDettagliVeicolo)
    const assStato = campoVeicolo(['assicurazione_stato', 'assicurazioneStato'])
                        || statoDaBooleano(campoVeicolo(['isinsured']), 'Attiva', 'Non attiva')
                        || 'da verificare';

    // DIAGNOSTICA: apri la console del browser (F12), genera un PDF e guarda questa riga.
    // Ti mostra ESATTAMENTE quali campi sono disponibili per questo veicolo, così possiamo
    // sostituire le liste sopra con i nomi giusti al primo colpo.
    console.log('🔎 Campi disponibili per il PDF (veicoloAttivoInfo):', veicoloAttivoInfo);

    const xBox = margineSx + 6;
    const larghezzaBox = margineDx - margineSx;
    const larghezzaTesto = larghezzaBox - 12;

    // Costruisco l'elenco delle righe da scrivere: l'altezza del box si calcola da qui
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

    // La riga assicurazione può essere lunga (nome compagnia) -> vado a capo se serve
    doc.setFont(fontBase, 'normal');
    doc.setFontSize(9.5);
    const assicurazioneLabel = `Assicurazione: ${assCompagnia ? assCompagnia + ' · ' : ''}${assStato} · scadenza ${formattaData(assData)}`;
    const righeAssicurazione = doc.splitTextToSize(assicurazioneLabel, larghezzaTesto);
    righeAssicurazione.forEach((rigaTesto, idx) => {
      righe.push({ testo: rigaTesto, bold: false, size: 9.5, spazioDopo: idx === righeAssicurazione.length - 1 ? 8 : 5 });
    });

    // Altezza box calcolata dal contenuto reale (+ un po' di respiro sopra/sotto)
    const altezzaBox = righe.reduce((tot, r) => tot + r.spazioDopo, 0) + 4;

    doc.setFillColor(253, 231, 211); // peach chiaro coerente con --iv-orange2
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

  /* ---------- RIGA DI RIFERIMENTO REPORT ---------- */
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
      styles: { font: fontBase, fontSize: 9.5, cellPadding: 3, lineColor: [230, 230, 230], lineWidth: 0.2 },
      headStyles: { fillColor: arancio, textColor: 255, fontStyle: 'bold', halign: 'left' },
      bodyStyles: { textColor: grigioTesto },
      alternateRowStyles: { fillColor: [255, 255, 255] },
      margin: { left: margineSx, right: 210 - margineDx },
    });

    y = doc.lastAutoTable.finalY + 10;
  }

  /* ---------- TABELLA CRONOLOGIA INTERVENTI ---------- */
  if (document.getElementById('pdfCronologia').checked) {
    doc.setFont(fontBase, 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(...grigioTesto);
    doc.text('Tabella cronologia interventi', margineSx, y);
    y += 4;

    const bodyCronologia = dati
      .slice()
      .sort((a, b) => a.data.localeCompare(b.data))
      .map(i => [
        i.data.split('-').reverse().join('/'),
        catLabel(i.categoria),
        i.nome + (i.descrizione ? ' - ' + i.descrizione : ''),
        i.mediante || '—',
        i.costo ? Number(i.costo).toFixed(2) + ' €' : '—',
      ]);

    doc.autoTable({
      startY: y,
      head: [['Data', 'Categoria', 'Descrizione', 'Fornitore', 'Costo']],
      body: bodyCronologia.length ? bodyCronologia : [['—', '—', 'Nessun intervento nel periodo selezionato', '—', '—']],
      theme: 'grid',
      styles: { font: fontBase, fontSize: 9, cellPadding: 3, lineColor: [230, 230, 230], lineWidth: 0.2 },
      headStyles: { fillColor: arancio, textColor: 255, fontStyle: 'bold', halign: 'left' },
      bodyStyles: { textColor: grigioTesto },
      alternateRowStyles: { fillColor: [255, 255, 255] },
      margin: { left: margineSx, right: 210 - margineDx },
      columnStyles: { 2: { cellWidth: 60 } },
    });
  }

  const suffissoPeriodo = meseSel === 'all' ? '' : `-${meseSel === 'sem1' ? 'gen-giu' : meseSel === 'sem2' ? 'lug-dic' : nomiMesi[Number(meseSel)].toLowerCase()}`;
  const nomeFile = `recars-report-interventi-${anno}${suffissoPeriodo}.pdf`;

  return { doc, nomeFile };
}

/*----------------------------------------------------
--------------DOWNLOAD del PDF (bottone "Download")
----------------------------------------------------*/
function scaricaPdf() {
  const risultato = costruisciDocumentoPdf();
  if (!risultato) return;

  risultato.doc.save(risultato.nomeFile);
  closePdfModal();
}

/*----------------------------------------------------
ANTEPRIMA del PDF (bottone "Anteprima")
Apre il PDF in una nuova scheda usando il visualizzatore
nativo del browser, senza scaricare nulla
----------------------------------------------------*/
function anteprimaPdf() {
  const risultato = costruisciDocumentoPdf();
  if (!risultato) return;

  const url = risultato.doc.output('bloburl');
  const finestra = window.open(url, '_blank');

  if (!finestra) {
    alert('Il browser ha bloccato l\'apertura dell\'anteprima. Consenti i popup per questo sito e riprova.');
  }
}

/*----------------------------------------------------
HOOK: aggiorna i totali dopo ogni render
----------------------------------------------------*/
(function agganciaCalcoloTotali() {
  const renderRowsOriginale = renderRows;
  renderRows = function () {
    renderRowsOriginale.apply(this, arguments);
    calcolaTotali();
  };
})();
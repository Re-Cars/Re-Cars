/* ---------------------------------------------------- 
 come chiamare dati reali al backend
----------------------------------------------------*/

const API_BASE = 'http://localhost:3000';

const tipiIntervento = {
  ordinario:     ['Benzina','Cambio olio','Cambio tergicristalli','Gomme','Batteria','Controllo livelli','Pastiglie freni','Liquido freni','Liquido raffreddamento','Filtri motore','Pulizia iniettori','Tagliando','Altro'],
  straordinario: ['Cinghia distribuzione','Carrozzeria','Riparazioni','Impianto elettrico','Luci','Frizione','Ammortizzatori','Radiatore','Sensori','Compressore clima','Marmitta','Altro'],
  gestione:      ['Assicurazione','Bollo','Revisione','Multa','Pedaggi','Parcheggio'],
  annotazioni:   ['Problemi','luci','motore','elettrico','rumori','altro'],
};

let interventi = [];
let currentFilter = 'all';

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
------------------CARICAMENTO INIZIALE 
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
-------------- RENDER TABELLA 
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
        <div>${item.nome}</div>
        ${item.descrizione ? `<div class="desc-sub">${item.descrizione}</div>` : ''}
      </div>

      <div class="mediante-cell">${item.mediante || '—'}</div>

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
--------------------FILTRI 
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
--------------comando per il DELETE 
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
--------------MODAL NUOVO INTERVENTO 
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
---------------MODIFICA STORICO 
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


/* ==========================================================================
   ==========================  CODICE AGGIUNTO  ============================
   Riepilogo spese (mese/anno) + Genera PDF
   Nessuna funzione esistente sopra è stata modificata: qui sotto vengono solo
   aggiunte nuove funzioni e, alla fine, un piccolo "hook" che richiama
   calcolaTotali() ogni volta che renderRows() viene eseguita, così i totali
   restano sempre aggiornati senza toccare la funzione originale.
   ========================================================================== */

let currentPdfFilter = 'all';

/*----------------------------------------------------
--------------RIEPILOGO SPESE (mese corrente / anno corrente)
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
--------------MODAL GENERA PDF
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
  document.getElementById('modalPdfOverlay').classList.add('open');
}

function closePdfModal() {
  document.getElementById('modalPdfOverlay').classList.remove('open');
}

// Chiudi modal PDF cliccando fuori
document.getElementById('modalPdfOverlay').addEventListener('click', function (e) {
  if (e.target === this) closePdfModal();
});

/*----------------------------------------------------
--------------GENERAZIONE DEL PDF (jsPDF + autotable)
----------------------------------------------------*/
function generaPdf() {
  if (!window.jspdf) {
    alert('Libreria PDF non ancora caricata, riprova tra un istante.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const anno = document.getElementById('pdfAnno').value;

  let dati = interventi.filter(i => i.data.substring(0, 4) === anno);
  if (currentPdfFilter !== 'all') {
    dati = dati.filter(i => i.categoria === currentPdfFilter);
  }

  let y = 18;

  doc.setFontSize(16);
  doc.setTextColor(249, 115, 22);
  doc.text('RE|CARS — Report Interventi', 14, y);
  doc.setTextColor(0, 0, 0);
  y += 10;

  // Sezione: info generali veicolo
  if (document.getElementById('pdfInfoVeicolo').checked) {
    const nomeVeicolo = document.getElementById('nome-veicolo-attivo')?.textContent?.trim() || '—';
    const targa       = document.getElementById('targa-veicolo-attivo')?.textContent?.trim() || '—';

    doc.setFontSize(12);
    doc.text('Info generali veicolo', 14, y);
    y += 7;
    doc.setFontSize(10);
    doc.text(`Veicolo: ${nomeVeicolo}`, 14, y); y += 6;
    doc.text(`Targa: ${targa}`, 14, y); y += 6;
    doc.text(`Anno di riferimento: ${anno}`, 14, y); y += 6;
    doc.text(`Tipologia: ${currentPdfFilter === 'all' ? 'Tutte' : catLabel(currentPdfFilter)}`, 14, y);
    y += 10;
  }

  // Sezione: tabella costo generale (totali per categoria)
  if (document.getElementById('pdfCostoGenerale').checked) {
    doc.setFontSize(12);
    doc.text('Tabella costo generale', 14, y);
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
      headStyles: { fillColor: [249, 115, 22] },
      margin: { left: 14, right: 14 },
      styles: { fontSize: 10 },
    });

    y = doc.lastAutoTable.finalY + 10;
  }

  // Sezione: tabella cronologia interventi (dettaglio righe)
  if (document.getElementById('pdfCronologia').checked) {
    doc.setFontSize(12);
    doc.text('Tabella cronologia interventi', 14, y);
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
      headStyles: { fillColor: [249, 115, 22] },
      margin: { left: 14, right: 14 },
      styles: { fontSize: 9 },
    });
  }

  doc.save(`recars-report-interventi-${anno}.pdf`);
  closePdfModal();
}

/*----------------------------------------------------
--------------HOOK: aggiorna i totali dopo ogni render
----------------------------------------------------*/
(function agganciaCalcoloTotali() {
  const renderRowsOriginale = renderRows;
  renderRows = function () {
    renderRowsOriginale.apply(this, arguments);
    calcolaTotali();
  };
})();
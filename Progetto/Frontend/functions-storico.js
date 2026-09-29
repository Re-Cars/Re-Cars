const API_BASE = window.API_URL || 'https://re-cars-backend.onrender.com';

const tipiIntervento = {
  /*ordinario:     ['Benzina','Cambio olio','Cambio tergicristalli','Gomme','Batteria','Controllo livelli','Pastiglie freni','Liquido freni','Liquido raffreddamento','Filtri motore','Pulizia iniettori','Altro'],*/
  ordinario:      ['Tagliando','Revisione','Ricarica Carburante','Rifornimento','Cambio', 'Controllo', 'Pulizia','Aggiunta','Altro'],
  /*straordinario: ['Cinghia distribuzione','Carrozzeria','Riparazioni','Impianto elettrico','Luci','Frizione','Ammortizzatori','Radiatore','Sensori','Compressore clima','Marmitta','Altro'],*/
  straordinario:   ['Riparazione', 'Controllo', 'Modifica veicolo', 'Altro'], 
  gestione:      ['Assicurazione','Bollo','Revisione','Tagliando','Revisione','Multa','Pedaggi','Parcheggio','Altro'],
  /*annotazioni:   ['Problemi','luci','motore','elettrico','rumori','altro'],*/
  annotazioni:   ['Problemi', 'Altro']
};



let interventi = [];
let currentFilter = 'all';
let searchQuery = ''; // testo di ricerca corrente (già in minuscolo, trimmato), combinato AND col filtro categoria
let veicoloAttivoInfo = {}; // dati generali veicolo (alimentazione, cilindrata, bollo, assicurazione...) per il PDF
let cittaCache = []; // ultimi risultati della ricerca città, usati per validare la scelta al salvataggio
 
/* ----------------------------------------------------
RICERCA LIVE CITTÀ (per l'autocompletamento nei form)
Usa l'endpoint esistente GET /citta?q=... (richiede almeno 2 caratteri)
----------------------------------------------------*/
async function cercaCitta(query) {
  if (!query || query.length < 2) return [];
  try {
    const res = await fetch(`${API_BASE}/citta?q=${encodeURIComponent(query)}`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Errore ricerca città');
    return await res.json();
  } catch (err) {
    console.error('Errore cercaCitta:', err);
    return [];
  }
}
 
// Debounce per non interrogare il backend ad ogni singola lettera digitata
// (usata sia per l'autocompletamento città sia per la ricerca testuale nello storico).
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
 
async function aggiornaSuggerimentiCitta(inputId) {
  const input = document.getElementById(inputId);
  const risultati = await cercaCitta(input.value);
  cittaCache = risultati; // salvo per la validazione al momento del salvataggio
 
  const datalist = document.getElementById('citta-datalist');
  if (datalist) {
    datalist.innerHTML = risultati.map(c => `<option value="${c.nome}">`).join('');
  }
}
 
const aggiornaSuggerimentiCittaDebounced = debounce(aggiornaSuggerimentiCitta, 300);
 
/*----------------------------------------------------
UTILITY: converte il nome città digitato dall'utente nella sigla per il backend.
Ritorna: sigla valida (string) | null (campo lasciato vuoto) | undefined (nome non riconosciuto)
----------------------------------------------------*/
function siglaDaNomeCitta(nomeDigitato) {
  const nome = (nomeDigitato || '').trim();
  if (!nome) return null;
  const trovata = cittaCache.find(c => c.nome.toLowerCase() === nome.toLowerCase());
  return trovata ? trovata.sigla : undefined;
}
 
/*---------------------------------------------------
 UTILITY CONDIVISE - relazione con il function-pdf.js
----------------------------------------------------*/
function catLabel(cat) {
  if (cat === 'gestione') return 'Spese di gest.';
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}
 
// Versione abbreviata, usata solo nei badge dentro le righe della tabella (non nei filtri né nel PDF)
function catLabelShort(cat) {
  const abbreviazioni = {
    ordinario: 'Ord.',
    straordinario: 'Straord.',
    annotazioni: 'Ann.',
    gestione: 'Sp. di gest.',
  };
  return abbreviazioni[cat] || catLabel(cat);
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
    const res = await fetch(`${API_BASE}/veicolo/${idVeicolo}`, {
      credentials: 'include',
    });
 
    if (!res.ok) throw new Error('Errore nel caricamento dei dati veicolo');
 
    const v = await res.json();
 
    const dg = (v.dati_generici && v.dati_generici[0]) || {};
    const ds = (v.dati_specifici && v.dati_specifici[0]) || {};
 
    veicoloAttivoInfo = { ...dg, ...ds, _generici: dg, _specifici: ds, _root: v };
  } catch (err) {
    console.error('Errore caricaInfoVeicolo:', err);
    veicoloAttivoInfo = {};
  }
}
 
// Carico i dati generali veicolo appena la pagina è pronta (in aggiunta, non al posto di, caricaInterventi)
// e collego la ricerca live delle città ai due campi input (nuovo intervento + modifica)
document.addEventListener('DOMContentLoaded', () => {
  caricaInfoVeicolo();
 
  const inputCitta = document.getElementById('inputCitta');
  if (inputCitta) {
    inputCitta.addEventListener('input', () => aggiornaSuggerimentiCittaDebounced('inputCitta'));
  }
 
  const editCitta = document.getElementById('editCitta');
  if (editCitta) {
    editCitta.addEventListener('input', () => aggiornaSuggerimentiCittaDebounced('editCitta'));
  }
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
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return str;
  const parti = str.substring(0, 10).split('-');
  if (parti.length === 3) return parti.reverse().join('/');
  return str;
}
 
/*----------------------------------------------------
UTILITY: riordina l'array interventi per data decrescente (più recente in cima)
----------------------------------------------------*/
function ordinaInterventi() {
  interventi.sort((a, b) => b.data.localeCompare(a.data));
}
 
/*----------------------------------------------------
RIEPILOGO MANUTENZIONE (sidebar sinistra): trova l'intervento più
recente di un dato tipo (es. "Tagliando", "Revisione") tra TUTTI gli
interventi caricati 
----------------------------------------------------*/
function trovaUltimoIntervento(tipoCercato) {
  const trovati = interventi.filter(i => i.tipo === tipoCercato);
  if (trovati.length === 0) return null;
 
  // Non do per scontato che "interventi" sia già ordinato: cerco
  // esplicitamente la data più recente tra quelli trovati.
  return trovati.reduce((piuRecente, corrente) =>
    corrente.data > piuRecente.data ? corrente : piuRecente
  );
}
 
function aggiornaRiepilogoManutenzione() {
  const elTagliando = document.getElementById('ultimoTagliando');
  const elRevisione = document.getElementById('ultimaRevisione');
 
  if (elTagliando) {
    const ultimoTagliando = trovaUltimoIntervento('Tagliando');
    elTagliando.textContent = ultimoTagliando
      ? ultimoTagliando.data.split('-').reverse().join('/')
      : 'Nessun tagliando registrato';
  }
 
  if (elRevisione) {
    const ultimaRevisione = trovaUltimoIntervento('Revisione');
    elRevisione.textContent = ultimaRevisione
      ? ultimaRevisione.data.split('-').reverse().join('/')
      : 'Nessuna revisione registrata';
  }
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
 
  let filtered = currentFilter === 'all'
    ? interventi
    : interventi.filter(i => i.categoria === currentFilter);
 
  // Filtro testuale: cerca in tipo, descrizione, mediante e città.
  if (searchQuery) {
    filtered = filtered.filter(i => {
      const campi = [i.tipo, i.descrizione, i.mediante, i.citta?.nome];
      return campi.some(campo => campo && campo.toLowerCase().includes(searchQuery));
    });
  }
 
  document.getElementById('countBadge').textContent = filtered.length + ' interventi';
 
  if (filtered.length === 0) {
    body.innerHTML = '';
    empty.classList.add('visible');
    // Messaggio differenziato: se non trova nulla 
    empty.textContent = searchQuery
      ? 'Nessun intervento trovato per questa ricerca.'
      : 'Nessun intervento trovato per questa categoria.';
  } else {
    empty.classList.remove('visible');
 
    body.innerHTML = filtered.map((item, idx) => `
      <div class="table-row" style="animation-delay:${idx * 0.05}s">
 
      <div class="date-cell">
        <div class="date-main">
          <span class="cat-dot ${item.categoria}"></span>
          ${item.data.split('-').reverse().join('/')}
        </div>
        <div class="date-cat-sub"><span class="cat-badge ${item.categoria}">${catLabelShort(item.categoria)}</span></div>
      </div>
 
        <div>
          <span class="cat-badge ${item.categoria}">${catLabel(item.categoria)}</span>
        </div>
 
        <div class="desc-cell">
          <div><b>${item.tipo}</b></div>
          ${item.descrizione ? `<div class="desc-sub">${item.descrizione}</div>` : ''}
        </div>
 
        <div class="mediante-cell">${item.mediante || '—'}</div>
 
        <div class="citta-cell">${item.citta?.nome || '—'}</div>
 
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
 
  // Aggiorna il riepilogo spese (mese/anno) se functions-pdf.js è caricato.
  // Chiamata esplicita (invece del monkey-patch usato in precedenza) così
  // se functions-pdf.js non è presente in pagina questo file non si rompe,
  // e non c'è rischio che un altro script ridefinisca renderRows()
  // "silenziando" l'aggiornamento dei totali senza dare errori.
  if (typeof calcolaTotali === 'function') {
    calcolaTotali();
  }
 
  // Aggiorna il riepilogo manutenzione (ultimo tagliando/revisione),
  // sempre sull'intero array "interventi", non su quello filtrato sopra.
  aggiornaRiepilogoManutenzione();
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
RICERCA TESTUALE 
Cerca in: tipo, descrizione, mediante, città. Non tocca il backend:
filtra l'array "interventi" già caricato in memoria, come setFilter().
----------------------------------------------------*/
function eseguiRicerca(valore) {
  searchQuery = (valore || '').trim().toLowerCase();
 
  const clearBtn = document.getElementById('searchClearBtn');
  if (clearBtn) clearBtn.style.display = searchQuery ? 'block' : 'none';
 
  renderRows();
}
 
const eseguiRicercaDebounced = debounce(eseguiRicerca, 250);
 
function clearSearch() {
  const input = document.getElementById('searchInput');
  if (input) input.value = '';
  eseguiRicerca('');
}
 
// Collego l'input di ricerca appena la pagina è pronta
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => eseguiRicercaDebounced(e.target.value));
  }
});
 
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
  document.getElementById('inputCitta').value = '';
  document.getElementById('inputCosto').value = '';
}
 
/*----------------------------------------------------
UTILITY CONDIVISA: popola il <select> "Tipo intervento" in base alla categoria scelta.
 
----------------------------------------------------*/
function aggiornaSelectTipo(prefix) {
  const cat = document.getElementById(`${prefix}Categoria`).value;
  const sel = document.getElementById(`${prefix}Nome`);
  if (!cat) {
    sel.innerHTML = '<option value="">Prima seleziona categoria...</option>';
    return;
  }
  const nomi = tipiIntervento[cat] || [];
  sel.innerHTML = nomi.map(n => `<option value="${n}">${n}</option>`).join('');
}
 
// Wrapper con i nomi originali, richiamati dagli onchange nell'HTML: nessuna modifica al markup necessaria
function updateNomi() { aggiornaSelectTipo('input'); }
function updateEditNomi() { aggiornaSelectTipo('edit'); }
 
/*----------------------------------------------------
UTILITY CONDIVISA: legge e valida i campi comuni ai form "Nuovo" e "Modifica"
----------------------------------------------------*/
function leggiEValidaFormIntervento(prefix) {
  const data = document.getElementById(`${prefix}Data`).value;
  const cat  = document.getElementById(`${prefix}Categoria`).value;
  const nome = document.getElementById(`${prefix}Nome`).value;
 
  if (!data || !cat || !nome) {
    alert('Data, categoria e tipo intervento sono obbligatori.');
    return null;
  }
 
  const cittaInput = document.getElementById(`${prefix}Citta`).value;
  const siglaCitta = siglaDaNomeCitta(cittaInput);
 
  if (siglaCitta === undefined) {
    alert('Città non riconosciuta. Selezionane una dai suggerimenti proposti oppure lascia il campo vuoto.');
    return null;
  }
 
  return {
    data,
    categoria:   cat,
    tipo:        nome,
    descrizione: document.getElementById(`${prefix}Descrizione`).value || null,
    mediante:    document.getElementById(`${prefix}Mediante`).value    || null,
    costo:       parseFloat(document.getElementById(`${prefix}Costo`).value) || null,
    sigla_citta: siglaCitta,
  };
}
 
async function saveIntervento() {
  const idVeicolo = getVeicoloAttivoId();
  if (!idVeicolo) {
    alert('Nessun veicolo attivo selezionato.');
    return;
  }
 
  const payloadBase = leggiEValidaFormIntervento('input');
  if (!payloadBase) return; // validazione fallita, alert già mostrato
 
  const payload = { id_veicolo: idVeicolo, ...payloadBase };
 
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
    ordinaInterventi();
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
 
function openEditModal(id) {
  const item = interventi.find(i => i.id === id);
  if (!item) return;
 
  document.getElementById('editId').value            = item.id;
  document.getElementById('editData').value          = item.data;
  document.getElementById('editCategoria').value     = item.categoria;
  updateEditNomi();
  document.getElementById('editNome').value          = item.tipo;
  document.getElementById('editDescrizione').value   = item.descrizione || '';
  document.getElementById('editMediante').value      = item.mediante    || '';
  document.getElementById('editCitta').value         = item.citta?.nome || '';
  document.getElementById('editCosto').value         = item.costo       || '';
 
  document.getElementById('modalEditOverlay').classList.add('open');
}
 
function closeEditModal() {
  document.getElementById('modalEditOverlay').classList.remove('open');
}
 
async function saveEdit() {
  const id = parseInt(document.getElementById('editId').value);
 
  const payload = leggiEValidaFormIntervento('edit');
  if (!payload) return; // validazione fallita, alert già mostrato
 
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
 
    const idx = interventi.findIndex(i => i.id === id);
    if (idx !== -1) interventi[idx] = aggiornato;
    ordinaInterventi();
 
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
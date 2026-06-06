const tipiIntervento = {
  ordinario:     ['Cambio olio','Cambio tergicristalli','Gomme','Batteria','Controllo livelli','Pastiglie freni','Tagliando','Altro'],
  straordinario: ['Cinghia distribuzione','Carrozzeria','Riparazioni','Impianto elettrico','Luci','Frizione','Ammortizzatori','Altro'],
  gestione:      ['Assicurazione','Bollo','Revisione','Multa','Pedaggi','Parcheggio']
};
 
let interventi = [
  { id:1, data:'2026-01-15', categoria:'ordinario',     nome:'Cambio olio',           descrizione:'cambio olio motore',         mediante:'Officina Rossi',      costo:60  },
  { id:2, data:'2026-02-20', categoria:'ordinario',     nome:'Cambio tergicristalli',  descrizione:'sostituzione tergicristalli', mediante:null,                  costo:25  },
  { id:3, data:'2026-03-10', categoria:'straordinario', nome:'Cinghia distribuzione',  descrizione:'rottura cinghia',            mediante:'Autofficina Bianchi', costo:350 },
  { id:4, data:'2026-04-01', categoria:'gestione',      nome:'Assicurazione',          descrizione:'rinnovo assicurazione',      mediante:null,                  costo:600 },
  { id:5, data:'2026-04-22', categoria:'ordinario',     nome:'Gomme',                  descrizione:'cambio gomme stagionali',    mediante:'Gommista Ferrari',    costo:200 },
];
 
let currentFilter = 'all';
let nextId = 6;
 
function catLabel(cat) {
  if (cat === 'gestione') return 'Spese di gestione';
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}
 
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
 
      <!-- DATA + PALLINO -->
      <div class="date-cell">
        <span class="cat-dot ${item.categoria}"></span>
        ${item.data}
      </div>
 
      <!-- CATEGORIA BADGE -->
      <div>
        <span class="cat-badge ${item.categoria}">${catLabel(item.categoria)}</span>
      </div>
 
      <!-- DESCRIZIONE -->
      <div class="desc-cell">
        <div>${item.nome}</div>
        ${item.descrizione ? `<div class="desc-sub">${item.descrizione}</div>` : ''}
      </div>
 
      <!-- MEDIANTE -->
      <div class="mediante-cell">${item.mediante || '—'}</div>
 
      <!-- COSTO -->
      <div class="costo-cell ${item.costo ? '' : 'vuoto'}">
        ${item.costo ? item.costo.toFixed(2) + ' €' : '—'}
      </div>
 
      <!-- AZIONI -->
      <div class="actions">
        <button class="action-btn edit-btn" title="Modifica">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button class="action-btn del-btn" title="Elimina" onclick="deleteRow(${item.id})">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
 
    </div>
  `).join('');
}
 
function setFilter(f, btn) {
  currentFilter = f;
  document.querySelectorAll('.filter-btn').forEach(b => b.className = 'filter-btn');
  if      (f === 'all')           btn.classList.add('active-all');
  else if (f === 'ordinario')     btn.classList.add('active-ordinario');
  else if (f === 'straordinario') btn.classList.add('active-straordinario');
  else                            btn.classList.add('active-gestione');
  renderRows();
}
 
function deleteRow(id) {
  if (!confirm('Eliminare questo intervento?')) return;
  interventi = interventi.filter(i => i.id !== id);
  renderRows();
}
 
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
 
function saveIntervento() {
  const data = document.getElementById('inputData').value;
  const cat  = document.getElementById('inputCategoria').value;
  const nome = document.getElementById('inputNome').value;
  if (!data || !cat || !nome) {
    alert('Data, categoria e tipo intervento sono obbligatori.');
    return;
  }
  interventi.unshift({
    id:          nextId++,
    data,
    categoria:   cat,
    nome,
    descrizione: document.getElementById('inputDescrizione').value || null,
    mediante:    document.getElementById('inputMediante').value    || null,
    costo:       parseFloat(document.getElementById('inputCosto').value) || null,
  });
  closeModal();
  renderRows();
}
 
// Chiudi modal cliccando fuori
document.getElementById('modalOverlay').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});
 
renderRows();
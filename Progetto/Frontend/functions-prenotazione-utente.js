/* ═══════════════════════════════════════════════════════════
   ① CONFIGURAZIONE ENDPOINT NESTJS
   ═══════════════════════════════════════════════════════════ */
const API_BASE          = 'http://localhost:3000'; 
const ENDPOINT_OFFICINE = `${API_BASE}/officina/all`; 
const ENDPOINT_PRENOTA  = `${API_BASE}/prenotazioni`;
const SLOT_ORARI        = ['08:00','09:00','10:00','11:00','14:00','15:00','16:00','17:00'];

/* ═══════════════════════════════════════════════════════════
   ② STATO APPLICAZIONE
   ═══════════════════════════════════════════════════════════ */
let tutteLeOfficine     = [];   
let officineVisibili    = [];   
let officineSelezionata = null;
let filtroCategoria     = null;
let sortAsc             = true;
let slotSelezionato     = null;
let mappaLeaflet        = null;  
let markerAttivo        = null;  

/* ═══════════════════════════════════════════════════════════
   ③ FETCH OFFICINE DAL DATABASE (NESTJS)
   ═══════════════════════════════════════════════════════════ */
async function caricaOfficine() {
    mostraStato('skeleton');

    try {
        const res = await fetch(ENDPOINT_OFFICINE, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });

        if (!res.ok) throw new Error(`Errore Server: ${res.status}`);

        const data = await res.json();

        tutteLeOfficine = data.map(o => ({
            id:            o.id,
            nome:          o.nome || 'Officina senza nome',           
            specialita:    o.specialita || 'Meccanica Generale',
            categoria:     o.categoria || 'Meccanica',
            stelle:        parseFloat(o.stelle || 4.5), 
            recensioni:    parseInt(o.recensioni || 12),
            distanza_km:   parseFloat(o.distanza_km || 0),
            aperta:        o.aperta !== undefined ? o.aperta : true,
            orario:        o.orario || '08:00 - 18:00',
            disponibilita: o.disponibilita || 'Immediata',
            indirizzo:     o.indirizzo || 'Indirizzo non specificato',
            telefono:      o.telefono || '',
            lat:           parseFloat(o.latitude || o.lat || 45.4642),  
            lng:           parseFloat(o.longitude || o.lng || 9.1900),
            servizi:       Array.isArray(o.servizi) ? o.servizi : (o.servizi ? o.servizi.split(',') : ['Riparazione', 'Tagliando']),
        }));

        officineVisibili = [...tutteLeOfficine];
        applicaSort();
        renderFiltriCategorie();
        renderLista();
        mostraStato('lista');

        if (officineVisibili.length > 0) {
            selezionaOfficina(officineVisibili[0]);
        } else {
            mostraStato('vuoto');
        }

    } catch (err) {
        console.error('Errore caricamento officine dal database:', err);
        mostraStato('errore');
    }
}

async function geocodificaIndirizzo(indirizzo) {
    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(indirizzo)}&limit=1`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.length > 0) {
            return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        }
    } catch (e) {
        console.warn('Geocodifica fallita, uso coordinate di default.', e);
    }
    return { lat: 45.4642, lng: 9.1900 }; 
}

/* ═══════════════════════════════════════════════════════════
   ④ RENDER LISTA OFFICINE (COLONNA SINISTRA)
   ═══════════════════════════════════════════════════════════ */
function renderLista() {
    const container = document.getElementById('officine-list');
    document.getElementById('risultati-count').textContent =
        officineVisibili.length + ' risultat' + (officineVisibili.length === 1 ? 'o' : 'i');

    container.innerHTML = '';

    if (officineVisibili.length === 0) {
        document.getElementById('no-results').style.display = 'flex';
        return;
    }
    document.getElementById('no-results').style.display = 'none';

    officineVisibili.forEach(o => container.appendChild(creaCardOfficina(o)));
}

function creaCardOfficina(o) {
    const isActive = officineSelezionata?.id === o.id;
    const iniziale = o.nome.charAt(0).toUpperCase();
    const colori = ['#f97316','#ea580c','#d97706','#16a34a','#1e3a8a','#7c3aed','#0891b2'];
    const colore  = colori[o.nome.charCodeAt(0) % colori.length];

    const badgeHTML = o.aperta
        ? `<span style="background:rgba(74,222,128,0.15);color:#22c55e;font-size:0.7rem;padding:2px 6px;border-radius:4px;font-weight:700;">• Aperta</span>`
        : `<span style="background:rgba(248,113,113,0.15);color:#f87171;font-size:0.7rem;padding:2px 6px;border-radius:4px;font-weight:700;">• Chiusa</span>`;

    const tagsHTML = o.servizi.slice(0, 3).map(s =>
        `<span style="font-size:0.65rem;background:var(--surface-2);padding:2px 6px;border-radius:4px;color:var(--text);">${s}</span>`
    ).join('');

    const card = document.createElement('div');
    card.className = 'vehicle-result-card';
    card.style.cssText = `
        margin-top:0; cursor:pointer; transition:0.2s;
        background:${isActive ? 'rgba(249,115,22,0.08)' : 'var(--surface)'};
        border:1px solid ${isActive ? 'rgba(249,115,22,0.4)' : 'var(--border)'};
    `;
    card.innerHTML = `
        <div style="padding:16px;display:flex;gap:14px;">
            <div style="width:45px;height:45px;background:${colore};border-radius:10px;
                        display:flex;align-items:center;justify-content:center;
                        color:#fff;font-weight:800;font-size:1.2rem;flex-shrink:0;">
                ${iniziale}
            </div>
            <div style="flex:1;min-width:0;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:4px;">
                    <h3 style="margin:0;font-size:0.95rem;color:var(--text);font-weight:700;
                               overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                        ${o.nome}
                    </h3>
                    ${badgeHTML}
                </div>
                <p style="margin:2px 0 6px 0;font-size:0.75rem;color:var(--text-muted);">${o.specialita}</p>
                <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.75rem;">
                    <span style="color:#fbbf24;">
                        ${renderStelle(o.stelle)}
                        <strong style="color:var(--text);margin-left:2px;">${o.stelle}</strong>
                        <span style="color:var(--text-muted);">(${o.recensioni})</span>
                    </span>
                    <span style="color:var(--text-muted);font-weight:600;">${o.distanza_km} km</span>
                </div>
                <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;">${tagsHTML}</div>
            </div>
        </div>`;

    card.addEventListener('click', () => selezionaOfficina(o));
    return card;
}

/* ═══════════════════════════════════════════════════════════
   ⑤ RENDER DETTAGLIO + GESTIONE MAPPA (COLONNA DESTRA)
   ═══════════════════════════════════════════════════════════ */
function renderDettaglio(o) {
    const box = document.getElementById('dettaglio-box');

    const badgeHTML = o.aperta
        ? `<span style="background:rgba(74,222,128,0.12);color:#22c55e;border:1px solid rgba(74,222,128,0.2);font-size:0.75rem;padding:4px 10px;border-radius:6px;font-weight:700;">Aperta ora</span>`
        : `<span style="background:rgba(248,113,113,0.12);color:#f87171;border:1px solid rgba(248,113,113,0.2);font-size:0.75rem;padding:4px 10px;border-radius:6px;font-weight:700;">Chiusa</span>`;

    const serviziHTML = o.servizi.map(s =>
        `<span style="font-size:0.75rem;background:rgba(249,115,22,0.1);border:1px solid rgba(249,115,22,0.2);
                      padding:4px 10px;border-radius:6px;color:var(--text);">
            <i class="fa-solid fa-check" style="color:#f97316;margin-right:4px;"></i>${s}
         </span>`
    ).join('');

    const salvata = isOfficinaSalvata(o.id);

    box.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
            <div>
                <h2 style="margin:0;font-size:1.4rem;color:var(--text);font-weight:800;">${o.nome}</h2>
                <p style="margin:4px 0 0 0;font-size:0.85rem;color:var(--text-muted);">${o.specialita}</p>
                <div style="display:flex;align-items:center;gap:6px;margin-top:6px;font-size:0.85rem;color:#fbbf24;">
                    ${renderStelle(o.stelle)}
                    <strong style="color:var(--text);margin-left:2px;">${o.stelle}</strong>
                    <span style="color:var(--text-muted);font-weight:400;">· ${o.recensioni} recensioni</span>
                </div>
            </div>
            ${badgeHTML}
        </div>

        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
            <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:12px;padding:12px;text-align:center;">
                <i class="fa-regular fa-clock" style="color:#f97316;font-size:1.1rem;margin-bottom:6px;"></i>
                <span style="display:block;font-size:0.6rem;color:var(--text-muted);text-transform:uppercase;font-weight:700;letter-spacing:0.5px;">Orario</span>
                <span style="display:block;font-size:0.8rem;font-weight:600;color:var(--text);margin-top:2px;">${o.orario}</span>
            </div>
            <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:12px;padding:12px;text-align:center;">
                <i class="fa-solid fa-location-dot" style="color:#f97316;font-size:1.1rem;margin-bottom:6px;"></i>
                <span style="display:block;font-size:0.6rem;color:var(--text-muted);text-transform:uppercase;font-weight:700;letter-spacing:0.5px;">Distanza</span>
                <span style="display:block;font-size:0.8rem;font-weight:600;color:var(--text);margin-top:2px;">${o.distanza_km} km</span>
            </div>
            <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:12px;padding:12px;text-align:center;">
                <i class="fa-solid fa-hourglass-half" style="color:#f97316;font-size:1.1rem;margin-bottom:6px;"></i>
                <span style="display:block;font-size:0.6rem;color:var(--text-muted);text-transform:uppercase;font-weight:700;letter-spacing:0.5px;">Disponibilità</span>
                <span style="display:block;font-size:0.8rem;font-weight:600;color:${o.aperta ? '#22c55e' : 'var(--text-muted)'};margin-top:2px;">
                    ${o.disponibilita}
                </span>
            </div>
        </div>

        <div>
            <h4 style="margin:0 0 10px 0;font-size:0.75rem;text-transform:uppercase;color:var(--text-muted);letter-spacing:0.5px;font-weight:700;">Servizi Offerti</h4>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">${serviziHTML}</div>
        </div>

        <div style="display:flex;gap:10px;margin-top:5px;">
            <button class="btn-aggiungi-garage" onclick="apriModal()" style="flex:1;padding:14px;">
                <i class="fa-solid fa-calendar-check"></i> Prenota Appuntamento
            </button>
            <button class="btn-landing" onclick="chiamaOfficina('${o.telefono}')" title="Chiama"
                style="background:var(--surface-2);border:1px solid var(--border);width:48px;height:48px;padding:0;display:flex;align-items:center;justify-content:center;border-radius:12px;">
                <i class="fa-solid fa-phone" style="color:#f97316;"></i>
            </button>
            <button id="btn-bookmark" onclick="toggleSalvata(${o.id})" title="${salvata ? 'Rimuovi dai salvati' : 'Salva'}"
                style="background:var(--surface-2);border:1px solid var(--border);width:48px;height:48px;padding:0;display:flex;align-items:center;justify-content:center;border-radius:12px;cursor:pointer;">
                <i class="${salvata ? 'fa-solid' : 'fa-regular'} fa-bookmark" style="color:#f97316;"></i>
            </button>
        </div>`;
}

/* ═══════════════════════════════════════════════════════════
   ⑥ AGGIORNAMENTO DELLA MAPPA REALE (LEAFLET)
   ═══════════════════════════════════════════════════════════ */
function inizializzaMappa(lat, lng) {
    const mappaEl = document.getElementById('mappa-leaflet');
    if (!mappaEl) return; // Evita l'errore se il div non esiste ancora

    // Inizializza Leaflet
    mappaLeaflet = L.map('mappa-leaflet', { zoomControl: true, scrollWheelZoom: false })
                    .setView([lat, lng], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
    }).addTo(mappaLeaflet);
}

function aggiornaMappa(lat, lng, nome, indirizzo) {
    if (!mappaLeaflet) {
        inizializzaMappa(lat, lng);
    } else {
        mappaLeaflet.setView([lat, lng], 14, { animate: true });
    }

    if (markerAttivo) markerAttivo.remove();

    const icona = L.divIcon({
        className: '',
        html: `<div style="
            width:36px;height:36px;background:#f97316;border-radius:50%;
            display:flex;align-items:center;justify-content:center;
            color:#fff;font-weight:800;font-size:1rem;
            box-shadow:0 0 0 3px rgba(249,115,22,0.3);
            border:2px solid #fff;">
            ${nome.charAt(0)}
        </div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -20],
    });

    markerAttivo = L.marker([lat, lng], { icon: icona })
        .addTo(mappaLeaflet)
        .bindPopup(`<strong>${nome}</strong><br><small>${indirizzo}</small>`)
        .openPopup();
}

function apriMappa() {
    if (!officineSelezionata) return;
    const q = encodeURIComponent(officineSelezionata.indirizzo);
    window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank');
}

function selezionaOfficina(o) {
    officineSelezionata = o;
    renderLista();

    document.getElementById('dettaglio-skeleton').style.display = 'none';
    document.getElementById('dettaglio-box').style.display = 'flex';
    renderDettaglio(o);

    if (o.lat && o.lng && o.lat !== 0) {
        aggiornaMappa(o.lat, o.lng, o.nome, o.indirizzo);
    } else {
        geocodificaIndirizzo(o.indirizzo).then(({ lat, lng }) => {
            o.lat = lat; o.lng = lng;
            aggiornaMappa(lat, lng, o.nome, o.indirizzo);
        });
    }
}

/* ═══════════════════════════════════════════════════════════
   ⑦ GESTIONE MODALE PRENOTAZIONE E LOGICA LOGISTICA
   ═══════════════════════════════════════════════════════════ */
function apriModal() {
    if (!officineSelezionata) return;

    slotSelezionato = null;
    const modal = document.getElementById('modal-prenotazione');
    modal.style.display = 'flex';

    document.getElementById('modal-officina-nome').textContent = officineSelezionata.nome;

    
    const oggi = new Date().toISOString().split('T')[0];
    const inputData = document.getElementById('modal-data');
    inputData.value = oggi;
    inputData.min = oggi;

    const selectServizio = document.getElementById('modal-servizio');
    selectServizio.innerHTML = '<option value="">Seleziona un servizio...</option>';
    officineSelezionata.servizi.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = s;
        selectServizio.appendChild(opt);
    });

    renderSlotOrari();
    gestisciFeedbackModal('', false);
}

function chiudiModal() {
    document.getElementById('modal-prenotazione').style.display = 'none';
}

function renderSlotOrari() {
    const container = document.getElementById('modal-slots');
    container.innerHTML = '';

    SLOT_ORARI.forEach(orario => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'slot-btn';
        btn.textContent = orario;
        btn.addEventListener('click', () => {
            container.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('attivo'));
            btn.classList.add('attivo');
            slotSelezionato = orario;
        });
        container.appendChild(btn);
    });
}

async function confermaPrenotazione() {
    const servizio = document.getElementById('modal-servizio').value;
    const dataInput = document.getElementById('modal-data').value;
    const dataIso = `${dataInput}T${slotSelezionato}:00`;
    const note = document.getElementById('modal-note').value;

    if (!servizio || !dataInput || !slotSelezionato) {
        gestisciFeedbackModal('Errore: Compila tutti i campi obbligatori (Servizio, Data, Orario).', true);
        return;
    }

    const payload = {
        officinaId: officineSelezionata.id,
        servizio: servizio,
        data: dataIso,
        orario: slotSelezionato,
        note: note
    };

    try {
        const res = await fetch(ENDPOINT_PRENOTA, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error(`Errore di rete: ${res.status}`);

        gestisciToast('Prenotazione confermata con successo!');
        chiudiModal();
        
        // Reset dei campi del form
        document.getElementById('modal-servizio').value = '';
        document.getElementById('modal-note').value = '';
        slotSelezionato = null;

    } catch (err) {
        console.error('Errore durante l\'invio della prenotazione:', err);
        gestisciFeedbackModal('Impossibile elaborare la prenotazione. Riprova più tardi.', true);
    }
}

function gestisciFeedbackModal(messaggio, isErrore = false) {
    const fbox = document.getElementById('modal-feedback');
    if (!messaggio) {
        fbox.style.display = 'none';
        return;
    }
    fbox.style.display = 'block';
    fbox.style.background = isErrore ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)';
    fbox.style.color = isErrore ? '#f87171' : '#4ade80';
    fbox.textContent = messaggio;
}

function gestisciToast(messaggio) {
    const toast = document.getElementById('toast');
    toast.textContent = messaggio;
    toast.style.display = 'block';
    toast.style.background = '#22c55e';
    setTimeout(() => { toast.style.display = 'none'; }, 4000);
}

/* ═══════════════════════════════════════════════════════════
   ⑧ CATEGORIE, FILTRI E LOGICHE AUSILIARIE
   ═══════════════════════════════════════════════════════════ */
function renderFiltriCategorie() {
    const container = document.getElementById('filtri-categorie');
    container.innerHTML = '';

    const categorie = [...new Set(tutteLeOfficine.map(o => o.categoria).filter(Boolean))];
    const iconeMappa = { 'Meccanica': 'fa-screwdriver-wrench', 'Carrozzeria': 'fa-car-burst', 'Elettrico': 'fa-bolt' };

    categorie.forEach(cat => {
        const icon = iconeMappa[cat] ?? 'fa-wrench';
        const tag = document.createElement('span');
        tag.className = 'cerca-storico-tag';
        tag.innerHTML = `<i class="fa-solid ${icon}"></i> ${cat}`;
        tag.style.cursor = 'pointer';
        tag.addEventListener('click', () => {
            if (filtroCategoria === cat) {
                filtroCategoria = null;
                tag.style.background = ''; tag.style.color = '';
            } else {
                filtroCategoria = cat;
                container.querySelectorAll('.cerca-storico-tag').forEach(t => { t.style.background = ''; t.style.color = ''; });
                tag.style.background = 'rgba(249,115,22,0.25)'; tag.style.color = '#f97316';
            }
            applicaFiltriERender();
        });
        container.appendChild(tag);
    });
}

function applicaFiltriERender(q = '') {
    q = q.toLowerCase().trim();
    officineVisibili = tutteLeOfficine.filter(o => {
        const matchCat = !filtroCategoria || o.categoria === filtroCategoria;
        const matchQ = !q || o.nome.toLowerCase().includes(q) || o.specialita.toLowerCase().includes(q) || o.servizi.some(s => s.toLowerCase().includes(q));
        return matchCat && matchQ;
    });
    applicaSort();
    renderLista();
}

function applicaSort() {
    officineVisibili.sort((a, b) => sortAsc ? a.distanza_km - b.distanza_km : b.distanza_km - a.distanza_km);
}

function toggleSort() {
    sortAsc = !sortAsc;
    document.getElementById('sort-btn').innerHTML = (sortAsc ? 'Più vicine' : 'Più lontane') + ` <i class="fa-solid fa-chevron-${sortAsc ? 'down' : 'up'}"></i>`;
    applicaSort();
    renderLista();
}

function renderStelle(val) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
        if (val >= i) html += '<i class="fa-solid fa-star"></i>';
        else if (val >= i-.5) html += '<i class="fa-solid fa-star-half-stroke"></i>';
        else html += '<i class="fa-regular fa-star"></i>';
    }
    return html;
}

function mostraStato(stato) {
    document.getElementById('lista-skeleton').style.display = stato === 'skeleton' ? 'flex' : 'none';
    document.getElementById('lista-errore').style.display   = stato === 'errore'   ? 'flex' : 'none';
    document.getElementById('no-results').style.display     = stato === 'vuoto'    ? 'flex' : 'none';
    const listEl = document.getElementById('officine-list');
    if (stato === 'lista') {
        listEl.style.display = 'flex';
        listEl.style.flexDirection = 'column';
    } else {
        listEl.style.display = 'none';
    }
}

function isOfficinaSalvata(id) { return false; }
function toggleSalvata(id) {}
function chiamaOfficina(tel) { if(tel) window.location.href = 'tel:' + tel; }

/* ═══════════════════════════════════════════════════════════
   ⑨ START
   ═══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
    caricaOfficine();
    document.getElementById('input-ricerca').addEventListener('input', e => {
    applicaFiltriERender(e.target.value);
    });
    document.getElementById('btn-gps').addEventListener('click', () => {
        if (!navigator.geolocation) {
            gestisciToast('GPS non supportato dal browser');
            return;
        }
        gestisciToast('Localizzazione in corso...');
        navigator.geolocation.getCurrentPosition(
            pos => {
                if (mappaLeaflet) {
                    mappaLeaflet.setView([pos.coords.latitude, pos.coords.longitude], 13, { animate: true });
                }
                gestisciToast('Posizione rilevata!');
            },
            () => gestisciToast('Impossibile rilevare la posizione')
        );
    });
    
     document.getElementById('modal-prenotazione').addEventListener('click', e => {
        if (e.target === document.getElementById('modal-prenotazione')) chiudiModal();
    });
});
 /* ----------------------------------------------------
/              PRENOTAZIONI OFFICINA                   /
-----------------------------------------------------*/

const API = 'http://localhost:3000';
let officina = null;
let tuttePrenotazioni = [];
let filtroAttivo = 'all';

 /* ----------------------------------------------------
/                  INIT                                /
-----------------------------------------------------*/
document.addEventListener('DOMContentLoaded', async () => {
    officina = JSON.parse(localStorage.getItem('yd_utente_loggato'));
    if (!officina) { window.location.href = 'landing.html'; return; }

    document.getElementById('nome-officina-header').textContent = officina.nome || officina.ragione_sociale;
    document.getElementById('avatar-dropdown-name').textContent = officina.nome || officina.ragione_sociale;

    await caricaPrenotazioni();
});

 /* ----------------------------------------------------
/                  AVATAR MENU                         /
-----------------------------------------------------*/
function toggleAvatarMenu() {
    document.getElementById('avatar-dropdown').classList.toggle('show');
}

document.addEventListener('click', (e) => {
    const wrapper = document.getElementById('avatar-wrapper');
    const dropdown = document.getElementById('avatar-dropdown');
    if (wrapper && !wrapper.contains(e.target)) dropdown?.classList.remove('show');
});

 /* ----------------------------------------------------
/              CARICA PRENOTAZIONI                     /
-----------------------------------------------------*/
async function caricaPrenotazioni() {
    try {
        const res = await fetch(`${API}/officina/prenotazioni`, {
            credentials: 'include',
        });
        if (!res.ok) return;
        tuttePrenotazioni = await res.json();
        renderPrenotazioni();
    } catch (err) {
        console.error('Errore caricamento prenotazioni:', err);
    }
}

 /* ----------------------------------------------------
/                  FILTRI                              /
-----------------------------------------------------*/
function setFiltro(stato, btn) {
    filtroAttivo = stato;
    document.querySelectorAll('.oc-filter-btn').forEach(b => {
        b.className = 'oc-filter-btn';
    });
    btn.classList.add(`active-${stato}`);
    renderPrenotazioni();
}

 /* ----------------------------------------------------
/              RENDER PRENOTAZIONI                     /
-----------------------------------------------------*/
function renderPrenotazioni() {
    const container = document.getElementById('prenotazioni-list');
    const emptyState = document.getElementById('empty-state');
    const countEl = document.getElementById('pren-count');

    const filtrate = filtroAttivo === 'all'
        ? tuttePrenotazioni
        : tuttePrenotazioni.filter(p => p.stato === filtroAttivo);

    countEl.textContent = `${filtrate.length} prenotazioni`;

    if (!filtrate.length) {
        container.innerHTML = '';
        container.appendChild(emptyState);
        emptyState.style.display = 'flex';
        return;
    }

    emptyState.style.display = 'none';

    const statoLabel = {
        in_attesa: 'In attesa',
        confermata: 'Confermata',
        annullata: 'Annullata',
        completata: 'Completata',
    };

    const cards = filtrate.map(p => {
        const v = p.utente?.veicolo?.[0];
        const dg = v?.dati_generici?.[0];
        const ds = v?.dati_specifici?.[0];

        const isMoto = dg?.tipo_veicolo === 'Moto' || dg?.tipo_veicolo === 'Scooter';
        const iconaVeicolo = isMoto ? 'fa-motorcycle' : 'fa-car';
        const nomeVeicolo = v ? `${v.marca || ''} ${v.modello || ''}`.trim() : 'Veicolo sconosciuto';
        const targa = v?.targa || '—';
        const nomeUtente = p.utente?.username || '—';
        const emailUtente = p.utente?.email || '';
        const anno = ds?.dataimmatricolazione
            ? new Date(ds.dataimmatricolazione).getFullYear()
            : '—';
        const tipo = dg?.tipo_veicolo || '—';

        const dataOra = new Date(p.dataprenotazione).toLocaleString('it-IT', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });

        const azioniHtml = p.stato === 'in_attesa' ? `
            <div class="oc-action-row">
                <button class="oc-action-btn conferma" title="Conferma" onclick="aggiornaStato(${p.id}, 'confermata', event)">
                    <i class="fa-solid fa-check"></i>
                </button>
                <button class="oc-action-btn annulla" title="Annulla" onclick="aggiornaStato(${p.id}, 'annullata', event)">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
        ` : p.stato === 'confermata' ? `
            <div class="oc-action-row">
                <button class="oc-action-btn completa" title="Completa" onclick="aggiornaStato(${p.id}, 'completata', event)">
                    <i class="fa-solid fa-flag-checkered"></i>
                </button>
            </div>
        ` : '';

        const bottomDescrizione = p.descrizione ? `
            <div class="oc-pren-card-bottom-item">
                <i class="fa-solid fa-file-lines"></i>
                ${p.descrizione}
            </div>
        ` : '';

        const bottomCellulare = p.utente?.cellulare ? `
            <div class="oc-pren-card-bottom-item">
                <i class="fa-solid fa-phone"></i>
                ${p.utente.cellulare}
            </div>
        ` : '';

        return `
            <div class="oc-pren-card-wrap">
                <div class="oc-prenotazione-card" onclick="apriDettaglio(${p.id})">
                    <div class="oc-veicolo-icon">
                        <i class="fa-solid ${iconaVeicolo}"></i>
                    </div>
                    <div class="oc-veicolo-info">
                        <div class="oc-veicolo-nome">
                            ${nomeVeicolo}
                            <span class="oc-targa-pill">${targa}</span>
                        </div>
                        <div class="oc-veicolo-sub">
                            <i class="fa-regular fa-calendar"></i> ${dataOra}
                        </div>
                        <div class="oc-utente-row">
                            <i class="fa-solid fa-user"></i>
                            <span>${nomeUtente}${emailUtente ? ' · ' + emailUtente : ''}</span>
                        </div>
                    </div>
                    <div class="oc-pren-right">
                        <span class="oc-stato ${p.stato}">${statoLabel[p.stato] || p.stato}</span>
                        ${azioniHtml}
                    </div>
                </div>
                <div class="oc-pren-card-bottom">
                    <div class="oc-pren-card-bottom-item">
                        <i class="fa-solid fa-car"></i>
                        <strong>${tipo}</strong> · ${anno}
                    </div>
                    ${bottomDescrizione}
                    ${bottomCellulare}
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = cards;
}

 /* ----------------------------------------------------
/              DETTAGLIO PRENOTAZIONE                  /
-----------------------------------------------------*/
function apriDettaglio(id) {
    const p = tuttePrenotazioni.find(p => p.id === id);
    if (!p) return;

    const v = p.utente?.veicolo?.[0];
    const dg = v?.dati_generici?.[0];
    const ds = v?.dati_specifici?.[0];

    const nomeVeicolo = v ? `${v.marca || ''} ${v.modello || ''}`.trim() : '—';
    const anno = ds?.dataimmatricolazione
        ? new Date(ds.dataimmatricolazione).getFullYear()
        : '—';
    const dataOra = new Date(p.dataprenotazione).toLocaleString('it-IT', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });

    const statoLabel = {
        in_attesa: 'In attesa',
        confermata: 'Confermata',
        annullata: 'Annullata',
        completata: 'Completata',
    };

    document.getElementById('oc-detail-content').innerHTML = `
        <div class="oc-detail-section">
            <div class="oc-detail-section-title">Veicolo</div>
            <div class="oc-detail-grid">
                <div class="oc-detail-row">
                    <span class="oc-detail-label">Modello</span>
                    <span class="oc-detail-value">${nomeVeicolo}</span>
                </div>
                <div class="oc-detail-row">
                    <span class="oc-detail-label">Targa</span>
                    <span class="oc-detail-value">${v?.targa || '—'}</span>
                </div>
                <div class="oc-detail-row">
                    <span class="oc-detail-label">Tipo</span>
                    <span class="oc-detail-value">${dg?.tipo_veicolo || '—'}</span>
                </div>
                <div class="oc-detail-row">
                    <span class="oc-detail-label">Anno</span>
                    <span class="oc-detail-value">${anno}</span>
                </div>
                <div class="oc-detail-row">
                    <span class="oc-detail-label">Alimentazione</span>
                    <span class="oc-detail-value">${dg?.alimentazione || '—'}</span>
                </div>
                <div class="oc-detail-row">
                    <span class="oc-detail-label">Cilindrata</span>
                    <span class="oc-detail-value">${dg?.cilindrata ? dg.cilindrata + ' cc' : '—'}</span>
                </div>
                <div class="oc-detail-row">
                    <span class="oc-detail-label">Cavalli</span>
                    <span class="oc-detail-value">${dg?.cavalli ? dg.cavalli + ' CV' : '—'}</span>
                </div>
                <div class="oc-detail-row">
                    <span class="oc-detail-label">Colore</span>
                    <span class="oc-detail-value">${dg?.colore || '—'}</span>
                </div>
            </div>
        </div>

        <div class="oc-detail-section">
            <div class="oc-detail-section-title">Cliente</div>
            <div class="oc-detail-grid">
                <div class="oc-detail-row">
                    <span class="oc-detail-label">Username</span>
                    <span class="oc-detail-value">${p.utente?.username || '—'}</span>
                </div>
                <div class="oc-detail-row">
                    <span class="oc-detail-label">Email</span>
                    <span class="oc-detail-value">${p.utente?.email || '—'}</span>
                </div>
                <div class="oc-detail-row">
                    <span class="oc-detail-label">Cellulare</span>
                    <span class="oc-detail-value">${p.utente?.cellulare || '—'}</span>
                </div>
            </div>
        </div>

        <div class="oc-detail-section">
            <div class="oc-detail-section-title">Prenotazione</div>
            <div class="oc-detail-grid">
                <div class="oc-detail-row">
                    <span class="oc-detail-label">Data e ora</span>
                    <span class="oc-detail-value">${dataOra}</span>
                </div>
                <div class="oc-detail-row">
                    <span class="oc-detail-label">Stato</span>
                    <span class="oc-stato ${p.stato}">${statoLabel[p.stato] || p.stato}</span>
                </div>
                <div class="oc-detail-row oc-detail-row-full">
                    <span class="oc-detail-label">Note</span>
                    <span class="oc-detail-value">${p.descrizione || '—'}</span>
                </div>
            </div>
        </div>
    `;

    const azioniBtn = p.stato === 'in_attesa' ? `
        <button class="oc-btn-conferma" onclick="aggiornaStato(${p.id}, 'confermata')">
            <i class="fa-solid fa-check"></i> Conferma
        </button>
        <button class="oc-btn-annulla" onclick="aggiornaStato(${p.id}, 'annullata')">
            <i class="fa-solid fa-xmark"></i> Annulla
        </button>
    ` : p.stato === 'confermata' ? `
        <button class="oc-btn-conferma" onclick="aggiornaStato(${p.id}, 'completata')">
            <i class="fa-solid fa-flag-checkered"></i> Completa
        </button>
    ` : '';

    document.getElementById('oc-detail-azioni').innerHTML = `
        <button class="oc-btn-chiudi" onclick="chiudiDettaglio()">Chiudi</button>
        ${azioniBtn}
    `;

    document.getElementById('oc-detail-overlay').classList.add('open');
}

function chiudiDettaglio() {
    document.getElementById('oc-detail-overlay').classList.remove('open');
}

 /* ----------------------------------------------------
/              AGGIORNA STATO                          /
-----------------------------------------------------*/
async function aggiornaStato(id, stato, event) {
    if (event) event.stopPropagation();

    try {
        const res = await fetch(`${API}/officina/prenotazioni/${id}/stato`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stato }),
            credentials: 'include',
        });

        if (!res.ok) return;

        const idx = tuttePrenotazioni.findIndex(p => p.id === id);
        if (idx !== -1) tuttePrenotazioni[idx].stato = stato;

        chiudiDettaglio();
        renderPrenotazioni();

    } catch (err) {
        console.error('Errore aggiornamento stato:', err);
    }
}

 /* ----------------------------------------------------
/                  LOGOUT                              /
-----------------------------------------------------*/
async function logout() {
    await fetch(`${API}/officina/logout`, { method: 'POST', credentials: 'include' });
    localStorage.removeItem('yd_utente_loggato');
    window.location.href = 'landing.html';
}
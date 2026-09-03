 /* ----------------------------------------------------
/              PRENOTAZIONI OFFICINA                   /
-----------------------------------------------------*/

const API = window.API_URL || 'https://re-cars-backend.onrender.com';
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
function aggiornaContatoriFiltri() {
    const stati = ['in_attesa', 'confermata', 'completata', 'annullata'];
    document.getElementById('fcount-all').textContent = tuttePrenotazioni.length || '';
    stati.forEach(s => {
        const n = tuttePrenotazioni.filter(p => p.stato === s).length;
        document.getElementById(`fcount-${s}`).textContent = n || '';
    });
}

function renderPrenotazioni() {
    const container = document.getElementById('prenotazioni-list');
    const emptyState = document.getElementById('empty-state');
    const countEl = document.getElementById('pren-count');

    aggiornaContatoriFiltri();

    const filtrate = filtroAttivo === 'all'
        ? tuttePrenotazioni
        : tuttePrenotazioni.filter(p => p.stato === filtroAttivo);

    countEl.textContent = `${filtrate.length} prenotazioni`;

    if (!filtrate.length) {
        container.innerHTML = '';
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

    container.innerHTML = filtrate.map(p => {
        const v = p.utente?.veicolo?.[0];
        const dg = v?.dati_generici?.[0];
        const ds = v?.dati_specifici?.[0];

        const isMoto = dg?.tipo_veicolo === 'Moto' || dg?.tipo_veicolo === 'Scooter';
        const iconaVeicolo = isMoto ? 'fa-motorcycle' : 'fa-car';
        const nomeVeicolo = v ? `${v.marca || ''} ${v.modello || ''}`.trim() : 'Veicolo sconosciuto';
        const targa = v?.targa || '—';
        const nomeUtente = p.utente?.username || '—';
        const emailUtente = p.utente?.email || '';
        const anno = ds?.dataimmatricolazione ? new Date(ds.dataimmatricolazione).getFullYear() : '—';
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
                    <i class="fa-solid fa-square-check"></i>
                </button>
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
                    ${p.servizio ? `
                    <div class="oc-pren-card-bottom-item">
                        <i class="fa-solid fa-screwdriver-wrench"></i>
                        ${p.servizio}
                    </div>` : ''}
                    ${bottomCellulare}
                </div>
            </div>
        `;
    }).join('');
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
    const targa = v?.targa || '—';
    const anno = ds?.dataimmatricolazione ? new Date(ds.dataimmatricolazione).getFullYear() : '—';
    const tipo = dg?.tipo_veicolo || '—';
    const isMoto = tipo === 'Moto' || tipo === 'Scooter';
    const iconaVeicolo = isMoto ? 'fa-motorcycle' : 'fa-car';

    const dataOra = new Date(p.dataprenotazione).toLocaleString('it-IT', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });

    const statoLabel = { in_attesa: 'In attesa', confermata: 'Confermata', annullata: 'Annullata', completata: 'Completata' };
    const statoClasse = { in_attesa: 'oc-stato in_attesa', confermata: 'oc-stato confermata', annullata: 'oc-stato annullata', completata: 'oc-stato completata' };

    const nomeUtente = p.utente?.username || '—';
    const iniziale = nomeUtente.charAt(0).toUpperCase();
    const email = p.utente?.email || '';
    const cellulare = p.utente?.cellulare || '';
    const clienteSub = [email, cellulare].filter(Boolean).join(' · ');

    const notaHtml = p.descrizione ? `
        <div class="oc-new-nota">
            <div class="oc-new-nota-label">
                <i class="fa-solid fa-note-sticky"></i> Note
            </div>
            <div class="oc-new-nota-text">${p.descrizione}</div>
        </div>
    ` : '';

    document.getElementById('oc-detail-stato-badge').className = statoClasse[p.stato] || 'oc-stato';
    document.getElementById('oc-detail-stato-badge').textContent = statoLabel[p.stato] || p.stato;

    document.getElementById('oc-detail-content').innerHTML = `
        <div class="oc-new-hero">
            <div class="oc-new-car-icon">
                <i class="fa-solid ${iconaVeicolo}"></i>
            </div>
            <div>
                <div class="oc-new-car-name">${nomeVeicolo}</div>
                <div class="oc-new-car-sub">
                    <span class="oc-new-targa">${targa}</span>
                    <span>${tipo} · ${anno}</span>
                </div>
            </div>
        </div>
        <div class="oc-new-chips">
            <div class="oc-new-chip ora">
                <i class="fa-solid fa-clock"></i> ${dataOra}
            </div>
            <div class="oc-new-chip">
                <i class="fa-solid fa-screwdriver-wrench"></i> ${p.servizio || 'Servizio generico'}
            </div>
        </div>
        ${notaHtml}
        <div class="oc-new-divider"></div>
        <div class="oc-new-client">
            <div class="oc-new-avatar">${iniziale}</div>
            <div>
                <div class="oc-new-client-name">${nomeUtente}</div>
                <div class="oc-new-client-sub">${clienteSub || '—'}</div>
            </div>
        </div>
    `;

    const azioniBtn = p.stato === 'in_attesa' ? `
        <button class="oc-new-btn conferma" onclick="aggiornaStato(${p.id}, 'confermata')">
            <i class="fa-solid fa-check"></i> Conferma
        </button>
        <button class="oc-new-btn annulla" onclick="aggiornaStato(${p.id}, 'annullata')">
            <i class="fa-solid fa-ban"></i> Annulla
        </button>
    ` : p.stato === 'confermata' ? `
        <button class="oc-new-btn conferma" onclick="aggiornaStato(${p.id}, 'completata')">
            <i class="fa-solid fa-square-check"></i> Completa
        </button>
        <button class="oc-new-btn annulla" onclick="aggiornaStato(${p.id}, 'annullata')">
            <i class="fa-solid fa-ban"></i> Annulla
        </button>
    ` : '';

    document.getElementById('oc-detail-azioni').innerHTML = azioniBtn;
    document.getElementById('oc-detail-overlay').classList.add('open');
}

function chiudiDettaglio() {
    document.getElementById('oc-detail-overlay').classList.remove('open');
    prenotazioneSelezionata = null;
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


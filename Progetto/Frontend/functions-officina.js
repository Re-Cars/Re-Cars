 /* ----------------------------------------------------
/                  DASHBOARD OFFICINA                  /
-----------------------------------------------------*/

const API = window.API_URL || 'https://re-cars-backend.onrender.com';
let officina = null;
let prenotazioniOggi = [];
let prenotazioneSelezionata = null;
let switcherAperto = false;

 /* ----------------------------------------------------
/                  INIT                                /
-----------------------------------------------------*/
document.addEventListener('DOMContentLoaded', async () => {
    officina = JSON.parse(localStorage.getItem('yd_utente_loggato'));

    if (!officina) {
        window.location.href = 'landing.html';
        return;
    }

    document.getElementById('nome-officina').textContent = officina.nome || officina.ragione_sociale;
    document.getElementById('citta-officina').textContent = officina.sigla_citta || '';
    document.getElementById('avatar-dropdown-name').textContent = officina.nome || officina.ragione_sociale;

    await caricaDashboard();
});

 /* ----------------------------------------------------
/              CARICA DATI DASHBOARD                   /
-----------------------------------------------------*/
async function caricaDashboard() {
    try {
        const res = await fetch(`${API}/officina/dashboard`, {
            credentials: 'include',
        });

        if (!res.ok) return;

        const data = await res.json();

        // stats
        document.getElementById('stat-oggi').textContent = data.oggiTotale ?? '0';
        document.getElementById('stat-oggi-sub').innerHTML = `<span class="oc-stat-dot" style="background:#22c55e"></span>${data.oggiConfermate ?? 0} confermate`;

        document.getElementById('stat-settimana').textContent = data.settimanaT ?? '0';
        document.getElementById('stat-settimana-sub').innerHTML = `<span class="oc-stat-dot" style="background:#fbbf24"></span>${data.settimanaAttesa ?? 0} in attesa`;

        const ponti = officina.ponti_disponibili ?? '—';
        document.getElementById('stat-ponti').textContent = `${data.pontiOccupati ?? 0}/${ponti}`;
        document.getElementById('stat-ponti-sub').innerHTML = `<span class="oc-stat-dot" style="background:#f97316"></span>${data.pontiOccupati ?? 0} occupati`;

        // abbonamento
        if (data.abbonamento) {
            document.getElementById('abbonamento-piano').textContent = data.abbonamento.piano.replace('_', ' ');
        }

        // prenotazioni oggi
        prenotazioniOggi = data.prenotazioniOggi ?? [];
        renderPrenotazioniOggi();
        renderSwitcher();

    } catch (err) {
        console.error('Errore caricamento dashboard:', err);
    }
}

 /* ----------------------------------------------------
/           RENDER PRENOTAZIONI OGGI                   /
-----------------------------------------------------*/
function renderPrenotazioniOggi() {
    const container = document.getElementById('prenotazioni-oggi');
    const emptyState = document.getElementById('empty-state');
    const countBadge = document.getElementById('veicoli-oggi-count');

    countBadge.textContent = `${prenotazioniOggi.length} veicoli`;

    if (!prenotazioniOggi.length) {
        emptyState.style.display = 'flex';
        return;
    }

    emptyState.style.display = 'none';

    const cards = prenotazioniOggi.map(p => {
        const v = p.utente?.veicolo?.[0];
        const iconaVeicolo = v?.dati_generici?.[0]?.tipo_veicolo === 'Moto' || v?.dati_generici?.[0]?.tipo_veicolo === 'Scooter'
            ? 'fa-motorcycle'
            : 'fa-car';

        const nomeVeicolo = v ? `${v.marca || ''} ${v.modello || ''}`.trim() : 'Veicolo sconosciuto';
        const targa = v?.targa || '—';
        const nomeUtente = p.utente?.username || '—';
        const emailUtente = p.utente?.email || '';
        const ora = new Date(p.dataprenotazione).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

        const statoLabel = {
            in_attesa: 'In attesa',
            confermata: 'Confermata',
            annullata: 'Annullata',
            completata: 'Completata',
        }[p.stato] || p.stato;

        const azioniHtml = p.stato === 'in_attesa' ? `
            <button class="oc-action-btn conferma" title="Conferma" onclick="aggiornaStato(${p.id}, 'confermata', event)">
                <i class="fa-solid fa-check"></i>
            </button>
            <button class="oc-action-btn annulla" title="Annulla" onclick="aggiornaStato(${p.id}, 'annullata', event)">
                <i class="fa-solid fa-xmark"></i>
            </button>
        ` : p.stato === 'confermata' ? `
            <button class="oc-action-btn completa" title="Completa" onclick="aggiornaStato(${p.id}, 'completata', event)">
                <i class="fa-solid fa-square-check"></i>
            </button>
        ` : '';

        return `
            <div class="oc-prenotazione-card" onclick="apriDettaglio(${p.id})">
                <div class="oc-veicolo-icon">
                    <i class="fa-solid ${iconaVeicolo}"></i>
                </div>
                <div class="oc-veicolo-info">
                    <div class="oc-veicolo-nome">
                        ${nomeVeicolo}
                        <span class="oc-targa-pill">${targa}</span>
                    </div>
                    <div class="oc-veicolo-sub">Ore ${ora}${p.descrizione ? ' · ' + p.descrizione : ''}</div>
                    <div class="oc-utente-row">
                        <i class="fa-solid fa-user"></i>
                        <span>${nomeUtente}${emailUtente ? ' · ' + emailUtente : ''}</span>
                    </div>
                </div>
                <div class="oc-pren-right">
                    <span class="oc-stato ${p.stato}">${statoLabel}</span>
                    ${azioniHtml}
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = cards + document.getElementById('empty-state').outerHTML;
}

 /* ----------------------------------------------------
/              SWITCHER VEICOLI                        /
-----------------------------------------------------*/
function renderSwitcher() {
    const dropdown = document.getElementById('switcher-dropdown');
    const counter = document.getElementById('veicoli-counter');

    counter.textContent = `${prenotazioniOggi.length} veicoli oggi`;

    if (!prenotazioniOggi.length) {
        dropdown.innerHTML = '<div style="padding:14px; font-size:13px; color:var(--muted); text-align:center;">Nessun veicolo oggi</div>';
        return;
    }

    dropdown.innerHTML = prenotazioniOggi.map(p => {
        const v = p.utente?.veicolo?.[0];
        const nomeVeicolo = v ? `${v.marca || ''} ${v.modello || ''}`.trim() : 'Veicolo';
        const targa = v?.targa || '—';
        const iconaVeicolo = v?.dati_generici?.[0]?.tipo_veicolo === 'Moto' || v?.dati_generici?.[0]?.tipo_veicolo === 'Scooter'
            ? 'fa-motorcycle' : 'fa-car';
        const statoLabel = {
            in_attesa: 'In attesa',
            confermata: 'Confermata',
            annullata: 'Annullata',
            completata: 'Completata',
        }[p.stato] || p.stato;

        return `
            <div class="switcher-item" onclick="apriDettaglio(${p.id}); toggleSwitcher()">
                <i class="fa-solid ${iconaVeicolo}"></i>
                <div>
                    <div>${nomeVeicolo} · ${targa}</div>
                    <div class="sw-sub">${statoLabel} · ${p.utente?.username || '—'}</div>
                </div>
            </div>
        `;
    }).join('');
}

function toggleSwitcher() {
    const dropdown = document.getElementById('switcher-dropdown');
    const icon = document.getElementById('switcher-icon');
    switcherAperto = !switcherAperto;
    dropdown.style.display = switcherAperto ? 'block' : 'none';
    icon.style.transform = switcherAperto ? 'rotate(180deg)' : 'rotate(0deg)';
}

 /* ----------------------------------------------------
/              DETTAGLIO PRENOTAZIONE                  /
-----------------------------------------------------*/
function apriDettaglio(id) {
    prenotazioneSelezionata = prenotazioniOggi.find(p => p.id === id);
    if (!prenotazioneSelezionata) return;

    const p = prenotazioneSelezionata;
    const v = p.utente?.veicolo?.[0];
    const dg = v?.dati_generici?.[0];
    const ds = v?.dati_specifici?.[0];

    const nomeVeicolo = v ? `${v.marca || ''} ${v.modello || ''}`.trim() : '—';
    const targa = v?.targa || '—';
    const tipo = dg?.tipo_veicolo || '—';
    const anno = ds?.dataimmatricolazione ? new Date(ds.dataimmatricolazione).getFullYear() : '—';
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
            ${p.servizio ? `
            <div class="oc-new-chip">
                <i class="fa-solid fa-screwdriver-wrench"></i> ${p.servizio}
            </div>` : ''}
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
        const res = await fetch(`${API}/prenotazioni/${id}/stato`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stato }),
            credentials: 'include',
        });

        if (!res.ok) return;

        const idx = prenotazioniOggi.findIndex(p => p.id === id);
        if (idx !== -1) prenotazioniOggi[idx].stato = stato;

        chiudiDettaglio();
        renderPrenotazioniOggi();
        renderSwitcher();

    } catch (err) {
        console.error('Errore aggiornamento stato:', err);
    }
}


 /* ----------------------------------------------------
/                  AGENDA OFFICINA                     /
-----------------------------------------------------*/

const API = 'http://localhost:3000';
let officina = null;
let prenotazioni = [];
let vistaAttiva = 'settimana';
let dataCorrente = new Date();
const ORE = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00'];
const GIORNI_NOMI = ['L','M','M','G','V','S','D'];
const MESI_NOMI = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

 /* ----------------------------------------------------
/                  INIT                                /
-----------------------------------------------------*/
document.addEventListener('DOMContentLoaded', async () => {
    officina = JSON.parse(localStorage.getItem('yd_utente_loggato'));
    if (!officina) { window.location.href = 'landing.html'; return; }
    document.getElementById('avatar-dropdown-name').textContent = officina.nome || officina.ragione_sociale;
    await caricaAgenda();
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
/              CARICA AGENDA                           /
-----------------------------------------------------*/
async function caricaAgenda() {
    try {
        const anno = dataCorrente.getFullYear();
        const mese = dataCorrente.getMonth() + 1;
        const res = await fetch(`${API}/officina/agenda?anno=${anno}&mese=${mese}`, {
            credentials: 'include',
        });
        if (!res.ok) return;
        prenotazioni = await res.json();
        renderMiniCal();
        renderSlotsOggi();
        renderVista();
    } catch (err) {
        console.error('Errore caricamento agenda:', err);
    }
}

 /* ----------------------------------------------------
/              MINI CALENDARIO                         /
-----------------------------------------------------*/
function renderMiniCal() {
    const label = document.getElementById('ag-mini-mese-label');
    label.textContent = `${MESI_NOMI[dataCorrente.getMonth()]} ${dataCorrente.getFullYear()}`;

    const container = document.getElementById('ag-mini-cal-days');
    const oggi = new Date();
    const anno = dataCorrente.getFullYear();
    const mese = dataCorrente.getMonth();
    const primoGiorno = new Date(anno, mese, 1);
    const ultimoGiorno = new Date(anno, mese + 1, 0);

    let giornoPrimaSettimana = primoGiorno.getDay();
    if (giornoPrimaSettimana === 0) giornoPrimaSettimana = 7;
    giornoPrimaSettimana--;

    const targhePrenGiorni = new Set(
        prenotazioni.map(p => new Date(p.dataprenotazione).getDate())
    );

    let html = '';

    for (let i = 0; i < giornoPrimaSettimana; i++) {
        html += '<div class="ag-mini-day altro-mese"></div>';
    }

    for (let g = 1; g <= ultimoGiorno.getDate(); g++) {
        const isOggi = g === oggi.getDate() && mese === oggi.getMonth() && anno === oggi.getFullYear();
        const haEventi = targhePrenGiorni.has(g);
        html += `<div class="ag-mini-day ${isOggi ? 'oggi' : ''} ${haEventi && !isOggi ? 'ha-eventi' : ''}"
                      onclick="selezionaGiorno(${anno}, ${mese}, ${g})">${g}</div>`;
    }

    container.innerHTML = html;
}

function selezionaGiorno(anno, mese, giorno) {
    dataCorrente = new Date(anno, mese, giorno);
    setVista('settimana');
}

 /* ----------------------------------------------------
/              SLOT OGGI                               /
-----------------------------------------------------*/
function renderSlotsOggi() {
    const oggi = new Date();
    const container = document.getElementById('ag-slots-oggi');
    const ponti = officina.ponti_disponibili || 1;

    const prenotazioniOggi = prenotazioni.filter(p => {
        const d = new Date(p.dataprenotazione);
        return d.getDate() === oggi.getDate() &&
               d.getMonth() === oggi.getMonth() &&
               d.getFullYear() === oggi.getFullYear();
    });

    const slotOre = ['09:00', '11:00', '14:00', '16:00'];

    const html = slotOre.map(ora => {
        const [h] = ora.split(':').map(Number);
        const occupato = prenotazioniOggi.some(p => {
            const ph = new Date(p.dataprenotazione).getHours();
            return ph === h && (p.stato === 'confermata' || p.stato === 'in_attesa');
        });

        const label = occupato
            ? prenotazioniOggi.find(p => new Date(p.dataprenotazione).getHours() === h)?.utente?.username || 'Occupato'
            : 'Libero';

        return `
            <div class="ag-slot-row">
                <span class="ag-slot-time">${ora}</span>
                <div class="ag-slot-bar ${occupato ? 'ag-slot-occupato' : 'ag-slot-libero'}">${label}</div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

 /* ----------------------------------------------------
/              VISTA                                   /
-----------------------------------------------------*/
function setVista(vista) {
    vistaAttiva = vista;
    document.getElementById('btn-settimana').classList.toggle('active', vista === 'settimana');
    document.getElementById('btn-mese').classList.toggle('active', vista === 'mese');
    renderVista();
}

function cambiaVista(direzione) {
    if (vistaAttiva === 'settimana') {
        dataCorrente.setDate(dataCorrente.getDate() + direzione * 7);
    } else {
        dataCorrente.setMonth(dataCorrente.getMonth() + direzione);
        caricaAgenda();
        return;
    }
    renderVista();
    renderMiniCal();
}

function renderVista() {
    if (vistaAttiva === 'settimana') renderSettimana();
    else renderMese();
}

 /* ----------------------------------------------------
/              VISTA SETTIMANA                         /
-----------------------------------------------------*/
function renderSettimana() {
    const container = document.getElementById('ag-calendario');
    const oggi = new Date();

    const lunedi = new Date(dataCorrente);
    const giorno = lunedi.getDay();
    const diff = giorno === 0 ? -6 : 1 - giorno;
    lunedi.setDate(lunedi.getDate() + diff);

    const giorni = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(lunedi);
        d.setDate(d.getDate() + i);
        return d;
    });

    const titolo = `${lunedi.getDate()} ${MESI_NOMI[lunedi.getMonth()]} — ${giorni[6].getDate()} ${MESI_NOMI[giorni[6].getMonth()]} ${giorni[6].getFullYear()}`;
    document.getElementById('ag-main-title').textContent = titolo;
    document.getElementById('ag-mini-mese-label').textContent = `${MESI_NOMI[dataCorrente.getMonth()]} ${dataCorrente.getFullYear()}`;

    const headerHtml = `
        <div class="ag-week-header">
            <div></div>
            ${giorni.map(d => {
                const isOggi = d.toDateString() === oggi.toDateString();
                return `
                    <div class="ag-week-day-col">
                        <div class="ag-week-day-name">${GIORNI_NOMI[d.getDay() === 0 ? 6 : d.getDay() - 1]}</div>
                        <div class="ag-week-day-num ${isOggi ? 'oggi' : ''}">${d.getDate()}</div>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    const grigliaHtml = `
        <div class="ag-week-grid">
            <div class="ag-time-col">
                ${ORE.map(ora => `
                    <div class="ag-time-slot">
                        <span class="ag-time-label">${ora}</span>
                    </div>
                `).join('')}
            </div>
            ${giorni.map(d => {
                const prenGiorno = prenotazioni.filter(p => {
                    const pd = new Date(p.dataprenotazione);
                    return pd.toDateString() === d.toDateString();
                });

                return `
                    <div class="ag-day-col">
                        ${ORE.map(ora => {
                            const [h] = ora.split(':').map(Number);
                            const pren = prenGiorno.find(p => new Date(p.dataprenotazione).getHours() === h);
                            const v = pren?.utente?.veicolo?.[0];
                            const nomeVeicolo = v ? `${v.marca || ''} ${v.modello || ''}`.trim() : '';

                            return `
                                <div class="ag-day-cell">
                                    ${pren ? `
                                        <div class="ag-event ag-ev-${pren.stato}"
                                             onclick="apriDettaglio(${pren.id})"
                                             title="${nomeVeicolo} · ${pren.utente?.username || ''}">
                                            ${nomeVeicolo || pren.utente?.username || '—'}
                                        </div>
                                    ` : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
            }).join('')}
        </div>
    `;

    container.innerHTML = headerHtml + grigliaHtml;
}

 /* ----------------------------------------------------
/              VISTA MESE                              /
-----------------------------------------------------*/
function renderMese() {
    const container = document.getElementById('ag-calendario');
    const oggi = new Date();
    const anno = dataCorrente.getFullYear();
    const mese = dataCorrente.getMonth();

    document.getElementById('ag-main-title').textContent = `${MESI_NOMI[mese]} ${anno}`;

    const primoGiorno = new Date(anno, mese, 1);
    const ultimoGiorno = new Date(anno, mese + 1, 0);

    let giornoPrima = primoGiorno.getDay();
    if (giornoPrima === 0) giornoPrima = 7;
    giornoPrima--;

    const headerHtml = `
        <div class="ag-month-header">
            ${['Lun','Mar','Mer','Gio','Ven','Sab','Dom'].map(g => `
                <div class="ag-month-day-name">${g}</div>
            `).join('')}
        </div>
    `;

    let celle = '';

    for (let i = 0; i < giornoPrima; i++) {
        celle += '<div class="ag-month-cell altro-mese"></div>';
    }

    for (let g = 1; g <= ultimoGiorno.getDate(); g++) {
        const dataGiorno = new Date(anno, mese, g);
        const isOggi = dataGiorno.toDateString() === oggi.toDateString();
        const prenGiorno = prenotazioni.filter(p => {
            const pd = new Date(p.dataprenotazione);
            return pd.toDateString() === dataGiorno.toDateString();
        });

        const eventiHtml = prenGiorno.slice(0, 2).map(p => {
            const v = p.utente?.veicolo?.[0];
            const nome = v ? `${v.marca || ''} ${v.modello || ''}`.trim() : p.utente?.username || '—';
            return `
                <div class="ag-month-event ag-ev-${p.stato}"
                     onclick="apriDettaglio(${p.id}); event.stopPropagation()">
                    ${nome}
                </div>
            `;
        }).join('');

        const altriHtml = prenGiorno.length > 2
            ? `<div class="ag-month-more">+${prenGiorno.length - 2} altri</div>`
            : '';

        celle += `
            <div class="ag-month-cell ${isOggi ? 'oggi' : ''}"
                 onclick="selezionaGiorno(${anno}, ${mese}, ${g})">
                <div class="ag-month-cell-num">${g}</div>
                ${eventiHtml}
                ${altriHtml}
            </div>
        `;
    }

    container.innerHTML = headerHtml + `<div class="ag-month-grid">${celle}</div>`;
}

 /* ----------------------------------------------------
/              DETTAGLIO PRENOTAZIONE                  /
-----------------------------------------------------*/
function apriDettaglio(id) {
    const p = prenotazioni.find(p => p.id === id);
    if (!p) return;

    const v = p.utente?.veicolo?.[0];
    const nomeVeicolo = v ? `${v.marca || ''} ${v.modello || ''}`.trim() : '—';
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

    document.getElementById('ag-detail-titolo').textContent = nomeVeicolo;
    document.getElementById('ag-detail-content').innerHTML = `
        <div class="ag-detail-row">
            <span class="ag-detail-label">Veicolo</span>
            <span class="ag-detail-value">${nomeVeicolo}</span>
        </div>
        <div class="ag-detail-row">
            <span class="ag-detail-label">Targa</span>
            <span class="ag-detail-value">${v?.targa || '—'}</span>
        </div>
        <div class="ag-detail-row">
            <span class="ag-detail-label">Cliente</span>
            <span class="ag-detail-value">${p.utente?.username || '—'}</span>
        </div>
        <div class="ag-detail-row">
            <span class="ag-detail-label">Email</span>
            <span class="ag-detail-value">${p.utente?.email || '—'}</span>
        </div>
        <div class="ag-detail-row">
            <span class="ag-detail-label">Data e ora</span>
            <span class="ag-detail-value">${dataOra}</span>
        </div>
        <div class="ag-detail-row">
            <span class="ag-detail-label">Stato</span>
            <span class="oc-stato ${p.stato}">${statoLabel[p.stato] || p.stato}</span>
        </div>
        ${p.descrizione ? `
        <div class="ag-detail-row">
            <span class="ag-detail-label">Note</span>
            <span class="ag-detail-value">${p.descrizione}</span>
        </div>` : ''}
    `;

    document.getElementById('ag-detail-overlay').classList.add('open');
}

function chiudiDettaglio() {
    document.getElementById('ag-detail-overlay').classList.remove('open');
}

 /* ----------------------------------------------------
/              MENU E TEMA                             /
-----------------------------------------------------*/
function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('hamburger-overlay');
    const hamburger = document.getElementById('hamburger9');
    const header = document.querySelector('.header');
    if (sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
        hamburger.classList.remove('open');
        header.classList.remove('sidebar-is-open');
    } else {
        sidebar.classList.add('open');
        overlay.classList.add('open');
        hamburger.classList.add('open');
        header.classList.add('sidebar-is-open');
    }
}

function closeMenu() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('hamburger-overlay').classList.remove('open');
    document.getElementById('hamburger9').classList.remove('open');
    document.querySelector('.header').classList.remove('sidebar-is-open');
}

 /* ----------------------------------------------------
/                  LOGOUT                              /
-----------------------------------------------------*/
async function logout() {
    await fetch(`${API}/officina/logout`, { method: 'POST', credentials: 'include' });
    localStorage.removeItem('yd_utente_loggato');
    window.location.href = 'landing.html';
}
 /* ----------------------------------------------------
/                PROFILO OFFICINA                      /
-----------------------------------------------------*/

const API = 'http://localhost:3000';
let officina = null;
let datiProfilo = null;
let campoInModifica = null;
const TIPI_DISPONIBILI = ['meccanica', 'carrozzeria', 'gommista', 'elettrauto', 'multimarca', 'concessionaria', 'tagliando', 'revisione'];

 /* ----------------------------------------------------
/                  INIT                                /
-----------------------------------------------------*/
document.addEventListener('DOMContentLoaded', async () => {
    officina = JSON.parse(localStorage.getItem('yd_utente_loggato'));
    if (!officina) { window.location.href = 'landing.html'; return; }

    document.getElementById('avatar-dropdown-name').textContent = officina.nome || officina.ragione_sociale;

    await caricaProfilo();
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
/              CARICA PROFILO                          /
-----------------------------------------------------*/
async function caricaProfilo() {
    try {
        const res = await fetch(`${API}/officina/profilo`, { credentials: 'include' });
        if (!res.ok) return;
        datiProfilo = await res.json();
        renderProfilo();
    } catch (err) {
        console.error('Errore caricamento profilo:', err);
    }
}

 /* ----------------------------------------------------
/              RENDER PROFILO                          /
-----------------------------------------------------*/
function renderProfilo() {
    const { officina: of, stats } = datiProfilo;

    document.getElementById('po-hero-nome').textContent = of.nome || of.ragione_sociale;
    document.getElementById('po-hero-indirizzo').textContent = `${of.indirizzo || '—'}, ${of.sigla_citta || ''}`;
    document.getElementById('po-hero-telefono').textContent = of.telefono || '—';
    document.getElementById('po-hero-email').textContent = of.email || '—';

    caricaPianoProfiloOfficina(of);

    document.getElementById('stat-totale').textContent = stats.totale;
    document.getElementById('stat-mese').textContent = stats.mese;
    const diff = stats.mese - stats.mesePrecedente;
    document.getElementById('stat-mese-sub').textContent = diff >= 0
        ? `+${diff} rispetto al mese scorso`
        : `${diff} rispetto al mese scorso`;
    document.getElementById('stat-completate').textContent = stats.completate;
    document.getElementById('stat-tasso').textContent = `${stats.tassoCompletamento}% tasso completamento`;
    document.getElementById('stat-ponti').textContent = of.ponti_disponibili ?? '—';

    document.getElementById('po-val-nome').textContent = of.nome || '—';
    document.getElementById('po-val-ragione-sociale').textContent = of.ragione_sociale || '—';
    document.getElementById('po-val-piva').textContent = of.partita_iva || '—';
    document.getElementById('po-val-sdi').textContent = of.codice_sdi || '—';
    document.getElementById('po-val-email').textContent = of.email || '—';
    document.getElementById('po-val-telefono').textContent = of.telefono || '—';
    document.getElementById('po-val-indirizzo').textContent = of.indirizzo || '—';
    document.getElementById('po-val-ponti').textContent = of.ponti_disponibili ?? '—';

    renderTipi(of.tipi || []);
}

function caricaPianoProfiloOfficina(of) {
    const abbonamento = of.abbonamento?.[0];
    const piano = abbonamento?.piano || 'officina_business';

    const nomi = {
        officina_business: 'Business',
        officina_business_pro: 'Business Pro',
    };

    const nomeEl = document.getElementById('po-piano-nome');
    const subEl = document.getElementById('po-piano-sub');

    if (nomeEl) nomeEl.textContent = nomi[piano] || piano;
    if (subEl) subEl.textContent = abbonamento?.data_fine
        ? `Rinnovo il ${new Date(abbonamento.data_fine).toLocaleDateString('it-IT')}`
        : 'Rinnovo automatico mensile';
}

 /* ----------------------------------------------------
/              TIPI SERVIZIO                           /
-----------------------------------------------------*/
function renderTipi(tipiAttivi) {
    const grid = document.getElementById('po-tipi-grid');
    grid.innerHTML = TIPI_DISPONIBILI.map(t => `
        <span class="po-tipo-pill ${tipiAttivi.includes(t) ? 'attivo' : ''}"
              onclick="toggleTipo(this, '${t}')">
            ${t.charAt(0).toUpperCase() + t.slice(1)}
        </span>
    `).join('');
}

function toggleTipo(el, tipo) {
    el.classList.toggle('attivo');
    document.getElementById('po-btn-salva-tipi').style.display = 'inline-flex';
}

async function salvaTipi() {
    const tipiAttivi = Array.from(document.querySelectorAll('.po-tipo-pill.attivo'))
        .map(el => el.textContent.trim().toLowerCase());

    try {
        const res = await fetch(`${API}/officina/profilo`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tipi: tipiAttivi }),
            credentials: 'include',
        });
        if (!res.ok) return;
        document.getElementById('po-btn-salva-tipi').style.display = 'none';
    } catch (err) {
        console.error('Errore salvataggio tipi:', err);
    }
}

 /* ----------------------------------------------------
/              MODIFICA CAMPO                          /
-----------------------------------------------------*/
const labelCampi = {
    nome: 'Nome officina',
    ragione_sociale: 'Ragione sociale',
    partita_iva: 'Partita IVA',
    codice_sdi: 'Codice SDI',
    email: 'Email',
    telefono: 'Telefono',
    indirizzo: 'Indirizzo',
    ponti_disponibili: 'Ponti disponibili',
    password: 'Nuova password',
};

function apriModifica(campo) {
    campoInModifica = campo;
    document.getElementById('po-modifica-titolo').textContent = labelCampi[campo] || campo;
    const input = document.getElementById('po-modifica-input');
    input.type = campo === 'password' ? 'password' : 'text';
    input.value = campo === 'password' ? '' : (datiProfilo?.officina?.[campo] || '');
    document.getElementById('po-modifica-error').textContent = '';
    apriOverlay('po-modifica-overlay');
    setTimeout(() => input.focus(), 200);
}

function chiudiModifica() {
    chiudiOverlay('po-modifica-overlay');
    campoInModifica = null;
}

async function salvaModifica() {
    const input = document.getElementById('po-modifica-input');
    const errEl = document.getElementById('po-modifica-error');
    const valore = input.value.trim();

    if (!valore) {
        errEl.textContent = 'Il campo non può essere vuoto';
        return;
    }

    try {
        const body = { [campoInModifica]: campoInModifica === 'ponti_disponibili' ? Number(valore) : valore };
        const res = await fetch(`${API}/officina/profilo`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            credentials: 'include',
        });

        const data = await res.json();

        if (!res.ok) {
            errEl.textContent = Array.isArray(data.message) ? data.message[0] : data.message || 'Errore';
            return;
        }

        chiudiModifica();
        await caricaProfilo();
    } catch (err) {
        errEl.textContent = 'Errore di connessione';
    }
}

async function eliminaProfilo() {
    try {
        const res = await fetch(`${API}/officina/profilo`, {
            method: 'DELETE',
            credentials: 'include',
        });
        if (!res.ok) return;
        localStorage.removeItem('yd_utente_loggato');
        window.location.href = 'landing.html';
    } catch (err) {
        console.error('Errore eliminazione:', err);
    }
}

 /* ----------------------------------------------------
/              OVERLAY UTILS                           /
-----------------------------------------------------*/
function apriOverlay(id) {
    document.getElementById(id).classList.add('open');
}

function chiudiOverlay(id) {
    document.getElementById(id).classList.remove('open');
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.po-overlay.open').forEach(el => el.classList.remove('open'));
        campoInModifica = null;
    }
});

 /* ----------------------------------------------------
/                  LOGOUT                              /
-----------------------------------------------------*/
async function logout() {
    await fetch(`${API}/officina/logout`, { method: 'POST', credentials: 'include' });
    localStorage.removeItem('yd_utente_loggato');
    window.location.href = 'landing.html';
}
 /* ----------------------------------------------------
/                   AVVIO PAGINA                       /
-----------------------------------------------------*/
document.addEventListener('DOMContentLoaded', function () {
    var cards = document.querySelectorAll('.card');
    cards.forEach(function (card) {
        card.classList.add('show');
    });
    var utente = getUtente();
    var nicknameEl = document.getElementById('header-nickname');
    if (nicknameEl && utente) {
        nicknameEl.textContent = utente.username;
    }
});

function toggleMenu() {
    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('hamburger-overlay');
    var hamburger = document.getElementById('hamburger9');
    var header = document.querySelector('.header');
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
/                   LOGOUT                             /
-----------------------------------------------------*/
function logout() {
    localStorage.removeItem('yd_utente_loggato');
    localStorage.removeItem('access_token');
    window.location.href = 'landing.html';
}

 /* ----------------------------------------------------
/            GESTIONE MULTI-VEICOLO                    /
-----------------------------------------------------*/
let veicoli = [];
let veicoloAttivoIndex = 0;

async function caricaVeicoli() {
    const token = getData('access_token');
    if (!token) return;
    const Idtoken = getUserIdFromToken(token);
    try {
        const response = await fetch(`http://localhost:3000/veicolo/utente/${Idtoken}`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            }
        });
        const data = await response.json();
        veicoli = data.map(v => ({
            id: v.id,
            nome: `${v.marca} ${v.modello}`,
            targa: v.targa,
            tipo: v.dati_generici[0]?.tipo_veicolo === 'Moto' ? 'motorcycle' : 'car',
        }));
        const counterEl = document.getElementById('veicoli-counter');
        if (counterEl) counterEl.textContent = veicoli.length;
        renderVeicoloAttivo();
        renderDropdown();
    } catch (err) {
        console.error('Errore nel caricamento veicoli', err);
    }
}

function getVeicoloAttivo() {
    return veicoli[veicoloAttivoIndex];
}

function renderVeicoloAttivo() {
    const v = getVeicoloAttivo();
    if (!v) return;
    const el = document.getElementById('nome-veicolo-attivo');
    if (el) el.textContent = v.nome;
    localStorage.setItem('veicoloAttivo', JSON.stringify(v));
}

function renderDropdown() {
    const dropdown = document.getElementById('switcher-dropdown');
    if (!dropdown) return;
    dropdown.innerHTML = '';
    veicoli.forEach((v, i) => {
        const iconClass = v.tipo === 'motorcycle' ? 'fa-motorcycle' : 'fa-car';
        const btn = document.createElement('div');
        btn.className = 'switcher-item' + (i === veicoloAttivoIndex ? ' attivo' : '');
        btn.innerHTML = `
            <i class="fa-solid ${iconClass}"></i>
            <span>${v.nome}</span>
            <span class="item-targa">${v.targa}</span>
            <button class="switcher-delete-btn" data-id="${v.id}" data-nome="${v.nome}" title="Elimina veicolo">
                <i class="fa-solid fa-trash"></i>
            </button>
        `;
        btn.querySelector('.switcher-item span:first-of-type, i.fa-solid:first-child')?.addEventListener('click', () => selezionaVeicolo(i));
        btn.addEventListener('click', (e) => {
            if (!e.target.closest('.switcher-delete-btn')) selezionaVeicolo(i);
        });
        btn.querySelector('.switcher-delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            mostraConfermaElimina(v.id, v.nome);
        });
        dropdown.appendChild(btn);
    });
    const aggiungi = document.createElement('div');
    aggiungi.className = 'switcher-aggiungi';
    aggiungi.innerHTML = `
        <button class="switcher-item" onclick="location.href='cerca_aggiungi_veicolo.html'">
            <i class="fa-solid fa-plus"></i>
            <span>Aggiungi veicolo</span>
        </button>
    `;
    dropdown.appendChild(aggiungi);
}

function mostraConfermaElimina(id, nome) {
    const esistente = document.getElementById('confirma-elimina-overlay');
    if (esistente) esistente.remove();

    const overlay = document.createElement('div');
    overlay.id = 'confirma-elimina-overlay';
    overlay.innerHTML = `
        <div class="conferma-elimina-box">
            <div class="conferma-elimina-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
            <p class="conferma-elimina-title">Elimina veicolo</p>
            <p class="conferma-elimina-sub">Vuoi rimuovere <strong>${nome}</strong> dal tuo garage?</p>
            <div class="conferma-elimina-btns">
                <button class="conferma-btn-annulla" onclick="document.getElementById('confirma-elimina-overlay').remove()">Annulla</button>
                <button class="conferma-btn-elimina" onclick="eliminaVeicolo(${id})">Elimina</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

async function eliminaVeicolo(id) {
    const token = getData('access_token');
    document.getElementById('confirma-elimina-overlay')?.remove();
    try {
        const response = await fetch(`http://localhost:3000/veicolo/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            alert('Errore durante l\'eliminazione del veicolo.');
            return;
        }
        await caricaVeicoli();
        closeSwitcher();
    } catch (err) {
        alert('Errore di connessione.');
    }
}

function selezionaVeicolo(index) {
    veicoloAttivoIndex = index;
    renderVeicoloAttivo();
    renderDropdown();
    closeSwitcher();
    if (document.getElementById('iv-tipo')) caricaInfoVeicolo();
}

function toggleSwitcher() {
    const dropdown = document.getElementById('switcher-dropdown');
    const btn = document.getElementById('switcher-btn');
    const isOpen = dropdown.classList.contains('open');
    if (isOpen) {
        closeSwitcher();
    } else {
        dropdown.classList.add('open');
        btn.classList.add('open');
        renderDropdown();
    }
}

function closeSwitcher() {
    document.getElementById('switcher-dropdown')?.classList.remove('open');
    document.getElementById('switcher-btn')?.classList.remove('open');
}

document.addEventListener('click', (e) => {
    const switcher = document.getElementById('veicolo-switcher');
    if (switcher && !switcher.contains(e.target)) closeSwitcher();
});

document.addEventListener('DOMContentLoaded', async () => {
    await caricaVeicoli();
    checkGarageAnimation();
    if (document.getElementById('iv-tipo')) caricaInfoVeicolo();
});

 /* ----------------------------------------------------
/             CARICAMENTO INFO-VEICOLO                 /
-----------------------------------------------------*/
async function caricaInfoVeicolo() {
    const veicoloAttivo = JSON.parse(localStorage.getItem('veicoloAttivo'));
    try {
        const response = await fetch(`http://localhost:3000/veicolo/${veicoloAttivo.id}`);
        if (!response.ok) return;
        const v = await response.json();
        const dg = v.dati_generici[0] || {};
        const ds = v.dati_specifici[0] || {};
        const nomeVeicolo = `${v.marca || ''} ${v.modello || ''}`.trim();
        document.getElementById('nome-veicolo-attivo').textContent = nomeVeicolo || 'Veicolo Attivo';
        document.getElementById('iv-tipo').textContent = dg.tipo_veicolo || '-';
        document.getElementById('iv-marca').textContent = v.marca || '-';
        document.getElementById('iv-modello').textContent = v.modello || '-';
        document.getElementById('iv-anno').textContent = ds.dataimmatricolazione
            ? new Date(ds.dataimmatricolazione).getFullYear() : '-';
        document.getElementById('iv-alimentazione').textContent = dg.alimentazione || '-';
        document.getElementById('iv-cilindrata').textContent = dg.cilindrata ? `${dg.cilindrata} cc` : '-';
        document.getElementById('iv-cavalli').textContent = dg.cavalli ? `${dg.cavalli} CV` : '-';
        document.getElementById('iv-targa').textContent = v.targa || '-';
        if (ds.datascadenzabollo) {
            const dataBollo = new Date(ds.datascadenzabollo).toLocaleDateString('it-IT');
            document.getElementById('iv-bollo-date').textContent = `scade il ${dataBollo}`;
            const badgeBollo = document.getElementById('iv-bollo-stato');
            badgeBollo.textContent = ds.isbolloattivo ? 'Attivo' : 'Scaduto';
            badgeBollo.className = `iv-badge ${ds.isbolloattivo ? 'iv-badge-attiva' : 'iv-badge-scaduta'}`;
        } else {
            document.getElementById('iv-bollo-date').textContent = 'Dato non disponibile';
        }
        if (ds.datascadenzarca) {
            const dataRca = new Date(ds.datascadenzarca).toLocaleDateString('it-IT');
            document.getElementById('iv-assicurazione-date').textContent = `scade il ${dataRca}`;
            document.getElementById('iv-assicurazione-compagnia').textContent = ds.nomeassicurazione || '-';
            const badgeRca = document.getElementById('iv-assicurazione-stato');
            badgeRca.textContent = ds.isinsured ? 'Attiva' : 'Scaduta';
            badgeRca.className = `iv-badge ${ds.isinsured ? 'iv-badge-attiva' : 'iv-badge-scaduta'}`;
        } else {
            document.getElementById('iv-assicurazione-date').textContent = 'Dato non disponibile';
        }
    } catch (err) {
        console.error('Errore nel caricamento info veicolo', err);
    }
}

/* =============================================
/           AVATAR DROPDOWN
/ ============================================*/
function toggleAvatarMenu() {
    const dropdown = document.getElementById('avatar-dropdown');
    dropdown.classList.toggle('open');
}

document.addEventListener('click', (e) => {
    const wrapper = document.getElementById('avatar-wrapper');
    if (wrapper && !wrapper.contains(e.target)) {
        document.getElementById('avatar-dropdown')?.classList.remove('open');
    }
});

 /* ---------------------------------------------------
/             CERCA E AGGIUNGI VEICOLO                /
----------------------------------------------------*/
function validaTarga(input) {
    const val = input.value.toUpperCase();
    input.value = val;
    const ok = document.getElementById('targa-icon-ok');
    const ko = document.getElementById('targa-icon-ko');
    const regex = /^[A-Z]{2}[0-9]{3}[A-Z]{2}$/;
    if (val.length === 0) {
        input.classList.remove('valid', 'invalid');
        ok.classList.remove('show');
        ko.classList.remove('show');
    } else if (val.length === 7 && regex.test(val)) {
        input.classList.add('valid'); input.classList.remove('invalid');
        ok.classList.add('show'); ko.classList.remove('show');
    } else if (val.length === 7) {
        input.classList.add('invalid'); input.classList.remove('valid');
        ko.classList.add('show'); ok.classList.remove('show');
    } else {
        input.classList.remove('valid', 'invalid');
        ok.classList.remove('show'); ko.classList.remove('show');
    }
}

function salvaStorico(targa) {
    let storico = JSON.parse(localStorage.getItem('storico_targhe') || '[]');
    storico = storico.filter(t => t !== targa);
    storico.unshift(targa);
    storico = storico.slice(0, 5);
    localStorage.setItem('storico_targhe', JSON.stringify(storico));
}

function renderStorico() {
    const storico = JSON.parse(localStorage.getItem('storico_targhe') || '[]');
    const container = document.getElementById('cerca-storico');
    const tags = document.getElementById('cerca-storico-tags');
    if (!container || !tags) return;
    if (storico.length === 0) { container.style.display = 'none'; return; }
    container.style.display = 'block';
    tags.innerHTML = storico.map(t => `
        <span class="cerca-storico-tag" onclick="usaStorico('${t}')">${t}</span>
    `).join('');
}

function usaStorico(targa) {
    const input = document.getElementById('input-targa-visitor');
    if (input) { input.value = targa; validaTarga(input); }
}

document.addEventListener("DOMContentLoaded", () => {
    renderStorico();
    const searchBtn = document.querySelector(".btn-info-veicolo");
    const plateInput = document.getElementById("input-targa-visitor");
    if (!searchBtn || !plateInput) return;

    searchBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        const plate = plateInput.value.trim().toUpperCase();
        const token = getData('access_token');
        if (!token) { alert("Devi effettuare il login."); return; }
        const Idtoken = getUserIdFromToken(token);
        if (plate.length < 5) {
            showResult(`<p style="color:#f87171; margin-top:10px;">Inserisci una targa valida.</p>`);
            return;
        }
        document.getElementById('cerca-loading').classList.add('show');
        document.getElementById('vehicleResult').innerHTML = '';
        try {
            const response = await fetch(`http://localhost:3000/veicolo/cerca/${plate}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            document.getElementById('cerca-loading').classList.remove('show');
            if (!response.ok) {
                showResult(`<p style="color:#f87171; margin-top:10px;">Veicolo non trovato.</p>`);
                return;
            }
            const data = await response.json();
            salvaStorico(plate);
            renderStorico();
            showResult(`
                <div class="vehicle-result-card">
                    <div class="vehicle-result-header">
                        <div class="vehicle-result-targa">${data.targa}</div>
                        <div class="vehicle-result-nome">${data.marca} ${data.modello}</div>
                    </div>
                    <div class="vehicle-result-divider"></div>
                    <div class="vehicle-result-body">
                        <div class="vehicle-result-field">
                            <span class="vehicle-result-label">Alimentazione</span>
                            <span class="vehicle-result-value">${data.alimentazione || '-'}</span>
                        </div>
                        <div class="vehicle-result-field">
                            <span class="vehicle-result-label">Cavalli</span>
                            <span class="vehicle-result-value">${data.cavalli ? data.cavalli + ' CV' : '-'}</span>
                        </div>
                        <div class="vehicle-result-field">
                            <span class="vehicle-result-label">Bollo</span>
                            <div class="vehicle-result-status ${data.isbolloattivo ? 'ok' : 'ko'}">
                                <div class="vehicle-result-dot ${data.isbolloattivo ? 'ok' : 'ko'}"></div>
                                ${data.isbolloattivo ? 'Attivo' : 'Scaduto'}
                            </div>
                        </div>
                        <div class="vehicle-result-field">
                            <span class="vehicle-result-label">Assicurazione</span>
                            <div class="vehicle-result-status ${data.isinsured ? 'ok' : 'ko'}">
                                <div class="vehicle-result-dot ${data.isinsured ? 'ok' : 'ko'}"></div>
                                ${data.isinsured ? 'Attiva' : 'Scaduta'}
                            </div>
                        </div>
                    </div>
                    <div class="vehicle-result-footer">
                        <button id="addVehicleBtn" type="button" class="btn-aggiungi-garage">
                            <i class="fa-solid fa-warehouse" aria-hidden="true"></i>
                            Aggiungi al mio garage
                            <i class="fa-solid fa-arrow-right btn-arrow" aria-hidden="true"></i>
                        </button>
                    </div>
                </div>
            `);
            const addBtn = document.getElementById("addVehicleBtn");
            if (addBtn) {
                addBtn.addEventListener("click", (evt) => {
                    evt.preventDefault();
                    evt.stopPropagation();
                    addVehicle(data.targa, Idtoken);
                }, { once: true });
            }
        } catch (err) {
            document.getElementById('cerca-loading').classList.remove('show');
            showResult(`<p style="color:#f87171; margin-top:10px;">Errore di connessione al server.</p>`);
        }
    });

    function showResult(html) {
        document.getElementById('vehicleResult').innerHTML = html;
    }
});

async function addVehicle(targa, Idtoken) {
    const token = getData('access_token');
    try {
        const response = await fetch(`http://localhost:3000/veicolo`, {
            method: "POST",
            headers: { "Content-Type": "application/json", 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ targa, id_utente: Idtoken })
        });
        if (response.status === 401) {
            alert('Sessione scaduta, effettua di nuovo il login');
            logout();
            return;
        }
        if (response.status === 409) {
            alert("Veicolo già esistente nel db!");
            return;
        }
        if (!response.ok) {
            alert("Errore durante l'aggiunta del veicolo.");
            return;
        }
        localStorage.setItem('garage_animation', 'true');
        window.location.href = "homepage.html";
    } catch (err) {
        alert("Errore di connessione.");
    }
}

function checkGarageAnimation() {
    if (localStorage.getItem('garage_animation') !== 'true') return;
    localStorage.removeItem('garage_animation');
    setTimeout(() => {
        const btn = document.getElementById('switcher-btn');
        if (!btn) return;
        btn.classList.add('garage-pop');
        setTimeout(() => btn.classList.remove('garage-pop'), 3000);
    }, 300);
}

async function getUsername() {
    const token = getData('access_token');
    const Idtoken = getUserIdFromToken(token);
    try {
        const response = await fetch(`http://localhost:3000/auth/utente/${Idtoken}`, {
            method: "GET",
            headers: { "Content-Type": "application/json", 'Authorization': `Bearer ${token}` }
        });
        if (response.status === 401) {
            alert('Sessione scaduta, effettua di nuovo il login');
            logout();
            return null;
        }
        if (!response.ok) {
            alert("Errore durante il recupero dell'utente.");
            return null;
        }
        const data = await response.json();
        return data[0].username;
    } catch (err) {
        alert("Errore di connessione.");
        return null;
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    const username = await getUsername();
    if (username) {
        document.getElementById("avatar-dropdown-name").textContent = username;
    }
});

 /* ----------------------------------------------------
/            LAYOUT CIRCOLARE HOMEPAGE                 /
-----------------------------------------------------*/
document.addEventListener('DOMContentLoaded', () => {
    const scene = document.querySelector('.cards-scene');
    if (!scene) return;
    const cards = [
        { id: 'hc1', angle: -90 },
        { id: 'hc2', angle: -18 },
        { id: 'hc3', angle: 54 },
        { id: 'hc4', angle: 126 },
        { id: 'hc5', angle: 198 },
    ];
    const r = 240;
    const cx = scene.offsetWidth / 2;
    const cy = scene.offsetHeight / 2;
    cards.forEach((c, i) => {
        const el = document.getElementById(c.id);
        if (!el) return;
        const rad = (c.angle * Math.PI) / 180;
        const x = cx + Math.cos(rad) * r;
        const y = cy + Math.sin(rad) * r;
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        setTimeout(() => {
            el.style.transition = 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease, box-shadow 0.25s ease, border-color 0.2s';
            el.style.transform = 'translate(-50%, -50%)';
            el.style.opacity = '1';
            el.addEventListener('mouseenter', () => {
                el.style.transform = 'translate(-50%, -50%) perspective(400px) rotateX(8deg) rotateY(-4deg) scale(1.1)';
                el.style.boxShadow = '0 20px 40px rgba(0,0,0,0.6)';
                el.style.borderColor = 'rgba(255,255,255,0.2)';
            });
            el.addEventListener('mouseleave', () => {
                el.style.transform = 'translate(-50%, -50%)';
                el.style.boxShadow = '0 4px 20px rgba(0,0,0,0.4)';
                el.style.borderColor = 'rgba(255,255,255,0.08)';
            });
            el.addEventListener('mousedown', () => {
                el.style.transform = 'translate(-50%, -50%) scale(0.96)';
            });
            el.addEventListener('mouseup', () => {
                el.style.transform = 'translate(-50%, -50%)';
            });
        }, 100 + i * 80);
    });
});
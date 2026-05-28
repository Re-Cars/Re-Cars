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

 /* ----------------------------------------------------
/                   SIDEBAR E HAMB                     /
-----------------------------------------------------*/
function toggleMenu() {
    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('hamburger-overlay');
    var hamburger = document.getElementById('hamburger9');

    if (sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
        hamburger.classList.remove('open');
        hamburger.style.left = '20px';
        hamburger.style.top = '30px';
    } else {
        sidebar.classList.add('open');
        overlay.classList.add('open');
        hamburger.classList.add('open');
        hamburger.style.left = '225px';
        hamburger.style.top = '18px';
    }
}

function closeMenu() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('hamburger-overlay').classList.remove('open');
    document.getElementById('hamburger9').classList.remove('open');
    document.getElementById('hamburger9').style.left = '20px';
    document.getElementById('hamburger9').style.top = '30px';
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
        if (counterEl) {
            counterEl.textContent = veicoli.length;
        }

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

        const btn = document.createElement('button');
        btn.className = 'switcher-item' + (i === veicoloAttivoIndex ? ' attivo' : '');
        btn.innerHTML = `
            <i class="fa-solid ${iconClass}"></i>
            <span>${v.nome}</span>
            <span class="item-targa">${v.targa}</span>
        `;
        btn.onclick = () => selezionaVeicolo(i);
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

function selezionaVeicolo(index) {
    veicoloAttivoIndex = index;
    renderVeicoloAttivo();
    renderDropdown();
    closeSwitcher();

    if (document.getElementById('iv-tipo')) {
        caricaInfoVeicolo();
    }
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
    if (switcher && !switcher.contains(e.target)) {
        closeSwitcher();
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    await caricaVeicoli();
    
    if (document.getElementById('iv-tipo')) {
        caricaInfoVeicolo();
    }
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
            ? new Date(ds.dataimmatricolazione).getFullYear()
            : '-';


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



// =============================================
//           AVATAR DROPDOWN -- functions-app
// =============================================
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

document.addEventListener("DOMContentLoaded", () => {
    const searchBtn = document.querySelector(".btn-info-veicolo");
    const plateInput = document.getElementById("input-targa-visitor");

    if (!searchBtn || !plateInput) return;


    searchBtn.addEventListener("click", async (e) => {
        e.preventDefault();

        const plate = plateInput.value.trim().toUpperCase();
        const token = getData('access_token');
        
        if (!token) {
            alert("Devi effettuare il login.");
            return;
        }

        const Idtoken = getUserIdFromToken(token);

        if (plate.length < 5) {
            showResult(`<p style="color:red; margin-top:10px;">Inserisci una targa valida.</p>`);
            return;
        }

        showResult(`<p style="margin-top:10px;">🔍 Ricerca in corso...</p>`);

        try {
            const response = await fetch(`http://localhost:3000/veicolo/cerca/${plate}`,  {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                showResult(`<p style="color:red; margin-top:10px;">Veicolo non trovato.</p>`);
                return;
            }

            const data = await response.json();
            
            showResult(`
                <div class="card" style="margin-top:20px; display:block; opacity:1;">
                    <h3><i class="fa-solid fa-car"></i> Veicolo trovato</h3>
                    <p><b>Marca:</b> ${data.marca}</p>
                    <p><b>Modello:</b> ${data.modello}</p>
                    <p><b>Targa:</b> ${data.targa}</p>
                    <p><b>Alimentazione:</b> ${data.alimentazione}</p>
                    <p><b>Cavalli:</b> ${data.cavalli} CV</p>
                    <button id="addVehicleBtn" type="button" class="btn-landing" style="margin-top:10px;">
                        <i class="fa-solid fa-plus"></i> Aggiungi al mio garage
                    </button>
                </div>
            `);


            document.getElementById("addVehicleBtn").addEventListener("click", (evt) => {
                evt.preventDefault();
                addVehicle(data.targa, Idtoken);
            });

        } catch (err) {
            showResult(`<p style="color:red; margin-top:10px;">Errore di connessione al server.</p>`);
        }
    });

    function showResult(html) {
        let box = document.getElementById("vehicleResult");
        if (!box) {
            box = document.createElement("div");
            box.id = "vehicleResult";
            const container = document.querySelector(".landing-search-section");
            if (container) {
                container.appendChild(box);
            }
        }
        box.innerHTML = html;
    }
});

async function addVehicle(targa, Idtoken) {
    const token = getData('access_token');
    
    try {
        const response = await fetch("http://localhost:3000/veicolo", {
            method: "POST",
            headers: { "Content-Type": "application/json" ,  'Authorization': `Bearer ${token}`  },
            body: JSON.stringify({ targa, id_utente: Idtoken })
        });

        if (response.status === 401) {
            alert('Sessione scaduta, effettua di nuovo il login');
            logout();
        }
        
        if (response.status === 409) {
            alert("Veicolo già esistente nel db!");
            return;
        }

        if (!response.ok) {
            alert("Errore durante l'aggiunta del veicolo.");
            return;
        }


        alert("Veicolo aggiunto correttamente!");
        window.location.href = "homepage.html";
    } catch (err) {
        alert("Errore di connessione.");
    }
}
//Stampa del nome nel menu a tendina
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
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
    window.location.href = 'landing.html';
}

// =============================================
//           GESTIONE MULTI-VEICOLO
// =============================================

let veicoli = [];
let veicoloAttivoIndex = 0;

async function caricaVeicoli() {
    const utente = getData('yd_utente_loggato');
    if (!utente) return;
    try {
        const response = await fetch(`http://localhost:3000/veicolo/utente/${utente.id}`);
        const data = await response.json();
        veicoli = data.map(v => ({
            id: v.id,
            nome: `${v.marca} ${v.modello}`,
            targa: v.targa,
            tipo: v.dati_generici[0]?.tipo_veicolo === 'Moto' ? 'motorcycle' : 'car',
        }));
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

    document.getElementById('nome-veicolo-attivo').textContent = v.nome;
    document.getElementById('switcher-label').textContent =
        `[ ${veicoloAttivoIndex + 1} - ... ]`;
    localStorage.setItem('veicoloAttivo', JSON.stringify(v));
}

function renderDropdown() {
    const dropdown = document.getElementById('switcher-dropdown');
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

document.addEventListener('DOMContentLoaded', () => {
    caricaVeicoli();
});


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

    // Aggiunto l'argomento 'e' per controllare l'evento del click
    searchBtn.addEventListener("click", async (e) => {
        e.preventDefault(); // BLOCCA IL RICARICAMENTO DELLA PAGINA

        const plate = plateInput.value.trim().toUpperCase();
        const utente = getData("yd_utente_loggato");

        if (!utente) {
            alert("Devi effettuare il login.");
            return;
        }

        if (plate.length < 5) {
            showResult(`<p style="color:red; margin-top:10px;">Inserisci una targa valida.</p>`);
            return;
        }

        showResult(`<p style="margin-top:10px;">🔍 Ricerca in corso...</p>`);

        try {
            const response = await fetch(`http://localhost:3000/veicolo/cerca/${plate}`);
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

            // Cambiato anche qui inserendo il blocco del submit preventivo
            document.getElementById("addVehicleBtn").addEventListener("click", (evt) => {
                evt.preventDefault();
                addVehicle(data.targa, utente.id);
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

async function addVehicle(targa, userId) {
    try {
        const response = await fetch("http://localhost:3000/veicolo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ targa, id_utente: userId })
        });

        if (!response.ok) {
            alert("Errore durante l'aggiunta del veicolo.");
            return;
        }

        alert("Veicolo aggiunto correttamente!");
        window.location.href = "imp_imiei_veicoli.html";
    } catch (err) {
        alert("Errore di connessione.");
    }
}
//Stampa del nome nel menu a tendina
async function getUsername(userId) {
    try {
        const response = await fetch(`http://localhost:3000/auth/utente/${userId}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });

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
    const utente = getData('yd_utente_loggato');
    const username = await getUsername(utente.id);

    if (username) {
        document.getElementById("avatar-dropdown-name").textContent = username;
    }
});
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

        // In produzione questi dati vengono dal backend/localStorage
        let veicoli = [
            { id: 1, nome: "Fiat 500", targa: "AA123BB", tipo: "car" },
            { id: 2, nome: "Honda CBR", targa: "ZZ987YY", tipo: "motorcycle" },
        ];

        let veicoloAttivoIndex = 0;

        function getVeicoloAttivo() {
            return veicoli[veicoloAttivoIndex];
        }

        function renderVeicoloAttivo() {
            const v = getVeicoloAttivo();
            if (!v) return;

            // Aggiorna nome nell'intro
            document.getElementById('nome-veicolo-attivo').textContent = v.nome;

            // Aggiorna etichetta switcher [N - ...]
            document.getElementById('switcher-label').textContent =
                `[ ${veicoloAttivoIndex + 1} - ... ]`;

            // Salva in localStorage per le altre pagine
            localStorage.setItem('veicoloAttivo', JSON.stringify(v));
        }

        function renderDropdown() {
            const dropdown = document.getElementById('switcher-dropdown');
            dropdown.innerHTML = '';

            veicoli.forEach((v, i) => {
                const iconClass = v.tipo === 'motorcycle'
                    ? 'fa-motorcycle' : 'fa-car';

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

            // Bottone aggiungi veicolo in fondo al dropdown
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

        // Chiudi dropdown cliccando fuori
        document.addEventListener('click', (e) => {
            const switcher = document.getElementById('veicolo-switcher');
            if (switcher && !switcher.contains(e.target)) {
                closeSwitcher();
            }
        });

        // Init
        document.addEventListener('DOMContentLoaded', () => {
            // In produzione: carica veicoli da API/localStorage
            renderVeicoloAttivo();
        });


        // =============================================
        //           AVATAR DROPDOWN -- functions-app
        // =============================================
        function toggleAvatarMenu() {
            const dropdown = document.getElementById('avatar-dropdown');
            dropdown.classList.toggle('open');
        }

        // Chiudi cliccando fuori
        document.addEventListener('click', (e) => {
            const wrapper = document.getElementById('avatar-wrapper');
            if (wrapper && !wrapper.contains(e.target)) {
                document.getElementById('avatar-dropdown')?.classList.remove('open');
            }
        });
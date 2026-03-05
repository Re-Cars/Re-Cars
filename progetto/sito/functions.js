/* =====================================================
/                  CARD OBSERVER                       /
===================================================== */
document.addEventListener("DOMContentLoaded", () => {
    const cards = document.querySelectorAll(".card");

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("show");
            }
        });
    }, { threshold: 0.1 });

    cards.forEach(card => observer.observe(card));

    // Footer automatico
    const footer = document.getElementById("footer");
    if (footer) {
        const year = new Date().getFullYear();
        footer.innerHTML = `<p>© ${year} — YouDrive</p>`;
    }

    // Header utente
    const headerUser = document.getElementById("header-user");
    if (headerUser) {
        const utente = getUtenteLoggato();
        if (utente) {
            headerUser.textContent = utente.nome;
        }
    }

    // Protezione pagine: se non loggato, rimanda al login
    const paginaAttuale = window.location.pathname.split("/").pop();
    const paginePubbliche = ["index.html", ""];
    if (!paginePubbliche.includes(paginaAttuale)) {
        const utente = getUtenteLoggato();
        if (!utente) {
            window.location.href = "index.html";
            return;
        }
    }

    // Inizializzazione per pagina
    if (paginaAttuale === "home.html") {
        initHome();
    }
    if (paginaAttuale === "veicoli.html") {
        initVeicoli();
    }
    if (paginaAttuale === "scadenze.html") {
        initScadenze();
    }
    if (paginaAttuale === "prenotazioni.html") {
        initPrenotazioni();
    }
    if (paginaAttuale === "recensioni.html") {
        initRecensioni();
    }
});

/* =====================================================
/                  HAMBURGER MENU                      /
===================================================== */
function openMenu() {
    document.getElementById("sidebar").classList.add("open");
    document.getElementById("hamburger-overlay").classList.add("active");
}

function closeMenu() {
    document.getElementById("sidebar").classList.remove("open");
    document.getElementById("hamburger-overlay").classList.remove("active");
}

/* =====================================================
/                  STORAGE HELPERS                     /
===================================================== */
function getData(chiave) {
    const val = localStorage.getItem(chiave);
    if (!val) return null;
    return JSON.parse(val);
}

function setData(chiave, valore) {
    localStorage.setItem(chiave, JSON.stringify(valore));
}

function getUtenteLoggato() {
    return getData("youdrive_utente_loggato");
}

function getVeicoli() {
    const utente = getUtenteLoggato();
    if (!utente) return [];
    return getData("youdrive_veicoli_" + utente.email) || [];
}

function setVeicoli(veicoli) {
    const utente = getUtenteLoggato();
    if (!utente) return;
    setData("youdrive_veicoli_" + utente.email, veicoli);
}

function getPrenotazioni() {
    const utente = getUtenteLoggato();
    if (!utente) return [];
    return getData("youdrive_prenotazioni_" + utente.email) || [];
}

function setPrenotazioni(prenotazioni) {
    const utente = getUtenteLoggato();
    if (!utente) return;
    setData("youdrive_prenotazioni_" + utente.email, prenotazioni);
}

function getRecensioni() {
    const utente = getUtenteLoggato();
    if (!utente) return [];
    return getData("youdrive_recensioni_" + utente.email) || [];
}

function setRecensioni(recensioni) {
    const utente = getUtenteLoggato();
    if (!utente) return;
    setData("youdrive_recensioni_" + utente.email, recensioni);
}

function getScadenze() {
    const utente = getUtenteLoggato();
    if (!utente) return {};
    return getData("youdrive_scadenze_" + utente.email) || {};
}

function setScadenze(scadenze) {
    const utente = getUtenteLoggato();
    if (!utente) return;
    setData("youdrive_scadenze_" + utente.email, scadenze);
}

/* =====================================================
/                    AUTH                              /
===================================================== */
function switchTab(tab) {
    const btnLogin = document.getElementById("tab-login");
    const btnReg = document.getElementById("tab-register");
    const formLogin = document.getElementById("form-login");
    const formReg = document.getElementById("form-register");

    if (tab === "login") {
        btnLogin.classList.add("active");
        btnReg.classList.remove("active");
        formLogin.classList.remove("hidden");
        formReg.classList.add("hidden");
    } else {
        btnReg.classList.add("active");
        btnLogin.classList.remove("active");
        formReg.classList.remove("hidden");
        formLogin.classList.add("hidden");
    }
}

function register() {
    const nome = document.getElementById("reg-nome").value.trim();
    const email = document.getElementById("reg-email").value.trim();
    const password = document.getElementById("reg-password").value;
    const errEl = document.getElementById("reg-error");

    if (!nome || !email || !password) {
        errEl.textContent = "Compila tutti i campi.";
        return;
    }
    if (!email.includes("@")) {
        errEl.textContent = "Email non valida.";
        return;
    }
    if (password.length < 6) {
        errEl.textContent = "La password deve avere almeno 6 caratteri.";
        return;
    }

    const utenti = getData("youdrive_utenti") || [];
    const esisteGia = utenti.find(u => u.email === email);
    if (esisteGia) {
        errEl.textContent = "Email già registrata. Accedi.";
        return;
    }

    const nuovoUtente = { nome, email, password };
    utenti.push(nuovoUtente);
    setData("youdrive_utenti", utenti);

    // Login automatico dopo registrazione
    setData("youdrive_utente_loggato", { nome, email });
    window.location.href = "home.html";
}

function login() {
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    const errEl = document.getElementById("login-error");

    if (!email || !password) {
        errEl.textContent = "Inserisci email e password.";
        return;
    }

    const utenti = getData("youdrive_utenti") || [];
    const utente = utenti.find(u => u.email === email && u.password === password);

    if (!utente) {
        errEl.textContent = "Credenziali non corrette.";
        return;
    }

    setData("youdrive_utente_loggato", { nome: utente.nome, email: utente.email });
    window.location.href = "home.html";
}

function logout() {
    localStorage.removeItem("youdrive_utente_loggato");
    window.location.href = "index.html";
}

/* =====================================================
/                    HOME                              /
===================================================== */
function initHome() {
    const utente = getUtenteLoggato();
    const heroUsername = document.getElementById("hero-username");
    if (heroUsername && utente) {
        heroUsername.textContent = "Ciao, " + utente.nome + "!";
    }
}

/* =====================================================
/                    VEICOLI                           /
===================================================== */

// Dati veicolo simulati (in realtà si chiamerebbe un API con la targa)
let veicoloTrovato = null;

function cercaVeicolo() {
    const targa = document.getElementById("input-targa").value.trim().toUpperCase();
    const errEl = document.getElementById("targa-error");
    const cardDati = document.getElementById("card-dati-veicolo");

    if (!targa) {
        errEl.textContent = "Inserisci la targa.";
        return;
    }

    // Validazione formato targa italiana (es. AA123BB)
    const regexTarga = /^[A-Z]{2}[0-9]{3}[A-Z]{2}$/;
    if (!regexTarga.test(targa)) {
        errEl.textContent = "Formato targa non valido. Es: AA123BB";
        return;
    }

    errEl.textContent = "";

    // Simulazione dati veicolo (come se arrivassero da un API)
    const marche = ["Fiat", "Alfa Romeo", "Volkswagen", "Ford", "Toyota", "BMW", "Renault"];
    const modelli = {
        "Fiat": ["Panda", "500", "Tipo", "Punto"],
        "Alfa Romeo": ["Giulia", "Stelvio", "Tonale"],
        "Volkswagen": ["Golf", "Polo", "Passat", "Tiguan"],
        "Ford": ["Fiesta", "Focus", "Kuga"],
        "Toyota": ["Yaris", "Corolla", "RAV4"],
        "BMW": ["Serie 1", "Serie 3", "X1", "X3"],
        "Renault": ["Clio", "Megane", "Captur"]
    };

    // Dati deterministici basati sulla targa (sempre gli stessi per la stessa targa)
    const seed = targa.charCodeAt(0) + targa.charCodeAt(1) + targa.charCodeAt(4);
    const marca = marche[seed % marche.length];
    const listaModelli = modelli[marca];
    const modello = listaModelli[(seed + targa.charCodeAt(2)) % listaModelli.length];
    const annoBase = 2010 + (seed % 13);
    const cilindrate = [1000, 1200, 1400, 1600, 1800, 2000];
    const cilindrata = cilindrate[seed % cilindrate.length];
    const carburanti = ["Benzina", "Diesel", "Ibrido", "GPL"];
    const carburante = carburanti[(seed + 1) % carburanti.length];
    const colori = ["Bianco", "Nero", "Grigio", "Blu", "Rosso", "Silver"];
    const colore = colori[(seed + 2) % colori.length];

    veicoloTrovato = {
        targa,
        marca,
        modello,
        anno: annoBase,
        cilindrata: cilindrata + " cc",
        carburante,
        colore
    };

    // Mostra i dati
    const contenuto = document.getElementById("dati-veicolo-content");
    contenuto.innerHTML = `
        <div class="veicolo-row"><span>Targa</span><span class="badge-targa">${targa}</span></div>
        <div class="veicolo-row"><span>Marca</span><span>${marca}</span></div>
        <div class="veicolo-row"><span>Modello</span><span>${modello}</span></div>
        <div class="veicolo-row"><span>Anno</span><span>${annoBase}</span></div>
        <div class="veicolo-row"><span>Cilindrata</span><span>${cilindrata} cc</span></div>
        <div class="veicolo-row"><span>Carburante</span><span>${carburante}</span></div>
        <div class="veicolo-row"><span>Colore</span><span>${colore}</span></div>
    `;

    cardDati.classList.remove("hidden");
    cardDati.classList.add("show");
}

function aggiungiVeicolo() {
    if (!veicoloTrovato) return;

    const veicoli = getVeicoli();
    const esiste = veicoli.find(v => v.targa === veicoloTrovato.targa);

    if (esiste) {
        document.getElementById("targa-error").textContent = "Veicolo già aggiunto.";
        return;
    }

    veicoli.push(veicoloTrovato);
    setVeicoli(veicoli);

    document.getElementById("card-dati-veicolo").classList.add("hidden");
    document.getElementById("input-targa").value = "";
    veicoloTrovato = null;

    renderListaVeicoli();
}

function initVeicoli() {
    renderListaVeicoli();
}

function renderListaVeicoli() {
    const veicoli = getVeicoli();
    const el = document.getElementById("lista-veicoli");
    if (!el) return;

    if (veicoli.length === 0) {
        el.innerHTML = '<p style="color:#7a6aaa">Nessun veicolo aggiunto.</p>';
        return;
    }

    el.innerHTML = veicoli.map((v, i) => `
        <div class="veicolo-item">
            <div>
                <span class="badge-targa">${v.targa}</span>
                <strong style="margin-left:12px; color:#e0d8ff">${v.marca} ${v.modello}</strong>
                <span style="color:#7a6aaa; margin-left:8px; font-size:0.85rem">${v.anno} · ${v.carburante}</span>
            </div>
            <button class="btn-secondary" onclick="rimuoviVeicolo(${i})">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
    `).join("");
}

function rimuoviVeicolo(index) {
    const veicoli = getVeicoli();
    veicoli.splice(index, 1);
    setVeicoli(veicoli);
    renderListaVeicoli();
}

/* =====================================================
/                    SCADENZE                          /
===================================================== */
let tipoScadenzaCorrente = "";

function initScadenze() {
    const veicoli = getVeicoli();
    const select = document.getElementById("select-veicolo-scadenze");
    if (!select) return;

    if (veicoli.length === 0) {
        select.innerHTML = '<option value="">— Nessun veicolo aggiunto —</option>';
        return;
    }

    select.innerHTML = '<option value="">— Scegli un veicolo —</option>' +
        veicoli.map(v => `<option value="${v.targa}">${v.targa} — ${v.marca} ${v.modello}</option>`).join("");
}

function caricaScadenze() {
    const targa = document.getElementById("select-veicolo-scadenze").value;
    if (!targa) return;

    const scadenze = getScadenze();
    const datiVeicolo = scadenze[targa] || {};

    renderScadenzaCard("bollo", datiVeicolo.bollo);
    renderScadenzaCard("revisione", datiVeicolo.revisione);
    renderScadenzaCard("tagliando", datiVeicolo.tagliando);
}

function renderScadenzaCard(tipo, data) {
    const el = document.getElementById("info-" + tipo);
    if (!el) return;

    if (!data) {
        el.innerHTML = '<p style="color:#7a6aaa">Nessuna data impostata</p>';
        return;
    }

    const oggi = new Date();
    const dataScadenza = new Date(data);
    const diffGiorni = Math.ceil((dataScadenza - oggi) / (1000 * 60 * 60 * 24));

    let stato = "";
    let classe = "";

    if (diffGiorni < 0) {
        stato = "Scaduta!";
        classe = "scadenza-expired";
    } else if (diffGiorni <= 30) {
        stato = "In scadenza (" + diffGiorni + " giorni)";
        classe = "scadenza-warn";
    } else {
        stato = "In regola (" + diffGiorni + " giorni)";
        classe = "scadenza-ok";
    }

    const dataFormatted = dataScadenza.toLocaleDateString("it-IT");

    el.innerHTML = `
        <p>Scadenza: <strong style="color:#e0d8ff">${dataFormatted}</strong></p>
        <p class="${classe}"><i class="fa-solid fa-circle"></i> ${stato}</p>
    `;
}

function impostaScadenza(tipo) {
    const targa = document.getElementById("select-veicolo-scadenze").value;
    if (!targa) {
        alert("Seleziona prima un veicolo.");
        return;
    }

    tipoScadenzaCorrente = tipo;

    const titoli = { bollo: "Bollo Auto", revisione: "Revisione", tagliando: "Tagliando" };
    document.getElementById("modal-scadenza-titolo").textContent = "Imposta — " + titoli[tipo];

    // Pre-compila con data attuale se già impostata
    const scadenze = getScadenze();
    const datiVeicolo = scadenze[targa] || {};
    if (datiVeicolo[tipo]) {
        document.getElementById("input-data-scadenza").value = datiVeicolo[tipo];
    } else {
        document.getElementById("input-data-scadenza").value = "";
    }

    document.getElementById("modal-scadenza").classList.remove("hidden");
}

function salvaScadenza() {
    const targa = document.getElementById("select-veicolo-scadenze").value;
    const data = document.getElementById("input-data-scadenza").value;

    if (!data) {
        alert("Seleziona una data.");
        return;
    }

    const scadenze = getScadenze();
    if (!scadenze[targa]) scadenze[targa] = {};
    scadenze[targa][tipoScadenzaCorrente] = data;
    setScadenze(scadenze);

    chiudiModal("modal-scadenza");
    renderScadenzaCard(tipoScadenzaCorrente, data);
}

/* =====================================================
/                    PRENOTAZIONI                      /
===================================================== */
let officineSel = [];
let officineCorrente = null;

function initPrenotazioni() {
    const veicoli = getVeicoli();
    const select = document.getElementById("input-veicolo-prenota");
    if (select) {
        select.innerHTML = '<option value="">— Seleziona veicolo —</option>' +
            veicoli.map(v => `<option value="${v.targa}">${v.targa} — ${v.marca} ${v.modello}</option>`).join("");
    }
    renderListaPrenotazioni();
}

function cercaOfficine() {
    const luogo = document.getElementById("input-luogo").value.trim();
    const data = document.getElementById("input-data-prenota").value;
    const tipo = document.getElementById("input-tipo-officina").value;
    const errEl = document.getElementById("prenota-error");

    if (!luogo || !data || !tipo) {
        errEl.textContent = "Compila tutti i campi per cercare.";
        return;
    }

    errEl.textContent = "";

    // Officine simulate
    const nomiOfficine = {
        "meccanico": ["Officina Ferrari", "Auto Service Bianchi", "Meccanica Rossi"],
        "elettrauto": ["ElettroAuto Center", "Auto Elettrica Verdi", "Spark Motors"],
        "carrozzeria": ["Carrozzeria Marinelli", "AutoBody Expert", "Verniciatura Blu"],
        "gommista": ["Pneumatici Pro", "GommaPoint", "Fast Tyre"],
        "tagliando": ["TagliandoExpress", "Quick Service", "AutoCare Center"]
    };

    const lista = nomiOfficine[tipo] || ["Officina Generica 1", "Officina Generica 2"];
    const seed = luogo.length + data.length;

    officineSel = lista.map((nome, i) => ({
        id: i,
        nome,
        indirizzo: "Via " + luogo + ", " + (10 + i * 3) + " — " + luogo,
        telefono: "0" + (91 + seed + i) + " " + (100000 + seed * 10 + i * 1234),
        tipo,
        luogo,
        data
    }));

    const listaEl = document.getElementById("lista-officine");
    listaEl.innerHTML = officineSel.map((o, i) => `
        <div class="officina-item">
            <div class="officina-info">
                <strong>${o.nome}</strong>
                <p><i class="fa-solid fa-location-dot"></i> ${o.indirizzo}</p>
                <p><i class="fa-solid fa-phone"></i> ${o.telefono}</p>
            </div>
            <div style="display:flex; flex-direction:column; gap:8px">
                <button class="btn-secondary" onclick="mostraMappa(${i})">
                    <i class="fa-solid fa-map"></i> Mappa
                </button>
                <button class="btn-primary" onclick="apriModalPrenota(${i})">
                    <i class="fa-solid fa-calendar-plus"></i> Prenota
                </button>
            </div>
        </div>
    `).join("");
}

function mostraMappa(index) {
    const officina = officineSel[index];
    const cardMappa = document.getElementById("card-mappa");
    const iframe = document.getElementById("mappa-iframe");
    const info = document.getElementById("mappa-info");

    const query = encodeURIComponent(officina.indirizzo + " " + officina.luogo);
    iframe.src = "https://maps.google.com/maps?q=" + query + "&output=embed&hl=it";

    info.innerHTML = `<i class="fa-solid fa-location-dot"></i> Stai visualizzando il percorso verso <strong style="color:#e0d8ff">${officina.nome}</strong> — ${officina.indirizzo}`;

    cardMappa.classList.remove("hidden");
    cardMappa.classList.add("show");
    cardMappa.scrollIntoView({ behavior: "smooth", block: "center" });
}

function apriModalPrenota(index) {
    const officina = officineSel[index];
    const veicolo = document.getElementById("input-veicolo-prenota").value;
    const errEl = document.getElementById("prenota-error");

    if (!veicolo) {
        errEl.textContent = "Seleziona prima il veicolo da prenotare.";
        return;
    }

    officineCorrente = { ...officina, targa: veicolo };

    const dataFormatted = new Date(officina.data).toLocaleDateString("it-IT");

    document.getElementById("modal-prenota-riepilogo").innerHTML = `
        <div class="veicolo-row"><span>Officina</span><span style="color:#e0d8ff">${officina.nome}</span></div>
        <div class="veicolo-row"><span>Tipo</span><span style="color:#e0d8ff">${capitalizza(officina.tipo)}</span></div>
        <div class="veicolo-row"><span>Data</span><span style="color:#e0d8ff">${dataFormatted}</span></div>
        <div class="veicolo-row"><span>Indirizzo</span><span style="color:#e0d8ff">${officina.indirizzo}</span></div>
        <div class="veicolo-row"><span>Veicolo</span><span class="badge-targa">${veicolo}</span></div>
    `;

    document.getElementById("modal-prenota").classList.remove("hidden");
}

function confermaPrenotazione() {
    if (!officineCorrente) return;

    const prenotazioni = getPrenotazioni();
    prenotazioni.push({
        id: Date.now(),
        ...officineCorrente
    });
    setPrenotazioni(prenotazioni);

    chiudiModal("modal-prenota");
    officineCorrente = null;
    renderListaPrenotazioni();

    alert("Prenotazione confermata!");
}

function renderListaPrenotazioni() {
    const prenotazioni = getPrenotazioni();
    const el = document.getElementById("lista-prenotazioni");
    if (!el) return;

    if (prenotazioni.length === 0) {
        el.innerHTML = '<p style="color:#7a6aaa">Nessuna prenotazione effettuata.</p>';
        return;
    }

    el.innerHTML = prenotazioni.map((p, i) => {
        const dataFormatted = new Date(p.data).toLocaleDateString("it-IT");
        return `
            <div class="prenotazione-item">
                <p><strong>${p.nome}</strong> — <span class="badge-targa">${p.targa}</span></p>
                <p><i class="fa-solid fa-calendar"></i> ${dataFormatted} &nbsp;|&nbsp; <i class="fa-solid fa-wrench"></i> ${capitalizza(p.tipo)}</p>
                <p><i class="fa-solid fa-location-dot"></i> ${p.indirizzo}</p>
                <button class="btn-secondary" onclick="rimuoviPrenotazione(${i})" style="margin-top:8px">
                    <i class="fa-solid fa-trash"></i> Rimuovi
                </button>
            </div>
        `;
    }).join("");
}

function rimuoviPrenotazione(index) {
    const prenotazioni = getPrenotazioni();
    prenotazioni.splice(index, 1);
    setPrenotazioni(prenotazioni);
    renderListaPrenotazioni();
}

/* =====================================================
/                    RECENSIONI                        /
===================================================== */
let stellaSelezionata = 0;

function initRecensioni() {
    const prenotazioni = getPrenotazioni();
    const select = document.getElementById("select-prenota-recensione");
    const cardForm = document.getElementById("card-form-recensione");
    const cardNoPren = document.getElementById("card-no-prenotazioni");

    if (prenotazioni.length === 0) {
        if (cardForm) cardForm.classList.add("hidden");
        if (cardNoPren) cardNoPren.classList.remove("hidden");
    } else {
        if (cardNoPren) cardNoPren.classList.add("hidden");
        if (cardForm) cardForm.classList.remove("hidden");
        if (select) {
            select.innerHTML = '<option value="">— Seleziona prenotazione —</option>' +
                prenotazioni.map((p, i) => {
                    const dataFormatted = new Date(p.data).toLocaleDateString("it-IT");
                    return `<option value="${i}">${p.nome} — ${dataFormatted}</option>`;
                }).join("");
        }
    }

    renderListaRecensioni();
}

function setStella(val) {
    stellaSelezionata = val;
    const stelle = document.querySelectorAll(".stella");
    stelle.forEach((s, i) => {
        if (i < val) {
            s.classList.add("attiva");
        } else {
            s.classList.remove("attiva");
        }
    });
}

function inviaRecensione() {
    const index = document.getElementById("select-prenota-recensione").value;
    const testo = document.getElementById("input-testo-recensione").value.trim();
    const errEl = document.getElementById("rec-error");

    if (index === "") {
        errEl.textContent = "Seleziona una prenotazione.";
        return;
    }
    if (stellaSelezionata === 0) {
        errEl.textContent = "Dai un voto prima di inviare.";
        return;
    }
    if (!testo) {
        errEl.textContent = "Scrivi un commento.";
        return;
    }

    errEl.textContent = "";

    const prenotazioni = getPrenotazioni();
    const prenotazione = prenotazioni[parseInt(index)];

    const recensioni = getRecensioni();
    recensioni.push({
        officina: prenotazione.nome,
        data: prenotazione.data,
        targa: prenotazione.targa,
        stelle: stellaSelezionata,
        testo
    });
    setRecensioni(recensioni);

    // Reset form
    document.getElementById("select-prenota-recensione").value = "";
    document.getElementById("input-testo-recensione").value = "";
    setStella(0);

    renderListaRecensioni();
}

function renderListaRecensioni() {
    const recensioni = getRecensioni();
    const el = document.getElementById("lista-recensioni");
    if (!el) return;

    if (recensioni.length === 0) {
        el.innerHTML = '<p style="color:#7a6aaa">Non hai ancora lasciato recensioni.</p>';
        return;
    }

    el.innerHTML = recensioni.map(r => {
        const stelle = "★".repeat(r.stelle) + "☆".repeat(5 - r.stelle);
        const dataFormatted = new Date(r.data).toLocaleDateString("it-IT");
        return `
            <div class="recensione-item">
                <div class="recensione-stelle">${stelle}</div>
                <p><strong style="color:#e0d8ff">${r.officina}</strong> — <span class="badge-targa">${r.targa}</span></p>
                <p>${r.testo}</p>
                <p style="font-size:0.8rem; color:#5a4a8a">${dataFormatted}</p>
            </div>
        `;
    }).join("");
}

/* =====================================================
/                  STORICO PDF                         /
===================================================== */
function downloadStoricoPDF() {
    const prenotazioni = getPrenotazioni();
    const recensioni = getRecensioni();
    const veicoli = getVeicoli();
    const utente = getUtenteLoggato();

    if (prenotazioni.length === 0) {
        alert("Non ci sono interventi nello storico da scaricare.");
        return;
    }

    // Crea contenuto testo semplice del PDF simulato come file HTML stampabile
    let contenuto = `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8">
    <title>Storico Interventi — YouDrive</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #222; }
        h1 { color: #6a00ff; }
        h2 { color: #444; border-bottom: 1px solid #ddd; padding-bottom: 6px; }
        .item { padding: 12px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 12px; }
        .targa { background: #f0ebff; padding: 2px 10px; border-radius: 6px; font-weight: bold; color: #6a00ff; }
        footer { margin-top: 40px; font-size: 0.8rem; color: #888; }
    </style>
    </head><body>
    <h1>🚗 YouDrive — Storico Interventi</h1>
    <p><strong>Utente:</strong> ${utente ? utente.nome : "N/D"} &nbsp;|&nbsp; <strong>Data stampa:</strong> ${new Date().toLocaleDateString("it-IT")}</p>
    
    <h2>Veicoli Registrati</h2>`;

    if (veicoli.length === 0) {
        contenuto += "<p>Nessun veicolo.</p>";
    } else {
        veicoli.forEach(v => {
            contenuto += `<div class="item"><span class="targa">${v.targa}</span> — ${v.marca} ${v.modello} (${v.anno}) — ${v.carburante}</div>`;
        });
    }

    contenuto += "<h2>Prenotazioni Effettuate</h2>";
    prenotazioni.forEach(p => {
        const dataFormatted = new Date(p.data).toLocaleDateString("it-IT");
        contenuto += `<div class="item">
            <p><strong>${p.nome}</strong> — <span class="targa">${p.targa}</span></p>
            <p>Tipo: ${capitalizza(p.tipo)} &nbsp;|&nbsp; Data: ${dataFormatted}</p>
            <p>Indirizzo: ${p.indirizzo}</p>
        </div>`;
    });

    contenuto += "<h2>Recensioni Lasciate</h2>";
    if (recensioni.length === 0) {
        contenuto += "<p>Nessuna recensione.</p>";
    } else {
        recensioni.forEach(r => {
            const stelle = "★".repeat(r.stelle) + "☆".repeat(5 - r.stelle);
            const dataFormatted = new Date(r.data).toLocaleDateString("it-IT");
            contenuto += `<div class="item">
                <p>${stelle} — <strong>${r.officina}</strong></p>
                <p>"${r.testo}"</p>
                <p style="font-size:0.8rem;color:#888">${dataFormatted}</p>
            </div>`;
        });
    }

    contenuto += `<footer>© ${new Date().getFullYear()} YouDrive — Storico generato automaticamente</footer></body></html>`;

    // Apri finestra di stampa
    const win = window.open("", "_blank");
    win.document.write(contenuto);
    win.document.close();
    win.print();
}

/* =====================================================
/                    MODAL                             /
===================================================== */
function chiudiModal(id) {
    document.getElementById(id).classList.add("hidden");
}

/* =====================================================
/                    UTILITY                           /
===================================================== */
function capitalizza(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
}
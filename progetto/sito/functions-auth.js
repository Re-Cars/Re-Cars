 /* ----------------------------------------------------
/                   REGISTRAZIONE                      /
-----------------------------------------------------*/

function register() {
    var username = document.getElementById('reg-user').value.trim();
    var email = document.getElementById('reg-email').value.trim();
    var password = document.getElementById('reg-password').value;
    var errore = document.getElementById('reg-error');

    if (!username || !email || !password) {
        errore.textContent = 'Compila tutti i campi.';
        return;
    }

    if (!email.includes('@')) {
        errore.textContent = 'Email non valida.';
        return;
    }

    if (password.length < 6) {
        errore.textContent = 'La password deve avere almeno 6 caratteri.';
        return;
    }

    var utenti = getData('yd_utenti') || [];

    var esiste = utenti.find(function (u) { return u.email === email; });
    if (esiste) {
        errore.textContent = 'Email già registrata.';
        return;
    }

    utenti.push({ username: username, email: email, password: password });
    setData('yd_utenti', utenti);
    setData('yd_utente_loggato', { username: username, email: email });

    window.location.href = 'homepage.html';
}

 /* ----------------------------------------------------
/                   LOGIN                              /
-----------------------------------------------------*/

function login() {
    var email    = document.getElementById('login-email').value.trim();
    var password = document.getElementById('login-password').value;
    var errore   = document.getElementById('login-error');

    if (!email || !password) {
        errore.textContent = 'Compila tutti i campi.';
        return;
    }

    var utenti = getData('yd_utenti') || [];

    var utente = utenti.find(function (u) {
        return u.email === email && u.password === password;
    });

    if (!utente) {
        errore.textContent = 'Email o password errati.';
        return;
    }

    setData('yd_utente_loggato', { username: utente.username, email: utente.email });
    window.location.href = 'homepage.html';
}

 /* ----------------------------------------------------
/                   LOGOUT                             /
-----------------------------------------------------*/

function logout() {
    localStorage.removeItem('yd_utente_loggato');
    window.location.href = 'landing.html';
}

 /* ----------------------------------------------------
/                   VISITATORE - CERCA VEICOLO         /
-----------------------------------------------------*/

function cercaVeicoloVisitatore() {
    var input  = document.getElementById('input-targa-visitor').value.trim().toUpperCase();
    var errore = document.getElementById('targa-error');

    if (!input || input.length < 5) {
        errore.textContent = 'Inserisci una targa valida.';
        return;
    }

    errore.textContent = '';

    var veicolo = simulaVeicolo(input);

    document.getElementById('dati-veicolo-visitor').innerHTML =
        '<p><b>Targa:</b> ' + veicolo.targa + '</p>' +
        '<p><b>Marca:</b> ' + veicolo.marca + '</p>' +
        '<p><b>Modello:</b> ' + veicolo.modello + '</p>' +
        '<p><b>Anno:</b> ' + veicolo.anno + '</p>' +
        '<p><b>Carburante:</b> ' + veicolo.carburante + '</p>';

    document.getElementById('card-dati-veicolo-visitor').classList.remove('hidden');
}

 /* ----------------------------------------------------
/                   SIMULAZIONE DATI VEICOLO           /
-----------------------------------------------------*/

function simulaVeicolo(targa) {
    var marche     = ['Fiat', 'Ford', 'BMW', 'Volkswagen', 'Renault', 'Peugeot', 'Toyota', 'Opel'];
    var modelli    = ['Panda', 'Focus', 'Serie 3', 'Golf', 'Clio', '208', 'Yaris', 'Corsa'];
    var carburanti = ['Benzina', 'Diesel', 'GPL', 'Ibrido'];
    var anni       = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022];

    var seed = 0;
    for (var i = 0; i < targa.length; i++) {
        seed += targa.charCodeAt(i);
    }

    return {
        targa:      targa,
        marca:      marche[seed % marche.length],
        modello:    modelli[seed % modelli.length],
        anno:       anni[seed % anni.length],
        carburante: carburanti[seed % carburanti.length]
    };
}
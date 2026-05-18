 /* ----------------------------------------------------
/                   REGISTRAZIONE                      /
-----------------------------------------------------*/

async function register() {
    var username = document.getElementById('reg-user').value.trim();
    var email = document.getElementById('reg-email').value.trim();
    var password = document.getElementById('reg-password').value;
    var errore = document.getElementById('reg-error');

    if (!username || !email || !password) {
        errore.textContent = 'Compila tutti i campi';
        return;
    }

    if (!email.includes('@')) {
        errore.textContent = 'Email non valida';
        return;
    }

    if (password.length < 8) {
        errore.textContent = 'La password deve avere almeno 8 caratteri';
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
            errore.textContent = data.message || 'Errore durante la registrazione';
            return;
        }

        setData('yd_utente_loggato', { id: data.id, username: data.username, email: data.email });
        window.location.href = 'homepage.html';

    } catch (err) {
        errore.textContent = 'Errore di connessione al server';
    }
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
window.addEventListener('scroll', () => {
    const hint = document.querySelector('.scroll-hint');
    if (!hint) return;
    
    if (window.scrollY > 320) {
        hint.classList.add('hint-hidden');
    } else {
        hint.classList.remove('hint-hidden');
    }
});
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
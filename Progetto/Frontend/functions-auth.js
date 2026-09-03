 /* ----------------------------------------------------
/              CONTROLLO SARACINESCA                   /
-----------------------------------------------------*/
function openGarage() {
    const gate = document.getElementById('shutter-gate');
    const hint = document.querySelector('.scroll-hint');
    const authContainer = document.querySelector('.auth-container');
    // il container parte con display:none inline (anti-flash al caricamento):
    // va reso visibile prima che la saracinesca si sollevi
    if (authContainer) authContainer.style.display = 'flex';
    if (gate) {
        if (hint) hint.classList.add('hint-hidden');
        gate.classList.add('lift-up');
        window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
    }
}

function closeGarage(event) {
    if (event) event.preventDefault();
    const gate = document.getElementById('shutter-gate');
    const hint = document.querySelector('.scroll-hint');
    if (gate) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => {
            gate.classList.remove('lift-up');
            if (hint) hint.classList.remove('hint-hidden');
        }, 300);
    }
}

window.addEventListener('wheel', function(event) {
    const gate = document.getElementById('shutter-gate');
    if (!gate || gate.classList.contains('lift-up')) return;
    const isMouse = (event.deltaY % 100 === 0 || event.deltaY % 120 === 0) && Math.abs(event.deltaY) >= 100;
    if (isMouse) { if (event.deltaY < 0) openGarage(); }
    else { if (event.deltaY > 0) openGarage(); }
}, { passive: true });

let touchStartSY = 0;
window.addEventListener('touchstart', function(event) {
    touchStartSY = event.touches[0].clientY;
}, { passive: true });

window.addEventListener('touchend', function(event) {
    const gate = document.getElementById('shutter-gate');
    const touchEndY = event.changedTouches[0].clientY;
    if (gate && !gate.classList.contains('lift-up') && touchStartSY - touchEndY > 50) openGarage();
}, { passive: true });

 /* ----------------------------------------------------
/              SWITCH LOGIN/REGISTER                   /
-----------------------------------------------------*/
function switchForm(event) {
    if (event) event.preventDefault();
    const loginWrapper = document.getElementById('wrapper-login');
    const registerWrapper = document.getElementById('wrapper-register');
    const toggleNav = document.getElementById('auth-toggle-nav');
    const toggleLeft = document.getElementById('auth-toggle-left');
    if (!loginWrapper || !registerWrapper) return;
    if (loginWrapper.classList.contains('active')) {
        loginWrapper.classList.remove('active');
        registerWrapper.classList.add('active');
        if (toggleNav) toggleNav.style.visibility = 'hidden';
        if (toggleLeft) toggleLeft.style.visibility = 'visible';
    } else {
        registerWrapper.classList.remove('active');
        loginWrapper.classList.add('active');
        if (toggleNav) toggleNav.style.visibility = 'visible';
        if (toggleLeft) toggleLeft.style.visibility = 'hidden';
    }
    // reset step
    resetLoginStep();
    resetRegStep();
}

 /* ----------------------------------------------------
/              LOGIN — STEP                            /
-----------------------------------------------------*/
let loginTipo = null;
let loginBusinessTipo = null;

function loginSelezionaTipo(tipo) {
    loginTipo = tipo;
    document.getElementById('login-step-tipo').classList.add('hidden');
    if (tipo === 'utente') {
        document.getElementById('login-step-utente').classList.remove('hidden');
    } else {
        document.getElementById('login-step-business').classList.remove('hidden');
    }
}

function loginSelezionaBusiness(tipo) {
    loginBusinessTipo = tipo;
    document.querySelectorAll('#login-step-business .auth-tipo-btn').forEach(b => b.classList.remove('selected'));
    document.getElementById(`login-btn-${tipo}`).classList.add('selected');
}

function loginTornaATipo() {
    loginTipo = null;
    loginBusinessTipo = null;
    document.getElementById('login-step-tipo').classList.remove('hidden');
    document.getElementById('login-step-utente').classList.add('hidden');
    document.getElementById('login-step-business').classList.add('hidden');
    document.querySelectorAll('#login-step-business .auth-tipo-btn').forEach(b => b.classList.remove('selected'));
    document.getElementById('login-error').textContent = '';
    document.getElementById('login-error-business').textContent = '';
}

function resetLoginStep() {
    loginTipo = null;
    loginBusinessTipo = null;
    document.getElementById('login-step-tipo').classList.remove('hidden');
    document.getElementById('login-step-utente').classList.add('hidden');
    document.getElementById('login-step-business').classList.add('hidden');
}

 /* ----------------------------------------------------
/              REGISTER — STEP                         /
-----------------------------------------------------*/
let regTipo = null;

function regSelezionaTipo(tipo) {
    regTipo = tipo;
    document.getElementById('reg-step-tipo').classList.add('hidden');
    document.getElementById('reg-step-form').classList.remove('hidden');
    document.getElementById('reg-form-privato').classList.add('hidden');
    document.getElementById('reg-form-azienda').classList.add('hidden');
    document.getElementById('reg-form-officina').classList.add('hidden');
    document.getElementById(`reg-form-${tipo}`).classList.remove('hidden');
}

function regTornaATipo() {
    regTipo = null;
    document.getElementById('reg-step-tipo').classList.remove('hidden');
    document.getElementById('reg-step-form').classList.add('hidden');
    document.getElementById('reg-error').textContent = '';
}

function resetRegStep() {
    regTipo = null;
    document.getElementById('reg-step-tipo').classList.remove('hidden');
    document.getElementById('reg-step-form').classList.add('hidden');
}

 /* ----------------------------------------------------
/              RICERCA CITTÀ (officina)                /
-----------------------------------------------------*/
async function cercaCitta(query) {
    const dropdown = document.getElementById('citta-dropdown');
    if (query.length < 2) {
        dropdown.classList.remove('open');
        return;
    }
    try {
        const res = await fetch(`${API_URL}/citta?q=${encodeURIComponent(query)}`);
        const citta = await res.json();
        if (!citta.length) {
            dropdown.classList.remove('open');
            return;
        }
        dropdown.innerHTML = citta.map(c => `
            <div class="citta-option" onclick="selezionaCitta('${c.sigla}', '${c.nome}')">
                <span>${c.sigla}</span>${c.nome}
            </div>
        `).join('');
        dropdown.classList.add('open');
    } catch {
        dropdown.classList.remove('open');
    }
}

function selezionaCitta(sigla, nome) {
    document.getElementById('reg-of-citta-input').value = nome;
    document.getElementById('reg-of-citta-sigla').value = sigla;
    document.getElementById('citta-dropdown').classList.remove('open');
}

 /* ----------------------------------------------------
/                   REGISTRAZIONE                      /
-----------------------------------------------------*/
async function register() {
    const errore = document.getElementById('reg-error');

    if (!regTipo) {
        errore.textContent = 'Seleziona un tipo di account';
        return;
    }

    let url, body;

    if (regTipo === 'privato') {
        url = `${API_URL}/auth/register`;
        body = {
            username: document.getElementById('reg-username').value.trim(),
            email: document.getElementById('reg-email').value.trim(),
            password: document.getElementById('reg-password').value,
            tipo: 'privato',
        };
    } else if (regTipo === 'azienda') {
        url = `${API_URL}/auth/register`;
        body = {
            username: document.getElementById('reg-az-username').value.trim(),
            email: document.getElementById('reg-az-email').value.trim(),
            password: document.getElementById('reg-az-password').value,
            tipo: 'azienda',
            ragione_sociale: document.getElementById('reg-az-ragione-sociale').value.trim(),
            partita_iva: document.getElementById('reg-az-piva').value.trim(),
            codice_sdi: document.getElementById('reg-az-sdi').value.trim() || null,
        };
    } else {
        url = `${API_URL}/officina/register`;
        body = {
            email: document.getElementById('reg-of-email').value.trim(),
            password: document.getElementById('reg-of-password').value,
            nome: document.getElementById('reg-of-nome').value.trim(),
            ragione_sociale: document.getElementById('reg-of-ragione-sociale').value.trim(),
            partita_iva: document.getElementById('reg-of-piva').value.trim(),
            codice_sdi: document.getElementById('reg-of-sdi').value.trim() || null,
            telefono: document.getElementById('reg-of-telefono').value.trim(),
            indirizzo: document.getElementById('reg-of-indirizzo').value.trim(),
            sigla_citta: document.getElementById('reg-of-citta-sigla').value,
        };
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            credentials: 'include',
        });

        const data = await response.json();
        console.log('risposta registrazione:', data);

        if (!response.ok) {
            const msg = Array.isArray(data.message) ? data.message[0] : data.message;
            errore.textContent = msg || 'Errore durante la registrazione';
            return;
        }

        // auto-login dopo registrazione
        const profilo = regTipo === 'officina' ? data.officina : data.utente;
        console.log('profilo da salvare:', profilo);
        console.log('data completo:', data);
        localStorage.setItem('yd_utente_loggato', JSON.stringify(profilo));

        if (regTipo === 'officina') {
            window.location.href = 'officina.html';
        } else if (regTipo === 'azienda') {
            window.location.href = 'azienda.html';
        } else {
            window.location.href = 'homepage.html';
        }

    } catch (err) {
        errore.textContent = 'Errore di connessione al server';
    }
}

 /* ----------------------------------------------------
/                      LOGIN                           /
-----------------------------------------------------*/
async function login(tipo) {
    if (tipo === 'utente') {
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        const errore = document.getElementById('login-error');

        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
                credentials: 'include',
            });

            const data = await response.json();

            if (!response.ok) {
                errore.textContent = Array.isArray(data.message) ? data.message[0] : data.message || 'Credenziali non valide';
                return;
            }

            localStorage.setItem('yd_utente_loggato', JSON.stringify(data.utente));

            if (data.utente.tipo === 'azienda') {
                window.location.href = 'azienda.html';
            } else {
                window.location.href = 'homepage.html';
            }

        } catch (err) {
            document.getElementById('login-error').textContent = 'Errore di connessione al server';
        }

    } else {
        const piva = document.getElementById('login-piva').value.trim();
        const password = document.getElementById('login-password-business').value;
        const errore = document.getElementById('login-error-business');

        if (!loginBusinessTipo) {
            errore.textContent = 'Seleziona se sei Azienda o Officina';
            return;
        }

        const url = loginBusinessTipo === 'officina'
            ? `${API_URL}/officina/login`
            : `${API_URL}/auth/login/azienda`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ partita_iva: piva, password }),
                credentials: 'include',
            });

            const data = await response.json();

            if (!response.ok) {
                errore.textContent = Array.isArray(data.message) ? data.message[0] : data.message || 'Credenziali non valide';
                return;
            }

            const profilo = loginBusinessTipo === 'officina' ? data.officina : data.utente;
            localStorage.setItem('yd_utente_loggato', JSON.stringify(profilo));

            window.location.href = loginBusinessTipo === 'officina'
                ? 'officina.html'
                : 'azienda.html';

        } catch (err) {
            errore.textContent = 'Errore di connessione al server';
        }
    }
}

 /* ----------------------------------------------------
/          SEQUENZA ANIMAZIONE LANDING                 /
-----------------------------------------------------*/
document.addEventListener('DOMContentLoaded', () => {
    const gate        = document.getElementById('shutter-gate');
    const logoWrap    = document.getElementById('landing-logo');
    const logoPath    = document.getElementById('logo-path');
    const title       = document.getElementById('landing-title');
    const subtitle    = document.getElementById('landing-subtitle');
    const buttons     = document.getElementById('landing-buttons');
    const actionGroup = document.getElementById('action-group');

    if (!gate || !logoPath) return;

    const T = {
        bgFade: 800, bgPause: 400, logoDraw: 2200,
        titleFade: 700, sloganWait: 250, btnWait: 500,
    };

    const pathLen = logoPath.getTotalLength();
    logoPath.style.strokeDasharray  = pathLen;
    logoPath.style.strokeDashoffset = pathLen;
    logoPath.style.setProperty('--path-len', pathLen);

    let t = 0;
    setTimeout(() => gate.classList.add('show-bg'), t);
    t += T.bgFade + T.bgPause;
    setTimeout(() => {
        if (logoWrap) {
            logoWrap.classList.add('show-logo');
            setTimeout(() => logoWrap.classList.add('animate-logo'), 80);
        }
    }, t);
    t += T.logoDraw;
    setTimeout(() => { if (title) title.classList.add('show-title'); }, t);
    t += T.titleFade + T.sloganWait;
    setTimeout(() => { if (subtitle) subtitle.classList.add('show-subtitle'); }, t);
    t += 400;
    setTimeout(() => {
        if (buttons) buttons.classList.add('show-btn');
        if (actionGroup) actionGroup.classList.add('show-hint');
    }, t + T.btnWait);
});

document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const loginWrapper = document.getElementById('wrapper-login');
    const registerWrapper = document.getElementById('wrapper-register');
    if (loginWrapper && loginWrapper.classList.contains('active')) {
        if (loginTipo === 'utente') login('utente');
        else if (loginTipo === 'business') login('business');
    } else if (registerWrapper && registerWrapper.classList.contains('active')) {
        register();
    }
});
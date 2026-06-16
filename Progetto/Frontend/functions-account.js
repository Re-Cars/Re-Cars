 /* ----------------------------------------------------
/             IL MIO ACCOUNT — caricamento dati        /
-----------------------------------------------------*/
let accUtenteCorrente = null;

async function caricaDatiAccount() {
    const utenteString = localStorage.getItem('yd_utente_loggato');
    if (!utenteString) return;
    const utente = JSON.parse(utenteString);
    const idUtente = utente.id;

    try {
        const response = await fetch(`http://localhost:3000/auth/utente/${idUtente}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });

        if (response.status === 401) {
            alert('Sessione scaduta, effettua di nuovo il login');
            logout();
            return;
        }

        if (!response.ok) return;

        const data = await response.json();
        accUtenteCorrente = data;

        const usernameDisplay = document.getElementById('acc-username-display');
        const valUsername = document.getElementById('val-username');
        const valEmail = document.getElementById('val-email');
        const valCellulare = document.getElementById('val-cellulare');
        const btnCellulareLabel = document.getElementById('btn-cellulare-label');
        const memberSince = document.getElementById('acc-member-since');

        if (usernameDisplay) usernameDisplay.textContent = data.username || '-';
        if (valUsername) valUsername.textContent = data.username || '-';
        if (valEmail) valEmail.textContent = data.email || '-';

        if (data.cellulare) {
            if (valCellulare) valCellulare.textContent = data.cellulare;
            if (btnCellulareLabel) btnCellulareLabel.textContent = 'Modifica';
        } else {
            if (valCellulare) valCellulare.textContent = 'Non impostato';
            if (btnCellulareLabel) btnCellulareLabel.textContent = 'Aggiungi';
        }

        if (memberSince && data.createdAt) {
            const d = new Date(data.createdAt);
            const mesi = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
            memberSince.textContent = `Membro da ${mesi[d.getMonth()]} ${d.getFullYear()}`;
        }

        renderPianoAttivo(data.piano || 'base');

    } catch (err) {
        console.error('Errore nel caricamento dati account', err);
    }
}

document.addEventListener('DOMContentLoaded', caricaDatiAccount);

 /* ----------------------------------------------------
/             GESTIONE ABBONAMENTO                      /
-----------------------------------------------------*/
function renderPianoAttivo(piano) {
    const nomi = { base: 'Piano Base', premium: 'Piano Premium', pro: 'Piano Pro' };
    const prezzi = { base: 'Gratis', premium: '4,99€/mese', pro: '9,99€/mese' };
    const badgeLabel = { base: 'Base', premium: 'Premium', pro: 'Pro' };
    const badgeIcon = { base: 'fa-circle-check', premium: 'fa-crown', pro: 'fa-crown' };

    const nomeEl = document.getElementById('acc-plan-nome');
    const subEl = document.getElementById('acc-plan-sub');
    const badgeEl = document.getElementById('acc-plan-badge');
    const disdiciBtn = document.getElementById('acc-btn-disdici');

    if (nomeEl) nomeEl.textContent = nomi[piano] || 'Piano Base';
    if (subEl) subEl.textContent = piano === 'base' ? 'Nessun rinnovo programmato' : `Rinnovo automatico mensile (${prezzi[piano]})`;

    if (badgeEl) {
        badgeEl.innerHTML = `
            <div class="acc-plan-pill-static"><i class="fa-solid ${piano === 'base' ? 'fa-circle-check' : 'fa-circle'}"></i> Attivo</div>
            <div class="acc-plan-pill-animated"><i class="fa-solid ${badgeIcon[piano]}"></i> ${badgeLabel[piano]}</div>
        `;
    }

    if (disdiciBtn) disdiciBtn.style.display = piano === 'base' ? 'none' : 'inline-flex';

    document.querySelectorAll('.acc-plan-opt').forEach(opt => {
        opt.classList.toggle('attivo', opt.dataset.plan === piano);
    });

    pianoSelezionato = piano;
}

document.addEventListener('click', (e) => {
    const opt = e.target.closest('.acc-plan-opt');
    if (!opt) return;
    document.querySelectorAll('.acc-plan-opt').forEach(o => o.classList.remove('attivo'));
    opt.classList.add('attivo');
    pianoSelezionato = opt.dataset.plan;
});

function cambiaPiano() {
    if (!pianoSelezionato) return;
    renderPianoAttivo(pianoSelezionato);
}
    /*const utenteString = localStorage.getItem('yd_utente_loggato');
    if (!utenteString) return;
    const utente = JSON.parse(utenteString);

    try {
        const response = await fetch(`http://localhost:3000/auth/utente/${utente.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ piano: pianoSelezionato })
        });

        if (!response.ok) {
            alert('Errore durante il cambio piano.');
            return;
        }

        renderPianoAttivo(pianoSelezionato);
    } catch (err) {
        alert('Errore di connessione.');
    }
}
*/
 /* ----------------------------------------------------
/        CONFERMA DISDICI / ELIMINA ACCOUNT             /
-----------------------------------------------------*/
function mostraConfermaAccount(tipo) {
    const esistente = document.getElementById('conferma-account-overlay');
    if (esistente) esistente.remove();

    const config = {
        disdici: {
            icon: 'fa-ban',
            title: 'Disdici abbonamento',
            sub: `Sei sicuro di voler disdire il tuo ${pianoSelezionato === 'pro' ? 'piano Pro' : 'piano Premium'}? Perderai l'accesso alle funzionalità premium.`,
            btnLabel: 'Disdici',
            btnIcon: 'fa-ban',
            action: 'confermaDisdici'
        },
        elimina: {
            icon: 'fa-triangle-exclamation',
            title: 'Elimina account',
            sub: 'Questa azione è irreversibile. Tutti i tuoi dati, veicoli e prenotazioni verranno eliminati permanentemente.',
            btnLabel: 'Elimina',
            btnIcon: 'fa-trash',
            action: 'confermaEliminaAccount'
        }
    };

    const c = config[tipo];
    if (!c) return;

    const overlay = document.createElement('div');
    overlay.id = 'conferma-account-overlay';
    overlay.innerHTML = `
        <div class="conferma-account-box">
            <div class="conferma-account-icon"><i class="fa-solid ${c.icon}"></i></div>
            <p class="conferma-account-title">${c.title}</p>
            <p class="conferma-account-sub">${c.sub}</p>
            <div class="conferma-account-btns">
                <button class="btn-annulla" onclick="document.getElementById('conferma-account-overlay').remove()">Annulla</button>
                <button class="acc-btn-pill-danger" onclick="${c.action}()">
                    <div class="acc-icon-circle-danger"><i class="fa-solid ${c.btnIcon}"></i></div>
                    ${c.btnLabel}
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

async function confermaDisdici() {
    document.getElementById('conferma-account-overlay')?.remove();
    const utenteString = localStorage.getItem('yd_utente_loggato');
    if (!utenteString) return;
    const utente = JSON.parse(utenteString);

    try {
        const response = await fetch(`http://localhost:3000/auth/utente/${utente.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ piano: 'base' })
        });

        if (!response.ok) {
            alert('Errore durante la disdetta.');
            return;
        }

        renderPianoAttivo('base');
    } catch (err) {
        alert('Errore di connessione.');
    }
}

async function confermaEliminaAccount() {
    document.getElementById('conferma-account-overlay')?.remove();
    const utenteString = localStorage.getItem('yd_utente_loggato');
    if (!utenteString) return;
    const utente = JSON.parse(utenteString);

    try {
        const response = await fetch(`http://localhost:3000/auth/utente/${utente.id}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (!response.ok) {
            alert('Errore durante l\'eliminazione dell\'account.');
            return;
        }

        localStorage.clear();
        window.location.href = 'landing.html';
    } catch (err) {
        alert('Errore di connessione.');
    }
}

 /* ----------------------------------------------------
/        MODIFICA CAMPO (username, email, telefono, password) /
-----------------------------------------------------*/
function apriModifica(campo) {
    const esistente = document.getElementById('modifica-campo-overlay');
    if (esistente) esistente.remove();

    const config = {
        username: { icon: 'fa-user', title: 'Cambia username', placeholder: 'Nuovo username', type: 'text', current: accUtenteCorrente?.username || '' },
        email: { icon: 'fa-envelope', title: 'Cambia email', placeholder: 'Nuova email', type: 'email', current: accUtenteCorrente?.email || '' },
        cellulare: { icon: 'fa-phone', title: 'Numero di telefono', placeholder: 'Es. 3331234567', type: 'tel', current: accUtenteCorrente?.cellulare || '' },
        password: { icon: 'fa-key', title: 'Cambia password', placeholder: 'Nuova password', type: 'password', current: '' }
    };

    const c = config[campo];
    if (!c) return;

    const overlay = document.createElement('div');
    overlay.id = 'modifica-campo-overlay';
    overlay.innerHTML = `
        <div class="modifica-campo-box">
            <p class="modifica-campo-title"><i class="fa-solid ${c.icon}"></i> ${c.title}</p>
            <input type="${c.type}" id="modifica-campo-input" placeholder="${c.placeholder}" value="${campo === 'password' ? '' : c.current}">
            <p class="modifica-campo-error" id="modifica-campo-error"></p>
            <div class="modifica-campo-btns">
                <button class="btn-annulla" onclick="document.getElementById('modifica-campo-overlay').remove()">Annulla</button>
                <button class="acc-btn-pill" onclick="salvaModificaCampo('${campo}')">
                    <div class="acc-icon-circle"><i class="fa-solid fa-check"></i></div>
                    Salva
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    const input = document.getElementById('modifica-campo-input');
    if (input) {
        input.focus();
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') salvaModificaCampo(campo);
        });
    }
}

async function salvaModificaCampo(campo) {
    const input = document.getElementById('modifica-campo-input');
    const errore = document.getElementById('modifica-campo-error');
    const valore = input.value.trim();

    if (!valore) {
        errore.textContent = 'Il campo non può essere vuoto';
        return;
    }

    const utenteString = localStorage.getItem('yd_utente_loggato');
    if (!utenteString) return;
    const utente = JSON.parse(utenteString);

    const body = {};
    body[campo] = valore;

    try {
        const response = await fetch(`http://localhost:3000/auth/utente/${utente.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (!response.ok) {
            const msg = Array.isArray(data.message) ? data.message[0] : data.message;
            errore.textContent = msg || 'Errore durante il salvataggio';
            return;
        }

        document.getElementById('modifica-campo-overlay')?.remove();

        if (campo === 'username') {
            const nuovoUtente = { ...utente, username: valore };
            localStorage.setItem('yd_utente_loggato', JSON.stringify(nuovoUtente));
        }

        await caricaDatiAccount();

    } catch (err) {
        errore.textContent = 'Errore di connessione al server';
    }
}

 /* ----------------------------------------------------
/        UPLOAD IMMAGINE AVATAR                         /
-----------------------------------------------------*/
document.addEventListener('DOMContentLoaded', () => {
    const editBtn = document.getElementById('acc-avatar-edit-btn');
    const fileInput = document.getElementById('acc-avatar-input');

    if (!editBtn || !fileInput) return;

    editBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            const avatarBig = document.querySelector('.acc-avatar-big');
            const icon = document.getElementById('acc-avatar-icon');
            if (icon) icon.style.display = 'none';

            let img = avatarBig.querySelector('img');
            if (!img) {
                img = document.createElement('img');
                avatarBig.insertBefore(img, avatarBig.firstChild);
            }
            img.src = ev.target.result;

            localStorage.setItem('yd_avatar_img', ev.target.result);
        };
        reader.readAsDataURL(file);
    });

    const savedAvatar = localStorage.getItem('yd_avatar_img');
    if (savedAvatar) {
        const avatarBig = document.querySelector('.acc-avatar-big');
        const icon = document.getElementById('acc-avatar-icon');
        if (icon) icon.style.display = 'none';
        const img = document.createElement('img');
        img.src = savedAvatar;
        avatarBig.insertBefore(img, avatarBig.firstChild);
    }
});

document.addEventListener('click', (e) => {
    if (e.target.id === 'modifica-campo-overlay') {
        e.target.remove();
    }
    if (e.target.id === 'conferma-account-overlay') {
        e.target.remove();
    }
});
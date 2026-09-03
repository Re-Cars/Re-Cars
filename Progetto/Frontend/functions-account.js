 /* ----------------------------------------------------
/             IL MIO ACCOUNT — caricamento dati        /
-----------------------------------------------------*/
const API = window.API_URL || 'https://re-cars-backend.onrender.com';
let accUtenteCorrente = null;

async function caricaDatiAccount() {
    const utenteString = localStorage.getItem('yd_utente_loggato');
    if (!utenteString) return;
    const utente = JSON.parse(utenteString);

    try {
        const response = await fetch(`${API}/auth/utente/${utente.id}`, {
            method: 'GET',
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

        if (data.avatar) {
            applicaAvatar(data.avatar);
            localStorage.setItem('yd_avatar_img', data.avatar);
        }

        const usernameDisplay = document.getElementById('acc-username-display');
        const valUsername = document.getElementById('val-username');
        const valEmail = document.getElementById('val-email');
        const valCellulare = document.getElementById('val-cellulare');
        const btnCellulareLabel = document.getElementById('btn-cellulare-label');
        const btnCellulareIcon = document.getElementById('btn-cellulare-icon');

        if (usernameDisplay) usernameDisplay.textContent = data.username || '-';
        if (valUsername) valUsername.textContent = data.username || '-';
        if (valEmail) valEmail.textContent = data.email || '-';

        if (data.cellulare) {
            if (valCellulare) valCellulare.textContent = data.cellulare;
            if (btnCellulareLabel) btnCellulareLabel.textContent = 'Modifica';
            if (btnCellulareIcon) {
                btnCellulareIcon.classList.remove('fa-plus');
                btnCellulareIcon.classList.add('fa-pen');
            }
        } else {
            if (valCellulare) valCellulare.textContent = 'Non impostato';
            if (btnCellulareLabel) btnCellulareLabel.textContent = 'Aggiungi';
            if (btnCellulareIcon) {
                btnCellulareIcon.classList.remove('fa-pen');
                btnCellulareIcon.classList.add('fa-plus');
            }
        }

        caricaPianoAccount(data);

    } catch (err) {
        console.error('Errore nel caricamento dati account', err);
    }
}

document.addEventListener('DOMContentLoaded', caricaDatiAccount);

 /* ----------------------------------------------------
/             PIANO ABBONAMENTO                        /
-----------------------------------------------------*/
function caricaPianoAccount(data) {
    const abbonamento = data.abbonamento?.[0];
    const piano = abbonamento?.piano || 'base';

    const nomiPiani = {
        base: 'Base',
        premium: 'Premium',
        pro: 'Pro',
    };

    const nomeEl = document.getElementById('acc-piano-nome');
    const subEl = document.getElementById('acc-piano-sub');

    if (nomeEl) nomeEl.textContent = nomiPiani[piano] || piano;
    if (subEl) subEl.textContent = abbonamento?.data_fine
        ? `Rinnovo il ${new Date(abbonamento.data_fine).toLocaleDateString('it-IT')}`
        : piano === 'base' ? 'Piano gratuito · Nessun rinnovo' : 'Rinnovo automatico mensile';
}

 /* ----------------------------------------------------
/        CONFERMA ELIMINA ACCOUNT                      /
-----------------------------------------------------*/
function mostraConfermaAccount(tipo) {
    const esistente = document.getElementById('conferma-account-overlay');
    if (esistente) esistente.remove();

    const config = {
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

async function confermaEliminaAccount() {
    document.getElementById('conferma-account-overlay')?.remove();
    const utenteString = localStorage.getItem('yd_utente_loggato');
    if (!utenteString) return;
    const utente = JSON.parse(utenteString);

    try {
        const response = await fetch(`${API}/auth/utente/${utente.id}`, {
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
/ MODIFICA CAMPO (username, email, telefono, password) /
-----------------------------------------------------*/
function apriModifica(campo) {
    const esistente = document.getElementById('modifica-campo-overlay');
    if (esistente) esistente.remove();

    const config = {
        username:  { icon: 'fa-user',     title: 'Cambia username',    placeholder: 'Nuovo username',   type: 'text',     current: accUtenteCorrente?.username  || '' },
        email:     { icon: 'fa-envelope', title: 'Cambia email',        placeholder: 'Nuova email',       type: 'email',    current: accUtenteCorrente?.email     || '' },
        cellulare: { icon: 'fa-phone',    title: 'Numero di telefono',  placeholder: 'Es. 3331234567',    type: 'tel',      current: accUtenteCorrente?.cellulare || '' },
        password:  { icon: 'fa-key',      title: 'Cambia password',     placeholder: 'Nuova password',    type: 'password', current: '' }
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
        const response = await fetch(`${API}/auth/utente/${utente.id}`, {
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
/        UPLOAD IMMAGINE AVATAR                        /
-----------------------------------------------------*/
document.addEventListener('DOMContentLoaded', () => {
    const editBtn = document.getElementById('acc-avatar-edit-btn');
    const fileInput = document.getElementById('acc-avatar-input');

    if (!editBtn || !fileInput) return;

    editBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        fileInput.value = '';

        if (file.size > 5 * 1024 * 1024) {
            alert('Immagine troppo grande. Massimo 5MB.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => apriCropper(ev.target.result);
        reader.readAsDataURL(file);
    });

    caricaAvatar();
});

function apriCropper(src) {
    const esistente = document.getElementById('cropper-overlay');
    if (esistente) esistente.remove();

    const overlay = document.createElement('div');
    overlay.id = 'cropper-overlay';
    overlay.innerHTML = `
        <div class="cropper-box">
            <p class="cropper-title"><i class="fa-solid fa-crop-simple"></i> Ritaglia la tua foto</p>
            <div class="cropper-area">
                <img id="cropper-img" src="${src}">
            </div>
            <div class="cropper-btns">
                <button class="btn-annulla" onclick="document.getElementById('cropper-overlay').remove(); if(window._cropper){window._cropper.destroy();window._cropper=null;}">Annulla</button>
                <button class="acc-btn-pill" onclick="confermaCrop()">
                    <div class="acc-icon-circle"><i class="fa-solid fa-check"></i></div>
                    Applica
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    const img = document.getElementById('cropper-img');
    window._cropper = new Cropper(img, {
        aspectRatio: 1,
        viewMode: 1,
        dragMode: 'move',
        cropBoxMovable: true,
        cropBoxResizable: true,
        autoCropArea: 0.8,
        background: false,
        guides: false,
        center: true,
        highlight: false,
    });
}

async function confermaCrop() {
    const cropper = window._cropper;
    if (!cropper) return;

    const canvas = cropper.getCroppedCanvas({ width: 256, height: 256 });
    const base64 = canvas.toDataURL('image/jpeg', 0.85);

    cropper.destroy();
    window._cropper = null;
    document.getElementById('cropper-overlay')?.remove();

    applicaAvatar(base64);
    applicaAvatarHeader();

    const utenteString = localStorage.getItem('yd_utente_loggato');
    if (!utenteString) return;
    const utente = JSON.parse(utenteString);

    const nuovoUtente = { ...utente, avatar: base64 };
    localStorage.setItem('yd_utente_loggato', JSON.stringify(nuovoUtente));
    localStorage.setItem('yd_avatar_img', base64);

    try {
        const response = await fetch(`${API}/auth/utente/${utente.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ avatar: base64 }),
        });
        if (!response.ok) console.error('Errore salvataggio avatar');
    } catch (err) {
        console.error('Errore connessione avatar:', err);
    }
}

function applicaAvatar(src) {
    const avatarBig = document.querySelector('.acc-avatar-big');
    if (!avatarBig) return;

    const icon = document.getElementById('acc-avatar-icon');
    if (icon) icon.style.display = 'none';

    let img = avatarBig.querySelector('img');
    if (!img) {
        img = document.createElement('img');
        avatarBig.insertBefore(img, avatarBig.firstChild);
    }
    img.src = src;
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;';
}

async function caricaAvatar() {
    const utenteString = localStorage.getItem('yd_utente_loggato');
    if (!utenteString) return;
    const utente = JSON.parse(utenteString);
    if (utente.avatar) {
        applicaAvatar(utente.avatar);
        applicaAvatarHeader();
        return;
    }
    const salvato = localStorage.getItem('yd_avatar_img');
    if (salvato) {
        applicaAvatar(salvato);
        applicaAvatarHeader();
    }
}

 /* ----------------------------------------------------
/                  OVERLAY CLICK FUORI                 /
-----------------------------------------------------*/
document.addEventListener('click', (e) => {
    if (e.target.id === 'modifica-campo-overlay') e.target.remove();
    if (e.target.id === 'conferma-account-overlay') e.target.remove();
});
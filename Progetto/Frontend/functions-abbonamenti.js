 /* ----------------------------------------------------
/                   ABBONAMENTI                        /
-----------------------------------------------------*/

const API = 'http://localhost:3000';
let utente = null;

 /* ----------------------------------------------------
/                        INIT                          /
-----------------------------------------------------*/
document.addEventListener('DOMContentLoaded', async () => {
    utente = JSON.parse(localStorage.getItem('yd_utente_loggato'));
    if (!utente) { window.location.href = 'landing.html'; return; }

    document.getElementById('avatar-dropdown-name').textContent = utente.username || utente.ragione_sociale;

    initTiltCards();
    await caricaPianoAttivo();
    aggiornaPiani();
});

 /* ----------------------------------------------------
/                   CARICA PIANO ATTIVO                /
-----------------------------------------------------*/
async function caricaPianoAttivo() {
    try {
        const res = await fetch(`${API}/auth/utente/${utente.id}`, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();

        const abbonamento = data.abbonamento?.[0];
        const piano = abbonamento?.piano || 'base';

        const nomiPiani = { base: 'Base', premium: 'Premium', pro: 'Pro' };

        document.getElementById('abb-piano-nome').textContent = nomiPiani[piano] || piano;
        document.getElementById('abb-piano-sub').textContent = abbonamento?.data_fine
            ? `Rinnovo il ${new Date(abbonamento.data_fine).toLocaleDateString('it-IT')}`
            : piano === 'base' ? 'Piano gratuito · Nessun rinnovo' : 'Rinnovo automatico mensile';

        utente.piano = piano;
        localStorage.setItem('yd_utente_loggato', JSON.stringify({ ...utente, piano }));

        aggiornaPiani();

    } catch (err) {
        console.error('Errore caricamento piano:', err);
        document.getElementById('abb-piano-nome').textContent = 'Base';
        document.getElementById('abb-piano-sub').textContent = 'Piano gratuito · Nessun rinnovo';
    }
}

 /* ----------------------------------------------------
/         AGGIORNA CARD + BTN PIANO ATTIVO             /
-----------------------------------------------------*/
function aggiornaPiani() {
    const piano = utente.piano || 'base';

    ['base', 'premium', 'pro'].forEach(p => {
        const card = document.getElementById(`card-${p}`);
        const btn = document.getElementById(`btn-${p}`);
        if (!card || !btn) return;

        // reset stato
        card.classList.remove('attivo');
        const oldBadge = card.querySelector('.abb-attivo-badge');
        if (oldBadge) oldBadge.remove();

        if (p === piano) {
            // PIANO ATTUALE — anello verde + badge "Attivo" + bottone-stato (non cliccabile)
            card.classList.add('attivo');
            const badge = document.createElement('span');
            badge.className = 'abb-attivo-badge';
            badge.innerHTML = '<span class="dot"></span> Attivo';
            card.appendChild(badge);

            btn.className = 'abb-btn status';
            btn.onclick = null;
            btn.innerHTML = '<i class="fa-solid fa-check"></i> Piano attuale';

        } else if (p === 'base') {
            // DOWNGRADE / DISDETTA
            btn.className = 'abb-btn ghost';
            btn.onclick = () => disdiciAbbonamento();
            btn.innerHTML = '<i class="fa-solid fa-rotate-left"></i> Passa al Base';

        } else {
            // ABBONAMENTO
            btn.className = 'abb-btn cta';
            btn.onclick = () => avviaCheckout(p);
            btn.innerHTML = '<i class="fa-solid fa-credit-card"></i> Abbonati ora';
        }
    });
}

 /* ----------------------------------------------------
/                   DISDICI ABBONAMENTO                /
-----------------------------------------------------*/
async function disdiciAbbonamento() {
    try {
        const res = await fetch(`${API}/abbonamento/disdici`, { method: 'POST', credentials: 'include' });
        if (!res.ok) return;
        utente.piano = 'base';
        localStorage.setItem('yd_utente_loggato', JSON.stringify(utente));
        await caricaPianoAttivo();
    } catch (err) {
        console.error('Errore disdetta:', err);
    }
}

 /* ----------------------------------------------------
/                   CHECKOUT STRIPE                    /
-----------------------------------------------------*/
async function avviaCheckout(piano) {
    try {
        const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/'));

        const res = await fetch(`${API}/abbonamento/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ piano, id_utente: utente.id, baseUrl }),
            credentials: 'include',
        });

        const data = await res.json();

        if (!res.ok || !data.url) {
            console.error('Errore checkout:', data);
            return;
        }

        window.location.href = data.url;

    } catch (err) {
        console.error('Errore avvio checkout:', err);
    }
}
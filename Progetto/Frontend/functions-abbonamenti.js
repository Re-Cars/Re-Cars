 /* ----------------------------------------------------
/                   ABBONAMENTI                        /
-----------------------------------------------------*/

const API = 'http://localhost:3000';
let utente = null;

 /* ----------------------------------------------------
/                  INIT                                /
-----------------------------------------------------*/
document.addEventListener('DOMContentLoaded', async () => {
    utente = JSON.parse(localStorage.getItem('yd_utente_loggato'));
    if (!utente) { window.location.href = 'landing.html'; return; }

    document.getElementById('avatar-dropdown-name').textContent = utente.username || utente.ragione_sociale;

    await caricaPianoAttivo();
    aggiornaBtnPianoAttivo();
});

 /* ----------------------------------------------------
/              CARICA PIANO ATTIVO                     /
-----------------------------------------------------*/
async function caricaPianoAttivo() {
    try {
        const res = await fetch(`${API}/auth/utente/${utente.id}`, {
            credentials: 'include',
        });
        if (!res.ok) return;
        const data = await res.json();

        const abbonamento = data.abbonamento?.[0];
        const piano = abbonamento?.piano || 'base';

        const nomiPiani = {
            base: 'Base',
            premium: 'Premium',
            pro: 'Pro',
        };

        document.getElementById('abb-piano-nome').textContent = nomiPiani[piano] || piano;
        document.getElementById('abb-piano-sub').textContent = abbonamento?.data_fine
            ? `Rinnovo il ${new Date(abbonamento.data_fine).toLocaleDateString('it-IT')}`
            : piano === 'base' ? 'Piano gratuito · Nessun rinnovo' : 'Rinnovo automatico mensile';

        localStorage.setItem('yd_utente_loggato', JSON.stringify({ ...utente, piano }));
        utente.piano = piano;

    } catch (err) {
        console.error('Errore caricamento piano:', err);
        document.getElementById('abb-piano-nome').textContent = 'Base';
        document.getElementById('abb-piano-sub').textContent = 'Piano gratuito · Nessun rinnovo';
    }
}

 /* ----------------------------------------------------
/           AGGIORNA BOTTONE PIANO ATTIVO              /
-----------------------------------------------------*/
function aggiornaBtnPianoAttivo() {
    const piano = utente.piano || 'base';

    ['base', 'premium', 'pro'].forEach(p => {
        const btn = document.getElementById(`btn-${p}`);
        const card = document.getElementById(`card-${p}`);
        if (!btn) return;

        if (p === piano) {
            btn.className = 'abb-btn-wrap statico';
            btn.onclick = null;
            btn.querySelector('.abb-btn-inner').className = 'abb-btn-inner verde';
            btn.querySelector('.abb-btn-inner').innerHTML = '<i class="fa-solid fa-check"></i> Piano attuale';
            card.style.borderColor = 'rgba(55, 169, 97, 0.3)';
        } else {
            btn.className = 'abb-btn-wrap animato';
            btn.querySelector('.abb-btn-inner').className = 'abb-btn-inner arancione';
            btn.querySelector('.abb-btn-inner').innerHTML = '<i class="fa-solid fa-credit-card"></i> Abbonati ora';
            btn.onclick = () => avviaCheckout(p);
        }
    });
}

 /* ----------------------------------------------------
/              AVVIA CHECKOUT STRIPE                   /
-----------------------------------------------------*/
async function avviaCheckout(piano) {
    try {
        const res = await fetch(`${API}/abbonamento/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ piano, id_utente: utente.id }),
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
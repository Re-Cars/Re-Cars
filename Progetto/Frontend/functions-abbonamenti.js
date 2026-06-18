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

        utente.piano = piano;
        localStorage.setItem('yd_utente_loggato', JSON.stringify({ ...utente, piano }));

        aggiornaBtnPianoAttivo();

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
        const card = document.getElementById(`card-${p}`);
        const btn = document.getElementById(`btn-${p}`);
        if (!card) return;

        card.classList.remove('spento');
        card.style.borderColor = '';

        if (p === piano) {
            card.style.borderColor = 'rgba(55, 169, 97, 0.3)';
            if (btn) {
                btn.className = 'abb-btn-wrap statico';
                btn.onclick = null;
                btn.querySelector('.abb-btn-inner').className = 'abb-btn-inner verde';
                btn.querySelector('.abb-btn-inner').innerHTML = '<i class="fa-solid fa-check"></i> Piano attuale';
            }

        } else if (p === 'base') {
            card.classList.add('spento');
            if (btn) {
                btn.className = 'abb-btn-wrap statico-ghost';
                btn.style.cursor = 'pointer';
                btn.onclick = () => disdiciAbbonamento();
                btn.querySelector('.abb-btn-inner').className = 'abb-btn-inner muted';
                btn.querySelector('.abb-btn-inner').innerHTML = '<i class="fa-solid fa-rotate-left"></i> Passa al Base';
                btn.querySelector('.abb-btn-inner').style.pointerEvents = 'none';
            }

        } else {
            if (btn) {
                btn.className = 'abb-btn-wrap animato';
                btn.querySelector('.abb-btn-inner').className = 'abb-btn-inner arancione';
                btn.querySelector('.abb-btn-inner').innerHTML = '<i class="fa-solid fa-credit-card"></i> Abbonati ora';
                btn.onclick = () => avviaCheckout(p);
            }
        }
    });
}

async function disdiciAbbonamento() {
    try {
        const res = await fetch(`${API}/abbonamento/disdici`, {
            method: 'POST',
            credentials: 'include',
        });
        if (!res.ok) return;
        utente.piano = 'base';
        localStorage.setItem('yd_utente_loggato', JSON.stringify(utente));
        await caricaPianoAttivo();
    } catch (err) {
        console.error('Errore disdetta:', err);
    }
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
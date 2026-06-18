const API = 'http://localhost:3000';

async function caricaPianoAttivo() {
    try {
        const res = await fetch(`${API}/officina/profilo`, {
            credentials: 'include',
        });
        if (!res.ok) return;
        const data = await res.json();

        const abbonamento = data.officina?.abbonamento?.[0];
        const piano = abbonamento?.piano || 'officina_business';

        const nomi = {
            officina_business: 'Business',
            officina_business_pro: 'Business Pro',
        };

        const nomeEl = document.getElementById('abb-piano-nome');
        const subEl = document.getElementById('abb-piano-sub');

        if (nomeEl) nomeEl.textContent = nomi[piano] || piano;
        if (subEl) subEl.textContent = abbonamento?.data_fine
            ? `Rinnovo il ${new Date(abbonamento.data_fine).toLocaleDateString('it-IT')}`
            : 'Rinnovo automatico mensile';

        aggiornaBtnPianoAttivo(piano);

    } catch (err) {
        console.error('Errore caricamento piano:', err);
    }
}

function aggiornaBtnPianoAttivo(piano) {
    ['business', 'business-pro'].forEach(p => {
        const pianoKey = p === 'business' ? 'officina_business' : 'officina_business_pro';
        const card = document.getElementById(`card-${p}`);
        const btn = document.getElementById(`btn-${p}`);
        if (!card || !btn) return;

        card.classList.remove('attivo');
        const oldBadge = card.querySelector('.abb-attivo-badge');
        if (oldBadge) oldBadge.remove();

        if (pianoKey === piano) {
            card.classList.add('attivo');
            const badge = document.createElement('span');
            badge.className = 'abb-attivo-badge';
            badge.innerHTML = '<span class="dot"></span> Attivo';
            card.appendChild(badge);

            btn.className = 'abb-btn status';
            btn.onclick = null;
            btn.innerHTML = '<i class="fa-solid fa-check"></i> Piano attuale';
        } else {
            btn.className = 'abb-btn cta';
            btn.onclick = () => avviaCheckout(pianoKey);
            btn.innerHTML = '<i class="fa-solid fa-credit-card"></i> Abbonati ora';
        }
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    initTiltCards();
    await caricaPianoAttivo();
});

function initTiltCards() {
    document.querySelectorAll('.abb-piano-card').forEach(card => {
        card.addEventListener('mousemove', e => {
            const r = card.getBoundingClientRect();
            const px = (e.clientX - r.left) / r.width;
            const py = (e.clientY - r.top) / r.height;
            card.style.transform = `perspective(1000px) rotateX(${(0.5 - py) * 6}deg) rotateY(${(px - 0.5) * 6}deg) translateY(-10px) scale(1.015)`;
        });
        card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    });
}

async function avviaCheckout(piano) {
    try {
        const res = await fetch(`${API}/abbonamento/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ piano }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.url) window.location.href = data.url;
    } catch (err) {
        console.error('Errore checkout:', err);
    }
}

async function disdiciAbbonamento() {
    try {
        const res = await fetch(`${API}/abbonamento/disdici`, {
            method: 'POST',
            credentials: 'include',
        });
        if (!res.ok) return;
        await caricaPianoAttivo();
    } catch (err) {
        console.error('Errore disdetta:', err);
    }
}

document.addEventListener('DOMContentLoaded', caricaPianoAttivo);
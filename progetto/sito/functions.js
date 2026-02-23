/* --------------------------------------------------
   EFFETTO TITOLO E SLOGAN
-------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
    const titolo = document.getElementById("titolo-animato");
    const slogan = document.getElementById("slogan-animato");

    setTimeout(() => {
        titolo.classList.add("testo-animato");
        slogan.classList.add("testo-animato");
    }, 300);
});

document.addEventListener("DOMContentLoaded", () => {
    const downloadTitle = document.getElementById("download-title");
    const downloadSlogan = document.getElementById("download-slogan");

    setTimeout(() => {
            downloadTitle.classList.add("testo-animato");
            downloadSlogan.classList.add("testo-animato");
    }, 300);
});
/* --------------------------------------------------
   EFFETTO LISTA SERVIZI
-------------------------------------------------- */
function mostraServizi(tipo) {
    const privati = document.getElementById('servizi-privati');
    const aziende = document.getElementById('servizi-aziende');
    const btnPrivati = document.getElementById('btn-privati');
    const btnAziende = document.getElementById('btn-aziende');

    // mostra/nasconde le sezioni
    privati.style.display = tipo === 'privati' ? 'block' : 'none';
    aziende.style.display = tipo === 'aziende' ? 'block' : 'none';

    // aggiorna lo stato dei pulsanti
    btnPrivati.classList.toggle('active', tipo === 'privati');
    btnAziende.classList.toggle('active', tipo === 'aziende');
}

/* --------------------------------------------------
   EFFETTO LISTA PREZZI
-------------------------------------------------- */
function mostraPrezzi(tipo) {
    const privato = document.getElementById('prezzi-privato');
    const azienda = document.getElementById('prezzi-azienda');
    const btnPrivato = document.getElementById('btn-privato');
    const btnAzienda = document.getElementById('btn-azienda');

    privato.style.display = tipo === 'privato' ? 'block' : 'none';
    azienda.style.display = tipo === 'azienda' ? 'block' : 'none';

    btnPrivato.classList.toggle('active', tipo === 'privato');
    btnAzienda.classList.toggle('active', tipo === 'azienda');
}

/* --------------------------------------------------
   FAQ
-------------------------------------------------- */
document.querySelectorAll('.faq-domanda').forEach(button => {
    button.addEventListener('click', () => {
        const risposta = button.nextElementSibling;

        document.querySelectorAll('.faq-risposta').forEach(r => {
            if (r !== risposta) r.classList.remove('open');
        });

        risposta.classList.toggle('open');
    });
});

const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
});

document.querySelectorAll('section').forEach(section => {
    section.classList.add('fade-in');
    observer.observe(section);
});
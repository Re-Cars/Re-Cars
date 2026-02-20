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
// FAQ accordion
document.querySelectorAll('.faq-domanda').forEach(button => {
    button.addEventListener('click', () => {
        const risposta = button.nextElementSibling;
        const isOpen = risposta.style.display === 'block';

        // Chiude tutte le altre FAQ
        document.querySelectorAll('.faq-risposta').forEach(r => r.style.display = 'none');

        // Apre/chiude quella cliccata
        risposta.style.display = isOpen ? 'none' : 'block';
    });
});
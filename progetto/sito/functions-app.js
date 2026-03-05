 /* ----------------------------------------------------
/                   AVVIO PAGINA                       /
-----------------------------------------------------*/

document.addEventListener('DOMContentLoaded', function () {

    var cards = document.querySelectorAll('.card');
    cards.forEach(function (card) {
        card.classList.add('show');
    });

    var utente = getUtente();
    var nicknameEl = document.getElementById('header-nickname');
    if (nicknameEl && utente) {
        nicknameEl.textContent = utente.username;
    }

});

 /* ----------------------------------------------------
/                   SIDEBAR                            /
-----------------------------------------------------*/

function openMenu() {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('hamburger-overlay').classList.add('open');
    document.getElementById('hamburger9-input').checked = true;
}

function closeMenu() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('hamburger-overlay').classList.remove('open');
    document.getElementById('hamburger9-input').checked = false;
}

 /* ----------------------------------------------------
/                   LOGOUT                             /
-----------------------------------------------------*/

function logout() {
    localStorage.removeItem('yd_utente_loggato');
    window.location.href = 'landing.html';
}
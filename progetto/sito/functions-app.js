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
/                   SIDEBAR E HAMB                     /
-----------------------------------------------------*/

document.addEventListener('DOMContentLoaded', function () {

    // animazione card
    var cards = document.querySelectorAll('.card');
    cards.forEach(function (card) {
        card.classList.add('show');
    });

    // nickname
    var utente = getUtente();
    var nicknameEl = document.getElementById('header-nickname');
    if (nicknameEl && utente) {
        nicknameEl.textContent = utente.username;
    }

    // hamb
    var checkbox = document.getElementById('hamburger9-input');
    if (checkbox) {
        checkbox.addEventListener('change', function () {
            if (this.checked) {
                document.getElementById('sidebar').classList.add('open');
                document.getElementById('hamburger-overlay').classList.add('open');
            } else {
                closeMenu();
            }
        });
    }

});

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
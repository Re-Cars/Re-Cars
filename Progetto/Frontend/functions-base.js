 /* ----------------------------------------------------
/                   LOCALSTORAGE                       /
-----------------------------------------------------*/

function getData(chiave) {
    return JSON.parse(localStorage.getItem(chiave));
}

function setData(chiave, valore) {
    localStorage.setItem(chiave, JSON.stringify(valore));
}

function getUtente() {
    return getData('yd_utente_loggato');
}

function getUserIdFromToken(accessToken) {
  const base64 = accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  const payload = JSON.parse(atob(base64));
  return payload.sub ?? payload.id ?? payload.userId ?? payload.user_id;;
}

 /* ----------------------------------------------------
/                      DARK/LIGHT MODE                 /
-----------------------------------------------------*/
function toggleTheme() {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    document.body.setAttribute('data-theme', newTheme);
    document.getElementById('theme-icon').className = newTheme === 'dark'
        ? 'fa-solid fa-sun'
        : 'fa-solid fa-moon';
    localStorage.setItem('theme', newTheme);
}

document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', savedTheme);
    const icon = document.getElementById('theme-icon');
    if (icon) {
        icon.className = savedTheme === 'dark'
            ? 'fa-solid fa-sun'
            : 'fa-solid fa-moon';
    }
});

 /* ----------------------------------------------------
/                   SIDEBAR / HAMBURGER MENU            /
-----------------------------------------------------*/
function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('hamburger-overlay');
    const hamburger = document.getElementById('hamburger9');
    const header = document.querySelector('.header');
    if (sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
        hamburger.classList.remove('open');
        header.classList.remove('sidebar-is-open');
    } else {
        sidebar.classList.add('open');
        overlay.classList.add('open');
        hamburger.classList.add('open');
        header.classList.add('sidebar-is-open');
    }
}

function closeMenu() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('hamburger-overlay').classList.remove('open');
    document.getElementById('hamburger9').classList.remove('open');
    document.querySelector('.header').classList.remove('sidebar-is-open');
}

 /* ----------------------------------------------------
/          TILT 3D CARD PIANI ABBONAMENTO               /
-----------------------------------------------------*/
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

 /* -----------------------------------------------------
/        FOOTER CHE SI AGGIORNA AUTOMATICAMENTE        /
-----------------------------------------------------*/
/*
const year = new Date().getFullYear();
const footer = document.getElementById('footer') ;
    if (footer) footer.innerHTML = `© ${year} — YouDrive`;
*/
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

 /* -----------------------------------------------------
/        FOOTER CHE SI AGGIORNA AUTOMATICAMENTE        /
-----------------------------------------------------*/
/*
const year = new Date().getFullYear();
const footer = document.getElementById('footer') ;
    if (footer) footer.innerHTML = `© ${year} — YouDrive`;
*/
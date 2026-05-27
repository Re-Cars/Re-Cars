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
    document.body.setAttribute('data-theme', isDark ? 'light' : 'dark');
    document.getElementById('theme-icon').className = isDark 
        ? 'fa-solid fa-sun' 
        : 'fa-solid fa-moon';
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
}

document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
    const icon = document.getElementById('theme-icon');
    if (icon) icon.className = savedTheme === 'dark' 
        ? 'fa-solid fa-moon' 
        : 'fa-solid fa-sun';
});

 /* -----------------------------------------------------
/        FOOTER CHE SI AGGIORNA AUTOMATICAMENTE        /
-----------------------------------------------------*/
const year = new Date().getFullYear();
const footer = document.getElementById('footer') ;
    if (footer) footer.innerHTML = `© ${year} — YouDrive`;
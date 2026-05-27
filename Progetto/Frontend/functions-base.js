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

 /* -----------------------------------------------------
/        FOOTER CHE SI AGGIORNA AUTOMATICAMENTE        /
-----------------------------------------------------*/
const year = new Date().getFullYear();
const footer = document.getElementById('footer') ;
    if (footer) footer.innerHTML = `© ${year} — YouDrive`;
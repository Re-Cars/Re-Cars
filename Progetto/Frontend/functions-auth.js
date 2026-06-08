 /* ----------------------------------------------------
/                CONTROLLO SARACINESCA                 /
-----------------------------------------------------*/
function openGarage() {
    const gate = document.getElementById('shutter-gate');
    const hint = document.querySelector('.scroll-hint');
    
    if (gate) {
        if (hint) hint.classList.add('hint-hidden');

        gate.classList.add('lift-up');
        
        window.scrollTo({
            top: window.innerHeight,
            behavior: 'smooth'
        });
    } else {
        console.error("Errore: Elemento #shutter-gate non trovato nel DOM.");
    }
}

function closeGarage(event) {
    if (event) event.preventDefault();
    const gate = document.getElementById('shutter-gate');
    const hint = document.querySelector('.scroll-hint');
    
    if (gate) {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });


        setTimeout(() => {
            gate.classList.remove('lift-up');
            if (hint) hint.classList.remove('hint-hidden');
        }, 300);
    }
}


window.addEventListener('wheel', function(event) {
    const gate = document.getElementById('shutter-gate');
    if (!gate || gate.classList.contains('lift-up')) return;

    const isMouse = (event.deltaY % 100 === 0 || event.deltaY % 120 === 0) && Math.abs(event.deltaY) >= 100;

    if (isMouse) {
        if (event.deltaY < 0) {
            openGarage();
        }
    } else {
        if (event.deltaY > 0) {
            openGarage();
        }
    }
}, { passive: true });




let touchStartSY = 0;
window.addEventListener('touchstart', function(event) {
    touchStartSY = event.touches[0].clientY;
}, { passive: true });

window.addEventListener('touchend', function(event) {
    const gate = document.getElementById('shutter-gate');
    const touchEndY = event.changedTouches[0].clientY;
    if (gate && !gate.classList.contains('lift-up') && touchStartSY - touchEndY > 50) {
        openGarage();
    }
}, { passive: true });


 /* ----------------------------------------------------
/                   SWITCH LOGIN/REGISTER              /
-----------------------------------------------------*/
function switchForm(event) {
    if (event) event.preventDefault();

    const loginWrapper = document.getElementById('wrapper-login');
    const registerWrapper = document.getElementById('wrapper-register');
    const toggleNav = document.getElementById('auth-toggle-nav');
    const toggleLeft = document.getElementById('auth-toggle-left');

    if (!loginWrapper || !registerWrapper) return;

    if (loginWrapper.classList.contains('active')) {
        loginWrapper.classList.remove('active');
        registerWrapper.classList.add('active');
        if (toggleNav) toggleNav.style.visibility = 'hidden';
        if (toggleLeft) toggleLeft.style.visibility = 'visible';
    } else {
        registerWrapper.classList.remove('active');
        loginWrapper.classList.add('active');
        if (toggleNav) toggleNav.style.visibility = 'visible';
        if (toggleLeft) toggleLeft.style.visibility = 'hidden';
    }
}

 /* ----------------------------------------------------
/                   REGISTRAZIONE                      /
-----------------------------------------------------*/
async function register() {
    var username = document.getElementById('reg-user').value.trim();
    var email = document.getElementById('reg-email').value.trim();
    var password = document.getElementById('reg-password').value;
    var errore = document.getElementById('reg-error');

    if (!username || !email || !password) {
        errore.textContent = 'Compila tutti i campi';
        return;
    }

    if (!email.includes('@')) {
        errore.textContent = 'Email non valida';
        return;
    }

    if (password.length < 8) {
        errore.textContent = 'La password deve avere almeno 8 caratteri';
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
            errore.textContent = data.message || 'Errore durante la registrazione';
            return;
        }

        errore.style.color = "green";
        errore.textContent = 'Registrazione completata! Reindirizzamento al login...';

        setTimeout(() => {
            switchForm();
            
            document.getElementById('reg-user').value = '';
            document.getElementById('reg-email').value = '';
            document.getElementById('reg-password').value = '';
            errore.textContent = '';
            errore.style.color = "";
        }, 1500);

    } catch (err) {
        errore.textContent = 'Errore di connessione al server';
    }
}

 /* ----------------------------------------------------
/                      LOGIN                           /
-----------------------------------------------------*/
async function login() {
    var email = document.getElementById('login-email').value.trim();
    var password = document.getElementById('login-password').value;
    var errore = document.getElementById('login-error');
    
    if (!email || !password) {
        errore.textContent = 'Compila tutti i campi';
        return;
    }
    if (!email.includes('@')) {
        errore.textContent = 'Email non valida';
        return;
    }
    if (password.length < 8) {
        errore.textContent = 'La password deve avere almeno 8 caratteri';
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();
        
        if (!response.ok) {
           errore.textContent = data.message || "Credenziali non valide";
           return;
        }

        console.log('Login effettuato:', data);
        
        setData('access_token', data.access_token);
        window.location.href = 'homepage.html';

    } catch (error) {
        console.error('Errore login:', error.message);
        errore.textContent = 'Errore di connessione al server';
    }
}

 /* ----------------------------------------------------
/                   LOGOUT                             /
-----------------------------------------------------*/
function logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('yd_utente_loggato');
    window.location.href = 'landing.html';
}
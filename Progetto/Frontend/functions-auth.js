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

        
        window.location.href = 'login.html';

    } catch (err) {
        errore.textContent = 'Errore di connessione al server';
    }
}
 /* ----------------------------------------------------
/                   LOGIN                           /
-----------------------------------------------------*/
async function login(email, password) {
    var email = document.getElementById('login-email').value.trim()
    var password = document.getElementById('login-password').value
    var errore = document.getElementById('login-error')
    if ( !email || !password) {
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
       errore.textContent = data.message || "Credenziali non valide"
       return;
    }

    console.log('Login effettuato:', data);
    
    //localstorage
    setData('access_token', data.access_token);
    window.location.href = 'homepage.html';

  } catch (error) {
    console.error('Errore login:', error.message);
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

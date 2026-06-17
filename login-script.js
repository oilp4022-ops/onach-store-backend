document.addEventListener('DOMContentLoaded', () => {

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const mfaForm = document.getElementById('mfa-form');
    
    const loginWrapper = document.getElementById('login-wrapper');
    const registerWrapper = document.getElementById('register-wrapper');
    const mfaWrapper = document.getElementById('mfa-wrapper');
    
    const API_URL = 'https://onach-api.onrender.com'; 
    let temporalUserId = null; 

    // --- CERRAR SESIÓN POR INACTIVIDAD ---
    let inactivityTimeout;
    const INACTIVITY_LIMIT_MS = 5 * 60 * 1000; // 5 minutos de inactividad

    const logoutUser = () => {
        if (localStorage.getItem('onachStoreToken')) {
            localStorage.removeItem('onachStoreToken');
            localStorage.removeItem('onachStoreRefreshToken');
            localStorage.removeItem('userName');
            localStorage.removeItem('userRole');
            alert('Tu sesión ha expirado por inactividad.');
            window.location.reload();
        }
    };

    const resetInactivityTimer = () => {
        clearTimeout(inactivityTimeout);
        if (localStorage.getItem('onachStoreToken')) {
            inactivityTimeout = setTimeout(logoutUser, INACTIVITY_LIMIT_MS);
        }
    };

    // Detectar actividad del usuario
    window.addEventListener('mousemove', resetInactivityTimer);
    window.addEventListener('keydown', resetInactivityTimer);
    window.addEventListener('click', resetInactivityTimer);
    resetInactivityTimer();

    // --- LÓGICA CAPTCHA (Registro) ---
    const initCaptcha = () => {
        const questionEl = document.getElementById('captcha-question');
        const answerEl = document.getElementById('captcha-answer');
        const inputEl = document.getElementById('captcha-input');
        if (questionEl && answerEl) {
            const n1 = Math.floor(Math.random() * 10) + 1;
            const n2 = Math.floor(Math.random() * 10) + 1;
            questionEl.textContent = `Verificación de seguridad: ¿Cuánto es ${n1} + ${n2}?`;
            answerEl.value = n1 + n2;
            inputEl.value = '';
        }
    };
    initCaptcha();

    // --- PASO 1: LOGIN TRADICIONAL ---
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const msg = document.getElementById('login-message');
            msg.textContent = 'Verificando credenciales...';
            msg.style.color = 'blue';
            
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            try {
                const response = await fetch(`${API_URL}/api/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Error al iniciar sesión.');

                if (data.requireMFA) {
                    temporalUserId = data.userId;
                    msg.textContent = ''; 
                    loginWrapper.style.display = 'none';
                    registerWrapper.style.display = 'none';
                    mfaWrapper.style.display = 'block';
                }

            } catch (error) {
                msg.style.color = 'red';
                msg.textContent = error.message; // Aquí mostrará si la cuenta está bloqueada
            }
        });
    }

    // --- PASO 2: VERIFICACIÓN MFA ---
    if (mfaForm) {
        mfaForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const msg = document.getElementById('mfa-message');
            msg.textContent = 'Verificando código...';
            msg.style.color = 'blue';
            
            const mfaCode = document.getElementById('mfa-code').value;

            try {
                const response = await fetch(`${API_URL}/api/verify-mfa`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: temporalUserId, mfaCode })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Código incorrecto o expirado.');

                localStorage.setItem('onachStoreToken', data.token); 
                localStorage.setItem('onachStoreRefreshToken', data.refreshToken); 
                localStorage.setItem('userName', data.userName);
                localStorage.setItem('userRole', data.role);
                resetInactivityTimer(); // Iniciar temporizador al hacer login

                msg.style.color = 'green';
                msg.textContent = `¡Autenticación exitosa! Entrando al sistema...`;
                setTimeout(() => window.location.href = 'index.html', 1000);

            } catch (error) {
                msg.style.color = 'red';
                msg.textContent = error.message;
            }
        });
    }

    const cancelMfaBtn = document.getElementById('cancel-mfa-btn');
    if(cancelMfaBtn) {
        cancelMfaBtn.addEventListener('click', () => {
            mfaWrapper.style.display = 'none';
            loginWrapper.style.display = 'block';
            registerWrapper.style.display = 'block';
            temporalUserId = null;
            document.getElementById('mfa-code').value = '';
            document.getElementById('login-password').value = '';
        });
    }

    // --- MANEJADOR DE REGISTRO ---
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const msg = document.getElementById('register-message');
            msg.textContent = 'Validando datos...'; msg.style.color = 'blue';
            
            const nombre = document.getElementById('register-name').value;
            const apellido = document.getElementById('register-lastname').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            const confirmPassword = document.getElementById('register-confirm-password').value;
            const captchaInput = parseInt(document.getElementById('captcha-input').value);
            const captchaReal = parseInt(document.getElementById('captcha-answer').value);

            const tieneConsecutivos = (str) => {
                for (let i = 0; i < str.length - 2; i++) {
                    let c1 = str.charCodeAt(i), c2 = str.charCodeAt(i+1), c3 = str.charCodeAt(i+2);
                    if ((c2 === c1 + 1 && c3 === c1 + 2) || (c2 === c1 - 1 && c3 === c1 - 2)) return true;
                }
                return false;
            };

            // Validaciones locales (FrontEnd)
            if (captchaInput !== captchaReal) { msg.style.color = 'red'; msg.textContent = '❌ Error en el CAPTCHA.'; return; }
            if (password !== confirmPassword) { msg.style.color = 'red'; msg.textContent = '❌ Las contraseñas no coinciden.'; return; }
            if (password.length < 8) { msg.style.color = 'red'; msg.textContent = '⚠️ Mínimo 8 caracteres.'; return; }
            if (!/[A-Z]/.test(password)) { msg.style.color = 'red'; msg.textContent = '⚠️ Requiere al menos una mayúscula.'; return; }
            if (!/[a-z]/.test(password)) { msg.style.color = 'red'; msg.textContent = '⚠️ Requiere al menos una minúscula.'; return; }
            if (!/[^A-Za-z0-9]/.test(password)) { msg.style.color = 'red'; msg.textContent = '⚠️ Requiere un carácter especial.'; return; }
            if (tieneConsecutivos(password)) { msg.style.color = 'red'; msg.textContent = '⚠️ No se permiten secuencias (ej. 123 o abc).'; return; }

            try {
                const response = await fetch(`${API_URL}/api/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nombre, apellido, email, password })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Error al registrar.');
                
                msg.style.color = 'green';
                msg.textContent = '✅ ¡Registro exitoso! Por favor inicia sesión.';
                registerForm.reset();
                initCaptcha(); 
            } catch (error) {
                msg.style.color = 'red';
                msg.textContent = error.message;
                initCaptcha(); 
            }
        });
    }
});
// login-script.js - CON SEGURIDAD MFA (Práctica 1 Unidad 3)
document.addEventListener('DOMContentLoaded', () => {

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const mfaForm = document.getElementById('mfa-form');
    
    const loginWrapper = document.getElementById('login-wrapper');
    const registerWrapper = document.getElementById('register-wrapper');
    const mfaWrapper = document.getElementById('mfa-wrapper');
    
    const API_URL = 'http://127.0.0.1:3006';
    let temporalUserId = null; // Guardará el ID temporalmente para el paso 2

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

    // --- PASO 1: LOGIN TRADICIONAL (Pide contraseña y dispara el SMS) ---
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

                // Si la clave es correcta, el servidor pide MFA
                if (data.requireMFA) {
                    temporalUserId = data.userId;
                    msg.textContent = ''; // Limpiamos mensaje
                    
                    // Ocultamos login/registro y mostramos MFA
                    loginWrapper.style.display = 'none';
                    registerWrapper.style.display = 'none';
                    mfaWrapper.style.display = 'block';
                }

            } catch (error) {
                msg.style.color = 'red';
                msg.textContent = error.message;
            }
        });
    }

    // --- PASO 2: VERIFICACIÓN MFA (Valida el código y te deja entrar) ---
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

                // ¡Éxito! Guardamos los tokens de Alta Seguridad
                localStorage.setItem('onachStoreToken', data.token); // Access Token (15 min)
                localStorage.setItem('onachStoreRefreshToken', data.refreshToken); // Refresh Token (7 días)
                localStorage.setItem('userName', data.userName);
                localStorage.setItem('userRole', data.role);

                msg.style.color = 'green';
                msg.textContent = `¡Autenticación exitosa! Entrando al sistema...`;
                setTimeout(() => window.location.href = 'index.html', 1000);

            } catch (error) {
                msg.style.color = 'red';
                msg.textContent = error.message;
            }
        });
    }

    // Botón para cancelar el MFA y volver atrás
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

    // --- MANEJADOR DE REGISTRO (Se mantiene igual) ---
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

            if (captchaInput !== captchaReal) { msg.style.color = 'red'; msg.textContent = '❌ Error de seguridad.'; return; }
            if (password !== confirmPassword) { msg.style.color = 'red'; msg.textContent = '❌ Contraseñas no coinciden.'; return; }
            if (password.length < 6) { msg.style.color = 'red'; msg.textContent = '⚠️ Mínimo 6 caracteres.'; return; }

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
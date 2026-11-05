document.addEventListener('DOMContentLoaded', () => {

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const mfaForm = document.getElementById('mfa-form');
    
    const loginWrapper = document.getElementById('login-wrapper');
    const registerWrapper = document.getElementById('register-wrapper');
    const mfaWrapper = document.getElementById('mfa-wrapper');
    
    // CORRECCIÓN: El puerto correcto hacia tu Node.js
    const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:3006' : 'https://onach-api.onrender.com'; 
    let temporalUserId = null; 

    // --- LÓGICA PARA MOSTRAR/OCULTAR CONTRASEÑAS ---
    const setupPasswordToggle = (iconId, inputId) => {
        const icon = document.getElementById(iconId);
        const input = document.getElementById(inputId);
        
        if (icon && input) {
            icon.addEventListener('click', () => {
                const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
                input.setAttribute('type', type);
                icon.classList.toggle('fa-eye');
                icon.classList.toggle('fa-eye-slash');
            });
        }
    };

    setupPasswordToggle('toggle-login-pass', 'login-password');
    setupPasswordToggle('toggle-reg-pass', 'register-password');
    setupPasswordToggle('toggle-reg-confirm', 'register-confirm-password');

    // --- MENSAJE DE ACTIVACIÓN DE CUENTA ---
    const activationParams = new URLSearchParams(window.location.search);
    if (activationParams.get('activado') === 'true' && loginForm) {
        const activationMsg = document.getElementById('login-message');
        activationMsg.style.color = 'green';
        activationMsg.textContent = '✅ Cuenta activada correctamente. Ya puedes iniciar sesión.';
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    // --- CERRAR SESIÓN POR INACTIVIDAD ---
    let inactivityTimeout;
    const INACTIVITY_LIMIT_MS = 5 * 60 * 1000;

    const logoutUser = async () => {
        const token = localStorage.getItem('onachStoreToken');
        if (!token) return;
        try {
            await fetch(`${API_URL}/api/logout`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (error) {
            console.warn('No fue posible registrar el cierre por inactividad:', error.message);
        } finally {
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

    window.addEventListener('mousemove', resetInactivityTimer);
    window.addEventListener('keydown', resetInactivityTimer);
    window.addEventListener('click', resetInactivityTimer);
    resetInactivityTimer();

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
                // CORRECCIÓN: Agregamos "/auth" a la ruta
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
                msg.textContent = error.message; 
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
                // CORRECCIÓN: Agregamos "/auth" a la ruta
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
                resetInactivityTimer(); 

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

    // --- VALIDACIÓN DE CONTRASEÑAS ---
    // La función se declara fuera del submit para que siempre esté disponible.
    // Evita ReferenceError cuando el navegador ejecuta el handler.
    const tieneConsecutivos = (str) => {
        const value = String(str || '');

        // Números consecutivos ascendentes/descendentes: 12, 23, 21, 32, etc.
        for (let i = 0; i < value.length - 1; i++) {
            const a = value.charCodeAt(i);
            const b = value.charCodeAt(i + 1);

            if (a >= 48 && a <= 57 && b >= 48 && b <= 57) {
                if (Math.abs(b - a) === 1) return true;
            }
        }

        // Letras consecutivas respecto al abecedario: ab, ba, cd, dc, etc.
        for (let i = 0; i < value.length - 1; i++) {
            const a = value[i].toLowerCase();
            const b = value[i + 1].toLowerCase();

            if (/[a-z]/.test(a) && /[a-z]/.test(b)) {
                if (Math.abs(b.charCodeAt(0) - a.charCodeAt(0)) === 1) return true;
            }
        }

        return false;
    };

    // --- MANEJADOR DE REGISTRO CON RECAPTCHA ---
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const msg = document.getElementById('register-message');
            
            // 🔒 [PROTECCIÓN DE DATOS] VALIDACIÓN CRÍTICA DEL AVISO DE PRIVACIDAD
            const privacyCheckbox = document.getElementById('privacyPolicy');
            if (!privacyCheckbox || !privacyCheckbox.checked) {
                msg.style.color = 'red';
                msg.textContent = '❌ Error: Debes aceptar el Aviso de Privacidad para poder registrarte.';
                return; 
            }

            msg.textContent = 'Validando datos...'; 
            msg.style.color = 'blue';
            
            const nombre = document.getElementById('register-name').value;
            const apellido = document.getElementById('register-lastname').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            const confirmPassword = document.getElementById('register-confirm-password').value;
            
            // --- TU CÓDIGO ORIGINAL E INTACTO PARA OBTENER RECAPTCHA ---
            const captchaResponse = grecaptcha.getResponse();

            // Validaciones locales
            if (captchaResponse.length === 0) { msg.style.color = 'red'; msg.textContent = '❌ Por favor, marca la casilla de "No soy un robot".'; return; }
            if (password !== confirmPassword) { msg.style.color = 'red'; msg.textContent = '❌ Las contraseñas no coinciden.'; return; }
            if (password.length < 8) { msg.style.color = 'red'; msg.textContent = '⚠️ Mínimo 8 caracteres.'; return; }
            if (!/[A-Z]/.test(password)) { msg.style.color = 'red'; msg.textContent = '⚠️ Requiere al menos una mayúscula.'; return; }
            if (!/[a-z]/.test(password)) { msg.style.color = 'red'; msg.textContent = '⚠️ Requiere al menos una minúscula.'; return; }
            if (!/[^A-Za-z0-9]/.test(password)) { msg.style.color = 'red'; msg.textContent = '⚠️ Requiere un carácter especial.'; return; }
            if (tieneConsecutivos(password)) { msg.style.color = 'red'; msg.textContent = '⚠️ No se permiten secuencias (ej. 123 o abc).'; return; }

            try {
                // CORRECCIÓN: Agregamos "/auth" a la ruta
                const response = await fetch(`${API_URL}/api/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nombre, apellido, email, password, captchaResponse, privacyAccepted: true })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Error al registrar.');
                
                msg.style.color = 'green';
                msg.textContent = '✅ Registro exitoso. Revisa tu correo y pulsa el enlace de activación.';
                registerForm.reset();
                if (typeof grecaptcha !== 'undefined') grecaptcha.reset();
            } catch (error) {
                msg.style.color = 'red';
                msg.textContent = error.message;
                if (typeof grecaptcha !== 'undefined') grecaptcha.reset();
            }
        });
    }
});
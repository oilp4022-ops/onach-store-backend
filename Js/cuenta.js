import { API } from './api.js';

document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. Verificar si el usuario está logueado
    if (!API.getToken()) {
        window.location.href = 'login.html';
        return;
    }

    // 2. Cargar datos del perfil
    const userName = localStorage.getItem('userName') || 'Usuario';
    const userRole = localStorage.getItem('userRole') || 'Cliente';
    
    document.getElementById('profile-name').textContent = `Hola, ${userName}`;
    document.getElementById('profile-role').textContent = `Rol: ${userRole}`;

    // 3. Cargar las sesiones activas desde el servidor
    try {
        const sessions = await API.request('/sessions', 'GET');
        const container = document.getElementById('sessions-container');
        
        if (sessions.length === 0) {
            container.innerHTML = '<p>No hay sesiones registradas.</p>';
        } else {
            container.innerHTML = sessions.map((s, index) => {
                const date = new Date(s.fecha_creacion).toLocaleString('es-MX');
                // Simulamos que la primera sesión de la lista es la actual
                const isCurrent = index === sessions.length - 1 ? '<span class="current-badge">Este dispositivo</span>' : '';
                
                return `
                    <div class="session-item">
                        <div class="session-info">
                            <h4><i class="fas fa-desktop"></i> ${s.dispositivo} ${isCurrent}</h4>
                            <p><strong>IP:</strong> ${s.direccion_ip} | <strong>Iniciada:</strong> ${date}</p>
                        </div>
                    </div>
                `;
            }).reverse().join(''); // Reverse para mostrar la más nueva arriba
        }
    } catch (error) {
        console.error("Error cargando sesiones", error);
        document.getElementById('sessions-container').innerHTML = '<p style="color:red;">Error al cargar las sesiones.</p>';
    }

    // 4. Lógica para Cerrar Sesión
    document.getElementById('logout-btn').addEventListener('click', () => {
        if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
            localStorage.removeItem('onachStoreToken');
            localStorage.removeItem('onachStoreRefreshToken');
            localStorage.removeItem('userName');
            localStorage.removeItem('userRole');
            window.location.href = 'login.html';
        }
    });
});
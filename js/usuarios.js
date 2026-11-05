const API_URL = ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:3006/api' : 'https://onach-api.onrender.com/api') + '/usuarios';

const getToken = () => localStorage.getItem('onachStoreToken');
const authHeaders = (json = false) => {
    const headers = { Authorization: `Bearer ${getToken()}` };
    if (json) headers['Content-Type'] = 'application/json';
    return headers;
};

// Cargar usuarios al iniciar
window.addEventListener('DOMContentLoaded', cargarUsuarios);

async function parseResponse(res) {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Error HTTP ${res.status}`);
    return data;
}

async function cargarUsuarios() {
    try {
        const res = await fetch(API_URL, { headers: authHeaders() });
        const usuarios = await parseResponse(res);
        const tbody = document.getElementById('tabla-usuarios-body');
        tbody.innerHTML = '';

        usuarios.forEach(user => {
            tbody.innerHTML += `
                <tr>
                    <td>${user.id_cliente}</td>
                    <td>${user.nombre} ${user.apellido || ''}</td>
                    <td>${user.email}</td>
                    <td><span class="badge bg-info text-dark">${user.rol}</span></td>
                    <td>
                        <span class="badge ${user.estado === 'activo' ? 'bg-success' : 'bg-warning'}">
                            ${user.estado}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="editarUsuario(${user.id_cliente})">Editar</button>
                        <button class="btn btn-sm btn-outline-danger" onclick="eliminarUsuario(${user.id_cliente})">Eliminar</button>
                    </td>
                </tr>
            `;
        });
    } catch (err) {
        console.error('Error al cargar usuarios:', err);
        const tbody = document.getElementById('tabla-usuarios-body');
        if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="color:red;text-align:center">${err.message}</td></tr>`;
    }
}

async function editarUsuario(id) {
    try {
        const res = await fetch(`${API_URL}/${id}`, { headers: authHeaders() });
        const user = await parseResponse(res);

        document.getElementById('usuario-id').value = user.id_cliente;
        document.getElementById('usuario-nombre').value = user.nombre || '';
        document.getElementById('usuario-apellido').value = user.apellido || '';
        document.getElementById('usuario-email').value = user.email || '';
        document.getElementById('usuario-password').value = '';
        document.getElementById('usuario-rol').value = user.rol || 'cliente';
        document.getElementById('usuario-estado').value = user.estado || 'activo';
        document.getElementById('modal-usuario-title').innerText = 'Editar Usuario';
        document.getElementById('modal-usuario').style.display = 'flex';
    } catch (err) {
        alert(`No fue posible cargar el usuario: ${err.message}`);
    }
}

async function eliminarUsuario(id) {
    if (!confirm(`¿Estás seguro de que deseas eliminar al usuario ID ${id}?`)) return;

    try {
        const res = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE',
            headers: authHeaders()
        });
        const data = await parseResponse(res);
        alert(data.message || 'Usuario eliminado.');
        cargarUsuarios();
    } catch (err) {
        alert(`No fue posible eliminar el usuario: ${err.message}`);
    }
}

const formUsuario = document.getElementById('form-usuario');
if (formUsuario) {
    formUsuario.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('usuario-id').value;
        const payload = {
            nombre: document.getElementById('usuario-nombre').value.trim(),
            apellido: document.getElementById('usuario-apellido').value.trim(),
            email: document.getElementById('usuario-email').value.trim(),
            password: document.getElementById('usuario-password').value,
            rol: document.getElementById('usuario-rol').value,
            estado: document.getElementById('usuario-estado').value
        };

        try {
            const res = await fetch(id ? `${API_URL}/${id}` : API_URL, {
                method: id ? 'PUT' : 'POST',
                headers: authHeaders(true),
                body: JSON.stringify(payload)
            });
            const data = await parseResponse(res);
            alert(data.message || 'Usuario guardado correctamente.');
            cerrarModalUsuario();
            cargarUsuarios();
        } catch (err) {
            alert(`No fue posible guardar el usuario: ${err.message}`);
        }
    });
}

window.cargarUsuarios = cargarUsuarios;
window.editarUsuario = editarUsuario;
window.eliminarUsuario = eliminarUsuario;

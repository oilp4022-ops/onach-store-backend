const ROLES_API_URL = ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:3006/api' : 'https://onach-api.onrender.com/api') + '/roles';
const getRoleToken = () => localStorage.getItem('onachStoreToken');

const roleHeaders = (json = false) => {
    const headers = { Authorization: `Bearer ${getRoleToken()}` };
    if (json) headers['Content-Type'] = 'application/json';
    return headers;
};

let editingRoleId = '';

async function roleResponse(res) {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Error HTTP ${res.status}`);
    return data;
}

async function cargarRoles() {
    const tbody = document.getElementById('tabla-roles-body');
    if (!tbody) return;
    try {
        const res = await fetch(ROLES_API_URL, { headers: roleHeaders() });
        const roles = await roleResponse(res);
        tbody.innerHTML = roles.map(role => `
            <tr>
                <td>${role.id_rol}</td>
                <td>${role.nombre}</td>
                <td>${role.descripcion || ''}</td>
                <td>${role.estado}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="editarRol(${role.id_rol}, '${String(role.nombre).replace(/'/g, "\\'")}', '${String(role.descripcion || '').replace(/'/g, "\\'")}', '${role.estado}')">Editar</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="eliminarRol(${role.id_rol})">Eliminar</button>
                </td>
            </tr>
        `).join('');

        const roleSelect = document.getElementById('usuario-rol');
        if (roleSelect) {
            const current = roleSelect.value;
            roleSelect.innerHTML = roles.filter(r => r.estado === 'activo')
                .map(r => `<option value="${r.nombre}">${r.nombre}</option>`).join('');
            if (roles.some(r => r.nombre === current && r.estado === 'activo')) roleSelect.value = current;
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" style="color:red;text-align:center">${err.message}</td></tr>`;
    }
}

function limpiarFormularioRol() {
    editingRoleId = '';
    document.getElementById('rol-nombre').value = '';
    document.getElementById('rol-descripcion').value = '';
    document.getElementById('rol-estado').value = 'activo';
    document.getElementById('rol-form-title').textContent = 'Nuevo Rol';
}

function editarRol(id, nombre, descripcion, estado) {
    editingRoleId = id;
    document.getElementById('rol-nombre').value = nombre;
    document.getElementById('rol-descripcion').value = descripcion;
    document.getElementById('rol-estado').value = estado;
    document.getElementById('rol-form-title').textContent = 'Editar Rol';
}

async function eliminarRol(id) {
    if (!confirm('¿Eliminar este rol? Si está asignado a usuarios, primero debes reasignarlos.')) return;
    try {
        const res = await fetch(`${ROLES_API_URL}/${id}`, { method: 'DELETE', headers: roleHeaders() });
        const data = await roleResponse(res);
        alert(data.message || 'Rol eliminado.');
        limpiarFormularioRol();
        cargarRoles();
    } catch (err) {
        alert(err.message);
    }
}

const rolForm = document.getElementById('rol-form');
if (rolForm) {
    rolForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            nombre: document.getElementById('rol-nombre').value.trim(),
            descripcion: document.getElementById('rol-descripcion').value.trim(),
            estado: document.getElementById('rol-estado').value
        };
        try {
            const url = editingRoleId ? `${ROLES_API_URL}/${editingRoleId}` : ROLES_API_URL;
            const res = await fetch(url, {
                method: editingRoleId ? 'PUT' : 'POST',
                headers: roleHeaders(true),
                body: JSON.stringify(payload)
            });
            const data = await roleResponse(res);
            alert(data.message || 'Rol guardado.');
            limpiarFormularioRol();
            cargarRoles();
        } catch (err) {
            alert(err.message);
        }
    });
}

window.addEventListener('DOMContentLoaded', cargarRoles);
window.editarRol = editarRol;
window.eliminarRol = eliminarRol;
window.limpiarFormularioRol = limpiarFormularioRol;

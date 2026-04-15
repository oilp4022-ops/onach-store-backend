// js/data.js (VERSIÓN CONECTADA A BD)
const API_URL = 'http://127.0.0.1:3006/api';

const getToken = () => localStorage.getItem('onachStoreToken');

export class DataStore {
    // Obtener productos (GET)
    static async getProducts() {
        try {
            const res = await fetch(`${API_URL}/productos`);
            return await res.json();
        } catch (err) {
            console.error(err);
            return [];
        }
    }

    // Agregar producto (POST)
    static async addProduct(product) {
        const res = await fetch(`${API_URL}/products`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}` 
            },
            body: JSON.stringify(product)
        });
        if (!res.ok) throw new Error('Error al guardar en BD');
        return await res.json();
    }

    // Eliminar producto (DELETE)
    static async removeProduct(id) {
        await fetch(`${API_URL}/products/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
    }

    // Actualizar producto (PUT)
    static async updateProduct(product) {
        await fetch(`${API_URL}/products/${product.id}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify(product)
        });
    }
}
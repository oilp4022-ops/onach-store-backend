import { CacheSystem } from './cache.js';

export class API {
    static BASE_URL = 'https://onach-api.onrender.com';

    static getToken() {
        return localStorage.getItem('onachStoreToken');
    }

    // Petición asíncrona unificada
    static async request(endpoint, method = 'GET', body = null, useCache = false) {
        if (method === 'GET' && useCache) {
            const cached = CacheSystem.get(endpoint);
            if (cached) return cached;
        }

        const headers = { 'Content-Type': 'application/json' };
        const token = this.getToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const config = { method, headers };
        if (body) config.body = JSON.stringify(body);

        const res = await fetch(`${this.BASE_URL}${endpoint}`, config);
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || 'Error en la petición');
        if (method === 'GET' && useCache) CacheSystem.save(endpoint, data);
        
        return data;
    }

    // RETO FINAL: Polling Inteligente (Busca actualizaciones cada 15 seg)
    static startSmartPolling(callback) {
        setInterval(async () => {
            try {
                // Forzamos buscar en la BD sin usar caché
                const latest = await this.request('/productos', 'GET', null, false);
                callback(latest);
            } catch (e) {
                console.warn("Polling pausado por error de red");
            }
        }, 15000);
    }
}
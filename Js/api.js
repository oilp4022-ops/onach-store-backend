import { CacheSystem } from './cache.js';

export class API {
    static BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:3006/api' : 'https://onach-api.onrender.com/api';

    static getToken() {
        return localStorage.getItem('onachStoreToken');
    }

    static async refreshToken() {
        const refreshToken = localStorage.getItem('onachStoreRefreshToken');
        if (!refreshToken) return false;

        const res = await fetch(`${API.BASE_URL}/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: refreshToken })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.token) return false;

        localStorage.setItem('onachStoreToken', data.token);
        if (data.refreshToken) localStorage.setItem('onachStoreRefreshToken', data.refreshToken);
        if (data.userName) localStorage.setItem('userName', data.userName);
        if (data.role) localStorage.setItem('userRole', data.role);
        return true;
    }

    static async request(endpoint, method = 'GET', body = null, useCache = false, retry = true) {
        if (method === 'GET' && useCache) {
            const cached = CacheSystem.get(endpoint);
            if (cached) return cached;
        }

        const makeRequest = async () => {
            const headers = { 'Content-Type': 'application/json' };
            const token = this.getToken();
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const config = { method, headers };
            if (body) config.body = JSON.stringify(body);
            return fetch(`${this.BASE_URL}${endpoint}`, config);
        };

        let res = await makeRequest();

        if (res.status === 401 || res.status === 403) {
            if (retry && await this.refreshToken()) {
                res = await makeRequest();
            } else if (res.status === 401 || res.status === 403) {
                localStorage.removeItem('onachStoreToken');
                localStorage.removeItem('onachStoreRefreshToken');
            }
        }

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Error HTTP ${res.status}`);
        if (method === 'GET' && useCache) CacheSystem.save(endpoint, data);
        return data;
    }

    static startSmartPolling(callback) {
        setInterval(async () => {
            try {
                const latest = await this.request('/productos', 'GET', null, false);
                callback(latest);
            } catch (e) {
                console.warn('Polling pausado por error de red');
            }
        }, 15000);
    }
}

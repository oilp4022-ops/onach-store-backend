export class CacheSystem {
    static CACHE_KEY = 'onach_api_cache';
    
    static save(key, data) {
        sessionStorage.setItem(`${this.CACHE_KEY}_${key}`, JSON.stringify({ time: Date.now(), data }));
    }
    
    static get(key) {
        const cached = sessionStorage.getItem(`${this.CACHE_KEY}_${key}`);
        if (!cached) return null;
        
        const parsed = JSON.parse(cached);
        // Expirar caché después de 3 minutos para no saturar memoria
        if (Date.now() - parsed.time > 180000) { 
            sessionStorage.removeItem(`${this.CACHE_KEY}_${key}`); 
            return null; 
        }
        return parsed.data;
    }
}
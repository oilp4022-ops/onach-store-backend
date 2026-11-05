const mysql = require('mysql2/promise');
require('dotenv').config();

class Database {
    constructor() {
        if (!Database.instance) {
            this.pool = mysql.createPool({
                host: process.env.DB_HOST || '127.0.0.1',
                user: process.env.DB_USER || 'root',
                password: process.env.DB_PASSWORD || process.env.DB_PASS || '',
                database: 'onachus', // Conexión directa y segura a tu BD
                port: parseInt(process.env.DB_PORT) || 3306,
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0
            });
            Database.instance = this;
        }
        return Database.instance;
    }

    static getInstance() {
        if (!Database.instance) {
            Database.instance = new Database();
        }
        return Database.instance;
    }

    // 👇 ESTA ES LA FUNCIÓN QUE SE HABÍA BORRADO Y CAUSABA EL ERROR
    async query(sql, params) {
        const [results] = await this.pool.execute(sql, params);
        return results;
    }
}

module.exports = Database;
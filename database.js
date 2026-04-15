const mysql = require('mysql2');

class Database {
    constructor() {
        if (!Database.instance) {
            this.connection = mysql.createConnection({
                host: process.env.DB_HOST,
                user: process.env.DB_USER,
                password: process.env.DB_PASS,
                database: process.env.DB_NAME
            });
            
            this.connection.connect(err => {
                if (err) console.error('Error de conexión a BD:', err.stack);
                else console.log('Conexión a BD (Singleton) exitosa. ID:', this.connection.threadId);
            });

            Database.instance = this;
        }
        return Database.instance;
    }

    query(sql, args) {
        return new Promise((resolve, reject) => {
            this.connection.query(sql, args, (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });
    }
    
    // Método para obtener la instancia (o crearla)
    static getInstance() {
        if (!this.instance) {
            new Database();
        }
        return this.instance;
    }
}

module.exports = Database;
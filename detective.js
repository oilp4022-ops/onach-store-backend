const mysql = require('mysql2/promise');
require('dotenv').config();

async function investigarServidor() {
    try {
        console.log(`🔍 Tocando la puerta de MySQL en: ${process.env.DB_HOST}:${process.env.DB_PORT || 3306}`);
        
        // Nos conectamos al servidor en general, SIN pedir una base de datos
        const conexion = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            port: parseInt(process.env.DB_PORT) || 3306
        });

        console.log("✅ ¡La puerta se abrió! Node.js logró entrar al servidor.");
        console.log("📂 Buscando las bases de datos que existen aquí adentro...\n");

        const [basesDeDatos] = await conexion.query('SHOW DATABASES;');
        
        console.table(basesDeDatos);
        
        console.log("\nSi 'onachus' NO está en la lista de arriba, Node.js está entrando al servidor equivocado.");
        conexion.end();

    } catch (error) {
        console.error("❌ Error al intentar entrar al servidor:", error.message);
    }
}

investigarServidor();
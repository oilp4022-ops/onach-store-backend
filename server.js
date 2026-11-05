// server.js - Punto de entrada: levanta la API definida en app.js
require('dotenv').config();
const app = require('./app');

const port = process.env.PORT || 3006;

app.listen(port, () => {
    console.log(`🚀 Servidor ARQUITECTURA LIMPIA corriendo en http://localhost:${port}`);
});

// server.js - ARQUITECTURA LIMPIA (MVC) FINAL
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit'); // LIBRERÍA DE SEGURIDAD

// Importar todas nuestras rutas
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const port = process.env.PORT || 3006;

// Configuración CORS
const allowedOrigins = [
    'http://127.0.0.1:5500', 
    'http://localhost', 
    'http://localhost:80', 
    'null',
    'https://onach-urban-store.netlify.app' 
];


app.use(cors({
    origin: allowedOrigins
}));

app.use(express.json());

app.use(express.json());

// --- RATE LIMITING (Protección contra Fuerza Bruta) ---
// Máximo 5 intentos por ventana de 15 minutos en rutas sensibles
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 5, 
    message: { error: 'Demasiados intentos. Por favor, inténtalo de nuevo en 15 minutos.' }
});

// Aplicar el limitador SOLO a las rutas de login y recuperación
app.use('/api/login', loginLimiter);
app.use('/api/verify-mfa', loginLimiter);
app.use('/api/forgot-password', loginLimiter);

// Conectar las rutas con el prefijo /api
app.use('/api', authRoutes);
app.use('/api', productRoutes);
app.use('/api', cartRoutes);
app.use('/api', orderRoutes);
app.use('/api', adminRoutes);

app.listen(port, () => {
    console.log(`🚀 Servidor ARQUITECTURA LIMPIA corriendo en http://localhost:${port}`);
});
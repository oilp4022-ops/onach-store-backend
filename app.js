// app.js - Configuración de la aplicación Express (sin levantar el servidor)
// Se separa de server.js para poder probar la API con Supertest.
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
const healthRoutes = require('./routes/healthRoutes');

const app = express();
app.set('trust proxy', 1);
const userRoutes = require('./routes/userRoutes');
const roleRoutes = require('./routes/roleRoutes');

// Configuración CORS
const allowedOrigins = [
    'http://127.0.0.1:5500', 
    'http://localhost', 
    'http://localhost:80',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://localhost:3000',
    'null',
    'https://onach-urban-store.netlify.app' 
];


app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 204
}));

// CORS debe procesarse antes de las rutas para responder al preflight OPTIONS.
app.use(express.json());

// Rutas administrativas después de CORS para que también respondan correctamente al navegador.
app.use('/api/usuarios', userRoutes);
app.use('/api/roles', roleRoutes);

// --- RATE LIMITING (Protección contra Fuerza Bruta) ---
// Máximo 5 intentos por ventana de 15 minutos en rutas sensibles
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 5, 
    message: { error: 'Demasiados intentos. Por favor, inténtalo de nuevo en 15 minutos.' }
});

// Aplicar el limitador SOLO a las rutas de login y recuperación
app.use('/api/register', rateLimit({ windowMs: 60 * 60 * 1000, max: 10, message: { error: 'Demasiados registros desde esta IP. Inténtalo más tarde.' } }));
app.use('/api/login', loginLimiter);
app.use('/api/verify-mfa', loginLimiter);
app.use('/api/forgot-password', loginLimiter);

// Conectar las rutas con el prefijo /api
app.use('/api', healthRoutes); // RF-16: monitoreo (UptimeRobot)
app.use('/api', authRoutes);
app.use('/api', productRoutes);
app.use('/api', cartRoutes);
app.use('/api', orderRoutes);
app.use('/api', adminRoutes);

module.exports = app;

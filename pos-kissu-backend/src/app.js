// ============================================
// CONFIGURACIÓN DE EXPRESS
// ============================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const logger = require('./utils/logger');

// Importar rutas
const authRoutes = require('./routes/auth.routes');
const ventasRoutes = require('./routes/ventas.routes');
// const productosRoutes = require('./routes/productos.routes');
// const cajaRoutes = require('./routes/caja.routes');

const app = express();

// ============================================
// MIDDLEWARES DE SEGURIDAD
// ============================================
app.use(helmet()); // Seguridad HTTP headers
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
}));
app.use(compression()); // Compresión GZIP

// ============================================
// MIDDLEWARES DE PARSEO
// ============================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// MIDDLEWARE DE LOGGING
// ============================================
app.use((req, res, next) => {
    logger.request(req);
    next();
});

// ============================================
// HEALTH CHECK
// ============================================
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// ============================================
// RUTAS API
// ============================================
const API_VERSION = process.env.API_VERSION || 'v1';

app.use(`/api/${API_VERSION}/auth`, authRoutes);
app.use(`/api/${API_VERSION}/ventas`, ventasRoutes);
// app.use(`/api/${API_VERSION}/productos`, productosRoutes);
// app.use(`/api/${API_VERSION}/caja`, cajaRoutes);

// Ruta raíz de la API
app.get(`/api/${API_VERSION}`, (req, res) => {
    res.json({
        message: 'API POS Cafetería',
        version: API_VERSION,
        endpoints: {
            auth: `/api/${API_VERSION}/auth`,
            ventas: `/api/${API_VERSION}/ventas`,
            productos: `/api/${API_VERSION}/productos`,
            caja: `/api/${API_VERSION}/caja`
        }
    });
});

// ============================================
// MANEJO DE RUTAS NO ENCONTRADAS
// ============================================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Ruta no encontrada',
        path: req.path,
        method: req.method
    });
});

// ============================================
// MANEJO DE ERRORES GLOBAL
// ============================================
app.use((err, req, res, next) => {
    logger.error('Error no manejado:', err);
    
    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Error interno del servidor',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

module.exports = app;
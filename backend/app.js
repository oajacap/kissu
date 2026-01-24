// ============================================
// SERVIDOR PRINCIPAL - SISTEMA DE FACTURACIÓN
// ============================================

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARES
// ============================================
app.use(cors()); // Permitir peticiones desde el frontend
app.use(bodyParser.json()); // Parsear JSON en el body
app.use(bodyParser.urlencoded({ extended: true })); // Parsear formularios

// ============================================
// RUTA RAÍZ (DEBE IR PRIMERO)
// ============================================
app.get('/', (req, res) => {
    res.json({ 
        message: 'Sistema de Facturación API',
        version: '1.0.0',
        status: 'online'
    });
});

// ============================================
// IMPORTAR RUTAS
// ============================================
const routes = require('./routes/index');
app.use('/api', routes);

// ============================================
// MANEJO DE ERRORES
// ============================================
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({ 
        error: 'Error interno del servidor',
        message: err.message 
    });
});

// Ruta no encontrada (DEBE IR AL FINAL)
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Ruta no encontrada',
        ruta: req.originalUrl,
        metodo: req.method
    });
});

// ============================================
// INICIAR SERVIDOR
// ============================================
app.listen(PORT, () => {
    console.log('============================================');
    console.log('SISTEMA DE FACTURACIÓN - SERVIDOR ACTIVO');
    console.log('============================================');
    console.log(` Servidor corriendo en: http://localhost:${PORT}`);
    console.log(` API disponible en: http://localhost:${PORT}/api`);
    console.log('============================================');
    console.log('Rutas disponibles:');
    console.log(`  GET  http://localhost:${PORT}/`);
    console.log(`  POST http://localhost:${PORT}/api/auth/login`);
    console.log(`  GET  http://localhost:${PORT}/api/productos`);
    console.log(`  GET  http://localhost:${PORT}/api/usuarios`);
    console.log('============================================');
});
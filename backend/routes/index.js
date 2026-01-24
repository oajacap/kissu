// ============================================
// RUTAS PRINCIPALES DEL API
// ============================================

const express = require('express');
const router = express.Router();

// Verificar que todos los controladores existen
let authController, ventasController, productosController, inventarioController;
let proveedoresController, gastosController, lotesController;

try {
    authController = require('../controllers/authController');
    ventasController = require('../controllers/ventasController');
    productosController = require('../controllers/productosController');
    inventarioController = require('../controllers/inventarioController');
    proveedoresController = require('../controllers/proveedoresController');
    gastosController = require('../controllers/gastosController');
    lotesController = require('../controllers/lotesController');
    console.log('Todos los controladores cargados correctamente');
} catch (error) {
    console.error(' Error al cargar controladores:', error.message);
}

// ============================================
// RUTA DE PRUEBA
// ============================================
router.get('/', (req, res) => {
    res.json({ 
        message: 'API funcionando correctamente',
        rutas_disponibles: [
            'POST /api/auth/login',
            'GET /api/productos',
            'GET /api/usuarios',
            'GET /api/ventas',
            'GET /api/inventario',
            'GET /api/proveedores',
            'GET /api/gastos',
            'GET /api/lotes'
        ]
    });
});

// ============================================
// RUTAS DE AUTENTICACIÓN
// ============================================
router.post('/auth/login', authController.login);
router.get('/usuarios', authController.getAll);
router.post('/usuarios', authController.create);
router.put('/usuarios/:id', authController.update);
router.put('/usuarios/:id/password', authController.cambiarPassword);
router.delete('/usuarios/:id', authController.desactivar);

// ============================================
// RUTAS DE PRODUCTOS
// ============================================
router.get('/productos', productosController.getAll);
router.get('/productos/:id', productosController.getById);
router.post('/productos', productosController.create);
router.put('/productos/:id', productosController.update);
router.delete('/productos/:id', productosController.delete);

// ============================================
// RUTAS DE VENTAS
// ============================================
router.get('/ventas', ventasController.getAll);
router.get('/ventas/:id', ventasController.getById);
router.post('/ventas', ventasController.create);
router.get('/ventas/numero/:numero', ventasController.getByNumero);

// ============================================
// RUTAS DE CAJA
// ============================================
router.post('/caja/abrir', ventasController.abrirCaja);
router.post('/caja/cerrar', ventasController.cerrarCaja);
router.get('/caja/estado', ventasController.estadoCaja);

// ============================================
// RUTAS DE INVENTARIO
// ============================================
router.get('/inventario', inventarioController.getAll);
router.post('/inventario/entrada', inventarioController.entrada);
router.post('/inventario/salida', inventarioController.salida);
router.post('/inventario/ajuste', inventarioController.ajuste);
router.get('/inventario/movimientos', inventarioController.getMovimientos);
router.get('/inventario/bajo-stock', inventarioController.getBajoStock);

// ============================================
// RUTAS DE PROVEEDORES
// ============================================
router.get('/proveedores', proveedoresController.getAll);
router.get('/proveedores/:id', proveedoresController.getById);
router.post('/proveedores', proveedoresController.create);
router.put('/proveedores/:id', proveedoresController.update);
router.get('/proveedores/:id/cuadre', proveedoresController.getCuadre);

// ============================================
// RUTAS DE COMPRAS
// ============================================
router.post('/compras', proveedoresController.crearCompra);
router.get('/compras', proveedoresController.getCompras);

// ============================================
// RUTAS DE GASTOS
// ============================================
router.get('/gastos', gastosController.getAll);
router.post('/gastos', gastosController.create);
router.get('/gastos/total', gastosController.getTotal);

// ============================================
// RUTAS DE LOTES
// ============================================
router.get('/lotes', lotesController.getAll);
router.get('/lotes/producto/:id', lotesController.getByProducto);
router.post('/lotes', lotesController.create);
router.get('/lotes/vencimientos', lotesController.getProximosVencer);

module.exports = router;
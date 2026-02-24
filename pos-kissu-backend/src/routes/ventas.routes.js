// ============================================
// RUTAS DE VENTAS
// ============================================

const express = require('express');
const router = express.Router();
const ventasController = require('../controllers/ventas.controller');
const { authenticate } = require('../middleware/auth');
const { hasPermission } = require('../middleware/roles');

// Todas las rutas requieren autenticación
router.use(authenticate);

/**
 * @route   POST /api/ventas
 * @desc    Crear nueva venta
 * @access  Private (cajero, supervisor, admin)
 */
router.post('/', hasPermission('ventas.crear'), ventasController.create);

/**
 * @route   GET /api/ventas
 * @desc    Listar ventas
 * @access  Private
 */
router.get('/', hasPermission('ventas.listar'), ventasController.getAll);

/**
 * @route   GET /api/ventas/hoy
 * @desc    Obtener ventas del día
 * @access  Private
 */
router.get('/hoy', hasPermission('ventas.listar'), ventasController.getVentasHoy);

/**
 * @route   GET /api/ventas/:id
 * @desc    Obtener venta por ID
 * @access  Private
 */
router.get('/:id', hasPermission('ventas.listar'), ventasController.getById);

/**
 * @route   PUT /api/ventas/:id/anular
 * @desc    Anular venta
 * @access  Private (supervisor, admin)
 */
router.put('/:id/anular', hasPermission('ventas.anular'), ventasController.anular);

module.exports = router;
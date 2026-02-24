// ============================================
// RUTAS DE AUTENTICACIÓN
// ============================================

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');

// ============================================
// RUTAS PÚBLICAS
// ============================================

/**
 * @route   POST /api/auth/login
 * @desc    Iniciar sesión
 * @access  Public
 */
router.post('/login', authController.login);

// ============================================
// RUTAS PROTEGIDAS
// ============================================

/**
 * @route   GET /api/auth/profile
 * @desc    Obtener perfil del usuario autenticado
 * @access  Private
 */
router.get('/profile', authenticate, authController.getProfile);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Cambiar contraseña
 * @access  Private
 */
router.put('/change-password', authenticate, authController.changePassword);

/**
 * @route   POST /api/auth/validate
 * @desc    Validar sesión actual
 * @access  Private
 */
router.post('/validate', authenticate, authController.validateSession);

module.exports = router;
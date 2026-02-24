// ============================================
// CONTROLADOR DE AUTENTICACIÓN
// ============================================

const authService = require('../services/auth.service');
const { successResponse, errorResponse } = require('../utils/response');
const logger = require('../utils/logger');

class AuthController {
    
    // ============================================
    // POST /api/auth/login
    // ============================================
    async login(req, res) {
        try {
            const { email, password } = req.body;
            
            // Validaciones básicas
            if (!email || !password) {
                return errorResponse(res, 'Email y contraseña son requeridos', 400);
            }
            
            const result = await authService.login(email, password);
            
            if (!result.success) {
                return errorResponse(res, result.error, 401);
            }
            
            return successResponse(res, 'Login exitoso', result.data);
            
        } catch (error) {
            logger.error('Error en login:', error);
            return errorResponse(res, 'Error al procesar login', 500);
        }
    }
    
    // ============================================
    // GET /api/auth/profile
    // ============================================
    async getProfile(req, res) {
        try {
            const userId = req.user.id;
            
            const result = await authService.getProfile(userId);
            
            if (!result.success) {
                return errorResponse(res, result.error, 404);
            }
            
            return successResponse(res, 'Perfil obtenido', result.data);
            
        } catch (error) {
            logger.error('Error al obtener perfil:', error);
            return errorResponse(res, 'Error al obtener perfil', 500);
        }
    }
    
    // ============================================
    // PUT /api/auth/change-password
    // ============================================
    async changePassword(req, res) {
        try {
            const userId = req.user.id;
            const { currentPassword, newPassword } = req.body;
            
            // Validaciones
            if (!currentPassword || !newPassword) {
                return errorResponse(res, 'Contraseña actual y nueva son requeridas', 400);
            }
            
            if (newPassword.length < 6) {
                return errorResponse(res, 'La nueva contraseña debe tener al menos 6 caracteres', 400);
            }
            
            const result = await authService.changePassword(userId, currentPassword, newPassword);
            
            if (!result.success) {
                return errorResponse(res, result.error, 400);
            }
            
            return successResponse(res, result.message);
            
        } catch (error) {
            logger.error('Error al cambiar contraseña:', error);
            return errorResponse(res, 'Error al cambiar contraseña', 500);
        }
    }
    
    // ============================================
    // POST /api/auth/validate
    // ============================================
    async validateSession(req, res) {
        try {
            const userId = req.user.id;
            
            const result = await authService.validateSession(userId);
            
            if (!result.success) {
                return errorResponse(res, result.error, 401);
            }
            
            return successResponse(res, 'Sesión válida', { valid: true });
            
        } catch (error) {
            logger.error('Error al validar sesión:', error);
            return errorResponse(res, 'Error al validar sesión', 500);
        }
    }
}

module.exports = new AuthController();
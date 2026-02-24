// ============================================
// MIDDLEWARE DE AUTENTICACIÓN
// ============================================

const { verifyAccessToken } = require('../config/jwt');
const logger = require('../utils/logger');
const { errorResponse } = require('../utils/response');

// ============================================
// VERIFICAR TOKEN EN HEADERS
// ============================================
const authenticate = async (req, res, next) => {
    try {
        // Obtener token del header Authorization
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            return errorResponse(res, 'No se proporcionó token de autenticación', 401);
        }
        
        // Verificar formato: "Bearer TOKEN"
        const parts = authHeader.split(' ');
        
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return errorResponse(res, 'Formato de token inválido', 401);
        }
        
        const token = parts[1];
        
        // Verificar token
        const verification = verifyAccessToken(token);
        
        if (!verification.valid) {
            if (verification.expired) {
                return errorResponse(res, 'Token expirado', 401, { expired: true });
            }
            return errorResponse(res, verification.error, 401);
        }
        
        // Agregar datos del usuario al request
        req.user = verification.decoded;
        
        logger.debug('Usuario autenticado:', {
            id: req.user.id,
            email: req.user.email,
            rol: req.user.rol
        });
        
        next();
        
    } catch (error) {
        logger.error('Error en middleware de autenticación:', error);
        return errorResponse(res, 'Error en autenticación', 500);
    }
};

// ============================================
// AUTENTICACIÓN OPCIONAL (no falla si no hay token)
// ============================================
const optionalAuthenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            return next();
        }
        
        const parts = authHeader.split(' ');
        
        if (parts.length === 2 && parts[0] === 'Bearer') {
            const token = parts[1];
            const verification = verifyAccessToken(token);
            
            if (verification.valid) {
                req.user = verification.decoded;
            }
        }
        
        next();
        
    } catch (error) {
        logger.error('Error en autenticación opcional:', error);
        next();
    }
};

module.exports = {
    authenticate,
    optionalAuthenticate
};
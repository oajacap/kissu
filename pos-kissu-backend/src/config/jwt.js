// ============================================
// CONFIGURACIÓN JWT
// ============================================

const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_change_in_production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh_secret_change';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// ============================================
// GENERAR ACCESS TOKEN
// ============================================
const generateAccessToken = (payload) => {
    try {
        const token = jwt.sign(
            {
                id: payload.id,
                email: payload.email,
                rol: payload.rol,
                nombre: payload.nombre
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );
        
        return token;
    } catch (error) {
        logger.error('Error al generar access token:', error);
        throw new Error('Error al generar token de acceso');
    }
};

// ============================================
// GENERAR REFRESH TOKEN
// ============================================
const generateRefreshToken = (payload) => {
    try {
        const token = jwt.sign(
            { id: payload.id },
            JWT_REFRESH_SECRET,
            { expiresIn: JWT_REFRESH_EXPIRES_IN }
        );
        
        return token;
    } catch (error) {
        logger.error('Error al generar refresh token:', error);
        throw new Error('Error al generar token de refresco');
    }
};

// ============================================
// VERIFICAR TOKEN
// ============================================
const verifyAccessToken = (token) => {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return { valid: true, decoded };
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return { valid: false, expired: true, error: 'Token expirado' };
        }
        if (error.name === 'JsonWebTokenError') {
            return { valid: false, expired: false, error: 'Token inválido' };
        }
        return { valid: false, expired: false, error: error.message };
    }
};

// ============================================
// VERIFICAR REFRESH TOKEN
// ============================================
const verifyRefreshToken = (token) => {
    try {
        const decoded = jwt.verify(token, JWT_REFRESH_SECRET);
        return { valid: true, decoded };
    } catch (error) {
        return { valid: false, error: error.message };
    }
};

// ============================================
// DECODIFICAR TOKEN SIN VERIFICAR
// ============================================
const decodeToken = (token) => {
    try {
        return jwt.decode(token);
    } catch (error) {
        logger.error('Error al decodificar token:', error);
        return null;
    }
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    decodeToken
};
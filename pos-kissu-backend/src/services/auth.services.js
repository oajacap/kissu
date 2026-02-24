// ============================================
// SERVICIO DE AUTENTICACIÓN
// ============================================

const bcrypt = require('bcryptjs');
const { promisePool } = require('../config/database');
const { generateAccessToken, generateRefreshToken } = require('../config/jwt');
const logger = require('../utils/logger');

class AuthService {
    
    // ============================================
    // LOGIN DE USUARIO
    // ============================================
    async login(email, password) {
        try {
            // Buscar usuario por email
            const [users] = await promisePool.query(
                `SELECT id, nombre, email, password, rol, activo 
                 FROM usuarios 
                 WHERE email = ? AND activo = TRUE`,
                [email]
            );
            
            if (users.length === 0) {
                return {
                    success: false,
                    error: 'Credenciales incorrectas'
                };
            }
            
            const user = users[0];
            
            // Verificar contraseña
            // NOTA: Si las contraseñas en tu BD no están hasheadas,
            // usa comparación directa temporalmente
            let passwordMatch;
            
            if (user.password.startsWith('$2')) {
                // Contraseña hasheada con bcrypt
                passwordMatch = await bcrypt.compare(password, user.password);
            } else {
                // Contraseña en texto plano (temporal para migración)
                passwordMatch = password === user.password;
                
                // Opcional: Hashear la contraseña para próxima vez
                if (passwordMatch) {
                    const hashedPassword = await bcrypt.hash(password, 10);
                    await promisePool.query(
                        'UPDATE usuarios SET password = ? WHERE id = ?',
                        [hashedPassword, user.id]
                    );
                }
            }
            
            if (!passwordMatch) {
                return {
                    success: false,
                    error: 'Credenciales incorrectas'
                };
            }
            
            // Generar tokens
            const payload = {
                id: user.id,
                email: user.email,
                rol: user.rol,
                nombre: user.nombre
            };
            
            const accessToken = generateAccessToken(payload);
            const refreshToken = generateRefreshToken(payload);
            
            // Registrar último login
            await promisePool.query(
                'UPDATE usuarios SET fecha_ultimo_login = NOW() WHERE id = ?',
                [user.id]
            );
            
            // Agregar campo de último login si no existe
            await promisePool.query(
                `ALTER TABLE usuarios 
                 ADD COLUMN IF NOT EXISTS fecha_ultimo_login TIMESTAMP NULL`
            ).catch(() => {
                // Ignorar si la columna ya existe
            });
            
            logger.info(`Usuario autenticado: ${user.email} (${user.rol})`);
            
            return {
                success: true,
                data: {
                    user: {
                        id: user.id,
                        nombre: user.nombre,
                        email: user.email,
                        rol: user.rol
                    },
                    accessToken,
                    refreshToken
                }
            };
            
        } catch (error) {
            logger.error('Error en login:', error);
            return {
                success: false,
                error: 'Error al procesar login'
            };
        }
    }
    
    // ============================================
    // OBTENER PERFIL DE USUARIO
    // ============================================
    async getProfile(userId) {
        try {
            const [users] = await promisePool.query(
                `SELECT id, nombre, email, rol, activo, fecha_creacion, fecha_ultimo_login
                 FROM usuarios 
                 WHERE id = ?`,
                [userId]
            );
            
            if (users.length === 0) {
                return {
                    success: false,
                    error: 'Usuario no encontrado'
                };
            }
            
            return {
                success: true,
                data: users[0]
            };
            
        } catch (error) {
            logger.error('Error al obtener perfil:', error);
            return {
                success: false,
                error: 'Error al obtener perfil'
            };
        }
    }
    
    // ============================================
    // CAMBIAR CONTRASEÑA
    // ============================================
    async changePassword(userId, currentPassword, newPassword) {
        try {
            // Obtener usuario
            const [users] = await promisePool.query(
                'SELECT password FROM usuarios WHERE id = ?',
                [userId]
            );
            
            if (users.length === 0) {
                return {
                    success: false,
                    error: 'Usuario no encontrado'
                };
            }
            
            const user = users[0];
            
            // Verificar contraseña actual
            let passwordMatch;
            if (user.password.startsWith('$2')) {
                passwordMatch = await bcrypt.compare(currentPassword, user.password);
            } else {
                passwordMatch = currentPassword === user.password;
            }
            
            if (!passwordMatch) {
                return {
                    success: false,
                    error: 'Contraseña actual incorrecta'
                };
            }
            
            // Hashear nueva contraseña
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            
            // Actualizar contraseña
            await promisePool.query(
                'UPDATE usuarios SET password = ? WHERE id = ?',
                [hashedPassword, userId]
            );
            
            logger.info(`Contraseña cambiada para usuario ID: ${userId}`);
            
            return {
                success: true,
                message: 'Contraseña actualizada correctamente'
            };
            
        } catch (error) {
            logger.error('Error al cambiar contraseña:', error);
            return {
                success: false,
                error: 'Error al cambiar contraseña'
            };
        }
    }
    
    // ============================================
    // VALIDAR SESIÓN
    // ============================================
    async validateSession(userId) {
        try {
            const [users] = await promisePool.query(
                'SELECT id, activo FROM usuarios WHERE id = ?',
                [userId]
            );
            
            if (users.length === 0 || !users[0].activo) {
                return {
                    success: false,
                    error: 'Sesión inválida'
                };
            }
            
            return {
                success: true
            };
            
        } catch (error) {
            logger.error('Error al validar sesión:', error);
            return {
                success: false,
                error: 'Error al validar sesión'
            };
        }
    }
}

module.exports = new AuthService();
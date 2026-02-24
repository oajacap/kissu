// ============================================
// MIDDLEWARE DE ROLES Y PERMISOS
// ============================================

const logger = require('../utils/logger');
const { errorResponse } = require('../utils/response');

// Definición de roles y sus jerarquías
const ROLES = {
    ADMIN: 'admin',
    SUPERVISOR: 'supervisor',
    CAJERO: 'cajero'
};

// Jerarquía de roles (de mayor a menor)
const ROLE_HIERARCHY = {
    admin: 3,
    supervisor: 2,
    cajero: 1
};

// Permisos por rol
const PERMISSIONS = {
    admin: [
        'usuarios.crear',
        'usuarios.editar',
        'usuarios.eliminar',
        'usuarios.listar',
        'productos.crear',
        'productos.editar',
        'productos.eliminar',
        'productos.listar',
        'ventas.crear',
        'ventas.listar',
        'ventas.anular',
        'caja.abrir',
        'caja.cerrar',
        'caja.cuadre',
        'inventario.entrada',
        'inventario.salida',
        'inventario.ajuste',
        'reportes.ventas',
        'reportes.caja',
        'reportes.inventario',
        'configuracion.editar'
    ],
    supervisor: [
        'productos.crear',
        'productos.editar',
        'productos.listar',
        'ventas.crear',
        'ventas.listar',
        'ventas.anular',
        'caja.abrir',
        'caja.cerrar',
        'caja.cuadre',
        'inventario.entrada',
        'inventario.salida',
        'reportes.ventas',
        'reportes.caja'
    ],
    cajero: [
        'productos.listar',
        'ventas.crear',
        'ventas.listar',
        'caja.abrir',
        'caja.cerrar'
    ]
};

// ============================================
// VERIFICAR SI USUARIO TIENE ROL
// ============================================
const hasRole = (...allowedRoles) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                return errorResponse(res, 'Usuario no autenticado', 401);
            }
            
            const userRole = req.user.rol;
            
            if (!userRole) {
                logger.error('Usuario sin rol definido:', req.user);
                return errorResponse(res, 'Usuario sin rol asignado', 403);
            }
            
            // Verificar si el usuario tiene alguno de los roles permitidos
            if (allowedRoles.includes(userRole)) {
                return next();
            }
            
            logger.warn('Acceso denegado por rol:', {
                usuario: req.user.email,
                rolUsuario: userRole,
                rolesPermitidos: allowedRoles
            });
            
            return errorResponse(res, 'No tienes permisos para realizar esta acción', 403);
            
        } catch (error) {
            logger.error('Error en middleware de roles:', error);
            return errorResponse(res, 'Error al verificar permisos', 500);
        }
    };
};

// ============================================
// VERIFICAR SI USUARIO TIENE JERARQUÍA MÍNIMA
// ============================================
const requireMinRole = (minRole) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                return errorResponse(res, 'Usuario no autenticado', 401);
            }
            
            const userRole = req.user.rol;
            const userHierarchy = ROLE_HIERARCHY[userRole] || 0;
            const minHierarchy = ROLE_HIERARCHY[minRole] || 0;
            
            if (userHierarchy >= minHierarchy) {
                return next();
            }
            
            logger.warn('Acceso denegado por jerarquía:', {
                usuario: req.user.email,
                rolUsuario: userRole,
                rolMinimo: minRole
            });
            
            return errorResponse(res, 'No tienes el nivel de permisos requerido', 403);
            
        } catch (error) {
            logger.error('Error en middleware de jerarquía:', error);
            return errorResponse(res, 'Error al verificar permisos', 500);
        }
    };
};

// ============================================
// VERIFICAR PERMISO ESPECÍFICO
// ============================================
const hasPermission = (permission) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                return errorResponse(res, 'Usuario no autenticado', 401);
            }
            
            const userRole = req.user.rol;
            const userPermissions = PERMISSIONS[userRole] || [];
            
            if (userPermissions.includes(permission)) {
                return next();
            }
            
            logger.warn('Acceso denegado por permiso:', {
                usuario: req.user.email,
                permisoRequerido: permission,
                rolUsuario: userRole
            });
            
            return errorResponse(res, `No tienes permiso: ${permission}`, 403);
            
        } catch (error) {
            logger.error('Error en middleware de permisos:', error);
            return errorResponse(res, 'Error al verificar permisos', 500);
        }
    };
};

// ============================================
// VERIFICAR SI ES ADMIN
// ============================================
const isAdmin = hasRole(ROLES.ADMIN);

// ============================================
// VERIFICAR SI ES ADMIN O SUPERVISOR
// ============================================
const isAdminOrSupervisor = hasRole(ROLES.ADMIN, ROLES.SUPERVISOR);

module.exports = {
    ROLES,
    PERMISSIONS,
    hasRole,
    requireMinRole,
    hasPermission,
    isAdmin,
    isAdminOrSupervisor
};
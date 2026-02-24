// ============================================
// UTILIDADES DE RESPUESTA ESTANDARIZADAS
// ============================================

/**
 * Respuesta exitosa
 */
const successResponse = (res, message, data = null, statusCode = 200) => {
    const response = {
        success: true,
        message,
        data,
        timestamp: new Date().toISOString()
    };
    
    return res.status(statusCode).json(response);
};

/**
 * Respuesta de error
 */
const errorResponse = (res, message, statusCode = 500, details = null) => {
    const response = {
        success: false,
        error: message,
        details,
        timestamp: new Date().toISOString()
    };
    
    return res.status(statusCode).json(response);
};

/**
 * Respuesta con paginación
 */
const paginatedResponse = (res, data, page, limit, total, message = 'Datos obtenidos') => {
    const totalPages = Math.ceil(total / limit);
    
    const response = {
        success: true,
        message,
        data,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        },
        timestamp: new Date().toISOString()
    };
    
    return res.status(200).json(response);
};

/**
 * Respuesta de validación
 */
const validationErrorResponse = (res, errors) => {
    const response = {
        success: false,
        error: 'Errores de validación',
        errors: errors.map(err => ({
            field: err.param || err.path,
            message: err.msg || err.message
        })),
        timestamp: new Date().toISOString()
    };
    
    return res.status(422).json(response);
};

/**
 * Respuesta de recurso no encontrado
 */
const notFoundResponse = (res, resource = 'Recurso') => {
    return errorResponse(res, `${resource} no encontrado`, 404);
};

/**
 * Respuesta de recurso creado
 */
const createdResponse = (res, message, data = null) => {
    return successResponse(res, message, data, 201);
};

/**
 * Respuesta sin contenido
 */
const noContentResponse = (res) => {
    return res.status(204).send();
};

module.exports = {
    successResponse,
    errorResponse,
    paginatedResponse,
    validationErrorResponse,
    notFoundResponse,
    createdResponse,
    noContentResponse
};
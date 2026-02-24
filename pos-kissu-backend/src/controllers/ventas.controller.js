// ============================================
// CONTROLADOR DE VENTAS
// ============================================

const ventasService = require('../services/ventas.service');
const { successResponse, errorResponse, createdResponse } = require('../utils/response');
const logger = require('../utils/logger');

class VentasController {
    
    // POST /api/ventas
    async create(req, res) {
        try {
            const ventaData = req.body;
            const userId = req.user.id;
            
            // Validaciones básicas
            if (!ventaData.productos || ventaData.productos.length === 0) {
                return errorResponse(res, 'Debe incluir al menos un producto', 400);
            }
            
            if (!ventaData.total || ventaData.total <= 0) {
                return errorResponse(res, 'El total debe ser mayor a cero', 400);
            }
            
            if (!ventaData.monto_recibido || ventaData.monto_recibido < ventaData.total) {
                return errorResponse(res, 'El monto recibido es insuficiente', 400);
            }
            
            const result = await ventasService.create(ventaData, userId);
            
            if (!result.success) {
                return errorResponse(res, result.error, 400);
            }
            
            return createdResponse(res, 'Venta registrada exitosamente', result.data);
            
        } catch (error) {
            logger.error('Error al crear venta:', error);
            return errorResponse(res, 'Error al procesar venta', 500);
        }
    }
    
    // GET /api/ventas/:id
    async getById(req, res) {
        try {
            const { id } = req.params;
            
            const result = await ventasService.getById(id);
            
            if (!result.success) {
                return errorResponse(res, result.error, 404);
            }
            
            return successResponse(res, 'Venta obtenida', result.data);
            
        } catch (error) {
            logger.error('Error al obtener venta:', error);
            return errorResponse(res, 'Error al obtener venta', 500);
        }
    }
    
    // GET /api/ventas
    async getAll(req, res) {
        try {
            const filters = {
                fecha_inicio: req.query.fecha_inicio,
                fecha_fin: req.query.fecha_fin,
                usuario_id: req.query.usuario_id,
                cliente_id: req.query.cliente_id,
                numero_factura: req.query.numero_factura,
                limit: req.query.limit || 50,
                offset: req.query.offset || 0
            };
            
            const result = await ventasService.getAll(filters);
            
            if (!result.success) {
                return errorResponse(res, result.error, 500);
            }
            
            return successResponse(res, 'Ventas obtenidas', result.data);
            
        } catch (error) {
            logger.error('Error al obtener ventas:', error);
            return errorResponse(res, 'Error al obtener ventas', 500);
        }
    }
    
    // PUT /api/ventas/:id/anular
    async anular(req, res) {
        try {
            const { id } = req.params;
            const { motivo } = req.body;
            const userId = req.user.id;
            
            if (!motivo) {
                return errorResponse(res, 'Debe especificar el motivo de anulación', 400);
            }
            
            const result = await ventasService.anular(id, userId, motivo);
            
            if (!result.success) {
                return errorResponse(res, result.error, 400);
            }
            
            return successResponse(res, 'Venta anulada correctamente', result.data);
            
        } catch (error) {
            logger.error('Error al anular venta:', error);
            return errorResponse(res, 'Error al anular venta', 500);
        }
    }
    
    // GET /api/ventas/hoy
    async getVentasHoy(req, res) {
        try {
            const usuarioId = req.query.usuario_id || null;
            
            const result = await ventasService.getVentasHoy(usuarioId);
            
            if (!result.success) {
                return errorResponse(res, result.error, 500);
            }
            
            return successResponse(res, 'Ventas del día obtenidas', result.data);
            
        } catch (error) {
            logger.error('Error al obtener ventas del día:', error);
            return errorResponse(res, 'Error al obtener ventas del día', 500);
        }
    }
}

module.exports = new VentasController();
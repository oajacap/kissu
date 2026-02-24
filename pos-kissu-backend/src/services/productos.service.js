// ============================================
// SERVICIO DE PRODUCTOS
// ============================================

const { promisePool } = require('../config/database');
const logger = require('../utils/logger');

class ProductosService {
    
    // ============================================
    // OBTENER TODOS LOS PRODUCTOS
    // ============================================
    async getAll(filters = {}) {
        try {
            let query = `
                SELECT p.*, c.nombre as categoria_nombre 
                FROM productos p 
                LEFT JOIN categorias c ON p.categoria_id = c.id 
                WHERE p.activo = TRUE
            `;
            const params = [];
            
            // Filtros opcionales
            if (filters.categoria_id) {
                query += ' AND p.categoria_id = ?';
                params.push(filters.categoria_id);
            }
            
            if (filters.search) {
                query += ' AND (p.nombre LIKE ? OR p.codigo LIKE ?)';
                params.push(`%${filters.search}%`, `%${filters.search}%`);
            }
            
            if (filters.bajo_stock) {
                query += ' AND p.stock_actual <= p.stock_minimo';
            }
            
            query += ' ORDER BY p.nombre ASC';
            
            const [productos] = await promisePool.query(query, params);
            
            return {
                success: true,
                data: productos
            };
            
        } catch (error) {
            logger.error('Error al obtener productos:', error);
            return {
                success: false,
                error: 'Error al obtener productos'
            };
        }
    }
    
    // ============================================
    // OBTENER PRODUCTO POR ID
    // ============================================
    async getById(id) {
        try {
            const [productos] = await promisePool.query(
                `SELECT p.*, c.nombre as categoria_nombre 
                 FROM productos p 
                 LEFT JOIN categorias c ON p.categoria_id = c.id 
                 WHERE p.id = ? AND p.activo = TRUE`,
                [id]
            );
            
            if (productos.length === 0) {
                return {
                    success: false,
                    error: 'Producto no encontrado'
                };
            }
            
            return {
                success: true,
                data: productos[0]
            };
            
        } catch (error) {
            logger.error('Error al obtener producto:', error);
            return {
                success: false,
                error: 'Error al obtener producto'
            };
        }
    }
    
    // ============================================
    // CREAR PRODUCTO
    // ============================================
    async create(productData) {
        try {
            const {
                codigo,
                nombre,
                descripcion,
                categoria_id,
                precio_compra,
                precio_venta,
                stock_minimo
            } = productData;
            
            // Verificar si el código ya existe
            const [existing] = await promisePool.query(
                'SELECT id FROM productos WHERE codigo = ?',
                [codigo]
            );
            
            if (existing.length > 0) {
                return {
                    success: false,
                    error: 'El código de producto ya existe'
                };
            }
            
            const [result] = await promisePool.query(
                `INSERT INTO productos 
                 (codigo, nombre, descripcion, categoria_id, precio_compra, precio_venta, stock_minimo, stock_actual) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
                [codigo, nombre, descripcion || '', categoria_id || null, precio_compra, precio_venta, stock_minimo || 5]
            );
            
            logger.info(`Producto creado: ${nombre} (ID: ${result.insertId})`);
            
            return {
                success: true,
                data: {
                    id: result.insertId,
                    ...productData
                }
            };
            
        } catch (error) {
            logger.error('Error al crear producto:', error);
            return {
                success: false,
                error: 'Error al crear producto'
            };
        }
    }
    
    // ============================================
    // ACTUALIZAR PRODUCTO
    // ============================================
    async update(id, productData) {
        try {
            const {
                nombre,
                descripcion,
                categoria_id,
                precio_compra,
                precio_venta,
                stock_minimo
            } = productData;
            
            const [result] = await promisePool.query(
                `UPDATE productos 
                 SET nombre = ?, descripcion = ?, categoria_id = ?, 
                     precio_compra = ?, precio_venta = ?, stock_minimo = ? 
                 WHERE id = ? AND activo = TRUE`,
                [nombre, descripcion, categoria_id, precio_compra, precio_venta, stock_minimo, id]
            );
            
            if (result.affectedRows === 0) {
                return {
                    success: false,
                    error: 'Producto no encontrado'
                };
            }
            
            logger.info(`Producto actualizado: ID ${id}`);
            
            return {
                success: true,
                message: 'Producto actualizado correctamente'
            };
            
        } catch (error) {
            logger.error('Error al actualizar producto:', error);
            return {
                success: false,
                error: 'Error al actualizar producto'
            };
        }
    }
    
    // ============================================
    // ELIMINAR PRODUCTO (SOFT DELETE)
    // ============================================
    async delete(id) {
        try {
            const [result] = await promisePool.query(
                'UPDATE productos SET activo = FALSE WHERE id = ?',
                [id]
            );
            
            if (result.affectedRows === 0) {
                return {
                    success: false,
                    error: 'Producto no encontrado'
                };
            }
            
            logger.info(`Producto eliminado: ID ${id}`);
            
            return {
                success: true,
                message: 'Producto eliminado correctamente'
            };
            
        } catch (error) {
            logger.error('Error al eliminar producto:', error);
            return {
                success: false,
                error: 'Error al eliminar producto'
            };
        }
    }
    
    // ============================================
    // VERIFICAR STOCK DISPONIBLE
    // ============================================
    async checkStock(productoId, cantidad) {
        try {
            const [productos] = await promisePool.query(
                'SELECT stock_actual FROM productos WHERE id = ? AND activo = TRUE',
                [productoId]
            );
            
            if (productos.length === 0) {
                return {
                    success: false,
                    error: 'Producto no encontrado'
                };
            }
            
            const stockDisponible = productos[0].stock_actual >= cantidad;
            
            return {
                success: true,
                data: {
                    disponible: stockDisponible,
                    stock_actual: productos[0].stock_actual,
                    cantidad_solicitada: cantidad
                }
            };
            
        } catch (error) {
            logger.error('Error al verificar stock:', error);
            return {
                success: false,
                error: 'Error al verificar stock'
            };
        }
    }
}

module.exports = new ProductosService();
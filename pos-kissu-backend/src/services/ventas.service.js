// ============================================
// SERVICIO DE VENTAS -核心 POS
// ============================================

const { promisePool, executeTransaction } = require('../config/database');
const logger = require('../utils/logger');

class VentasService {
    
    // ============================================
    // CREAR VENTA COMPLETA (TRANSACCIÓN ATÓMICA)
    // ============================================
    async create(ventaData, userId) {
        const result = await executeTransaction(async (connection) => {
            const {
                cliente_id = 1, // Cliente por defecto "Consumidor Final"
                productos,
                subtotal,
                descuento = 0,
                total,
                monto_recibido,
                metodo_pago = 'efectivo',
                notas
            } = ventaData;
            
            // Validar que haya productos
            if (!productos || productos.length === 0) {
                throw new Error('La venta debe tener al menos un producto');
            }
            
            // Validar montos
            if (monto_recibido < total) {
                throw new Error('El monto recibido es insuficiente');
            }
            
            // ============================================
            // 1. VERIFICAR STOCK DE TODOS LOS PRODUCTOS
            // ============================================
            for (const item of productos) {
                const [producto] = await connection.query(
                    'SELECT stock_actual, nombre FROM productos WHERE id = ? AND activo = TRUE',
                    [item.producto_id]
                );
                
                if (producto.length === 0) {
                    throw new Error(`Producto ID ${item.producto_id} no encontrado`);
                }
                
                if (producto[0].stock_actual < item.cantidad) {
                    throw new Error(
                        `Stock insuficiente para ${producto[0].nombre}. ` +
                        `Disponible: ${producto[0].stock_actual}, Solicitado: ${item.cantidad}`
                    );
                }
            }
            
            // ============================================
            // 2. GENERAR NÚMERO DE FACTURA
            // ============================================
            const [lastVenta] = await connection.query(
                'SELECT MAX(id) as ultimo FROM ventas'
            );
            const nextId = (lastVenta[0].ultimo || 0) + 1;
            const numeroFactura = `F-${String(nextId).padStart(8, '0')}`;
            
            // ============================================
            // 3. CALCULAR CAMBIO
            // ============================================
            const cambio = parseFloat((monto_recibido - total).toFixed(2));
            
            // ============================================
            // 4. INSERTAR VENTA
            // ============================================
            const [ventaResult] = await connection.query(
                `INSERT INTO ventas 
                 (numero_factura, cliente_id, fecha_venta, subtotal, descuento, total, 
                  monto_recibido, cambio, metodo_pago, notas, usuario_id) 
                 VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    numeroFactura,
                    cliente_id,
                    subtotal,
                    descuento,
                    total,
                    monto_recibido,
                    cambio,
                    metodo_pago,
                    notas || null,
                    userId
                ]
            );
            
            const ventaId = ventaResult.insertId;
            
            // ============================================
            // 5. INSERTAR DETALLES Y ACTUALIZAR STOCK
            // ============================================
            for (const item of productos) {
                // Insertar detalle de venta
                await connection.query(
                    `INSERT INTO detalle_ventas 
                     (venta_id, producto_id, cantidad, precio_unitario, subtotal) 
                     VALUES (?, ?, ?, ?, ?)`,
                    [
                        ventaId,
                        item.producto_id,
                        item.cantidad,
                        item.precio_unitario,
                        item.subtotal
                    ]
                );
                
                // Reducir stock del producto
                await connection.query(
                    'UPDATE productos SET stock_actual = stock_actual - ? WHERE id = ?',
                    [item.cantidad, item.producto_id]
                );
                
                // Registrar movimiento de inventario
                await connection.query(
                    `INSERT INTO movimientos_inventario 
                     (producto_id, tipo_movimiento, cantidad, motivo, usuario_id, fecha_movimiento) 
                     VALUES (?, 'salida', ?, ?, ?, NOW())`,
                    [
                        item.producto_id,
                        item.cantidad,
                        `Venta ${numeroFactura}`,
                        userId
                    ]
                );
            }
            
            // ============================================
            // 6. ACTUALIZAR CUADRE DE CAJA
            // ============================================
            const [cajaAbierta] = await connection.query(
                `SELECT id FROM cuadre_caja 
                 WHERE estado = 'abierta' 
                 ORDER BY fecha_apertura DESC 
                 LIMIT 1`
            );
            
            if (cajaAbierta.length > 0) {
                await connection.query(
                    `UPDATE cuadre_caja 
                     SET total_ventas = total_ventas + ? 
                     WHERE id = ?`,
                    [total, cajaAbierta[0].id]
                );
            }
            
            // ============================================
            // 7. RETORNAR DATOS DE LA VENTA
            // ============================================
            logger.info(`Venta creada: ${numeroFactura} - Total: Q${total}`, {
                usuario: userId,
                productos: productos.length,
                total
            });
            
            return {
                venta_id: ventaId,
                numero_factura: numeroFactura,
                total,
                cambio,
                fecha: new Date().toISOString()
            };
        });
        
        return result;
    }
    
    // ============================================
    // OBTENER VENTA POR ID
    // ============================================
    async getById(id) {
        try {
            // Obtener venta principal
            const [ventas] = await promisePool.query(
                `SELECT v.*, c.nombre as cliente_nombre, c.nit, u.nombre as usuario_nombre
                 FROM ventas v
                 LEFT JOIN clientes c ON v.cliente_id = c.id
                 LEFT JOIN usuarios u ON v.usuario_id = u.id
                 WHERE v.id = ?`,
                [id]
            );
            
            if (ventas.length === 0) {
                return {
                    success: false,
                    error: 'Venta no encontrada'
                };
            }
            
            const venta = ventas[0];
            
            // Obtener detalles de la venta
            const [detalles] = await promisePool.query(
                `SELECT dv.*, p.nombre as producto_nombre, p.codigo
                 FROM detalle_ventas dv
                 JOIN productos p ON dv.producto_id = p.id
                 WHERE dv.venta_id = ?`,
                [id]
            );
            
            venta.detalles = detalles;
            
            return {
                success: true,
                data: venta
            };
            
        } catch (error) {
            logger.error('Error al obtener venta:', error);
            return {
                success: false,
                error: 'Error al obtener venta'
            };
        }
    }
    
    // ============================================
    // LISTAR VENTAS CON FILTROS
    // ============================================
    async getAll(filters = {}) {
        try {
            let query = `
                SELECT v.*, c.nombre as cliente_nombre, u.nombre as usuario_nombre
                FROM ventas v
                LEFT JOIN clientes c ON v.cliente_id = c.id
                LEFT JOIN usuarios u ON v.usuario_id = u.id
                WHERE 1=1
            `;
            const params = [];
            
            // Filtro por fecha
            if (filters.fecha_inicio && filters.fecha_fin) {
                query += ' AND DATE(v.fecha_venta) BETWEEN ? AND ?';
                params.push(filters.fecha_inicio, filters.fecha_fin);
            }
            
            // Filtro por usuario
            if (filters.usuario_id) {
                query += ' AND v.usuario_id = ?';
                params.push(filters.usuario_id);
            }
            
            // Filtro por cliente
            if (filters.cliente_id) {
                query += ' AND v.cliente_id = ?';
                params.push(filters.cliente_id);
            }
            
            // Filtro por número de factura
            if (filters.numero_factura) {
                query += ' AND v.numero_factura LIKE ?';
                params.push(`%${filters.numero_factura}%`);
            }
            
            query += ' ORDER BY v.fecha_venta DESC';
            
            // Paginación
            if (filters.limit) {
                query += ' LIMIT ?';
                params.push(parseInt(filters.limit));
                
                if (filters.offset) {
                    query += ' OFFSET ?';
                    params.push(parseInt(filters.offset));
                }
            }
            
            const [ventas] = await promisePool.query(query, params);
            
            return {
                success: true,
                data: ventas
            };
            
        } catch (error) {
            logger.error('Error al obtener ventas:', error);
            return {
                success: false,
                error: 'Error al obtener ventas'
            };
        }
    }
    
    // ============================================
    // ANULAR VENTA (SOLO ADMIN/SUPERVISOR)
    // ============================================
    async anular(ventaId, userId, motivo) {
        const result = await executeTransaction(async (connection) => {
            // Obtener venta
            const [ventas] = await connection.query(
                'SELECT * FROM ventas WHERE id = ?',
                [ventaId]
            );
            
            if (ventas.length === 0) {
                throw new Error('Venta no encontrada');
            }
            
            const venta = ventas[0];
            
            // Verificar si ya está anulada
            if (venta.anulada) {
                throw new Error('La venta ya está anulada');
            }
            
            // Obtener detalles de la venta
            const [detalles] = await connection.query(
                'SELECT * FROM detalle_ventas WHERE venta_id = ?',
                [ventaId]
            );
            
            // Devolver stock a los productos
            for (const detalle of detalles) {
                await connection.query(
                    'UPDATE productos SET stock_actual = stock_actual + ? WHERE id = ?',
                    [detalle.cantidad, detalle.producto_id]
                );
                
                // Registrar movimiento
                await connection.query(
                    `INSERT INTO movimientos_inventario 
                     (producto_id, tipo_movimiento, cantidad, motivo, usuario_id) 
                     VALUES (?, 'entrada', ?, ?, ?)`,
                    [
                        detalle.producto_id,
                        detalle.cantidad,
                        `Anulación venta ${venta.numero_factura}: ${motivo}`,
                        userId
                    ]
                );
            }
            
            // Marcar venta como anulada
            await connection.query(
                `UPDATE ventas 
                 SET anulada = TRUE, motivo_anulacion = ?, fecha_anulacion = NOW(), usuario_anulacion = ?
                 WHERE id = ?`,
                [motivo, userId, ventaId]
            );
            
            // Actualizar cuadre de caja
            const [cajaAbierta] = await connection.query(
                `SELECT id FROM cuadre_caja 
                 WHERE estado = 'abierta' 
                 ORDER BY fecha_apertura DESC 
                 LIMIT 1`
            );
            
            if (cajaAbierta.length > 0) {
                await connection.query(
                    `UPDATE cuadre_caja 
                     SET total_ventas = total_ventas - ? 
                     WHERE id = ?`,
                    [venta.total, cajaAbierta[0].id]
                );
            }
            
            logger.warn(`Venta anulada: ${venta.numero_factura}`, {
                usuario: userId,
                motivo
            });
            
            return {
                mensaje: 'Venta anulada correctamente'
            };
        });
        
        return result;
    }
    
    // ============================================
    // OBTENER VENTAS DEL DÍA
    // ============================================
    async getVentasHoy(usuarioId = null) {
        try {
            let query = `
                SELECT v.*, COUNT(dv.id) as total_items
                FROM ventas v
                LEFT JOIN detalle_ventas dv ON v.id = dv.venta_id
                WHERE DATE(v.fecha_venta) = CURDATE()
                AND (v.anulada IS NULL OR v.anulada = FALSE)
            `;
            const params = [];
            
            if (usuarioId) {
                query += ' AND v.usuario_id = ?';
                params.push(usuarioId);
            }
            
            query += ' GROUP BY v.id ORDER BY v.fecha_venta DESC';
            
            const [ventas] = await promisePool.query(query, params);
            
            // Calcular totales
            const totalVentas = ventas.reduce((sum, v) => sum + parseFloat(v.total), 0);
            const cantidadVentas = ventas.length;
            
            return {
                success: true,
                data: {
                    ventas,
                    totales: {
                        cantidad: cantidadVentas,
                        total: totalVentas,
                        promedio: cantidadVentas > 0 ? totalVentas / cantidadVentas : 0
                    }
                }
            };
            
        } catch (error) {
            logger.error('Error al obtener ventas del día:', error);
            return {
                success: false,
                error: 'Error al obtener ventas del día'
            };
        }
    }
}

module.exports = new VentasService();
// ============================================
// SERVICIO DE CONTROL DE CAJA
// ============================================

const { promisePool, executeTransaction } = require('../config/database');
const logger = require('../utils/logger');

class CajaService {
    
    // ============================================
    // ABRIR CAJA
    // ============================================
    async abrirCaja(montoInicial, usuarioId, notas = null) {
        const result = await executeTransaction(async (connection) => {
            // Verificar si ya hay una caja abierta
            const [cajaAbierta] = await connection.query(
                `SELECT id, fecha_apertura, usuario_id 
                 FROM cuadre_caja 
                 WHERE estado = 'abierta'`
            );
            
            if (cajaAbierta.length > 0) {
                throw new Error('Ya existe una caja abierta');
            }
            
            // Insertar nueva caja
            const [result] = await connection.query(
                `INSERT INTO cuadre_caja 
                 (fecha_apertura, monto_inicial, total_ventas, total_gastos, usuario_id, estado, notas_apertura) 
                 VALUES (NOW(), ?, 0, 0, ?, 'abierta', ?)`,
                [montoInicial, usuarioId, notas]
            );
            
            logger.info(`Caja abierta por usuario ${usuarioId}`, {
                caja_id: result.insertId,
                monto_inicial: montoInicial
            });
            
            return {
                caja_id: result.insertId,
                fecha_apertura: new Date(),
                monto_inicial: montoInicial
            };
        });
        
        return result;
    }
    
    // ============================================
    // CERRAR CAJA
    // ============================================
    async cerrarCaja(montoFinal, usuarioId, notas = null) {
        const result = await executeTransaction(async (connection) => {
            // Obtener caja abierta
            const [cajas] = await connection.query(
                `SELECT * FROM cuadre_caja 
                 WHERE estado = 'abierta' 
                 ORDER BY fecha_apertura DESC 
                 LIMIT 1`
            );
            
            if (cajas.length === 0) {
                throw new Error('No hay caja abierta');
            }
            
            const caja = cajas[0];
            
            // Calcular monto esperado
            const montoEsperado = parseFloat(caja.monto_inicial) + 
                                parseFloat(caja.total_ventas) - 
                                parseFloat(caja.total_gastos);
            
            // Calcular diferencia
            const diferencia = parseFloat(montoFinal) - montoEsperado;
            
            // Actualizar caja
            await connection.query(
                `UPDATE cuadre_caja 
                 SET fecha_cierre = NOW(), 
                     monto_final = ?, 
                     diferencia = ?, 
                     estado = 'cerrada',
                     notas_cierre = ?,
                     usuario_cierre = ?
                 WHERE id = ?`,
                [montoFinal, diferencia, notas, usuarioId, caja.id]
            );
            
            logger.info(`Caja cerrada por usuario ${usuarioId}`, {
                caja_id: caja.id,
                monto_esperado: montoEsperado,
                monto_final: montoFinal,
                diferencia
            });
            
            return {
                caja_id: caja.id,
                monto_inicial: caja.monto_inicial,
                total_ventas: caja.total_ventas,
                total_gastos: caja.total_gastos,
                monto_esperado: montoEsperado.toFixed(2),
                monto_final: parseFloat(montoFinal).toFixed(2),
                diferencia: diferencia.toFixed(2),
                fecha_cierre: new Date()
            };
        });
        
        return result;
    }
    
    // ============================================
    // OBTENER ESTADO DE CAJA ACTUAL
    // ============================================
    async getEstado() {
        try {
            const [cajas] = await promisePool.query(
                `SELECT c.*, u.nombre as usuario_nombre
                 FROM cuadre_caja c
                 LEFT JOIN usuarios u ON c.usuario_id = u.id
                 WHERE c.estado = 'abierta'
                 ORDER BY c.fecha_apertura DESC
                 LIMIT 1`
            );
            
            if (cajas.length === 0) {
                return {
                    success: true,
                    data: {
                        abierta: false
                    }
                };
            }
            
            const caja = cajas[0];
            
            // Calcular monto esperado actual
            const montoEsperado = parseFloat(caja.monto_inicial) + 
                                parseFloat(caja.total_ventas) - 
                                parseFloat(caja.total_gastos);
            
            return {
                success: true,
                data: {
                    abierta: true,
                    caja_id: caja.id,
                    fecha_apertura: caja.fecha_apertura,
                    monto_inicial: parseFloat(caja.monto_inicial),
                    total_ventas: parseFloat(caja.total_ventas),
                    total_gastos: parseFloat(caja.total_gastos),
                    monto_esperado: montoEsperado.toFixed(2),
                    usuario_nombre: caja.usuario_nombre,
                    notas_apertura: caja.notas_apertura
                }
            };
            
        } catch (error) {
            logger.error('Error al obtener estado de caja:', error);
            return {
                success: false,
                error: 'Error al obtener estado de caja'
            };
        }
    }
    
    // ============================================
    // OBTENER HISTORIAL DE CUADRES
    // ============================================
    async getHistorial(filters = {}) {
        try {
            let query = `
                SELECT c.*, 
                       u.nombre as usuario_apertura,
                       uc.nombre as usuario_cierre
                FROM cuadre_caja c
                LEFT JOIN usuarios u ON c.usuario_id = u.id
                LEFT JOIN usuarios uc ON c.usuario_cierre = uc.id
                WHERE 1=1
            `;
            const params = [];
            
            if (filters.fecha_inicio && filters.fecha_fin) {
                query += ' AND DATE(c.fecha_apertura) BETWEEN ? AND ?';
                params.push(filters.fecha_inicio, filters.fecha_fin);
            }
            
            if (filters.usuario_id) {
                query += ' AND c.usuario_id = ?';
                params.push(filters.usuario_id);
            }
            
            if (filters.estado) {
                query += ' AND c.estado = ?';
                params.push(filters.estado);
            }
            
            query += ' ORDER BY c.fecha_apertura DESC';
            
            if (filters.limit) {
                query += ' LIMIT ?';
                params.push(parseInt(filters.limit));
            }
            
            const [cuadres] = await promisePool.query(query, params);
            
            return {
                success: true,
                data: cuadres
            };
            
        } catch (error) {
            logger.error('Error al obtener historial de caja:', error);
            return {
                success: false,
                error: 'Error al obtener historial de caja'
            };
        }
    }
    
    // ============================================
    // REGISTRAR GASTO EN CAJA ABIERTA
    // ============================================
    async registrarGasto(gastoData, usuarioId) {
        const result = await executeTransaction(async (connection) => {
            const { descripcion, categoria, monto } = gastoData;
            
            // Verificar que haya caja abierta
            const [cajaAbierta] = await connection.query(
                `SELECT id FROM cuadre_caja WHERE estado = 'abierta' LIMIT 1`
            );
            
            if (cajaAbierta.length === 0) {
                throw new Error('No hay caja abierta para registrar gastos');
            }
            
            // Insertar gasto
            const [result] = await connection.query(
                `INSERT INTO gastos (descripcion, categoria, monto, fecha_gasto, usuario_id) 
                 VALUES (?, ?, ?, NOW(), ?)`,
                [descripcion, categoria, monto, usuarioId]
            );
            
            // Actualizar total de gastos en caja
            await connection.query(
                `UPDATE cuadre_caja 
                 SET total_gastos = total_gastos + ? 
                 WHERE id = ?`,
                [monto, cajaAbierta[0].id]
            );
            
            logger.info(`Gasto registrado: ${descripcion} - Q${monto}`, {
                usuario: usuarioId,
                categoria
            });
            
            return {
                gasto_id: result.insertId,
                descripcion,
                monto
            };
        });
        
        return result;
    }
    
    // ============================================
    // OBTENER RESUMEN DEL DÍA
    // ============================================
    async getResumenDia() {
        try {
            // Ventas del día
            const [ventas] = await promisePool.query(
                `SELECT 
                    COUNT(*) as cantidad_ventas,
                    COALESCE(SUM(total), 0) as total_ventas
                 FROM ventas 
                 WHERE DATE(fecha_venta) = CURDATE()
                 AND (anulada IS NULL OR anulada = FALSE)`
            );
            
            // Gastos del día
            const [gastos] = await promisePool.query(
                `SELECT COALESCE(SUM(monto), 0) as total_gastos
                 FROM gastos 
                 WHERE DATE(fecha_gasto) = CURDATE()`
            );
            
            // Estado de caja actual
            const estadoCaja = await this.getEstado();
            
            return {
                success: true,
                data: {
                    ventas: {
                        cantidad: ventas[0].cantidad_ventas,
                        total: parseFloat(ventas[0].total_ventas)
                    },
                    gastos: {
                        total: parseFloat(gastos[0].total_gastos)
                    },
                    caja: estadoCaja.data
                }
            };
            
        } catch (error) {
            logger.error('Error al obtener resumen del día:', error);
            return {
                success: false,
                error: 'Error al obtener resumen del día'
            };
        }
    }
}

module.exports = new CajaService();
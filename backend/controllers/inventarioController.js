// ============================================
// CONTROLADOR DE INVENTARIO
// ============================================

const db = require('../config/database');

const inventarioController = {
    // Obtener todo el inventario
    getAll: async (req, res) => {
        try {
            const [inventario] = await db.query(`
                SELECT p.*, c.nombre as categoria_nombre,
                CASE 
                    WHEN p.stock_actual = 0 THEN 'AGOTADO'
                    WHEN p.stock_actual <= p.stock_minimo THEN 'BAJO' 
                    ELSE 'OK' 
                END as estado_stock
                FROM productos p 
                LEFT JOIN categorias c ON p.categoria_id = c.id 
                WHERE p.activo = TRUE
                ORDER BY p.nombre
            `);
            res.json(inventario);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Registrar entrada de inventario
    entrada: async (req, res) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const { producto_id, cantidad, lote_id, motivo, usuario_id } = req.body;

            // Actualizar stock del producto
            await connection.query(`
                UPDATE productos SET stock_actual = stock_actual + ? WHERE id = ?
            `, [cantidad, producto_id]);

            // Si tiene lote, actualizar el lote
            if (lote_id) {
                await connection.query(`
                    UPDATE lotes SET cantidad = cantidad + ? WHERE id = ?
                `, [cantidad, lote_id]);
            }

            // Registrar movimiento
            await connection.query(`
                INSERT INTO movimientos_inventario (producto_id, lote_id, tipo_movimiento, cantidad, motivo, usuario_id) 
                VALUES (?, ?, 'entrada', ?, ?, ?)
            `, [producto_id, lote_id || null, cantidad, motivo || 'Entrada manual', usuario_id || 1]);

            await connection.commit();
            res.json({ message: 'Entrada registrada exitosamente' });

        } catch (error) {
            await connection.rollback();
            res.status(500).json({ error: error.message });
        } finally {
            connection.release();
        }
    },

    // Registrar salida de inventario
    salida: async (req, res) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const { producto_id, cantidad, lote_id, motivo, usuario_id } = req.body;

            // Verificar stock disponible
            const [producto] = await connection.query('SELECT stock_actual FROM productos WHERE id = ?', [producto_id]);
            
            if (producto[0].stock_actual < cantidad) {
                await connection.rollback();
                return res.status(400).json({ error: 'Stock insuficiente' });
            }

            // Reducir stock
            await connection.query(`
                UPDATE productos SET stock_actual = stock_actual - ? WHERE id = ?
            `, [cantidad, producto_id]);

            // Si tiene lote, reducir del lote
            if (lote_id) {
                await connection.query(`
                    UPDATE lotes SET cantidad = cantidad - ? WHERE id = ?
                `, [cantidad, lote_id]);
            }

            // Registrar movimiento
            await connection.query(`
                INSERT INTO movimientos_inventario (producto_id, lote_id, tipo_movimiento, cantidad, motivo, usuario_id) 
                VALUES (?, ?, 'salida', ?, ?, ?)
            `, [producto_id, lote_id || null, cantidad, motivo || 'Salida manual', usuario_id || 1]);

            await connection.commit();
            res.json({ message: 'Salida registrada exitosamente' });

        } catch (error) {
            await connection.rollback();
            res.status(500).json({ error: error.message });
        } finally {
            connection.release();
        }
    },

    // Ajustar inventario
    ajuste: async (req, res) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const { producto_id, stock_nuevo, motivo, usuario_id } = req.body;

            // Obtener stock actual
            const [producto] = await connection.query('SELECT stock_actual FROM productos WHERE id = ?', [producto_id]);
            const diferencia = stock_nuevo - producto[0].stock_actual;

            // Actualizar stock
            await connection.query(`
                UPDATE productos SET stock_actual = ? WHERE id = ?
            `, [stock_nuevo, producto_id]);

            // Registrar movimiento
            await connection.query(`
                INSERT INTO movimientos_inventario (producto_id, tipo_movimiento, cantidad, motivo, usuario_id) 
                VALUES (?, 'ajuste', ?, ?, ?)
            `, [producto_id, Math.abs(diferencia), motivo || 'Ajuste de inventario', usuario_id || 1]);

            await connection.commit();
            res.json({ message: 'Ajuste registrado exitosamente' });

        } catch (error) {
            await connection.rollback();
            res.status(500).json({ error: error.message });
        } finally {
            connection.release();
        }
    },

    // Obtener movimientos de inventario
    getMovimientos: async (req, res) => {
        try {
            const [movimientos] = await db.query(`
                SELECT m.*, p.nombre as producto_nombre, p.codigo, u.nombre as usuario_nombre 
                FROM movimientos_inventario m 
                JOIN productos p ON m.producto_id = p.id 
                LEFT JOIN usuarios u ON m.usuario_id = u.id 
                ORDER BY m.fecha_movimiento DESC 
                LIMIT 100
            `);
            res.json(movimientos);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Obtener productos con stock bajo
    getBajoStock: async (req, res) => {
        try {
            const [productos] = await db.query(`
                SELECT p.*, c.nombre as categoria_nombre
                FROM productos p
                LEFT JOIN categorias c ON p.categoria_id = c.id
                WHERE p.stock_actual <= p.stock_minimo AND p.activo = TRUE
                ORDER BY p.stock_actual ASC
            `);
            res.json(productos);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = inventarioController;
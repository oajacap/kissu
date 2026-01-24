// ============================================
// CONTROLADOR DE GASTOS
// ============================================

const db = require('../config/database');

const gastosController = {
    // Obtener todos los gastos
    getAll: async (req, res) => {
        try {
            const [gastos] = await db.query(`
                SELECT g.*, u.nombre as usuario_nombre 
                FROM gastos g 
                LEFT JOIN usuarios u ON g.usuario_id = u.id 
                ORDER BY g.fecha_gasto DESC
                LIMIT 100
            `);
            res.json(gastos);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Crear nuevo gasto
    create: async (req, res) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const { descripcion, categoria, monto, usuario_id } = req.body;

            // Insertar gasto
            const [result] = await connection.query(`
                INSERT INTO gastos (descripcion, categoria, monto, usuario_id) 
                VALUES (?, ?, ?, ?)
            `, [descripcion, categoria, monto, usuario_id || 1]);

            // Actualizar total de gastos en caja abierta
            await connection.query(`
                UPDATE cuadre_caja 
                SET total_gastos = total_gastos + ? 
                WHERE estado = 'abierta' 
                ORDER BY fecha_apertura DESC 
                LIMIT 1
            `, [monto]);

            await connection.commit();
            res.status(201).json({ id: result.insertId, message: 'Gasto registrado exitosamente' });

        } catch (error) {
            await connection.rollback();
            res.status(500).json({ error: error.message });
        } finally {
            connection.release();
        }
    },

    // Obtener total de gastos
    getTotal: async (req, res) => {
        try {
            const { fecha_inicio, fecha_fin } = req.query;
            
            let query = 'SELECT SUM(monto) as total FROM gastos';
            const params = [];

            if (fecha_inicio && fecha_fin) {
                query += ' WHERE fecha_gasto BETWEEN ? AND ?';
                params.push(fecha_inicio, fecha_fin);
            }

            const [result] = await db.query(query, params);
            res.json({ total: result[0].total || 0 });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = gastosController;
// ============================================
// CONTROLADOR DE LOTES
// ============================================

const db = require('../config/database');

const lotesController = {
    // Obtener todos los lotes
    getAll: async (req, res) => {
        try {
            const [lotes] = await db.query(`
                SELECT l.*, p.nombre as producto_nombre, p.codigo 
                FROM lotes l 
                JOIN productos p ON l.producto_id = p.id 
                ORDER BY l.fecha_ingreso DESC
            `);
            res.json(lotes);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Obtener lotes por producto
    getByProducto: async (req, res) => {
        try {
            const [lotes] = await db.query(`
                SELECT * FROM lotes 
                WHERE producto_id = ? AND cantidad > 0 
                ORDER BY fecha_vencimiento ASC
            `, [req.params.id]);
            res.json(lotes);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Crear nuevo lote
    create: async (req, res) => {
        try {
            const { producto_id, numero_lote, cantidad, fecha_vencimiento } = req.body;

            const [result] = await db.query(`
                INSERT INTO lotes (producto_id, numero_lote, cantidad, fecha_vencimiento) 
                VALUES (?, ?, ?, ?)
            `, [producto_id, numero_lote, cantidad, fecha_vencimiento || null]);

            res.status(201).json({ id: result.insertId, message: 'Lote creado exitosamente' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Obtener lotes próximos a vencer (30 días)
    getProximosVencer: async (req, res) => {
        try {
            const [lotes] = await db.query(`
                SELECT l.*, p.nombre as producto_nombre, p.codigo 
                FROM lotes l 
                JOIN productos p ON l.producto_id = p.id 
                WHERE l.fecha_vencimiento IS NOT NULL 
                AND l.fecha_vencimiento <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
                AND l.cantidad > 0
                ORDER BY l.fecha_vencimiento ASC
            `);
            res.json(lotes);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = lotesController;
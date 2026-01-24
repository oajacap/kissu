// ============================================
// CONTROLADOR DE PRODUCTOS
// ============================================

const db = require('../config/database');

const productosController = {
    // Obtener todos los productos activos
    getAll: async (req, res) => {
        try {
            const [productos] = await db.query(`
                SELECT p.*, c.nombre as categoria_nombre 
                FROM productos p 
                LEFT JOIN categorias c ON p.categoria_id = c.id 
                WHERE p.activo = TRUE
                ORDER BY p.nombre
            `);
            res.json(productos);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Obtener producto por ID
    getById: async (req, res) => {
        try {
            const [producto] = await db.query(`
                SELECT p.*, c.nombre as categoria_nombre 
                FROM productos p 
                LEFT JOIN categorias c ON p.categoria_id = c.id 
                WHERE p.id = ?
            `, [req.params.id]);

            if (producto.length === 0) {
                return res.status(404).json({ error: 'Producto no encontrado' });
            }

            res.json(producto[0]);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Crear nuevo producto
    create: async (req, res) => {
        try {
            const { codigo, nombre, descripcion, categoria_id, precio_compra, precio_venta, stock_minimo } = req.body;

            const [result] = await db.query(`
                INSERT INTO productos (codigo, nombre, descripcion, categoria_id, precio_compra, precio_venta, stock_minimo) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [codigo, nombre, descripcion || '', categoria_id || 7, precio_compra, precio_venta, stock_minimo || 5]);

            res.status(201).json({ 
                id: result.insertId, 
                message: 'Producto creado exitosamente' 
            });
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'El código de producto ya existe' });
            }
            res.status(500).json({ error: error.message });
        }
    },

    // Actualizar producto
    update: async (req, res) => {
        try {
            const { nombre, descripcion, categoria_id, precio_compra, precio_venta, stock_minimo } = req.body;

            await db.query(`
                UPDATE productos 
                SET nombre = ?, descripcion = ?, categoria_id = ?, precio_compra = ?, precio_venta = ?, stock_minimo = ? 
                WHERE id = ?
            `, [nombre, descripcion, categoria_id, precio_compra, precio_venta, stock_minimo, req.params.id]);

            res.json({ message: 'Producto actualizado exitosamente' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Eliminar producto (desactivar)
    delete: async (req, res) => {
        try {
            await db.query('UPDATE productos SET activo = FALSE WHERE id = ?', [req.params.id]);
            res.json({ message: 'Producto eliminado exitosamente' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = productosController;
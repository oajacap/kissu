// ============================================
// CONTROLADOR DE PROVEEDORES Y COMPRAS
// ============================================

const db = require('../config/database');

const proveedoresController = {
    // Obtener todos los proveedores
    getAll: async (req, res) => {
        try {
            const [proveedores] = await db.query(`
                SELECT * FROM proveedores WHERE activo = TRUE ORDER BY nombre
            `);
            res.json(proveedores);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Obtener proveedor por ID
    getById: async (req, res) => {
        try {
            const [proveedor] = await db.query('SELECT * FROM proveedores WHERE id = ?', [req.params.id]);
            if (proveedor.length === 0) {
                return res.status(404).json({ error: 'Proveedor no encontrado' });
            }
            res.json(proveedor[0]);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Crear proveedor
    create: async (req, res) => {
        try {
            const { nombre, contacto, telefono, email, direccion, nit } = req.body;
            const [result] = await db.query(`
                INSERT INTO proveedores (nombre, contacto, telefono, email, direccion, nit) 
                VALUES (?, ?, ?, ?, ?, ?)
            `, [nombre, contacto || null, telefono || null, email || null, direccion || null, nit || null]);

            res.status(201).json({ id: result.insertId, message: 'Proveedor creado exitosamente' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Actualizar proveedor
    update: async (req, res) => {
        try {
            const { nombre, contacto, telefono, email, direccion, nit } = req.body;
            await db.query(`
                UPDATE proveedores 
                SET nombre = ?, contacto = ?, telefono = ?, email = ?, direccion = ?, nit = ? 
                WHERE id = ?
            `, [nombre, contacto, telefono, email, direccion, nit, req.params.id]);

            res.json({ message: 'Proveedor actualizado exitosamente' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Obtener cuadre con proveedor
    getCuadre: async (req, res) => {
        try {
            const [resumen] = await db.query(`
                SELECT 
                    SUM(CASE WHEN estado = 'pendiente' THEN total ELSE 0 END) as total_pendiente,
                    SUM(CASE WHEN estado = 'pagado' THEN total ELSE 0 END) as total_pagado,
                    SUM(total) as total_general
                FROM compras 
                WHERE proveedor_id = ?
            `, [req.params.id]);

            const [detalle] = await db.query(`
                SELECT * FROM compras 
                WHERE proveedor_id = ? 
                ORDER BY fecha_compra DESC
            `, [req.params.id]);

            res.json({
                resumen: resumen[0] || { total_pendiente: 0, total_pagado: 0, total_general: 0 },
                detalle: detalle
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Crear compra a proveedor
    crearCompra: async (req, res) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const { proveedor_id, numero_factura, productos, total, usuario_id } = req.body;

            // Insertar compra
            const [resultCompra] = await connection.query(`
                INSERT INTO compras (proveedor_id, numero_factura, total, usuario_id) 
                VALUES (?, ?, ?, ?)
            `, [proveedor_id, numero_factura || null, total, usuario_id || 1]);

            const compraId = resultCompra.insertId;

            // Procesar cada producto
            for (const item of productos) {
                let loteId = null;

                // Si viene con información de lote, crearlo
                if (item.numero_lote) {
                    const [resultLote] = await connection.query(`
                        INSERT INTO lotes (producto_id, numero_lote, cantidad, fecha_vencimiento) 
                        VALUES (?, ?, ?, ?)
                    `, [item.producto_id, item.numero_lote, item.cantidad, item.fecha_vencimiento || null]);
                    loteId = resultLote.insertId;
                }

                // Insertar detalle de compra
                await connection.query(`
                    INSERT INTO detalle_compras (compra_id, producto_id, lote_id, cantidad, precio_unitario, subtotal) 
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [compraId, item.producto_id, loteId, item.cantidad, item.precio_unitario, item.subtotal]);

                // Incrementar stock del producto
                await connection.query(`
                    UPDATE productos SET stock_actual = stock_actual + ? WHERE id = ?
                `, [item.cantidad, item.producto_id]);

                // Registrar movimiento de inventario
                await connection.query(`
                    INSERT INTO movimientos_inventario (producto_id, lote_id, tipo_movimiento, cantidad, motivo, usuario_id) 
                    VALUES (?, ?, 'entrada', ?, 'Compra a proveedor', ?)
                `, [item.producto_id, loteId, item.cantidad, usuario_id || 1]);
            }

            await connection.commit();
            res.status(201).json({ id: compraId, message: 'Compra registrada exitosamente' });

        } catch (error) {
            await connection.rollback();
            res.status(500).json({ error: error.message });
        } finally {
            connection.release();
        }
    },

    // Obtener todas las compras
    getCompras: async (req, res) => {
        try {
            const [compras] = await db.query(`
                SELECT c.*, p.nombre as proveedor_nombre 
                FROM compras c 
                JOIN proveedores p ON c.proveedor_id = p.id 
                ORDER BY c.fecha_compra DESC
                LIMIT 100
            `);
            res.json(compras);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = proveedoresController;
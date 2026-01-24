// ============================================
// CONTROLADOR DE VENTAS Y CAJA
// ============================================

const db = require('../config/database');

const ventasController = {
    // Obtener todas las ventas
    getAll: async (req, res) => {
        try {
            const [ventas] = await db.query(`
                SELECT v.*, c.nombre as cliente_nombre, u.nombre as usuario_nombre
                FROM ventas v 
                LEFT JOIN clientes c ON v.cliente_id = c.id 
                LEFT JOIN usuarios u ON v.usuario_id = u.id
                ORDER BY v.fecha_venta DESC
                LIMIT 100
            `);
            res.json(ventas);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Obtener venta por ID con detalle
    getById: async (req, res) => {
        try {
            const [venta] = await db.query(`
                SELECT v.*, c.nombre as cliente_nombre, c.nit 
                FROM ventas v 
                LEFT JOIN clientes c ON v.cliente_id = c.id 
                WHERE v.id = ?
            `, [req.params.id]);

            if (venta.length === 0) {
                return res.status(404).json({ error: 'Venta no encontrada' });
            }

            const [detalles] = await db.query(`
                SELECT dv.*, p.nombre as producto_nombre, p.codigo 
                FROM detalle_ventas dv 
                JOIN productos p ON dv.producto_id = p.id 
                WHERE dv.venta_id = ?
            `, [req.params.id]);

            res.json({ ...venta[0], detalles });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Crear nueva venta
    create: async (req, res) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const { cliente_id, productos, subtotal, descuento, total, monto_recibido, usuario_id } = req.body;

            // Generar número de factura
            const [ultimaVenta] = await connection.query('SELECT MAX(id) as ultimo FROM ventas');
            const numeroFactura = `F-${String((ultimaVenta[0].ultimo || 0) + 1).padStart(6, '0')}`;

            const cambio = monto_recibido - total;

            // Insertar venta
            const [resultVenta] = await connection.query(`
                INSERT INTO ventas (numero_factura, cliente_id, subtotal, descuento, total, monto_recibido, cambio, usuario_id) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [numeroFactura, cliente_id || 1, subtotal, descuento || 0, total, monto_recibido, cambio, usuario_id]);

            const ventaId = resultVenta.insertId;

            // Procesar cada producto
            for (const item of productos) {
                // Verificar stock
                const [producto] = await connection.query(
                    'SELECT stock_actual FROM productos WHERE id = ?', 
                    [item.producto_id]
                );

                if (producto[0].stock_actual < item.cantidad) {
                    throw new Error(`Stock insuficiente para el producto ID ${item.producto_id}`);
                }

                // Insertar detalle de venta
                await connection.query(`
                    INSERT INTO detalle_ventas (venta_id, producto_id, lote_id, cantidad, precio_unitario, subtotal) 
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [ventaId, item.producto_id, item.lote_id || null, item.cantidad, item.precio_unitario, item.subtotal]);

                // Reducir stock del producto
                await connection.query(`
                    UPDATE productos SET stock_actual = stock_actual - ? WHERE id = ?
                `, [item.cantidad, item.producto_id]);

                // Si hay lote, reducir cantidad del lote
                if (item.lote_id) {
                    await connection.query(`
                        UPDATE lotes SET cantidad = cantidad - ? WHERE id = ?
                    `, [item.cantidad, item.lote_id]);
                }

                // Registrar movimiento de inventario
                await connection.query(`
                    INSERT INTO movimientos_inventario (producto_id, lote_id, tipo_movimiento, cantidad, motivo, usuario_id) 
                    VALUES (?, ?, 'salida', ?, 'Venta', ?)
                `, [item.producto_id, item.lote_id || null, item.cantidad, usuario_id]);
            }

            // Actualizar total de ventas en caja abierta
            await connection.query(`
                UPDATE cuadre_caja 
                SET total_ventas = total_ventas + ? 
                WHERE estado = 'abierta' 
                ORDER BY fecha_apertura DESC 
                LIMIT 1
            `, [total]);

            await connection.commit();

            res.status(201).json({ 
                id: ventaId, 
                numero_factura: numeroFactura,
                cambio: cambio,
                message: 'Venta registrada exitosamente' 
            });

        } catch (error) {
            await connection.rollback();
            res.status(500).json({ error: error.message });
        } finally {
            connection.release();
        }
    },

    // Obtener venta por número de factura
    getByNumero: async (req, res) => {
        try {
            const [venta] = await db.query(`
                SELECT v.*, c.nombre as cliente_nombre 
                FROM ventas v 
                LEFT JOIN clientes c ON v.cliente_id = c.id 
                WHERE v.numero_factura = ?
            `, [req.params.numero]);

            if (venta.length === 0) {
                return res.status(404).json({ error: 'Venta no encontrada' });
            }

            res.json(venta[0]);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Abrir caja
    abrirCaja: async (req, res) => {
        try {
            const { monto_inicial, usuario_id } = req.body;

            // Verificar si hay caja abierta
            const [cajaAbierta] = await db.query(`
                SELECT * FROM cuadre_caja WHERE estado = 'abierta'
            `);

            if (cajaAbierta.length > 0) {
                return res.status(400).json({ error: 'Ya existe una caja abierta' });
            }

            const [result] = await db.query(`
                INSERT INTO cuadre_caja (monto_inicial, usuario_id) 
                VALUES (?, ?)
            `, [monto_inicial, usuario_id]);

            res.status(201).json({ 
                id: result.insertId, 
                message: 'Caja abierta exitosamente' 
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Cerrar caja
    cerrarCaja: async (req, res) => {
        try {
            const { monto_final } = req.body;

            const [caja] = await db.query(`
                SELECT * FROM cuadre_caja WHERE estado = 'abierta' ORDER BY fecha_apertura DESC LIMIT 1
            `);

            if (caja.length === 0) {
                return res.status(404).json({ error: 'No hay caja abierta' });
            }

            const cajaData = caja[0];
            const esperado = parseFloat(cajaData.monto_inicial) + parseFloat(cajaData.total_ventas) - parseFloat(cajaData.total_gastos);
            const diferencia = parseFloat(monto_final) - esperado;

            await db.query(`
                UPDATE cuadre_caja 
                SET fecha_cierre = NOW(), monto_final = ?, diferencia = ?, estado = 'cerrada' 
                WHERE id = ?
            `, [monto_final, diferencia, cajaData.id]);

            res.json({ 
                message: 'Caja cerrada exitosamente',
                monto_esperado: esperado,
                monto_real: monto_final,
                diferencia: diferencia 
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Estado de caja
    estadoCaja: async (req, res) => {
        try {
            const [caja] = await db.query(`
                SELECT * FROM cuadre_caja WHERE estado = 'abierta' ORDER BY fecha_apertura DESC LIMIT 1
            `);

            if (caja.length === 0) {
                return res.json({ abierta: false });
            }

            res.json({ abierta: true, ...caja[0] });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = ventasController;
// ============================================
// CONTROLADOR DE AUTENTICACIÓN Y USUARIOS
// ============================================

const db = require('../config/database');

const authController = {
    // Login de usuarios
    login: async (req, res) => {
        try {
            const { email, password } = req.body;

            const [usuarios] = await db.query(
                'SELECT * FROM usuarios WHERE email = ? AND activo = TRUE',
                [email]
            );

            if (usuarios.length === 0) {
                return res.status(401).json({ error: 'Usuario no encontrado' });
            }

            const usuario = usuarios[0];

            // Verificar contraseña (en producción usar bcrypt)
            if (password !== usuario.password) {
                return res.status(401).json({ error: 'Contraseña incorrecta' });
            }

            // No enviar password en la respuesta
            delete usuario.password;

            res.json({
                message: 'Login exitoso',
                usuario: usuario,
                token: 'token-' + usuario.id
            });

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Obtener todos los usuarios
    getAll: async (req, res) => {
        try {
            const [usuarios] = await db.query(
                'SELECT id, nombre, email, rol, activo, fecha_creacion FROM usuarios ORDER BY nombre'
            );
            res.json(usuarios);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Crear nuevo usuario
    create: async (req, res) => {
        try {
            const { nombre, email, password, rol } = req.body;

            // Verificar si email ya existe
            const [existe] = await db.query('SELECT id FROM usuarios WHERE email = ?', [email]);
            
            if (existe.length > 0) {
                return res.status(400).json({ error: 'El email ya está registrado' });
            }

            const [result] = await db.query(
                'INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)',
                [nombre, email, password, rol || 'cajero']
            );

            res.status(201).json({
                id: result.insertId,
                message: 'Usuario creado exitosamente'
            });

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Actualizar usuario
    update: async (req, res) => {
        try {
            const { nombre, email, rol, activo } = req.body;
            const { id } = req.params;

            await db.query(
                'UPDATE usuarios SET nombre = ?, email = ?, rol = ?, activo = ? WHERE id = ?',
                [nombre, email, rol, activo !== undefined ? activo : true, id]
            );

            res.json({ message: 'Usuario actualizado exitosamente' });

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Cambiar contraseña
    cambiarPassword: async (req, res) => {
        try {
            const { password_actual, password_nueva } = req.body;
            const { id } = req.params;

            const [usuario] = await db.query('SELECT password FROM usuarios WHERE id = ?', [id]);
            
            if (usuario.length === 0) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }

            if (password_actual !== usuario[0].password) {
                return res.status(401).json({ error: 'Contraseña actual incorrecta' });
            }

            await db.query('UPDATE usuarios SET password = ? WHERE id = ?', [password_nueva, id]);

            res.json({ message: 'Contraseña actualizada exitosamente' });

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Desactivar usuario
    desactivar: async (req, res) => {
        try {
            const { id } = req.params;
            await db.query('UPDATE usuarios SET activo = FALSE WHERE id = ?', [id]);
            res.json({ message: 'Usuario desactivado exitosamente' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = authController;
// ============================================
// CONFIGURACIÓN DE BASE DE DATOS - PROFESIONAL
// ============================================

const mysql = require('mysql2');
const logger = require('../utils/logger');

// Configuración del pool de conexiones
const poolConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    // Configuraciones adicionales para producción
    connectTimeout: 60000,
    acquireTimeout: 60000,
    timeout: 60000,
    // Configuración de zona horaria
    timezone: '+00:00',
    // Manejo de números decimales
    decimalNumbers: true
};

// Crear pool de conexiones
const pool = mysql.createPool(poolConfig);

// Convertir a promesas
const promisePool = pool.promise();

// ============================================
// HEALTH CHECK DE CONEXIÓN
// ============================================
const checkConnection = async () => {
    try {
        const [rows] = await promisePool.query('SELECT 1 + 1 AS result');
        logger.info(' Conexión a base de datos establecida correctamente');
        logger.info(` Base de datos: ${process.env.DB_NAME}`);
        logger.info(` Host: ${process.env.DB_HOST}`);
        return true;
    } catch (error) {
        logger.error(' Error al conectar con la base de datos:', {
            message: error.message,
            code: error.code,
            errno: error.errno
        });
        return false;
    }
};

// ============================================
// MANEJO DE ERRORES DEL POOL
// ============================================
pool.on('error', (err) => {
    logger.error(' Error inesperado en el pool de conexiones:', {
        message: err.message,
        code: err.code
    });
    
    // Intentar reconectar en caso de pérdida de conexión
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        logger.info('Intentando reconectar...');
        checkConnection();
    }
});

// ============================================
// FUNCIÓN PARA EJECUTAR TRANSACCIONES
// ============================================
const executeTransaction = async (callback) => {
    const connection = await promisePool.getConnection();
    
    try {
        await connection.beginTransaction();
        const result = await callback(connection);
        await connection.commit();
        return { success: true, data: result };
    } catch (error) {
        await connection.rollback();
        logger.error('Error en transacción:', error);
        return { success: false, error: error.message };
    } finally {
        connection.release();
    }
};

// ============================================
// FUNCIÓN PARA QUERIES CON RETRY
// ============================================
const queryWithRetry = async (sql, params, retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            const [rows] = await promisePool.query(sql, params);
            return rows;
        } catch (error) {
            if (i === retries - 1) throw error;
            
            logger.warn(`Reintentando query (intento ${i + 1}/${retries})`);
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
};

// ============================================
// VERIFICAR TABLAS EXISTENTES
// ============================================
const verifyTables = async () => {
    try {
        const requiredTables = [
            'usuarios',
            'productos',
            'categorias',
            'clientes',
            'ventas',
            'detalle_ventas',
            'cuadre_caja',
            'proveedores',
            'compras',
            'gastos',
            'lotes',
            'movimientos_inventario'
        ];
        
        const [tables] = await promisePool.query('SHOW TABLES');
        const tableNames = tables.map(t => Object.values(t)[0]);
        
        const missingTables = requiredTables.filter(t => !tableNames.includes(t));
        
        if (missingTables.length > 0) {
            logger.error('Faltan tablas en la base de datos:', missingTables);
            return false;
        }
        
        logger.info('Todas las tablas requeridas están presentes');
        return true;
    } catch (error) {
        logger.error('Error al verificar tablas:', error);
        return false;
    }
};

// ============================================
// CERRAR POOL DE CONEXIONES
// ============================================
const closePool = async () => {
    try {
        await pool.end();
        logger.info('Pool de conexiones cerrado');
    } catch (error) {
        logger.error('Error al cerrar pool:', error);
    }
};

module.exports = {
    pool,
    promisePool,
    checkConnection,
    executeTransaction,
    queryWithRetry,
    verifyTables,
    closePool
};
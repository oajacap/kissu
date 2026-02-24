// ============================================
// SERVIDOR PRINCIPAL - POS CAFETERÍA
// ============================================

require('dotenv').config();
const app = require('./src/app');
const { checkConnection, verifyTables } = require('./src/config/database');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 5000;

// ============================================
// INICIALIZAR SERVIDOR
// ============================================
const startServer = async () => {
    try {
        logger.info(' Iniciando servidor...');
        
        // Verificar conexión a base de datos
        const dbConnected = await checkConnection();
        
        if (!dbConnected) {
            logger.error(' No se pudo conectar a la base de datos');
            process.exit(1);
        }
        
        // Verificar tablas
        const tablesVerified = await verifyTables();
        
        if (!tablesVerified) {
            logger.warn(' Algunas tablas requeridas no están presentes');
        }
        
        // Iniciar servidor
        app.listen(PORT, () => {
            logger.info('═══════════════════════════════════════════');
            logger.info(' SERVIDOR POS KISSU ACTIVO');
            logger.info('═══════════════════════════════════════════');
            logger.info(` URL: http://localhost:${PORT}`);
            logger.info(` Entorno: ${process.env.NODE_ENV || 'development'}`);
            logger.info(` API: http://localhost:${PORT}/api/${process.env.API_VERSION || 'v1'}`);
            logger.info('═══════════════════════════════════════════');
        });
        
    } catch (error) {
        logger.error(' Error al iniciar servidor:', error);
        process.exit(1);
    }
};

// ============================================
// MANEJO DE SEÑALES DE TERMINACIÓN
// ============================================
process.on('SIGTERM', () => {
    logger.info('SIGTERM recibido, cerrando servidor...');
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('SIGINT recibido, cerrando servidor...');
    process.exit(0);
});

// ============================================
// MANEJO DE ERRORES NO CAPTURADOS
// ============================================
process.on('uncaughtException', (error) => {
    logger.error('Excepción no capturada:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Promesa rechazada no manejada:', { reason, promise });
});

// Iniciar servidor
startServer();
// ============================================
// SISTEMA DE LOGS PROFESIONAL
// ============================================

const fs = require('fs');
const path = require('path');

// Crear carpeta de logs si no existe
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

const logFile = path.join(logsDir, 'app.log');
const errorFile = path.join(logsDir, 'error.log');

// Niveles de log
const levels = {
    ERROR: 'ERROR',
    WARN: 'WARN',
    INFO: 'INFO',
    DEBUG: 'DEBUG'
};

// Colores para consola
const colors = {
    ERROR: '\x1b[31m', // Rojo
    WARN: '\x1b[33m',  // Amarillo
    INFO: '\x1b[36m',  // Cyan
    DEBUG: '\x1b[35m', // Magenta
    RESET: '\x1b[0m'
};

// Función para formatear fecha
const getTimestamp = () => {
    return new Date().toISOString();
};

// Función principal de log
const log = (level, message, data = null) => {
    const timestamp = getTimestamp();
    const logMessage = {
        timestamp,
        level,
        message,
        data
    };
    
    // Log en consola con colores
    const color = colors[level] || colors.RESET;
    console.log(
        `${color}[${timestamp}] [${level}]${colors.RESET} ${message}`,
        data ? JSON.stringify(data, null, 2) : ''
    );
    
    // Log en archivo
    const logLine = `[${timestamp}] [${level}] ${message} ${data ? JSON.stringify(data) : ''}\n`;
    
    fs.appendFileSync(logFile, logLine);
    
    // Errores también en archivo separado
    if (level === levels.ERROR) {
        fs.appendFileSync(errorFile, logLine);
    }
};

// Funciones específicas por nivel
const logger = {
    error: (message, data) => log(levels.ERROR, message, data),
    warn: (message, data) => log(levels.WARN, message, data),
    info: (message, data) => log(levels.INFO, message, data),
    debug: (message, data) => {
        if (process.env.NODE_ENV === 'development') {
            log(levels.DEBUG, message, data);
        }
    },
    
    // Log de request HTTP
    request: (req) => {
        const message = `${req.method} ${req.originalUrl}`;
        const data = {
            ip: req.ip,
            userAgent: req.get('user-agent'),
            body: req.method !== 'GET' ? req.body : undefined
        };
        log(levels.INFO, message, data);
    }
};

module.exports = logger;
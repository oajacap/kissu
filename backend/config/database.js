//conexion a base de datos
const mysql = require('mysql2');

const pool = mysql.createPool({
    host:'localhost',
    user:'root',
    password: '',
    database:'sistema_facturacion',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0

});

const promisePool = pool.promise();

//Prueba de conexion
promisePool.query('SELECT 1')
    .then(()=>{
        console.log('si conecta');
    })
    .catch((err)=>{
        console.log('no conecta :c', err.message);
    });

module.exports = promisePool;
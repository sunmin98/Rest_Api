const mysql = require('mysql2/promise');

async function initializeDbConnection() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'tjsals6092',
        database: 'todoapp',
    });
    return connection;
}

module.exports = initializeDbConnection;
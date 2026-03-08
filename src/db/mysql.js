const mysql = require('mysql2/promise');
const env = require('../config/env');

const pool = mysql.createPool(env.mysql);

async function testConnection() {
  const connection = await pool.getConnection();
  try {
    await connection.ping();
  } finally {
    connection.release();
  }
}

module.exports = {
  pool,
  testConnection
};

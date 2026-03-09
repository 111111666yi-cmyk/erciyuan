const mysql = require('mysql2/promise');
const env = require('../config/env');

const pool = mysql.createPool(env.mysql);

async function ensureAvatarShareColumn(connection) {
  const [columns] = await connection.query("SHOW COLUMNS FROM avatars LIKE 'is_share_visible'");
  if (!columns.length) {
    await connection.query('ALTER TABLE avatars ADD COLUMN is_share_visible TINYINT(1) NOT NULL DEFAULT 1 AFTER is_active');
  }

  const [indexes] = await connection.query("SHOW INDEX FROM avatars WHERE Key_name = 'idx_share_visible'");
  if (!indexes.length) {
    await connection.query('CREATE INDEX idx_share_visible ON avatars (is_share_visible)');
  }
}

async function ensureSchema() {
  const connection = await pool.getConnection();
  try {
    await ensureAvatarShareColumn(connection);
  } finally {
    connection.release();
  }
}

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
  testConnection,
  ensureSchema
};
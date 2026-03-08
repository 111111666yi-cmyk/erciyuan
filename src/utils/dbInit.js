const fs = require('fs/promises');
const path = require('path');
const mysql = require('mysql2/promise');
const env = require('../config/env');

async function main() {
  const schemaPath = path.resolve(process.cwd(), 'sql', 'schema.sql');
  const sql = await fs.readFile(schemaPath, 'utf8');

  const connection = await mysql.createConnection({
    host: env.mysql.host,
    port: env.mysql.port,
    user: env.mysql.user,
    password: env.mysql.password,
    multipleStatements: true
  });

  try {
    await connection.query(sql);
    // eslint-disable-next-line no-console
    console.log('数据库初始化完成');
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('数据库初始化失败:', error.message);
  process.exit(1);
});

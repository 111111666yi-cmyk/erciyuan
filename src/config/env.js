const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

module.exports = {
  app: {
    port: toInt(process.env.PORT, 3000),
    nodeEnv: process.env.NODE_ENV || 'development'
  },
  mysql: {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: toInt(process.env.MYSQL_PORT, 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'anime_avatar_expo',
    waitForConnections: true,
    connectionLimit: toInt(process.env.MYSQL_CONNECTION_LIMIT, 10),
    queueLimit: 0
  },
  upload: {
    dir: process.env.UPLOAD_DIR || path.join('uploads', 'images'),
    maxFileSizeMb: toInt(process.env.MAX_FILE_SIZE_MB, 20)
  },
  scraper: {
    headless: String(process.env.SCRAPER_HEADLESS || 'true').toLowerCase() !== 'false',
    timeoutMs: toInt(process.env.SCRAPER_TIMEOUT_MS, 45000),
    maxScroll: toInt(process.env.SCRAPER_MAX_SCROLL, 6),
    storageState: process.env.PLAYWRIGHT_STORAGE_STATE || ''
  },
  security: {
    adminToken: process.env.ADMIN_TOKEN || ''
  }
};
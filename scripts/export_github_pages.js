const path = require('path');
const fs = require('fs/promises');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const DOCS_DIR = path.resolve(process.cwd(), 'docs');
const DOCS_UPLOAD_DIR = path.join(DOCS_DIR, 'uploads', 'images');

async function ensureCleanDir(target) {
  await fs.rm(target, { recursive: true, force: true });
  await fs.mkdir(target, { recursive: true });
}

async function readRows() {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'anime_avatar_expo'
  });

  try {
    const [columns] = await conn.query("SHOW COLUMNS FROM avatars LIKE 'is_share_visible'");
    const where = columns.length ? 'is_active = 1 AND is_share_visible = 1' : 'is_active = 1';

    const [rows] = await conn.query(`
      SELECT id, title, description, source_platform, source_url, storage_path, tags_json, click_count, created_at
      FROM avatars
      WHERE ${where}
      ORDER BY created_at DESC
    `);
    return rows;
  } finally {
    await conn.end();
  }
}

function parseTags(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return [];
  }
}

function toRelativeStoragePath(storagePath) {
  const normalized = String(storagePath || '').replace(/\\/g, '/').replace(/^\/+/, '');
  if (normalized.startsWith('public/')) {
    return normalized.slice('public/'.length);
  }
  return normalized;
}

async function copyImage(storagePath) {
  const relPath = toRelativeStoragePath(storagePath);
  const primary = path.resolve(process.cwd(), relPath);
  const fallback = path.resolve(process.cwd(), `public/${relPath}`);
  const fileName = path.basename(relPath);
  const dest = path.join(DOCS_UPLOAD_DIR, fileName);

  try {
    await fs.copyFile(primary, dest);
  } catch (error) {
    await fs.copyFile(fallback, dest);
  }

  return path.posix.join('uploads/images', fileName);
}

async function exportData() {
  const rows = await readRows();

  await fs.mkdir(DOCS_DIR, { recursive: true });
  await ensureCleanDir(DOCS_UPLOAD_DIR);

  const items = [];
  for (const row of rows) {
    try {
      const imagePath = await copyImage(row.storage_path);
      items.push({
        id: row.id,
        title: row.title,
        description: row.description,
        sourcePlatform: row.source_platform,
        sourceUrl: row.source_url,
        imagePath,
        tags: parseTags(row.tags_json),
        clickCount: row.click_count,
        createdAt: row.created_at
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(`[skip] copy failed for ${row.storage_path}: ${error.message}`);
    }
  }

  await fs.writeFile(
    path.join(DOCS_DIR, 'data.json'),
    JSON.stringify({
      generatedAt: new Date().toISOString(),
      total: items.length,
      items
    }, null, 2),
    'utf8'
  );

  // eslint-disable-next-line no-console
  console.log(`Exported ${items.length} records to docs/`);
}

exportData().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error.message);
  process.exit(1);
});
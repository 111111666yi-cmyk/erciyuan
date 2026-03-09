function normalizeRow(row) {
  let tags = [];
  if (row.tags_json) {
    if (Array.isArray(row.tags_json)) {
      tags = row.tags_json;
    } else {
      try {
        tags = JSON.parse(row.tags_json);
      } catch (error) {
        tags = [];
      }
    }
  }

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    sourcePlatform: row.source_platform,
    sourceUrl: row.source_url,
    storagePath: row.storage_path,
    originalImageUrl: row.original_image_url,
    hashSha256: row.hash_sha256,
    tags,
    width: row.width,
    height: row.height,
    fileSize: row.file_size,
    clickCount: row.click_count,
    isShareVisible: Number(row.is_share_visible || 0) === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function createAvatarRepository(pool) {
  async function create(avatar) {
    const sql = `
      INSERT INTO avatars (
        title, description, source_platform, source_url, storage_path, original_image_url,
        hash_sha256, tags_json, width, height, file_size, is_share_visible
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      avatar.title,
      avatar.description || null,
      avatar.sourcePlatform || 'upload',
      avatar.sourceUrl || null,
      avatar.storagePath,
      avatar.originalImageUrl || null,
      avatar.hashSha256,
      avatar.tags && avatar.tags.length ? JSON.stringify(avatar.tags) : null,
      avatar.width || null,
      avatar.height || null,
      avatar.fileSize || null,
      avatar.isShareVisible === false ? 0 : 1
    ];

    const [result] = await pool.execute(sql, params);
    return result.insertId;
  }

  async function findByHash(hashSha256) {
    const [rows] = await pool.execute('SELECT * FROM avatars WHERE hash_sha256 = ? LIMIT 1', [hashSha256]);
    if (!rows.length) {
      return null;
    }
    return normalizeRow(rows[0]);
  }

  async function findById(id) {
    const [rows] = await pool.execute('SELECT * FROM avatars WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) {
      return null;
    }
    return normalizeRow(rows[0]);
  }

  async function list(filters) {
    const page = Math.max(1, Number.parseInt(filters.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(filters.limit, 10) || 24));
    const offset = (page - 1) * limit;

    const whereParts = ['is_active = 1'];
    const whereParams = [];

    const scope = String(filters.scope || 'public').toLowerCase();
    if (scope === 'hidden') {
      whereParts.push('is_share_visible = 0');
    } else if (scope !== 'all') {
      whereParts.push('is_share_visible = 1');
    }

    if (filters.source) {
      whereParts.push('source_platform = ?');
      whereParams.push(filters.source);
    }

    if (filters.tag) {
      whereParts.push('JSON_CONTAINS(COALESCE(tags_json, JSON_ARRAY()), JSON_QUOTE(?))');
      whereParams.push(filters.tag);
    }

    if (filters.keyword) {
      whereParts.push('(title LIKE ? OR description LIKE ?)');
      const keyword = `%${filters.keyword}%`;
      whereParams.push(keyword, keyword);
    }

    const whereSql = whereParts.join(' AND ');

    const countSql = `SELECT COUNT(1) AS total FROM avatars WHERE ${whereSql}`;
    const listSql = `
      SELECT * FROM avatars
      WHERE ${whereSql}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [countRows] = await pool.execute(countSql, whereParams);
    const [listRows] = await pool.execute(listSql, whereParams);

    return {
      page,
      limit,
      total: Number(countRows[0].total || 0),
      items: listRows.map(normalizeRow)
    };
  }

  async function incrementClick(id) {
    await pool.execute('UPDATE avatars SET click_count = click_count + 1 WHERE id = ?', [id]);
    return findById(id);
  }

  async function removeById(id) {
    const [result] = await pool.execute('DELETE FROM avatars WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  async function countByStoragePath(storagePath) {
    const [rows] = await pool.execute('SELECT COUNT(1) AS total FROM avatars WHERE storage_path = ?', [storagePath]);
    return Number(rows[0]?.total || 0);
  }

  async function updateShareVisibility(id, isShareVisible) {
    await pool.execute('UPDATE avatars SET is_share_visible = ? WHERE id = ?', [isShareVisible ? 1 : 0, id]);
    return findById(id);
  }

  return {
    create,
    findByHash,
    findById,
    list,
    incrementClick,
    removeById,
    countByStoragePath,
    updateShareVisibility
  };
}

module.exports = {
  createAvatarRepository
};
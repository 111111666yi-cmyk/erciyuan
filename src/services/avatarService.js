const path = require('path');
const fs = require('fs/promises');
const env = require('../config/env');
const { downloadImageBuffer } = require('../utils/downloadImage');
const { readImageMetadata } = require('../utils/readImageMetadata');
const { ensureDir, computeSha256, getExtFromMime, saveBuffer } = require('./storage/localStorage');
const { scrapeByPlatform } = require('./scrapers');

function splitTags(input) {
  if (!input) {
    return [];
  }

  if (Array.isArray(input)) {
    return [...new Set(input.map((item) => String(item).trim()).filter(Boolean))];
  }

  return [...new Set(String(input).split(',').map((item) => item.trim()).filter(Boolean))];
}

function toPublicPath(relativePath) {
  return `/${relativePath.replace(/\\/g, '/').replace(/^\/+/, '')}`;
}

function createAvatarService(avatarRepository) {
  async function createFromBuffer({ buffer, contentType, title, description, sourcePlatform, sourceUrl, originalImageUrl, tags }) {
    await ensureDir(env.upload.dir);

    const hashSha256 = computeSha256(buffer);
    const existed = await avatarRepository.findByHash(hashSha256);
    if (existed) {
      return {
        ...existed,
        duplicate: true
      };
    }

    const ext = getExtFromMime(contentType);
    const saved = await saveBuffer(buffer, {
      uploadDir: env.upload.dir,
      ext
    });

    const metadata = await readImageMetadata(buffer);
    const publicPath = toPublicPath(saved.relativePath);

    const avatarId = await avatarRepository.create({
      title: title || path.basename(saved.relativePath),
      description: description || null,
      sourcePlatform: sourcePlatform || 'upload',
      sourceUrl: sourceUrl || null,
      storagePath: publicPath,
      originalImageUrl: originalImageUrl || null,
      hashSha256: saved.hashSha256,
      tags: splitTags(tags),
      width: metadata.width,
      height: metadata.height,
      fileSize: saved.fileSize,
      isShareVisible: true
    });

    return avatarRepository.findById(avatarId);
  }

  async function createFromUploadFiles({ files, title, description, sourcePlatform, sourceUrl, tags }) {
    const results = [];

    for (const file of files || []) {
      const item = await createFromBuffer({
        buffer: file.buffer,
        contentType: file.mimetype,
        title: title || file.originalname,
        description,
        sourcePlatform: sourcePlatform || 'upload',
        sourceUrl,
        originalImageUrl: null,
        tags
      });
      results.push(item);
    }

    return results;
  }

  async function createFromUrlItems(items, defaults = {}) {
    const created = [];

    for (const item of items) {
      const imageUrl = item.imageUrl || item.url;
      if (!imageUrl) {
        continue;
      }

      try {
        const { buffer, contentType } = await downloadImageBuffer(imageUrl);

        const avatar = await createFromBuffer({
          buffer,
          contentType,
          title: item.title || defaults.title || 'Imported Avatar',
          description: item.description || defaults.description || null,
          sourcePlatform: item.sourcePlatform || defaults.sourcePlatform || 'url',
          sourceUrl: item.sourceUrl || defaults.sourceUrl || null,
          originalImageUrl: imageUrl,
          tags: splitTags(item.tags || defaults.tags)
        });

        created.push(avatar);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(`导入失败，已跳过: ${imageUrl} -> ${error.message}`);
      }
    }

    return created;
  }

  async function scrapeAndImport({ platform, pageUrl, limit, persist = true, tags }) {
    const scrapedItems = await scrapeByPlatform({ platform, pageUrl, limit });

    if (!persist) {
      return {
        scrapedCount: scrapedItems.length,
        importedCount: 0,
        items: scrapedItems
      };
    }

    const imported = await createFromUrlItems(
      scrapedItems.map((item) => ({
        ...item,
        sourcePlatform: platform,
        sourceUrl: item.sourceUrl || pageUrl,
        tags: [...splitTags(item.tags), ...splitTags(tags)]
      })),
      {
        sourcePlatform: platform,
        sourceUrl: pageUrl,
        tags
      }
    );

    return {
      scrapedCount: scrapedItems.length,
      importedCount: imported.length,
      items: imported
    };
  }

  async function list(filters, options = {}) {
    const scope = String(filters.scope || 'public').toLowerCase();
    const isAdmin = options.isAdmin === true;

    const safeFilters = { ...filters };
    if (!isAdmin && (scope === 'all' || scope === 'hidden')) {
      safeFilters.scope = 'public';
    }

    return avatarRepository.list(safeFilters);
  }

  async function click(id) {
    return avatarRepository.incrementClick(id);
  }

  async function remove(id) {
    const existing = await avatarRepository.findById(id);
    if (!existing) {
      return null;
    }

    await avatarRepository.removeById(id);

    const stillReferenced = await avatarRepository.countByStoragePath(existing.storagePath);
    if (stillReferenced === 0) {
      const rel = existing.storagePath.replace(/^\/+/, '');
      const localPath = path.resolve(process.cwd(), rel);
      const legacyPath = path.resolve(process.cwd(), `public/${rel}`);
      await fs.unlink(localPath).catch(() => {});
      await fs.unlink(legacyPath).catch(() => {});
    }

    return existing;
  }

  async function setShareVisibility(id, isShareVisible) {
    const existing = await avatarRepository.findById(id);
    if (!existing) {
      return null;
    }

    return avatarRepository.updateShareVisibility(id, isShareVisible);
  }

  return {
    splitTags,
    list,
    click,
    remove,
    setShareVisibility,
    createFromUploadFiles,
    createFromUrlItems,
    scrapeAndImport
  };
}

module.exports = {
  createAvatarService
};
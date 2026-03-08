const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

async function ensureDir(targetDir) {
  await fs.mkdir(targetDir, { recursive: true });
}

function computeSha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function getExtFromMime(mimeType) {
  if (!mimeType) {
    return '.jpg';
  }

  const normalized = mimeType.toLowerCase();
  if (normalized.includes('png')) return '.png';
  if (normalized.includes('webp')) return '.webp';
  if (normalized.includes('gif')) return '.gif';
  if (normalized.includes('bmp')) return '.bmp';
  if (normalized.includes('svg')) return '.svg';
  return '.jpg';
}

async function saveBuffer(buffer, options) {
  const hashSha256 = computeSha256(buffer);
  const ext = options.ext || '.jpg';
  const relativePath = path.join(options.uploadDir, `${hashSha256}${ext}`).replace(/\\/g, '/');

  await ensureDir(path.dirname(relativePath));

  const absolutePath = path.resolve(process.cwd(), relativePath);
  await fs.writeFile(absolutePath, buffer);

  return {
    hashSha256,
    relativePath,
    absolutePath,
    fileSize: buffer.length
  };
}

async function fileExists(relativePath) {
  try {
    await fs.access(path.resolve(process.cwd(), relativePath));
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = {
  ensureDir,
  computeSha256,
  getExtFromMime,
  saveBuffer,
  fileExists
};

const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');
const { chromium } = require('playwright');

dotenv.config();

const DEFAULT_TARGET_URL = 'https://web.telegram.org/k/#@gongzhutonghao';
const DEFAULT_CDP_URL = process.env.CDP_URL || 'http://127.0.0.1:9222';
const DEFAULT_LIMIT = 50;
const DEFAULT_OUTPUT_DIR = 'public/uploads/images';

function parseArgs(argv) {
  const output = {};
  for (const token of argv) {
    if (!token.startsWith('--')) continue;
    const [rawKey, ...rest] = token.slice(2).split('=');
    output[rawKey] = rest.length ? rest.join('=') : true;
  }
  return output;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function toInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizePathForDb(filePath) {
  return filePath.replace(/\\/g, '/');
}

function toWebStoragePath(outDir, fileName) {
  const normalized = normalizePathForDb(outDir).replace(/^\.+\//, '').replace(/^\/+/, '');
  if (normalized.startsWith('public/')) {
    return `/${normalized.slice('public/'.length)}/${fileName}`;
  }
  return `/${normalized}/${fileName}`;
}

function extFromContentType(contentType) {
  const type = String(contentType || '').toLowerCase();
  if (type.includes('png')) return '.png';
  if (type.includes('webp')) return '.webp';
  if (type.includes('jpeg') || type.includes('jpg')) return '.jpg';
  if (type.includes('gif')) return '.gif';
  if (type.includes('bmp')) return '.bmp';
  return '';
}

function extFromUrl(url) {
  try {
    const pathname = new URL(url).pathname || '';
    const ext = path.extname(pathname).toLowerCase();
    if (['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp'].includes(ext)) {
      return ext === '.jpeg' ? '.jpg' : ext;
    }
  } catch (error) {
    return '';
  }
  return '';
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function getDbPool() {
  return mysql.createPool({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: toInt(process.env.MYSQL_PORT, 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'anime_avatar_expo',
    waitForConnections: true,
    connectionLimit: toInt(process.env.MYSQL_CONNECTION_LIMIT, 10),
    queueLimit: 0
  });
}

async function ensureOutputDir(outDir) {
  await fs.mkdir(path.resolve(process.cwd(), outDir), { recursive: true });
}

async function attachTelegramPage(browser, targetUrl) {
  const contexts = browser.contexts();
  if (!contexts.length) {
    throw new Error('未找到可用浏览器上下文，请确认当前浏览器是已登录状态并开启了 CDP。');
  }

  let context = contexts[0];
  let page = null;

  for (const ctx of contexts) {
    const pages = ctx.pages();
    const matched = pages.find((p) => p.url().includes('web.telegram.org'));
    if (matched) {
      context = ctx;
      page = matched;
      break;
    }
  }

  if (!page) {
    page = await context.newPage();
  }

  await page.bringToFront();

  let targetHash = '';
  try {
    targetHash = new URL(targetUrl).hash || '';
  } catch (error) {
    targetHash = '';
  }

  if (!targetHash || !page.url().includes(targetHash)) {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  }

  await page.waitForTimeout(2000);

  const bodyText = await page.locator('body').innerText().catch(() => '');
  const loginPattern = /(log in|sign in|qr code|phone number|login|登录|二维码|手机号|手机号码)/i;
  if (loginPattern.test(bodyText)) {
    throw new Error('检测到登录页面。脚本不会自动登录，请先在当前浏览器会话中完成 Telegram 登录。');
  }

  return { context, page };
}

async function humanizedScrollUp(page) {
  const distance = 800 + randomInt(-80, 80);
  const anchor = await page.evaluate(() => {
    const firstBubble = document.querySelector('.bubble.channel-post');
    if (!firstBubble) {
      return { x: 540, y: 420 };
    }
    const r = firstBubble.getBoundingClientRect();
    return {
      x: Math.round(r.left + Math.min(Math.max(r.width * 0.5, 120), 500)),
      y: Math.round(Math.min(Math.max(r.top + 120, 180), window.innerHeight - 160))
    };
  });

  await page.mouse.move(anchor.x, anchor.y, { steps: randomInt(4, 10) });
  await page.mouse.wheel(0, -Math.abs(distance));
  await sleep(randomInt(450, 850));

  const result = await page.evaluate((d) => {
    const center = document.querySelector('#column-center');
    if (!center) {
      return { moved: false, beforeTop: 0, afterTop: 0, atTop: true };
    }

    const candidates = [center, ...Array.from(center.querySelectorAll('div'))]
      .filter((el) => el.scrollHeight - el.clientHeight > 300)
      .sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight));

    const target = candidates[0];
    if (!target) {
      return { moved: false, beforeTop: 0, afterTop: 0, atTop: true };
    }

    const beforeTop = target.scrollTop;
    target.scrollBy({ top: -Math.abs(d), behavior: 'auto' });
    const afterTop = target.scrollTop;
    const moved = Math.abs(afterTop - beforeTop) > 4;
    const atTop = afterTop <= 4;

    return { moved, beforeTop, afterTop, atTop };
  }, distance);

  await sleep(randomInt(2000, 4000));
  return result;
}

async function extractImageUrls(page) {
  const urls = await page.evaluate(() => {
    const center = document.querySelector('#column-center') || document.body;
    const centerRect = center.getBoundingClientRect();

    const inCenterFlow = (el) => {
      const rect = el.getBoundingClientRect();
      if (!rect || rect.width < 96 || rect.height < 96) return false;
      if (rect.right < centerRect.left + 40) return false;
      if (rect.left > centerRect.right - 40) return false;
      return true;
    };

    const fromImg = Array.from(center.querySelectorAll('.bubble.channel-post img'))
      .map((img) => ({
        src: img.currentSrc || img.src || '',
        width: img.naturalWidth || img.width || 0,
        height: img.naturalHeight || img.height || 0,
        node: img
      }))
      .filter((item) => item.src && item.width >= 96 && item.height >= 96 && inCenterFlow(item.node))
      .map((item) => item.src);

    const fromBg = Array.from(center.querySelectorAll('.bubble.channel-post [style*="background-image"]'))
      .filter((el) => inCenterFlow(el))
      .map((el) => ({ bg: getComputedStyle(el).backgroundImage || '', w: el.clientWidth, h: el.clientHeight }))
      .map(({ bg }) => {
        const match = bg.match(/url\(["']?(.*?)["']?\)/i);
        return match ? match[1] : '';
      })
      .filter((src) => src && /^(https?:|blob:|data:)/i.test(src));

    const merged = [...fromImg, ...fromBg];
    return Array.from(new Set(merged));
  });

  return urls.filter((u) => /^(https?:|blob:|data:)/i.test(u));
}

async function collectLatestImageUrls(page, limit) {
  const unique = new Set();
  const maxLoops = 220;
  let noProgressRounds = 0;

  for (let i = 0; i < maxLoops && unique.size < limit; i += 1) {
    const batch = await extractImageUrls(page);
    const before = unique.size;

    for (const url of batch) {
      unique.add(url);
      if (unique.size >= limit) break;
    }

    const gained = unique.size - before;
    const scrollInfo = await humanizedScrollUp(page);

    if (gained > 0 || scrollInfo.moved) {
      noProgressRounds = 0;
    } else {
      noProgressRounds += 1;
    }

    console.log(
      `[info] scan loop ${i + 1}/${maxLoops}, collected=${unique.size}, gained=${gained}, moved=${scrollInfo.moved}, top=${scrollInfo.afterTop}`
    );

    if (unique.size >= limit) {
      break;
    }

    if (noProgressRounds >= 25) {
      break;
    }
  }

  if (unique.size === 0) {
    throw new Error('未采集到任何图片 URL。请确认当前页面已经进入目标频道并且消息流可见。');
  }

  return Array.from(unique).slice(0, limit);
}

async function downloadImage(url, contextRequest, timeoutMs = 45000) {
  const response = await contextRequest.get(url, { timeout: timeoutMs });
  if (!response.ok()) {
    throw new Error(`下载失败: HTTP ${response.status()}`);
  }

  const buffer = await response.body();
  const contentType = response.headers()['content-type'] || '';

  return {
    buffer,
    contentType
  };
}

async function downloadBlobOrDataFromPage(page, url) {
  if (url.startsWith('data:')) {
    const parsed = /^data:([^;,]+)?(;base64)?,(.*)$/i.exec(url);
    if (!parsed) {
      throw new Error('无法解析 data URL');
    }
    const contentType = parsed[1] || '';
    const isBase64 = Boolean(parsed[2]);
    const payload = parsed[3] || '';
    const buffer = isBase64
      ? Buffer.from(payload, 'base64')
      : Buffer.from(decodeURIComponent(payload), 'utf8');
    return { buffer, contentType };
  }

  const result = await page.evaluate(async (src) => {
    const response = await fetch(src);
    if (!response.ok) {
      throw new Error(`fetch failed with status ${response.status}`);
    }
    const contentType = response.headers.get('content-type') || '';
    const arrayBuffer = await response.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    const binary = Array.from(uint8).map((x) => String.fromCharCode(x)).join('');
    const base64 = btoa(binary);
    return { base64, contentType };
  }, url);

  return {
    buffer: Buffer.from(result.base64, 'base64'),
    contentType: result.contentType || ''
  };
}

async function saveAndInsert({ pool, page, imageUrl, channelUrl, outDir, index, requestContext }) {
  try {
    const isBlobLike = imageUrl.startsWith('blob:') || imageUrl.startsWith('data:');
    const { buffer, contentType } = isBlobLike
      ? await downloadBlobOrDataFromPage(page, imageUrl)
      : await downloadImage(imageUrl, requestContext);
    const hash = sha256(buffer);

    const ext = extFromContentType(contentType) || extFromUrl(imageUrl) || '.jpg';
    const fileName = `${hash}${ext}`;

    const absolutePath = path.resolve(process.cwd(), outDir, fileName);
    const relativePath = toWebStoragePath(outDir, fileName);

    try {
      await fs.access(absolutePath);
    } catch (error) {
      await fs.writeFile(absolutePath, buffer);
    }

    const title = `Telegram Avatar ${index + 1}`;
    const description = `scraped_at=${new Date().toISOString()}`;
    const tags = JSON.stringify(['telegram', 'channel-avatar']);

    const sql = `
      INSERT INTO avatars (
        title, description, source_platform, source_url, storage_path,
        original_image_url, hash_sha256, tags_json, file_size
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP
    `;

    const params = [
      title,
      description,
      'telegram',
      channelUrl,
      relativePath,
      imageUrl,
      hash,
      tags,
      buffer.length
    ];

    const [result] = await pool.execute(sql, params);

    return {
      ok: true,
      duplicated: result.affectedRows === 2,
      filePath: relativePath
    };
  } catch (error) {
    console.warn(`[skip] ${imageUrl} -> ${error.message}`);
    return {
      ok: false,
      duplicated: false,
      filePath: null
    };
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || args.h) {
    console.log('Usage: node scripts/scrape_tg.js --url=<telegram_url> --limit=50 --cdp=http://127.0.0.1:9222 --outDir=public/uploads/images');
    process.exit(0);
  }

  const channelUrl = args.url || DEFAULT_TARGET_URL;
  const cdpUrl = args.cdp || DEFAULT_CDP_URL;
  const outDir = args.outDir || DEFAULT_OUTPUT_DIR;
  const limit = Math.min(DEFAULT_LIMIT, Math.max(1, toInt(args.limit, DEFAULT_LIMIT)));

  console.log('[info] Starting Telegram safe scrape');
  console.log(`[info] target=${channelUrl}`);
  console.log(`[info] cdp=${cdpUrl}`);
  console.log(`[info] limit=${limit}`);
  console.log('[info] strategy=headed session attach + segmented scroll + random wait');

  let browser;
  let pool;
  let exitCode = 0;

  try {
    pool = await getDbPool();
    await ensureOutputDir(outDir);

    browser = await chromium.connectOverCDP(cdpUrl);
    const { context, page } = await attachTelegramPage(browser, channelUrl);
    const currentUrl = page.url();
    if (!currentUrl.includes('/k/#@gongzhutonghao')) {
      throw new Error(`当前并非目标频道页: ${currentUrl}`);
    }

    const imageUrls = await collectLatestImageUrls(page, limit);
    console.log(`[info] collected ${imageUrls.length} candidate urls`);

    let successCount = 0;
    let failCount = 0;
    let duplicateCount = 0;

    for (let i = 0; i < imageUrls.length; i += 1) {
      const url = imageUrls[i];
      const result = await saveAndInsert({
        pool,
        page,
        imageUrl: url,
        channelUrl,
        outDir,
        index: i,
        requestContext: context.request
      });

      if (result.ok) {
        successCount += 1;
        if (result.duplicated) duplicateCount += 1;
        console.log(`[ok] ${i + 1}/${imageUrls.length} -> ${result.filePath}`);
      } else {
        failCount += 1;
      }

      await sleep(randomInt(600, 1400));
    }

    console.log('--- Summary ---');
    console.log(`candidates: ${imageUrls.length}`);
    console.log(`saved_or_existing: ${successCount}`);
    console.log(`duplicates: ${duplicateCount}`);
    console.log(`failed: ${failCount}`);
    console.log(`output_dir: ${normalizePathForDb(outDir)}`);
  } catch (error) {
    exitCode = 1;
    console.error('[fatal]', error.message);
  } finally {
    if (pool) {
      await pool.end().catch(() => {});
    }

    if (browser) {
      await browser.close().catch(() => {});
    }

    process.exit(exitCode);
  }
}

main();

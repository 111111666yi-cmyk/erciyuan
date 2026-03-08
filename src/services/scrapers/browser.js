const { chromium } = require('playwright');
const env = require('../../config/env');

async function withBrowser(task) {
  const launchOptions = {
    headless: env.scraper.headless,
    timeout: env.scraper.timeoutMs
  };

  const browser = await chromium.launch(launchOptions);
  const contextOptions = {
    viewport: { width: 1440, height: 1024 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
  };

  if (env.scraper.storageState) {
    contextOptions.storageState = env.scraper.storageState;
  }

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  page.setDefaultTimeout(env.scraper.timeoutMs);

  try {
    return await task(page);
  } finally {
    await context.close();
    await browser.close();
  }
}

async function autoScroll(page, loops = env.scraper.maxScroll) {
  for (let i = 0; i < loops; i += 1) {
    await page.mouse.wheel(0, 1800);
    await page.waitForTimeout(800);
  }
}

async function extractImageCandidates(page) {
  const images = await page.$$eval('img', (nodes) => {
    return nodes
      .map((img) => {
        const src = img.currentSrc || img.src || '';
        const width = img.naturalWidth || img.width || 0;
        const height = img.naturalHeight || img.height || 0;
        const alt = (img.alt || '').trim();

        return { src, width, height, alt };
      })
      .filter((item) => item.src && item.src.startsWith('http') && item.width >= 96 && item.height >= 96);
  });

  const unique = new Map();
  for (const item of images) {
    if (!unique.has(item.src)) {
      unique.set(item.src, item);
    }
  }

  return [...unique.values()];
}

module.exports = {
  withBrowser,
  autoScroll,
  extractImageCandidates
};

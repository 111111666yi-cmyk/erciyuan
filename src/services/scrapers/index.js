const { scrapeTikTok } = require('./tiktokScraper');
const { scrapeTelegram } = require('./telegramScraper');
const { scrapeChromePage } = require('./chromeScraper');

async function scrapeByPlatform({ platform, pageUrl, limit }) {
  const normalized = String(platform || '').toLowerCase();

  if (normalized === 'tiktok') {
    return scrapeTikTok({ pageUrl, limit });
  }

  if (normalized === 'telegram') {
    return scrapeTelegram({ pageUrl, limit });
  }

  if (normalized === 'chrome') {
    return scrapeChromePage({ pageUrl, limit });
  }

  throw new Error(`不支持的平台: ${platform}`);
}

module.exports = {
  scrapeByPlatform
};

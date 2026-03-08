const { withBrowser, autoScroll, extractImageCandidates } = require('./browser');

async function scrapeTelegram({ pageUrl, limit = 30 }) {
  if (!pageUrl) {
    throw new Error('Telegram 抓取需要 pageUrl');
  }

  return withBrowser(async (page) => {
    await page.goto(pageUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1800);
    await autoScroll(page);

    const candidates = await extractImageCandidates(page);

    return candidates.slice(0, limit).map((item, index) => ({
      title: `Telegram Avatar ${index + 1}`,
      imageUrl: item.src,
      sourceUrl: pageUrl,
      tags: ['telegram', 'avatar'],
      width: item.width || null,
      height: item.height || null
    }));
  });
}

module.exports = {
  scrapeTelegram
};

const { withBrowser, autoScroll, extractImageCandidates } = require('./browser');

async function scrapeChromePage({ pageUrl, limit = 30 }) {
  if (!pageUrl) {
    throw new Error('Chrome 抓取需要 pageUrl');
  }

  return withBrowser(async (page) => {
    await page.goto(pageUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    await autoScroll(page, 4);

    const candidates = await extractImageCandidates(page);

    return candidates.slice(0, limit).map((item, index) => ({
      title: `Chrome Import ${index + 1}`,
      imageUrl: item.src,
      sourceUrl: pageUrl,
      tags: ['chrome-import', 'avatar'],
      width: item.width || null,
      height: item.height || null
    }));
  });
}

module.exports = {
  scrapeChromePage
};

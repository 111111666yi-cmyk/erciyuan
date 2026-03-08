const { pool } = require('../db/mysql');
const { createAvatarRepository } = require('../repositories/avatarRepository');
const { createAvatarService } = require('../services/avatarService');

function parseArgs(argv) {
  const output = {};
  for (const token of argv) {
    if (!token.startsWith('--')) {
      continue;
    }
    const [key, value] = token.replace(/^--/, '').split('=');
    output[key] = value ?? true;
  }
  return output;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const platform = args.platform || args.p;
  const pageUrl = args.url || args.pageUrl;
  const limit = Number.parseInt(args.limit, 10) || 30;
  const persist = args.persist !== 'false';
  const tags = args.tags || '';

  if (!platform || !pageUrl) {
    throw new Error('用法: npm run scrape -- --platform=tiktok --url=https://... --limit=20 --persist=true');
  }

  const avatarService = createAvatarService(createAvatarRepository(pool));
  const result = await avatarService.scrapeAndImport({
    platform,
    pageUrl,
    limit,
    persist,
    tags
  });

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error.message);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });

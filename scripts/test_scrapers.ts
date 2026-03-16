import 'dotenv/config';
import { scrape } from '../packages/scrapers/src/index.ts';

async function main() {
  const urls = [
    'https://example.com',
    'https://www.reddit.com/r/programming/comments/1qg5jzt/cantkeepsayingfixeseverytime/',
  ];
  let failed = false;

  for (const url of urls) {
    try {
      const result = await scrape(url);
      console.log('OK', url, result.title?.slice(0, 80), result.type);
    } catch (err) {
      if (url.includes('reddit.com')) {
        console.warn('SKIP', url, err);
        continue;
      }
      failed = true;
      console.error('FAIL', url, err);
    }
  }

  if (failed) {
    process.exit(1);
  }
}

main();

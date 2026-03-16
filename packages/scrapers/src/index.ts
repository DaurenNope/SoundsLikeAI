import { detectUrlType } from './utils/detect';
import { getCached, setCache } from './cache';
import { waitForRateLimit } from './utils/rate-limit';
import { scrapeArticle } from './sources/article';
import { scrapeReddit } from './sources/reddit';
import { initProxyFetch } from './utils/proxy';
export { fetchRssFeed } from './sources/rss';
export { fetchSubreddit } from './sources/reddit';
export { fetchPodcastFeed } from './sources/podcast';
export { fetchYoutubeFeed } from './sources/youtube';
export { fetchTwitterFeed } from './sources/twitter';
export { batchCrawl } from './orchestrator';

export interface ScrapeResult {
  title: string;
  content: string;
  url: string;
  author?: string;
  publishedAt?: string;
  type: string;
}

export async function scrape(url: string): Promise<ScrapeResult> {
  initProxyFetch();
  const cached = await getCached(url);
  if (cached) return JSON.parse(cached);

  await waitForRateLimit(url);

  const type = detectUrlType(url);
  let result: ScrapeResult;

  switch (type) {
    case 'reddit':
      result = await scrapeReddit(url);
      break;
    default:
      result = await scrapeArticle(url);
  }

  await setCache(url, JSON.stringify(result));
  return result;
}

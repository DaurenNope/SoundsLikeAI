import Parser from 'rss-parser';
import { getProxyAgent } from '../utils/proxy';

const proxyAgent = getProxyAgent();

const timeoutMs = Number(process.env.RSS_TIMEOUT_MS ?? 10000);

const parser = new Parser({
  timeout: timeoutMs,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; SoundsLikeAI/1.0)',
    Accept: 'application/rss+xml, application/xml, text/xml',
  },
  requestOptions: proxyAgent ? { agent: proxyAgent } : undefined,
});

export interface FeedItem {
  title: string;
  content: string;
  url: string;
  publishedAt?: string;
  author?: string;
}

export async function fetchRssFeed(feedUrl: string): Promise<FeedItem[]> {
  const feed = await parser.parseURL(feedUrl);
  return feed.items
    .slice(0, 20)
    .map((item) => ({
      title: item.title ?? '',
      content:
        item.contentSnippet ??
        item.summary ??
        item.content ??
        item.title ??
        '',
      url: item.link ?? '',
      publishedAt: item.pubDate ?? item.isoDate,
      author: item.creator ?? item.author,
    }))
    .filter((item) => item.url && (item.content.length > 10 || item.title.length > 0));
}

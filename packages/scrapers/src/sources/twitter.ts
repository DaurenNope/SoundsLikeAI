import Parser from 'rss-parser';
import { cleanText } from '../utils/clean';
import { getProxyAgent } from '../utils/proxy';

const proxyAgent = getProxyAgent();

const timeoutMs = Number(process.env.RSS_TIMEOUT_MS ?? 10000);

const parser = new Parser({
  timeout: timeoutMs,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
  },
  requestOptions: proxyAgent ? { agent: proxyAgent } : undefined,
});

export interface TwitterItem {
  title: string;
  content: string;
  url: string;
  publishedAt?: string;
  author?: string;
}

export async function fetchTwitterFeed(input: string): Promise<TwitterItem[]> {
  const feedUrl = toTwitterFeedUrl(input);
  const feed = await parser.parseURL(feedUrl);
  return feed.items
    .slice(0, 20)
    .map((item) => {
      const raw = item.contentSnippet ?? item.content ?? item.summary ?? '';
      const text = cleanText(raw);
      return {
        title: item.title ?? '',
        content: text || item.title || '',
        url: item.link ?? '',
        publishedAt: item.pubDate ?? item.isoDate,
        author: item.creator ?? item.author,
      };
    })
    .filter((item) => item.url && item.content.length > 0);
}

function toTwitterFeedUrl(input: string): string {
  const trimmed = input.trim();
  const base = process.env.NITTER_BASE_URL?.replace(/\/$/, '') || 'https://nitter.net';

  if (trimmed.includes('/rss')) {
    return trimmed;
  }

  const handle = extractHandle(trimmed);
  if (!handle) {
    throw new Error('Provide a Twitter handle or RSS URL');
  }

  return `${base}/${handle}/rss`;
}

function extractHandle(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('@')) return trimmed.slice(1);
  if (!trimmed.includes('/')) return trimmed;

  const match = trimmed.match(/(?:twitter\.com|x\.com|nitter\.net)\/([^/?#]+)/i);
  if (match) return match[1];
  return null;
}

import Parser from 'rss-parser';
import { getProxyAgent } from '../utils/proxy';

const proxyAgent = getProxyAgent();

const timeoutMs = Number(process.env.RSS_TIMEOUT_MS ?? 20000);

const parser = new Parser({
  timeout: timeoutMs,
  xml2js: {
    strict: false,
    normalize: true,
    normalizeTags: false,
    trim: true,
  },
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; SoundsLikeAI/1.0)',
    Accept: 'application/rss+xml, application/xml, text/xml',
  },
  requestOptions: proxyAgent ? { agent: proxyAgent } : undefined,
});

export interface PodcastItem {
  title: string;
  content: string;
  url: string;
  audioUrl?: string;
  publishedAt?: string;
  author?: string;
  duration?: string;
}

export async function fetchPodcastFeed(feedUrl: string): Promise<PodcastItem[]> {
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
      audioUrl: (item.enclosure as any)?.url,
      publishedAt: item.pubDate ?? item.isoDate,
      author: item.creator ?? item.author,
      duration: (item as any).itunes?.duration,
    }))
    .filter((item) => item.title.length > 0 && item.content.length > 0);
}

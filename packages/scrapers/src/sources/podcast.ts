import Parser from 'rss-parser';
import { getProxyAgent } from '../utils/proxy';

const proxyAgent = getProxyAgent();

const timeoutMs = Number(process.env.RSS_TIMEOUT_MS ?? 20000);

const parser = new Parser({
  timeout: timeoutMs,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
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

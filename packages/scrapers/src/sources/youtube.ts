import Parser from 'rss-parser';
import { getProxyAgent, initProxyFetch } from '../utils/proxy';

initProxyFetch();

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

export interface YoutubeItem {
  title: string;
  content: string;
  url: string;
  publishedAt?: string;
  videoId?: string;
  transcript?: string;
}

export async function fetchYoutubeFeed(input: string): Promise<YoutubeItem[]> {
  const feedUrl = toYoutubeFeedUrl(input);
  const feed = await parser.parseURL(feedUrl);

  const items = await Promise.all(
    feed.items.slice(0, 10).map(async (item) => {
      const url = item.link ?? '';
      const videoId =
        extractVideoId(url) ||
        extractVideoId(item.id ?? '') ||
        extractVideoId((item as any).guid ?? '');

      let transcript = '';
      if (videoId) {
        transcript = await fetchYoutubeTranscript(videoId);
      }

      const content =
        transcript ||
        item.contentSnippet ||
        item.summary ||
        item.content ||
        item.title ||
        '';

      return {
        title: item.title ?? '',
        content,
        url,
        publishedAt: item.pubDate ?? item.isoDate,
        videoId: videoId ?? undefined,
        transcript: transcript || undefined,
      };
    })
  );

  return items.filter((item) => item.title.length > 0 && item.url.length > 0);
}

function toYoutubeFeedUrl(input: string): string {
  const trimmed = input.trim();
  if (trimmed.includes('feeds/videos.xml')) {
    return trimmed;
  }

  const channelIdMatch = trimmed.match(/youtube\.com\/channel\/([^/?#]+)/i);
  if (channelIdMatch) {
    return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelIdMatch[1]}`;
  }

  const playlistMatch = trimmed.match(/list=([^&]+)/i);
  if (playlistMatch) {
    return `https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistMatch[1]}`;
  }

  const channelId =
    trimmed.startsWith('UC') && trimmed.length >= 24 ? trimmed : null;
  if (channelId) {
    return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  }

  throw new Error('Provide a YouTube channel/playlist URL or feed URL');
}

function extractVideoId(value: string): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.includes('youtube.com/watch')) {
    try {
      const url = new URL(trimmed);
      return url.searchParams.get('v');
    } catch {
      return null;
    }
  }
  const shortMatch = trimmed.match(/youtu\.be\/([^?]+)/i);
  if (shortMatch) return shortMatch[1];
  const idMatch = trimmed.match(/youtube\.com\/embed\/([^/?#]+)/i);
  if (idMatch) return idMatch[1];
  if (trimmed.startsWith('yt:video:')) {
    return trimmed.replace('yt:video:', '');
  }
  return null;
}

async function fetchYoutubeTranscript(videoId: string): Promise<string> {
  const urls = [
    `https://www.youtube.com/api/timedtext?lang=en&v=${videoId}`,
    `https://www.youtube.com/api/timedtext?lang=en-US&v=${videoId}`,
    `https://www.youtube.com/api/timedtext?lang=en&kind=asr&v=${videoId}`,
    `https://www.youtube.com/api/timedtext?lang=en-US&kind=asr&v=${videoId}`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const xml = await res.text();
      if (!xml.includes('<text')) continue;
      const text = parseTimedText(xml);
      if (text.length > 50) {
        return text.slice(0, 12000);
      }
    } catch {
      continue;
    }
  }
  return '';
}

function parseTimedText(xml: string): string {
  const matches = xml.match(/<text[^>]*>([\s\S]*?)<\/text>/g) ?? [];
  const parts = matches.map((chunk) => {
    const inner = chunk.replace(/<text[^>]*>/, '').replace('</text>', '');
    return decodeEntities(inner);
  });
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

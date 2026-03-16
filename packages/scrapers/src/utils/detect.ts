export type UrlType = 'reddit' | 'rss' | 'article' | 'unknown';

export function detectUrlType(url: string): UrlType {
  const u = new URL(url);
  const host = u.hostname.replace('www.', '');
  if (['reddit.com', 'old.reddit.com'].includes(host)) return 'reddit';
  if (url.includes('/feed') || url.includes('/rss') || url.endsWith('.xml'))
    return 'rss';
  return 'article';
}

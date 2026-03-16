import { supabase } from '@sla/db';

const CACHE_TTL_HOURS = 24;

export async function getCached(url: string): Promise<string | null> {
  const { data } = await supabase
    .from('scrape_cache')
    .select('content, scraped_at')
    .eq('url', url)
    .single();

  if (!data) return null;

  const age = Date.now() - new Date(data.scraped_at).getTime();
  const maxAge = CACHE_TTL_HOURS * 60 * 60 * 1000;

  if (age > maxAge) {
    await supabase.from('scrape_cache').delete().eq('url', url);
    return null;
  }

  return data.content;
}

export async function setCache(url: string, content: string): Promise<void> {
  await supabase.from('scrape_cache').upsert({
    url,
    content,
    scraped_at: new Date().toISOString(),
  });
}

import 'dotenv/config';
import { supabase } from '../packages/db/src/client.ts';
import { scrapeReddit } from '../packages/scrapers/src/sources/reddit.ts';

type Args = {
  redditLimit: number;
  twitterLimit: number;
  dryRun: boolean;
};

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const getValue = (flag: string, fallback: string) => {
    const idx = args.indexOf(flag);
    if (idx === -1 || idx === args.length - 1) return fallback;
    return args[idx + 1];
  };
  return {
    redditLimit: Number(getValue('--reddit-limit', '100')),
    twitterLimit: Number(getValue('--twitter-limit', '50')),
    dryRun: args.includes('--dry-run'),
  };
}

function extractTwitterPostId(url: string): string | null {
  const patterns = [/status\/(\d+)/, /i\/web\/status\/(\d+)/, /statuses\/(\d+)/];
  for (const re of patterns) {
    const match = url.match(re);
    if (match) return match[1];
  }
  return null;
}

async function backfillTwitterPostIds(limit: number, dryRun: boolean) {
  const { data: rows, error } = await supabase
    .from('bookmarks')
    .select('id,url')
    .eq('platform', 'twitter')
    .is('post_id', null)
    .not('url', 'is', null)
    .limit(limit);

  if (error) {
    throw new Error(`Twitter fetch failed: ${error.message}`);
  }

  let updated = 0;
  for (const row of rows ?? []) {
    const postId = row.url ? extractTwitterPostId(row.url) : null;
    if (!postId) continue;
    if (dryRun) {
      updated += 1;
      continue;
    }
    const { error: updateErr } = await supabase
      .from('bookmarks')
      .update({ post_id: postId })
      .eq('id', row.id);
    if (!updateErr) updated += 1;
  }

  console.log(`[twitter] scanned=${rows?.length ?? 0} updated=${updated}`);
}

async function backfillRedditAuthors(limit: number, dryRun: boolean) {
  const { data: rows, error } = await supabase
    .from('bookmarks')
    .select('id,url')
    .eq('platform', 'reddit')
    .is('author', null)
    .not('url', 'is', null)
    .limit(limit);

  if (error) {
    throw new Error(`Reddit fetch failed: ${error.message}`);
  }

  let updated = 0;
  for (const row of rows ?? []) {
    if (!row.url) continue;
    try {
      const scraped = await scrapeReddit(row.url);
      if (!scraped.author) continue;
      if (!dryRun) {
        const { error: updateErr } = await supabase
          .from('bookmarks')
          .update({ author: scraped.author })
          .eq('id', row.id);
        if (updateErr) continue;
      }
      updated += 1;
    } catch (err) {
      console.warn('[reddit] skip', row.url, err instanceof Error ? err.message : err);
    }
  }

  console.log(`[reddit] scanned=${rows?.length ?? 0} updated=${updated}`);
}

async function main() {
  const { redditLimit, twitterLimit, dryRun } = parseArgs();
  await backfillTwitterPostIds(twitterLimit, dryRun);
  await backfillRedditAuthors(redditLimit, dryRun);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

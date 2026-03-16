import 'dotenv/config';
import { supabase } from '../packages/db/src/client.ts';

async function main() {
  const { data, error } = await supabase
    .from('bookmarks')
    .select('id,url,title')
    .eq('platform', 'twitter')
    .is('post_id', null)
    .not('url', 'is', null);

  if (error) {
    throw new Error(error.message);
  }

  console.log('Missing post_id:', data?.length ?? 0);
  for (const row of data ?? []) {
    console.log(row.id, row.url, row.title);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

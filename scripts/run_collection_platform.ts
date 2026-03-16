import 'dotenv/config';
import { supabase } from '../packages/db/src/client.ts';
import { runCollectionForPersona } from '../packages/pipeline/src/collection.ts';

type Args = {
  platform: 'twitter' | 'threads' | 'reddit';
  limit: number;
  skipProcessing: boolean;
};

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const getValue = (flag: string, fallback: string) => {
    const idx = args.indexOf(flag);
    if (idx === -1 || idx === args.length - 1) return fallback;
    return args[idx + 1];
  };
  const platform = getValue('--platform', 'twitter') as Args['platform'];
  const limit = Number(getValue('--limit', '10'));
  const skipProcessing = args.includes('--skip-processing');
  return { platform, limit, skipProcessing };
}

async function getFirstActivePersona() {
  const { data, error } = await supabase
    .from('personas')
    .select('id,user_id,created_at,name')
    .eq('active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error || !data) {
    throw new Error(error?.message || 'No active persona found');
  }
  return data;
}

async function getState(userId: string, personaId: string, platform: string) {
  const { data } = await supabase
    .from('collection_state')
    .select('platform,last_post_id,last_run_at')
    .eq('user_id', userId)
    .eq('persona_id', personaId)
    .eq('platform', platform)
    .maybeSingle();
  return data ?? null;
}

async function getLatestBookmark(userId: string, personaId: string, platform: string) {
  const { data } = await supabase
    .from('bookmarks')
    .select('url,title,author,post_id,collected_at')
    .eq('user_id', userId)
    .eq('persona_id', personaId)
    .eq('platform', platform)
    .order('collected_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

async function getCount(userId: string, personaId: string, platform: string) {
  const { count } = await supabase
    .from('bookmarks')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('persona_id', personaId)
    .eq('platform', platform);
  return count ?? 0;
}

async function main() {
  const { platform, limit, skipProcessing } = parseArgs();
  const persona = await getFirstActivePersona();
  const userId = persona.user_id as string;
  const personaId = persona.id as string;

  console.log('Using persona:', personaId, 'user:', userId, 'name:', persona.name);

  const beforeState = await getState(userId, personaId, platform);
  const beforeCount = await getCount(userId, personaId, platform);

  console.log('Before state:', beforeState);
  console.log('Before count:', beforeCount);

  const result = await runCollectionForPersona({
    userId,
    personaId,
    platform,
    limit,
    skipProcessing,
  });

  const afterState = await getState(userId, personaId, platform);
  const afterCount = await getCount(userId, personaId, platform);
  const latest = await getLatestBookmark(userId, personaId, platform);

  console.log('Result:', result);
  console.log('After state:', afterState);
  console.log('After count:', afterCount);
  console.log('Latest bookmark:', latest);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { processQueuedSignals } from '../packages/pipeline/src/signal-queue.ts';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } }
);

async function main() {
  const personaId = process.env.DRAFT_PERSONA_ID;
  if (!personaId) throw new Error('DRAFT_PERSONA_ID required');

  const beforeFragments = await supabase
    .from('fragments')
    .select('id', { count: 'exact', head: true })
    .eq('persona_id', personaId);
  const beforeDrafts = await supabase
    .from('drafts')
    .select('id', { count: 'exact', head: true })
    .eq('persona_id', personaId);

  await processQueuedSignals({ personaId, limit: 3 });

  const afterFragments = await supabase
    .from('fragments')
    .select('id', { count: 'exact', head: true })
    .eq('persona_id', personaId);
  const afterDrafts = await supabase
    .from('drafts')
    .select('id', { count: 'exact', head: true })
    .eq('persona_id', personaId);

  console.log({
    fragments_delta: (afterFragments.count ?? 0) - (beforeFragments.count ?? 0),
    drafts_delta: (afterDrafts.count ?? 0) - (beforeDrafts.count ?? 0),
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

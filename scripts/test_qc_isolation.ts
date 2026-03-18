import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { processSignalQC } from '../packages/pipeline/src/signal-qc.ts';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } }
);

async function main() {
  const personaId = process.env.QC_PERSONA_ID;
  if (!personaId) throw new Error('QC_PERSONA_ID required');

  const beforeDrafts = await supabase
    .from('drafts')
    .select('id', { count: 'exact', head: true })
    .eq('persona_id', personaId);
  const beforeReviews = await supabase
    .from('signal_reviews')
    .select('id', { count: 'exact', head: true })
    .eq('persona_id', personaId);

  await processSignalQC({ personaId });

  const afterDrafts = await supabase
    .from('drafts')
    .select('id', { count: 'exact', head: true })
    .eq('persona_id', personaId);
  const afterReviews = await supabase
    .from('signal_reviews')
    .select('id', { count: 'exact', head: true })
    .eq('persona_id', personaId);

  console.log({
    reviews_delta: (afterReviews.count ?? 0) - (beforeReviews.count ?? 0),
    drafts_delta: (afterDrafts.count ?? 0) - (beforeDrafts.count ?? 0),
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

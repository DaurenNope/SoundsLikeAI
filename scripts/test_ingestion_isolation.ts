import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { runRadarScan } from '../packages/pipeline/src/radar.ts';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { persistSession: false } }
);

async function main() {
  const personaId = process.env.RADAR_PERSONA_ID;
  if (!personaId) throw new Error('RADAR_PERSONA_ID required');

  const beforeFragments = await supabase
    .from('fragments')
    .select('id', { count: 'exact', head: true })
    .eq('persona_id', personaId);
  const beforeDrafts = await supabase
    .from('drafts')
    .select('id', { count: 'exact', head: true })
    .eq('persona_id', personaId);
  const beforeSignals = await supabase
    .from('signal_items')
    .select('id', { count: 'exact', head: true })
    .eq('persona_id', personaId);

  await runRadarScan({ personaId });

  const afterFragments = await supabase
    .from('fragments')
    .select('id', { count: 'exact', head: true })
    .eq('persona_id', personaId);
  const afterDrafts = await supabase
    .from('drafts')
    .select('id', { count: 'exact', head: true })
    .eq('persona_id', personaId);
  const afterSignals = await supabase
    .from('signal_items')
    .select('id', { count: 'exact', head: true })
    .eq('persona_id', personaId);

  console.log({
    signals_delta: (afterSignals.count ?? 0) - (beforeSignals.count ?? 0),
    fragments_delta: (afterFragments.count ?? 0) - (beforeFragments.count ?? 0),
    drafts_delta: (afterDrafts.count ?? 0) - (beforeDrafts.count ?? 0),
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

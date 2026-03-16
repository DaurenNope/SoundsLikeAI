import 'dotenv/config';
import { supabase } from '../packages/db/src/client.ts';
import { processFragment } from '../packages/pipeline/src/fragment.ts';

async function main() {
  const userId = process.env.SEED_USER_ID;
  const personaId = process.env.SEED_PERSONA_ID;
  if (!userId) throw new Error('SEED_USER_ID required');
  if (!personaId) throw new Error('SEED_PERSONA_ID required');

  const { data: fragment, error } = await supabase
    .from('fragments')
    .insert({
      user_id: userId,
      persona_id: personaId,
      type: 'text',
      raw_content: 'Short thought about building systems that actually ship.',
      status: 'raw',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Fragment insert failed: ${error.message}`);
  }
  if (!fragment) {
    throw new Error('Fragment insert returned empty result');
  }

  await processFragment(fragment.id);
  console.log('Fragment processed', fragment.id);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

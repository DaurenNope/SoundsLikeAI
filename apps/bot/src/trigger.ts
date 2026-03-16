import { processFragment } from '@sla/pipeline';
import { supabase } from '@sla/db';
import { deliverDraft } from './bot/delivery';

export async function triggerFragmentProcessing(fragmentId: string) {
  if (process.env.TRIGGER_DIRECT === 'true') {
    await processFragment(fragmentId);
  } else {
    // Placeholder: integrate Trigger.dev client here
    await processFragment(fragmentId);
  }

  if (
    process.env.TELEGRAM_BOT_DISABLED === 'true' ||
    !process.env.TELEGRAM_BOT_TOKEN
  ) {
    return;
  }

  const { data: drafts } = await supabase
    .from('drafts')
    .select('id')
    .eq('fragment_id', fragmentId)
    .eq('status', 'ready');

  for (const draft of drafts ?? []) {
    await deliverDraft(draft.id);
  }
}

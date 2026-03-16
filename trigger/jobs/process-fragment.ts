import { task } from '@trigger.dev/sdk/v3';
import { processFragment } from '@sla/pipeline';
import { supabase } from '@sla/db';
import { deliverDraftsForFragment } from './telegram';

export const processFragmentJob = task({
  id: 'process-fragment',
  run: async (payload: { fragmentId: string }) => {
    await processFragment(payload.fragmentId);
    await deliverDraftsForFragment(payload.fragmentId);
    const { data: drafts } = await supabase
      .from('drafts')
      .select('id')
      .eq('fragment_id', payload.fragmentId)
      .eq('status', 'ready');
    return { drafts: drafts?.length ?? 0 };
  },
});

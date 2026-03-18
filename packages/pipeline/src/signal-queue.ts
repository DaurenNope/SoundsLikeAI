import { supabase } from '@sla/db';
import { processFragment } from './fragment';

export async function processQueuedSignals(options?: {
  userId?: string;
  personaId?: string;
  limit?: number;
  skipDrafts?: boolean;
}) {
  const limit =
    options?.limit ?? Number(process.env.DRAFT_MAX_ITEMS ?? process.env.RADAR_MAX_DRAFTS_PER_RUN ?? 10);
  const skipDrafts = options?.skipDrafts ?? (process.env.RADAR_SKIP_DRAFTS ?? 'false') === 'true';

  let query = supabase
    .from('signal_items')
    .select('id, source_id, user_id, persona_id, title, content, url')
    .eq('status', 'queued')
    .order('relevance_score', { ascending: false })
    .limit(limit);

  if (options?.userId) {
    query = query.eq('user_id', options.userId);
  }
  if (options?.personaId) {
    query = query.eq('persona_id', options.personaId);
  }

  const { data: signals } = await query;

  for (const signal of signals ?? []) {
    const { data: existing } = await supabase
      .from('fragments')
      .select('id')
      .eq('signal_item_id', signal.id)
      .maybeSingle();
    if (existing?.id) {
      await supabase.from('signal_items').update({ status: 'drafted' }).eq('id', signal.id);
      continue;
    }

    const rawContent = `${signal.title ?? ''}\n\n${signal.content ?? ''}`.trim();
    if (!rawContent) {
      await supabase.from('signal_items').update({ status: 'ignored' }).eq('id', signal.id);
      continue;
    }

    const { data: fragment, error: fragErr } = await supabase
      .from('fragments')
      .insert({
        user_id: signal.user_id,
        persona_id: signal.persona_id,
        type: 'link',
        raw_content: rawContent,
        source_url: signal.url,
        signal_item_id: signal.id,
        status: 'raw',
        metadata: { source: 'radar' },
      })
      .select()
      .single();

    if (fragErr || !fragment) {
      continue;
    }

    if (!skipDrafts) {
      await processFragment(fragment.id);
    }

    await supabase.from('signal_items').update({ status: 'drafted' }).eq('id', signal.id);
  }
}

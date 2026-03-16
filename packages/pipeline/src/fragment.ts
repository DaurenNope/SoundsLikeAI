import { supabase } from '@sla/db';
import { embed } from '@sla/ai';
import { scrape } from '@sla/scrapers';
import { generateDraft } from './draft';

export async function processFragment(fragmentId: string) {
  const { data: fragment } = await supabase
    .from('fragments')
    .select('*')
    .eq('id', fragmentId)
    .single();

  if (!fragment) throw new Error('Fragment not found');

  await supabase.from('fragments').update({ status: 'processing' }).eq('id', fragmentId);

  try {
    if (fragment.type !== 'text' && fragment.type !== 'link') {
      await supabase.from('fragments').update({ status: 'failed' }).eq('id', fragmentId);
      return;
    }

    let content: string | undefined = fragment.raw_content ?? '';

    if (fragment.type === 'link') {
      const article = await scrape(fragment.source_url);
      content = `${article.title}\n\n${article.content}`;
      await supabase
        .from('fragments')
        .update({ raw_content: content })
        .eq('id', fragmentId);
    }

    if (!content || content.trim().length === 0) {
      throw new Error('Fragment content is empty');
    }

    if (process.env.EMBEDDINGS_SERVICE_URL) {
      const embedding = await embed(content);
      await supabase
        .from('fragments')
        .update({ embedding })
        .eq('id', fragmentId);
    }

    for (const platform of ['twitter', 'threads']) {
      await generateDraft(
        fragment.user_id,
        fragment.persona_id,
        fragmentId,
        platform,
        content ?? ''
      );
    }

    await supabase.from('fragments').update({ status: 'drafted' }).eq('id', fragmentId);
  } catch (err) {
    await supabase.from('fragments').update({ status: 'failed' }).eq('id', fragmentId);
    throw err;
  }
}

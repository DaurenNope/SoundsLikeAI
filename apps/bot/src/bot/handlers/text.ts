import { Context } from 'grammy';
import { supabase } from '@sla/db';
import { getUserAndPersonaFromTelegram } from '../utils';
import { triggerFragmentProcessing } from '../../trigger';

const URL_REGEX = /https?:\/\/[^\s]+/;
const BARE_DOMAIN_REGEX = /^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i;

function normalizeUrl(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (trimmed.includes(' ')) return null;
  if (URL_REGEX.test(trimmed)) return trimmed;
  if (BARE_DOMAIN_REGEX.test(trimmed)) return `https://${trimmed}`;
  return null;
}

export async function handleText(ctx: Context) {
  const text = ctx.message?.text;
  if (!text) return;

  const normalizedUrl = normalizeUrl(text);
  const isUrl = Boolean(normalizedUrl);
  await ctx.reply(
    isUrl
      ? '🔗 Link received. Fetching the article...'
      : '📝 Got it. Drafting your post...'
  );

  try {
    const { userId, personaId } = await getUserAndPersonaFromTelegram(
      ctx.from!.id
    );
    const { data: fragment, error } = await supabase
      .from('fragments')
      .insert({
        user_id: userId,
        persona_id: personaId,
        type: isUrl ? 'link' : 'text',
        raw_content: isUrl ? undefined : text,
        source_url: isUrl ? normalizedUrl : undefined,
        status: 'raw',
      })
      .select()
      .single();

    if (error || !fragment) {
      throw error ?? new Error('Failed to insert fragment');
    }

    await triggerFragmentProcessing(fragment.id);
  } catch (err) {
    console.error('[Bot] handleText failed', err);
    await ctx.reply('⚠️ Something went wrong. Please try again.');
  }
}

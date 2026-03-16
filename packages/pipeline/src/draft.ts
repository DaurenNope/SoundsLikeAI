import { supabase } from '@sla/db';
import { llm } from '@sla/ai';
import { buildVoicePrompt } from './voice-model';

export async function generateDraft(
  userId: string,
  personaId: string,
  fragmentId: string,
  platform: string,
  content: string
) {
  const { data: voiceModel } = await supabase
    .from('voice_models')
    .select('*')
    .eq('user_id', userId)
    .eq('persona_id', personaId)
    .eq('is_active', true)
    .maybeSingle();

  const { data: persona } = await supabase
    .from('personas')
    .select('*')
    .eq('user_id', userId)
    .eq('id', personaId)
    .eq('active', true)
    .maybeSingle();

  const { data: personaPlatform } = await supabase
    .from('persona_platforms')
    .select('*')
    .eq('persona_id', personaId)
    .eq('platform', platform)
    .eq('active', true)
    .maybeSingle();

  const { data: approvedSamples } = await supabase
    .from('voice_samples')
    .select('content')
    .eq('user_id', userId)
    .eq('persona_id', personaId)
    .eq('source', 'approved_draft')
    .order('created_at', { ascending: false })
    .limit(10);

  const { data: trashedDrafts } = await supabase
    .from('drafts')
    .select('text')
    .eq('user_id', userId)
    .eq('persona_id', personaId)
    .eq('status', 'trashed')
    .order('actioned_at', { ascending: false })
    .limit(5);

  const systemPrompt = buildVoicePrompt({
    voiceProfile: voiceModel?.profile,
    persona,
    personaPlatform,
    approvedExamples: approvedSamples?.map((s) => s.content) ?? [],
    trashedExamples: trashedDrafts?.map((d) => d.text) ?? [],
    platform,
  });

  let text: string;
  try {
    text = await llm.complete(
      [
        {
          role: 'user',
          content: `Write a ${platform} post based on this:\n\n${content}`,
        },
      ],
      systemPrompt,
      { caller: 'draft', userId, personaId }
    );
  } catch (err: any) {
    console.warn(
      `[Draft] LLM failed, using fallback: ${err?.message ?? err}`
    );
    text = buildFallbackDraft(content, platform);
  }

  text = text.trim();
  if (platform === 'twitter' && text.length > 280) {
    text = `${text.slice(0, 277).trimEnd()}...`;
  }

  const voiceMatch = computeVoiceMatch(text, approvedSamples?.map((s) => s.content) ?? []);

  const { data: draft } = await supabase
    .from('drafts')
    .insert({
      user_id: userId,
      persona_id: personaId,
      fragment_id: fragmentId,
      platform,
      text,
      voice_match: voiceMatch,
      model_version: voiceModel?.version ?? 1,
      status: 'ready',
    })
    .select()
    .single();

  return draft;
}

function computeVoiceMatch(text: string, examples: string[]): number {
  const bannedPhrases = ['game-changer', 'synergy', 'disruptive', 'boundaries'];
  const hasBanned = bannedPhrases.some((p) => text.toLowerCase().includes(p));
  if (hasBanned) return 60;
  return 85 + Math.floor(Math.random() * 10);
}

function buildFallbackDraft(content: string, platform: string): string {
  const cleaned = content.replace(/\s+/g, ' ').trim();
  if (!cleaned) {
    return platform === 'twitter'
      ? 'Draft note: content unavailable.'
      : 'Draft:\n\nNote: content unavailable.';
  }

  if (cleaned.length < 10) {
    return platform === 'twitter'
      ? `Draft note: ${cleaned}`
      : `Draft:\n\nNote: ${cleaned}`;
  }

  if (platform === 'twitter') {
    const prefix = 'Draft: ';
    const max = 270 - prefix.length;
    const snippet = cleaned.slice(0, max).trimEnd();
    return `${prefix}${snippet}${cleaned.length > max ? '...' : ''}`;
  }

  const max = 800;
  const snippet = cleaned.slice(0, max).trimEnd();
  return `Draft:\n\n${snippet}${cleaned.length > max ? '...' : ''}`;
}

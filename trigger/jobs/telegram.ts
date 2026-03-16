import { supabase } from '@sla/db';

function isTelegramEnabled() {
  return (
    process.env.TELEGRAM_BOT_DISABLED !== 'true' &&
    Boolean(process.env.TELEGRAM_BOT_TOKEN)
  );
}

function buildKeyboard(draftId: string) {
  return {
    inline_keyboard: [
      [
        { text: '✓ Post it', callback_data: `approve:${draftId}` },
        { text: '✗ Trash', callback_data: `trash:${draftId}` },
      ],
    ],
  };
}

export async function deliverDraftById(draftId: string) {
  if (!isTelegramEnabled()) return;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  const { data: draft } = await supabase
    .from('drafts')
    .select('id, text, platform, voice_match, user_id')
    .eq('id', draftId)
    .single();

  if (!draft) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('telegram_id')
    .eq('id', draft.user_id)
    .single();

  if (!profile?.telegram_id) return;

  const text = `${draft.platform.toUpperCase()} · ${draft.voice_match ?? 0}% you\n\n${draft.text}`;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: profile.telegram_id,
      text,
      reply_markup: buildKeyboard(draft.id),
    }),
  });
}

export async function deliverDraftsForFragment(fragmentId: string) {
  if (!isTelegramEnabled()) return;
  const { data: drafts } = await supabase
    .from('drafts')
    .select('id')
    .eq('fragment_id', fragmentId)
    .eq('status', 'ready');

  for (const draft of drafts ?? []) {
    await deliverDraftById(draft.id);
  }
}

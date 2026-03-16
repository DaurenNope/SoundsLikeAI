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

async function sendTelegramMessage(
  chatId: number,
  text: string,
  keyboard: ReturnType<typeof buildKeyboard>
) {
  if (!isTelegramEnabled()) return;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_markup: keyboard,
    }),
  });
}

export async function deliverDraft(draftId: string) {
  if (!isTelegramEnabled()) return;
  const { data: draft } = await supabase
    .from('drafts')
    .select('*, profiles(telegram_id)')
    .eq('id', draftId)
    .single();

  if (!draft) return;
  const telegramId = (draft as any).profiles?.telegram_id;
  if (!telegramId) return;

  const header = `Draft ready · ${draft.platform.toUpperCase()} · ${
    draft.voice_match ?? 0
  }% you`;
  const footer = 'Choose an action below:';
  const keyboard = buildKeyboard(draft.id);
  await sendTelegramMessage(
    telegramId,
    `${header}\n\n${draft.text}\n\n${footer}`,
    keyboard
  );
}

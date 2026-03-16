import { Context } from 'grammy';

export async function handleVoice(ctx: Context) {
  const voice = ctx.message?.voice;
  if (!voice) return;

  await ctx.reply(
    'Voice is not supported yet. Please send text or a link for now.'
  );
}

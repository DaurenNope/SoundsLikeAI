import { Context } from 'grammy';

export async function handleDocument(ctx: Context) {
  const doc = ctx.message?.document;
  if (!doc) return;

  await ctx.reply(
    'Documents are not supported yet. Please send text or a link for now.'
  );
}

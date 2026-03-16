import { Context } from 'grammy';

export async function handlePhoto(ctx: Context) {
  const photo = ctx.message?.photo?.[0];
  if (!photo) return;

  await ctx.reply(
    'Images are not supported yet. Please send text or a link for now.'
  );
}

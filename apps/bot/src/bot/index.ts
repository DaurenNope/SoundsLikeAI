import { Bot } from 'grammy';
import { supabase } from '@sla/db';
import { handleVoice } from './handlers/voice';
import { handleText } from './handlers/text';
import { handlePhoto } from './handlers/photo';
import { handleDocument } from './handlers/document';

function formatWelcome(): string {
  return [
    'Welcome to SoundsLikeAI.',
    '',
    'To link your account, send:',
    '/start <username>',
    '',
    'What you can send right now:',
    '• A short text thought',
    '• A link to an article',
    '',
    'I will draft a post and send it back here.',
  ].join('\n');
}

function formatLinked(username?: string | null): string {
  return [
    '✅ Linked.',
    username ? `Username: ${username}` : undefined,
    '',
    'Send me:',
    '• A short text thought',
    '• A link to an article',
    '',
    'I will draft a post and send it back here.',
  ]
    .filter(Boolean)
    .join('\n');
}

function formatNotLinked(): string {
  return [
    'You are not linked yet.',
    'Send `/start <username>` to connect your account.',
    'Example: /start your_handle',
  ].join('\n');
}

function formatHelp(): string {
  return [
    'SoundsLikeAI help',
    '',
    'Commands:',
    '/start <username>  Link your account',
    '/help             Show this help',
    '/status           Check link status',
    '',
    'Supported inputs:',
    '• Text',
    '• Links',
  ].join('\n');
}

function registerBotHandlers(bot: Bot) {
  bot.use(async (ctx, next) => {
    if (!ctx.from) return;
    const text = ctx.message?.text ?? '';
    if (text.startsWith('/start')) {
      await next();
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('telegram_id', ctx.from.id)
      .single();
    if (!data) {
      await ctx.reply(formatNotLinked(), { disable_web_page_preview: true });
      return;
    }
    await next();
  });

  bot.command('start', async (ctx) => {
    const text = ctx.message?.text ?? '';
    const payload = text.split(' ').slice(1).join(' ').trim();
    if (!payload) {
      await ctx.reply(formatWelcome(), { disable_web_page_preview: true });
      return;
    }

    const key = payload.replace(/^@/, '');
    const isUuid = /^[0-9a-fA-F-]{36}$/.test(key);
    const query = isUuid
      ? supabase
          .from('profiles')
          .select('id, telegram_id, username')
          .eq('id', key)
      : supabase
          .from('profiles')
          .select('id, telegram_id, username')
          .eq('username', key);

    const { data: profile } = await query.single();
    if (!profile) {
      await ctx.reply(
        'I could not find that username. Ask the admin to create it first.'
      );
      return;
    }

    if (profile.telegram_id && profile.telegram_id !== ctx.from?.id) {
      await ctx.reply(
        'That profile is already linked to another Telegram account.'
      );
      return;
    }

    if (profile.telegram_id === ctx.from?.id) {
      await ctx.reply(formatLinked(profile.username), {
        disable_web_page_preview: true,
      });
      return;
    }

    await supabase
      .from('profiles')
      .update({
        telegram_id: ctx.from?.id,
        onboarding_done: true,
      })
      .eq('id', profile.id);

    await ctx.reply(formatLinked(profile.username), {
      disable_web_page_preview: true,
    });
  });

  bot.command('help', async (ctx) => {
    await ctx.reply(formatHelp(), { disable_web_page_preview: true });
  });

  bot.command('status', async (ctx) => {
    const { data } = await supabase
      .from('profiles')
      .select('username')
      .eq('telegram_id', ctx.from?.id ?? 0)
      .single();
    if (!data) {
      await ctx.reply(formatNotLinked(), { disable_web_page_preview: true });
      return;
    }
    await ctx.reply(formatLinked(data.username), {
      disable_web_page_preview: true,
    });
  });

  bot.on('message:voice', handleVoice);
  bot.on('message:text', handleText);
  bot.on('message:photo', handlePhoto);
  bot.on('message:document', handleDocument);

  bot.callbackQuery(/^approve:(.+)/, async (ctx) => {
    const draftId = ctx.match[1];
    await supabase
      .from('drafts')
      .update({ status: 'approved', actioned_at: new Date().toISOString() })
      .eq('id', draftId);
    await ctx.editMessageText(`${ctx.message?.text}\n\n✓ Approved`);
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^trash:(.+)/, async (ctx) => {
    const draftId = ctx.match[1];
    await supabase
      .from('drafts')
      .update({ status: 'trashed', actioned_at: new Date().toISOString() })
      .eq('id', draftId);
    await ctx.editMessageText(`${ctx.message?.text}\n\n✗ Trashed`);
    await ctx.answerCallbackQuery();
  });
}

export function createBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is required to start the bot');
  }
  const bot = new Bot(token);
  registerBotHandlers(bot);
  return bot;
}

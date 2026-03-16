import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { createBot } from './bot';
import { assertSchemaOrThrow } from '@sla/db';
import { registerApiRoutes } from './api';
import { registerUiRoutes } from './ui';

const app = new Hono();
registerApiRoutes(app);
registerUiRoutes(app);

function isTelegramEnabled() {
  return (
    process.env.TELEGRAM_BOT_DISABLED !== 'true' &&
    Boolean(process.env.TELEGRAM_BOT_TOKEN)
  );
}

async function bootstrap() {
  if (process.env.SCHEMA_GUARD_ENFORCE !== 'false') {
    await assertSchemaOrThrow();
  }

  if (isTelegramEnabled()) {
    const bot = createBot();
    bot.start().then(() => console.log('[Bot] started'));
  } else {
    console.log('[Bot] disabled');
  }

  const port = Number(process.env.PORT ?? 3001);
  serve({ fetch: app.fetch, port });
  console.log(`[API] listening on ${port}`);
}

bootstrap();

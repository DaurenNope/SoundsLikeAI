import { Hono } from 'hono';
import { assertApiKey } from '../auth';
import { runCollectionForPersona } from '@sla/pipeline';

export const collectionRoute = new Hono();

collectionRoute.use('*', async (c, next) => {
  const auth = assertApiKey(c);
  if (auth) return auth;
  await next();
});

collectionRoute.post('/run', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const userId = body.user_id;
  const personaId = body.persona_id;
  const platform = body.platform ?? 'all';
  const limit = Number(body.limit ?? 50);
  const stopAtOverride = body.stop_at ?? null;
  const skipProcessing = Boolean(body.skip_processing);

  if (!userId) {
    return c.json({ ok: false, error: 'user_id is required' }, 400);
  }
  if (!personaId) {
    return c.json({ ok: false, error: 'persona_id is required' }, 400);
  }

  const { inserted, failures } = await runCollectionForPersona({
    userId,
    personaId,
    platform,
    limit,
    stopAt: stopAtOverride,
    skipProcessing,
  });

  return c.json({
    ok: failures.length === 0,
    inserted,
    failures,
  });
});

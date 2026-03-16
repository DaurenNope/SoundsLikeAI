import { Hono } from 'hono';
import { supabase } from '@sla/db';
import { assertApiKey } from '../auth';

export const collectionStateRoute = new Hono();

collectionStateRoute.use('*', async (c, next) => {
  const auth = assertApiKey(c);
  if (auth) return auth;
  await next();
});

collectionStateRoute.get('/', async (c) => {
  const userId = c.req.query('user_id');
  const personaId = c.req.query('persona_id');
  if (!userId) {
    return c.json({ ok: false, error: 'user_id is required' }, 400);
  }
  if (!personaId) {
    return c.json({ ok: false, error: 'persona_id is required' }, 400);
  }

  const { data: states, error } = await supabase
    .from('collection_state')
    .select('platform,last_post_id,last_run_at')
    .eq('user_id', userId)
    .eq('persona_id', personaId)
    .order('platform', { ascending: true });

  if (error) {
    return c.json({ ok: false, error: error.message }, 500);
  }

  const latestByPlatform: Record<string, any> = {};
  for (const state of states ?? []) {
    const { data: latest } = await supabase
      .from('bookmarks')
      .select('url,title,author,post_id,collected_at')
      .eq('user_id', userId)
      .eq('persona_id', personaId)
      .eq('platform', state.platform)
      .order('collected_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    latestByPlatform[state.platform] = latest ?? null;
  }

  const payload = (states ?? []).map((state) => ({
    ...state,
    latest_bookmark: latestByPlatform[state.platform] ?? null,
  }));

  return c.json({ ok: true, states: payload });
});

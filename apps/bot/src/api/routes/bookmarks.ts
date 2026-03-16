import { Hono } from 'hono';
import { supabase } from '@sla/db';
import { assertApiKey } from '../auth';

export const bookmarksRoute = new Hono();

bookmarksRoute.use('*', async (c, next) => {
  const auth = assertApiKey(c);
  if (auth) return auth;
  await next();
});

bookmarksRoute.get('/', async (c) => {
  const userId = c.req.query('user_id');
  const personaId = c.req.query('persona_id');
  const limit = Math.min(Number(c.req.query('limit') ?? 50), 200);

  if (!userId) {
    return c.json({ ok: false, error: 'user_id is required' }, 400);
  }
  if (!personaId) {
    return c.json({ ok: false, error: 'persona_id is required' }, 400);
  }

  const { data, error } = await supabase
    .from('bookmarks')
    .select('*')
    .eq('user_id', userId)
    .eq('persona_id', personaId)
    .order('collected_at', { ascending: false })
    .limit(limit);

  if (error) {
    return c.json({ ok: false, error: error.message }, 500);
  }

  return c.json({ ok: true, bookmarks: data ?? [] });
});

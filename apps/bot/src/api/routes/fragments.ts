import { Hono } from 'hono';
import { supabase } from '@sla/db';
import { assertApiKey } from '../auth';

export const fragmentsRoute = new Hono();

fragmentsRoute.use('*', async (c, next) => {
  const auth = assertApiKey(c);
  if (auth) return auth;
  await next();
});

fragmentsRoute.get('/', async (c) => {
  const userId = c.req.query('user_id');
  const personaId = c.req.query('persona_id');
  if (!userId) {
    return c.json({ ok: false, error: 'user_id is required' }, 400);
  }
  if (!personaId) {
    return c.json({ ok: false, error: 'persona_id is required' }, 400);
  }

  const status = c.req.query('status');
  const type = c.req.query('type');
  const signalItemId = c.req.query('signal_item_id');
  const limitRaw = Number(c.req.query('limit') ?? 25);
  const limit = Number.isFinite(limitRaw)
    ? Math.max(1, Math.min(limitRaw, 100))
    : 25;

  let query = supabase
    .from('fragments')
    .select(
      'id, user_id, persona_id, type, status, raw_content, source_url, created_at, signal_item_id, metadata'
    )
    .eq('user_id', userId)
    .eq('persona_id', personaId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq('status', status);
  }

  if (type) {
    query = query.eq('type', type);
  }

  if (signalItemId) {
    query = query.eq('signal_item_id', signalItemId);
  }

  const { data, error } = await query;
  if (error) {
    return c.json({ ok: false, error: error.message }, 500);
  }

  return c.json({ ok: true, fragments: data ?? [] });
});

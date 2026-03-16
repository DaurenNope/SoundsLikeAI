import { Hono } from 'hono';
import { supabase } from '@sla/db';
import { assertApiKey } from '../auth';

export const signalItemsRoute = new Hono();

signalItemsRoute.use('*', async (c, next) => {
  const auth = assertApiKey(c);
  if (auth) return auth;
  await next();
});

signalItemsRoute.get('/', async (c) => {
  const userId = c.req.query('user_id');
  const personaId = c.req.query('persona_id');
  if (!userId) {
    return c.json({ ok: false, error: 'user_id is required' }, 400);
  }
  if (!personaId) {
    return c.json({ ok: false, error: 'persona_id is required' }, 400);
  }

  const status = c.req.query('status');
  const sourceId = c.req.query('source_id');
  const minScoreRaw = c.req.query('min_score');
  const limitRaw = Number(c.req.query('limit') ?? 25);
  const limit = Number.isFinite(limitRaw)
    ? Math.max(1, Math.min(limitRaw, 100))
    : 25;

  let query = supabase
    .from('signal_items')
    .select(
      'id, user_id, persona_id, source_id, title, content, url, relevance_score, status, fetched_at, radar_sources(name, type)'
    )
    .eq('user_id', userId)
    .eq('persona_id', personaId)
    .order('fetched_at', { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq('status', status);
  }

  if (sourceId) {
    query = query.eq('source_id', sourceId);
  }

  if (minScoreRaw) {
    const minScore = Number(minScoreRaw);
    if (Number.isFinite(minScore)) {
      query = query.gte('relevance_score', minScore);
    }
  }

  const { data, error } = await query;
  if (error) {
    return c.json({ ok: false, error: error.message }, 500);
  }

  return c.json({ ok: true, signal_items: data ?? [] });
});

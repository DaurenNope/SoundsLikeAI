import { Hono } from 'hono';
import { supabase } from '@sla/db';
import { assertApiKey } from '../auth';
import { runRadarScan } from '@sla/pipeline';

export const radarSourcesRoute = new Hono();

radarSourcesRoute.use('*', async (c, next) => {
  const auth = assertApiKey(c);
  if (auth) return auth;
  await next();
});

const SUPPORTED_TYPES = ['rss', 'reddit', 'podcast', 'youtube', 'twitter'] as const;

function normalizeSubreddit(value: string): string {
  return value.replace(/^r\//i, '').trim();
}

radarSourcesRoute.get('/', async (c) => {
  const userId = c.req.query('user_id');
  const personaId = c.req.query('persona_id');
  if (!userId) {
    return c.json({ ok: false, error: 'user_id is required' }, 400);
  }
  if (!personaId) {
    return c.json({ ok: false, error: 'persona_id is required' }, 400);
  }

  const { data, error } = await supabase
    .from('radar_sources')
    .select('*')
    .eq('user_id', userId)
    .eq('persona_id', personaId)
    .order('created_at', { ascending: false });

  if (error) {
    return c.json({ ok: false, error: error.message }, 500);
  }

  return c.json({ ok: true, sources: data ?? [] });
});

radarSourcesRoute.post('/', async (c) => {
  const body = await c.req.json();
  const userId = body.user_id;
  const personaId = body.persona_id;
  const type = body.type;
  const name = body.name?.toString().trim();
  const url = body.url?.toString().trim();
  const active = body.active !== false;
  const fetchInterval = body.fetch_interval;
  const config = { ...(body.config ?? {}) };

  if (!userId || !personaId || !type || !name) {
    return c.json(
      { ok: false, error: 'user_id, persona_id, type, name are required' },
      400
    );
  }

  if (!SUPPORTED_TYPES.includes(type)) {
    return c.json(
      {
        ok: false,
        error: `type not supported yet (allowed: ${SUPPORTED_TYPES.join(', ')})`,
      },
      400
    );
  }

  if (type === 'rss' || type === 'podcast' || type === 'youtube') {
    if (!url) {
      return c.json({ ok: false, error: 'url is required for this source' }, 400);
    }
  }

  if (type === 'reddit') {
    const subreddit = body.subreddit ? normalizeSubreddit(body.subreddit) : '';
    const configSubreddit = config.subreddit
      ? normalizeSubreddit(config.subreddit)
      : '';
    const finalSubreddit = subreddit || configSubreddit;
    if (!finalSubreddit) {
      return c.json({ ok: false, error: 'subreddit is required for reddit' }, 400);
    }
    config.subreddit = finalSubreddit;
  }

  if (type === 'twitter') {
    const handle = body.handle ? String(body.handle).trim() : '';
    const configHandle = config.handle ? String(config.handle).trim() : '';
    const finalHandle = handle || configHandle || url;
    if (!finalHandle) {
      return c.json({ ok: false, error: 'handle or url is required for twitter' }, 400);
    }
    config.handle = finalHandle;
  }

  const { data, error } = await supabase
    .from('radar_sources')
    .insert({
      user_id: userId,
      persona_id: personaId,
      name,
      type,
      url: url || null,
      active,
      fetch_interval: fetchInterval,
      config,
    })
    .select()
    .single();

  if (error || !data) {
    return c.json({ ok: false, error: error?.message ?? 'insert failed' }, 500);
  }

  return c.json({ ok: true, source: data });
});

radarSourcesRoute.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();

  const update: Record<string, unknown> = {};
  if (body.name !== undefined) {
    update.name = String(body.name).trim();
  }
  if (body.active !== undefined) {
    update.active = Boolean(body.active);
  }
  if (body.url !== undefined) {
    update.url = String(body.url).trim() || null;
  }
  if (body.fetch_interval !== undefined) {
    update.fetch_interval = body.fetch_interval;
  }
  if (body.config !== undefined) {
    update.config = body.config;
  }
  if (body.type !== undefined) {
    if (!SUPPORTED_TYPES.includes(body.type)) {
      return c.json(
        {
          ok: false,
          error: `type not supported yet (allowed: ${SUPPORTED_TYPES.join(', ')})`,
        },
        400
      );
    }
    update.type = body.type;
  }
  if (body.subreddit !== undefined) {
    const subreddit = normalizeSubreddit(String(body.subreddit));
    update.config = { ...(body.config ?? {}), subreddit };
  }
  if (body.handle !== undefined) {
    const handle = String(body.handle).trim();
    update.config = { ...(body.config ?? {}), handle };
  }

  if (Object.keys(update).length === 0) {
    return c.json({ ok: false, error: 'no updatable fields provided' }, 400);
  }

  const { data, error } = await supabase
    .from('radar_sources')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    return c.json({ ok: false, error: error?.message ?? 'update failed' }, 400);
  }

  return c.json({ ok: true, source: data });
});

radarSourcesRoute.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const { error } = await supabase.from('radar_sources').delete().eq('id', id);
  if (error) {
    return c.json({ ok: false, error: error.message }, 400);
  }
  return c.json({ ok: true });
});

radarSourcesRoute.post('/:id/run', async (c) => {
  const id = c.req.param('id');
  try {
    await runRadarScan({ sourceId: id });
    return c.json({ ok: true });
  } catch (err: any) {
    return c.json({ ok: false, error: err?.message ?? 'run failed' }, 500);
  }
});

radarSourcesRoute.post('/run', async (c) => {
  const body = await c.req.json();
  const userId = body.user_id;
  const personaId = body.persona_id;
  if (!userId) {
    return c.json({ ok: false, error: 'user_id is required' }, 400);
  }
  if (!personaId) {
    return c.json({ ok: false, error: 'persona_id is required' }, 400);
  }
  try {
    await runRadarScan({ userId, personaId });
    return c.json({ ok: true });
  } catch (err: any) {
    return c.json({ ok: false, error: err?.message ?? 'run failed' }, 500);
  }
});

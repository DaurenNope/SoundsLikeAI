import { Hono } from 'hono';
import { supabase } from '@sla/db';
import { assertApiKey } from '../auth';

export const draftsRoute = new Hono();

draftsRoute.use('*', async (c, next) => {
  const auth = assertApiKey(c);
  if (auth) return auth;
  await next();
});

draftsRoute.get('/', async (c) => {
  const userId = c.req.query('user_id');
  const personaId = c.req.query('persona_id');
  if (!userId) {
    return c.json({ ok: false, error: 'user_id is required' }, 400);
  }
  if (!personaId) {
    return c.json({ ok: false, error: 'persona_id is required' }, 400);
  }

  const status = c.req.query('status');
  const platform = c.req.query('platform');
  const limitRaw = Number(c.req.query('limit') ?? 20);
  const limit = Number.isFinite(limitRaw)
    ? Math.max(1, Math.min(limitRaw, 100))
    : 20;

  let query = supabase
    .from('drafts')
    .select(
      'id, user_id, persona_id, fragment_id, platform, text, voice_match, status, generated_at, actioned_at, scheduled_for'
    )
    .eq('user_id', userId)
    .eq('persona_id', personaId)
    .order('generated_at', { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq('status', status);
  }

  if (platform) {
    query = query.eq('platform', platform);
  }

  const { data, error } = await query;
  if (error) {
    return c.json({ ok: false, error: error.message }, 500);
  }

  return c.json({ ok: true, drafts: data ?? [] });
});

draftsRoute.get('/:id', async (c) => {
  const id = c.req.param('id');
  const { data, error } = await supabase
    .from('drafts')
    .select(
      'id, user_id, persona_id, fragment_id, platform, text, voice_match, status, generated_at, actioned_at, scheduled_for'
    )
    .eq('id', id)
    .single();

  if (error) {
    return c.json({ ok: false, error: error.message }, 404);
  }

  return c.json({ ok: true, draft: data });
});

draftsRoute.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();

  const update: Record<string, unknown> = {};
  let nextText: string | undefined;
  let nextStatus: string | undefined;

  if (typeof body.text === 'string') {
    const trimmed = body.text.trim();
    if (trimmed.length < 10) {
      return c.json({ ok: false, error: 'text must be at least 10 characters' }, 400);
    }
    update.text = trimmed;
    nextText = trimmed;
  }

  if ('scheduled_for' in body) {
    update.scheduled_for = body.scheduled_for;
  }

  if (typeof body.status === 'string') {
    const allowed = ['ready', 'approved', 'trashed', 'published', 'failed'];
    if (!allowed.includes(body.status)) {
      return c.json({ ok: false, error: 'invalid status' }, 400);
    }
    update.status = body.status;
    nextStatus = body.status;
  }

  if (Object.keys(update).length === 0) {
    return c.json({ ok: false, error: 'no updatable fields provided' }, 400);
  }

  const { data: existing, error: existingError } = await supabase
    .from('drafts')
    .select('id, user_id, persona_id, text, status, platform')
    .eq('id', id)
    .single();

  if (existingError || !existing) {
    return c.json({ ok: false, error: existingError?.message ?? 'draft not found' }, 404);
  }

  const { data, error } = await supabase
    .from('drafts')
    .update(update)
    .eq('id', id)
    .select(
      'id, user_id, persona_id, fragment_id, platform, text, voice_match, status, generated_at, actioned_at, scheduled_for'
    )
    .single();

  if (error) {
    return c.json({ ok: false, error: error.message }, 400);
  }

  const finalText = nextText ?? existing.text;
  const statusChanged = Boolean(nextStatus && nextStatus !== existing.status);
  const feedbackEvents: Array<Record<string, unknown>> = [];

  if (nextText && nextText !== existing.text) {
    feedbackEvents.push({
      user_id: existing.user_id,
      persona_id: existing.persona_id,
      draft_id: existing.id,
      action: 'edited',
      original_text: existing.text,
      edited_text: nextText,
    });
  }

  if (feedbackEvents.length > 0) {
    const { error: feedbackError } = await supabase
      .from('feedback_events')
      .insert(feedbackEvents);
    if (feedbackError) {
      return c.json({ ok: false, error: feedbackError.message }, 500);
    }
  }

  if (statusChanged && nextStatus === 'approved') {
    const { error: voiceError } = await supabase.from('voice_samples').insert({
      user_id: existing.user_id,
      persona_id: existing.persona_id,
      content: finalText,
      platform: existing.platform,
      source: 'approved_draft',
    });
    if (voiceError) {
      return c.json({ ok: false, error: voiceError.message }, 500);
    }
  }

  return c.json({ ok: true, draft: data });
});

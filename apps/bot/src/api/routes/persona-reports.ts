import { Hono } from 'hono';
import { supabase } from '@sla/db';
import { assertApiKey } from '../auth';
import { generatePersonaReport } from '@sla/pipeline';

export const personaReportsRoute = new Hono();

personaReportsRoute.use('*', async (c, next) => {
  const auth = assertApiKey(c);
  if (auth) return auth;
  await next();
});

personaReportsRoute.get('/', async (c) => {
  const userId = c.req.query('user_id');
  const personaId = c.req.query('persona_id');
  if (!userId) return c.json({ ok: false, error: 'user_id is required' }, 400);
  if (!personaId) return c.json({ ok: false, error: 'persona_id is required' }, 400);

  const { data, error } = await supabase
    .from('persona_reports')
    .select('report,generated_at')
    .eq('user_id', userId)
    .eq('persona_id', personaId)
    .maybeSingle();

  if (error) return c.json({ ok: false, error: error.message }, 500);
  return c.json({ ok: true, report: data?.report ?? null, generated_at: data?.generated_at ?? null });
});

personaReportsRoute.post('/generate', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const personaId = body.persona_id;
  if (!personaId) return c.json({ ok: false, error: 'persona_id is required' }, 400);

  const report = await generatePersonaReport(personaId);
  return c.json({ ok: true, report });
});

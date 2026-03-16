import { Hono } from 'hono';
import { supabase } from '@sla/db';
import { assertApiKey } from '../auth';

export const llmRoute = new Hono();

llmRoute.use('*', async (c, next) => {
  const auth = assertApiKey(c);
  if (auth) return auth;
  await next();
});

llmRoute.get('/usage', async (c) => {
  const limit = Math.min(Number(c.req.query('limit') ?? 100), 500);
  const { data, error } = await supabase
    .from('llm_usage')
    .select(
      'id,provider,model,key_alias,caller,status,latency_ms,prompt_chars,response_chars,error,created_at'
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return c.json({ ok: false, error: error.message }, 500);
  }

  const summary: Record<string, { success: number; error: number }> = {};
  for (const row of data ?? []) {
    const key = `${row.provider}:${row.model}`;
    if (!summary[key]) summary[key] = { success: 0, error: 0 };
    if (row.status === 'success') summary[key].success += 1;
    if (row.status === 'error') summary[key].error += 1;
  }

  return c.json({ ok: true, usage: data ?? [], summary });
});

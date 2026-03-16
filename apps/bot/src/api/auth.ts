import type { Context } from 'hono';

export function assertApiKey(c: Context): Response | null {
  const expected = process.env.API_KEY ?? process.env.INGEST_API_KEY;
  if (!expected) return null;
  const provided = c.req.header('x-api-key');
  if (provided !== expected) {
    return c.json({ ok: false, error: 'unauthorized' }, 401);
  }
  return null;
}

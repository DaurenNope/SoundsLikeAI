import { Hono } from 'hono';

export const webhookRoute = new Hono();

webhookRoute.post('/', async (c) => {
  const payload = await c.req.json();
  return c.json({ ok: true, received: true, payload });
});

import { Hono } from 'hono';
import { ingestBook, ingestEmail, ingestFragment } from '@sla/ingest';
import { triggerFragmentProcessing } from '../../trigger';
import { assertApiKey } from '../auth';

export const ingestRoute = new Hono();

ingestRoute.post('/', async (c) => {
  const auth = assertApiKey(c);
  if (auth) return auth;

  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ ok: false, error: 'invalid json' }, 400);
  }

  const process = body.process !== false;

  try {
    const result = await ingestFragment({
      userId: body.user_id,
      personaId: body.persona_id,
      type: body.type,
      rawContent: body.raw_content,
      sourceUrl: body.source_url,
      filePath: body.file_path,
      metadata: body.metadata,
      signalItemId: body.signal_item_id,
      dedupe: body.dedupe,
      transcribeVoice: body.transcribe_voice,
    });

    let processed = false;
    if (process && result.processable && !result.deduped) {
      await triggerFragmentProcessing(result.fragmentId);
      processed = true;
    }

    return c.json({
      ok: true,
      fragment_id: result.fragmentId,
      deduped: result.deduped,
      processed,
    });
  } catch (err: any) {
    return c.json({ ok: false, error: err?.message ?? 'ingest failed' }, 400);
  }
});

ingestRoute.post('/batch', async (c) => {
  const auth = assertApiKey(c);
  if (auth) return auth;

  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ ok: false, error: 'invalid json' }, 400);
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return c.json({ ok: false, error: 'items must be a non-empty array' }, 400);
  }

  const process = body.process !== false;
  const results: any[] = [];
  let hasErrors = false;

  for (let i = 0; i < body.items.length; i += 1) {
    const item = body.items[i] ?? {};
    try {
    const result = await ingestFragment({
      userId: item.user_id,
      personaId: item.persona_id,
      type: item.type,
        rawContent: item.raw_content,
        sourceUrl: item.source_url,
        filePath: item.file_path,
        metadata: item.metadata,
        signalItemId: item.signal_item_id,
        dedupe: item.dedupe,
        transcribeVoice: item.transcribe_voice,
      });

      let processed = false;
      if (process && result.processable && !result.deduped) {
        await triggerFragmentProcessing(result.fragmentId);
        processed = true;
      }

      results.push({
        index: i,
        fragment_id: result.fragmentId,
        deduped: result.deduped,
        processed,
      });
    } catch (err: any) {
      hasErrors = true;
      results.push({
        index: i,
        error: err?.message ?? 'ingest failed',
      });
    }
  }

  return c.json({ ok: !hasErrors, results });
});

ingestRoute.post('/email', async (c) => {
  const auth = assertApiKey(c);
  if (auth) return auth;

  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ ok: false, error: 'invalid json' }, 400);
  }

  try {
    const result = await ingestEmail({
      userId: body.user_id,
      personaId: body.persona_id,
      fromEmail: body.from_email,
      subject: body.subject,
      content: body.content,
      process: body.process !== false,
    });

    let processed = false;
    if (result.fragmentId && body.process !== false) {
      await triggerFragmentProcessing(result.fragmentId);
      processed = true;
    }

    return c.json({
      ok: true,
      inbound_email_id: result.inboundEmailId,
      fragment_id: result.fragmentId ?? null,
      processed,
    });
  } catch (err: any) {
    return c.json({ ok: false, error: err?.message ?? 'ingest failed' }, 400);
  }
});

ingestRoute.post('/books', async (c) => {
  const auth = assertApiKey(c);
  if (auth) return auth;

  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ ok: false, error: 'invalid json' }, 400);
  }

  try {
    const result = await ingestBook({
      userId: body.user_id,
      personaId: body.persona_id,
      isbn: body.isbn,
      query: body.query,
    });

    let processed = false;
    if (body.process !== false && result.processable && !result.deduped) {
      await triggerFragmentProcessing(result.fragmentId);
      processed = true;
    }

    return c.json({
      ok: true,
      fragment_id: result.fragmentId,
      book_title: result.bookTitle,
      source_url: result.sourceUrl ?? null,
      processed,
    });
  } catch (err: any) {
    return c.json({ ok: false, error: err?.message ?? 'ingest failed' }, 400);
  }
});

ingestRoute.post('/bookmarks', async (c) => {
  const auth = assertApiKey(c);
  if (auth) return auth;

  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ ok: false, error: 'invalid json' }, 400);
  }

  const userId = body.user_id;
  const personaId = body.persona_id;
  if (!userId) {
    return c.json({ ok: false, error: 'user_id is required' }, 400);
  }
  if (!personaId) {
    return c.json({ ok: false, error: 'persona_id is required' }, 400);
  }

  let urls: string[] = [];
  if (Array.isArray(body.urls)) {
    urls = body.urls.map((u: any) => String(u).trim()).filter(Boolean);
  } else if (typeof body.urls === 'string') {
    urls = body.urls
      .split(/\\r?\\n/)
      .map((u) => u.trim())
      .filter(Boolean);
  }

  if (urls.length === 0) {
    return c.json({ ok: false, error: 'urls must be provided' }, 400);
  }

  const process = body.process !== false;
  const results: any[] = [];
  let hasErrors = false;

  for (let i = 0; i < urls.length; i += 1) {
    try {
      const result = await ingestFragment({
        userId,
        personaId,
        type: 'link',
        sourceUrl: urls[i],
        metadata: { source: 'bookmark' },
        dedupe: true,
      });

      let processed = false;
      if (process && result.processable && !result.deduped) {
        await triggerFragmentProcessing(result.fragmentId);
        processed = true;
      }

      results.push({
        index: i,
        fragment_id: result.fragmentId,
        deduped: result.deduped,
        processed,
      });
    } catch (err: any) {
      hasErrors = true;
      results.push({ index: i, error: err?.message ?? 'ingest failed' });
    }
  }

  return c.json({ ok: !hasErrors, results });
});

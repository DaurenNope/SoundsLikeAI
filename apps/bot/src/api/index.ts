import { Hono } from 'hono';
import { ingestRoute } from './routes/ingest';
import { webhookRoute } from './routes/webhook';
import { draftsRoute } from './routes/drafts';
import { radarSourcesRoute } from './routes/radar-sources';
import { signalItemsRoute } from './routes/signal-items';
import { fragmentsRoute } from './routes/fragments';
import { bookmarksRoute } from './routes/bookmarks';
import { collectionRoute } from './routes/collection';
import { llmRoute } from './routes/llm';
import { collectionStateRoute } from './routes/collection-state';

export function registerApiRoutes(app: Hono) {
  app.get('/health', (c) => c.json({ ok: true }));
  app.route('/ingest', ingestRoute);
  app.route('/drafts', draftsRoute);
  app.route('/signal-items', signalItemsRoute);
  app.route('/fragments', fragmentsRoute);
  app.route('/bookmarks', bookmarksRoute);
  app.route('/radar-sources', radarSourcesRoute);
  app.route('/collection', collectionRoute);
  app.route('/collection-state', collectionStateRoute);
  app.route('/llm', llmRoute);
  app.route('/webhook', webhookRoute);
}

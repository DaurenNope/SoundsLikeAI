import { Hono } from 'hono';

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1"
    />
    <title>SoundsLikeAI Console</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=JetBrains+Mono:wght@400;600&display=swap');

      :root {
        --bg: #0f1419;
        --bg-soft: #141b21;
        --card: #10161c;
        --card-strong: #18212b;
        --stroke: rgba(255, 255, 255, 0.08);
        --accent: #4cc9f0;
        --accent-strong: #56f0b0;
        --text: #e6edf3;
        --muted: #9aa4b2;
        --danger: #ff6b6b;
        --warn: #ffb347;
        --shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        font-family: "Space Grotesk", "Avenir Next", "Segoe UI", sans-serif;
        color: var(--text);
        background: radial-gradient(circle at 20% 20%, rgba(76, 201, 240, 0.15), transparent 45%),
          radial-gradient(circle at 90% 10%, rgba(86, 240, 176, 0.12), transparent 40%),
          var(--bg);
        min-height: 100vh;
      }

      .shell {
        max-width: 1180px;
        margin: 0 auto;
        padding: 48px 24px 80px;
      }

      .top {
        display: flex;
        flex-wrap: wrap;
        gap: 24px;
        align-items: flex-end;
        justify-content: space-between;
        margin-bottom: 32px;
      }

      .tag {
        display: inline-flex;
        gap: 8px;
        align-items: center;
        padding: 6px 14px;
        border-radius: 999px;
        background: rgba(86, 240, 176, 0.16);
        color: var(--accent-strong);
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        font-size: 12px;
      }

      h1 {
        margin: 12px 0 6px;
        font-size: 38px;
        letter-spacing: -0.02em;
      }

      .subtitle {
        margin: 0;
        color: var(--muted);
        max-width: 520px;
      }

      .status {
        background: rgba(255, 255, 255, 0.06);
        padding: 12px 16px;
        border-radius: 12px;
        border: 1px solid var(--stroke);
        min-width: 240px;
        font-size: 13px;
        color: var(--muted);
      }

      .grid {
        display: grid;
        gap: 18px;
      }

      .panel {
        background: var(--card);
        border: 1px solid var(--stroke);
        border-radius: 18px;
        padding: 22px;
        box-shadow: var(--shadow);
      }

      .panel h2 {
        margin: 0 0 12px;
        font-size: 20px;
      }

      label {
        display: flex;
        flex-direction: column;
        gap: 8px;
        font-size: 13px;
        color: var(--muted);
      }

      input,
      select,
      textarea {
        background: var(--bg-soft);
        border: 1px solid var(--stroke);
        color: var(--text);
        border-radius: 12px;
        padding: 10px 12px;
        font-size: 14px;
        font-family: inherit;
        outline: none;
      }

      textarea {
        min-height: 120px;
        resize: vertical;
      }

      .row {
        display: grid;
        gap: 16px;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      }

      .actions {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }

      button {
        border: 0;
        border-radius: 12px;
        padding: 10px 16px;
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
        color: #081018;
        background: linear-gradient(135deg, var(--accent), var(--accent-strong));
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }

      button.secondary {
        background: rgba(255, 255, 255, 0.08);
        color: var(--text);
        border: 1px solid var(--stroke);
      }

      button.ghost {
        background: transparent;
        border: 1px dashed var(--stroke);
        color: var(--muted);
      }

      button:hover {
        transform: translateY(-1px);
        box-shadow: 0 12px 30px rgba(76, 201, 240, 0.25);
      }

      .drafts {
        display: grid;
        gap: 18px;
      }

      .card {
        background: var(--card-strong);
        border: 1px solid var(--stroke);
        border-radius: 18px;
        padding: 18px;
        display: grid;
        gap: 12px;
        animation: rise 0.5s ease both;
        animation-delay: var(--delay, 0ms);
      }

      .meta {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        font-size: 13px;
        color: var(--muted);
      }

      .pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: 999px;
        border: 1px solid var(--stroke);
        background: rgba(255, 255, 255, 0.05);
        font-weight: 600;
      }

      .mono {
        font-family: "JetBrains Mono", "SFMono-Regular", ui-monospace, monospace;
        font-size: 12px;
      }

      .empty {
        padding: 28px;
        border-radius: 16px;
        border: 1px dashed var(--stroke);
        color: var(--muted);
        text-align: center;
      }

      .danger {
        color: var(--danger);
      }

      @keyframes rise {
        from {
          opacity: 0;
          transform: translateY(12px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @media (max-width: 720px) {
        h1 {
          font-size: 30px;
        }
        .shell {
          padding: 32px 16px 60px;
        }
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <header class="top">
        <div>
          <span class="tag">SoundsLikeAI Console</span>
          <h1>Draft Operations</h1>
          <p class="subtitle">
            Run ingest, review drafts, and approve or trash them without Telegram.
          </p>
        </div>
        <div class="status" id="status">Status: idle</div>
      </header>

      <section class="grid">
        <div class="panel">
          <h2>Connection</h2>
          <div class="row">
            <label>
              API Key
              <input id="apiKey" type="password" placeholder="x-api-key header" />
            </label>
            <label>
              User ID
              <input id="userId" type="text" placeholder="profile UUID" />
            </label>
            <label>
              Persona ID
              <input id="personaId" type="text" placeholder="persona UUID" />
            </label>
            <label>
              Status Filter
              <select id="statusFilter">
                <option value="">All</option>
                <option value="ready">Ready</option>
                <option value="approved">Approved</option>
                <option value="trashed">Trashed</option>
                <option value="published">Published</option>
                <option value="failed">Failed</option>
              </select>
            </label>
            <label>
              Platform
              <select id="platformFilter">
                <option value="">All</option>
                <option value="twitter">Twitter</option>
                <option value="threads">Threads</option>
              </select>
            </label>
            <label>
              Limit
              <input id="limit" type="number" min="1" max="100" value="20" />
            </label>
          </div>
          <div class="actions" style="margin-top: 16px;">
            <button id="loadDrafts">Load drafts</button>
            <button class="secondary" id="refresh">Refresh</button>
          </div>
        </div>

        <div class="panel">
          <h2>Ingest</h2>
          <div class="row">
            <label>
              Text input
              <textarea id="ingestText" placeholder="Paste a thought or note..."></textarea>
            </label>
            <label>
              Link input
              <textarea id="ingestLink" placeholder="Paste a URL to scrape..."></textarea>
            </label>
          </div>
          <div class="actions" style="margin-top: 16px;">
            <button id="ingestTextBtn">Ingest text</button>
            <button class="secondary" id="ingestLinkBtn">Ingest link</button>
          </div>
        </div>

        <div class="panel">
          <h2>Book Ingest</h2>
          <div class="row">
            <label>
              ISBN
              <input id="bookIsbn" type="text" placeholder="9780143127741" />
            </label>
            <label>
              Or search query
              <input id="bookQuery" type="text" placeholder="The Pragmatic Programmer" />
            </label>
          </div>
          <div class="actions" style="margin-top: 16px;">
            <button id="ingestBookBtn">Ingest book</button>
          </div>
        </div>

        <div class="panel">
          <h2>Bookmarks</h2>
          <label>
            URLs (one per line)
            <textarea id="bookmarkUrls" placeholder="https://...\nhttps://..."></textarea>
          </label>
          <div class="actions" style="margin-top: 16px;">
            <button id="ingestBookmarksBtn">Ingest bookmarks</button>
          </div>
        </div>

        <div class="panel">
          <h2>Radar Sources</h2>
          <div class="row">
            <label>
              Source name
              <input id="sourceName" type="text" placeholder="e.g. Industry RSS" />
            </label>
            <label>
              Type
              <select id="sourceType">
                <option value="rss">RSS</option>
                <option value="reddit">Reddit</option>
                <option value="youtube">YouTube</option>
                <option value="podcast">Podcast</option>
                <option value="twitter">Twitter</option>
              </select>
            </label>
            <label>
              URL / Feed
              <input id="sourceUrl" type="text" placeholder="https://example.com/feed.xml" />
            </label>
            <label>
              Handle (reddit/twitter)
              <input id="sourceSubreddit" type="text" placeholder="r/startups or @handle" />
            </label>
          </div>
          <div class="actions" style="margin-top: 16px;">
            <button id="addSource">Add source</button>
            <button class="secondary" id="refreshSources">Refresh sources</button>
            <button class="secondary" id="runRadar">Run radar now</button>
          </div>
          <div class="drafts" id="sources"></div>
        </div>

        <div class="panel">
          <h2>Bookmark Collection (Auth)</h2>
          <div class="row">
            <label>
              Platform
              <select id="collectionPlatform">
                <option value="all">All</option>
                <option value="twitter">Twitter</option>
                <option value="threads">Threads</option>
                <option value="reddit">Reddit</option>
              </select>
            </label>
            <label>
              Limit
              <input id="collectionLimit" type="number" min="1" max="200" value="50" />
            </label>
          </div>
          <div class="actions" style="margin-top: 16px;">
            <button id="runCollection">Run authenticated collection</button>
          </div>
        </div>

        <div class="panel">
          <h2>Collection State</h2>
          <div class="actions" style="margin-top: 16px;">
            <button id="refreshCollectionState">Refresh state</button>
          </div>
          <div class="drafts" id="collectionState"></div>
        </div>

        <div class="panel">
          <h2>Resource Report</h2>
          <div class="actions" style="margin-top: 16px;">
            <button id="refreshReport">Refresh report</button>
            <button class="secondary" id="generateReport">Generate report</button>
          </div>
          <div class="drafts" id="resourceReport"></div>
        </div>

        <div class="panel">
          <h2>Bookmarks</h2>
          <div class="row">
            <label>
              Limit
              <input id="bookmarkLimit" type="number" min="1" max="200" value="20" />
            </label>
          </div>
          <div class="actions" style="margin-top: 16px;">
            <button id="loadBookmarks">Load bookmarks</button>
            <button class="secondary" id="refreshBookmarks">Refresh bookmarks</button>
          </div>
          <div class="drafts" id="bookmarks"></div>
        </div>

        <div class="panel">
          <h2>LLM Usage</h2>
          <div class="meta" id="llmSummary"></div>
          <div class="actions" style="margin-top: 16px;">
            <button id="refreshLlmUsage">Refresh usage</button>
          </div>
          <div class="drafts" id="llmUsage"></div>
        </div>

        <div class="panel">
          <h2>Signal Items</h2>
          <div class="row">
            <label>
              Status
              <select id="signalStatusFilter">
                <option value="">All</option>
                <option value="raw">Raw</option>
                <option value="scored">Scored</option>
                <option value="queued">Queued</option>
                <option value="drafted">Drafted</option>
                <option value="ignored">Ignored</option>
              </select>
            </label>
            <label>
              Min score
              <input id="signalMinScore" type="number" min="0" max="100" value="70" />
            </label>
            <label>
              Limit
              <input id="signalLimit" type="number" min="1" max="100" value="20" />
            </label>
          </div>
          <div class="actions" style="margin-top: 16px;">
            <button id="loadSignals">Load signals</button>
            <button class="secondary" id="refreshSignals">Refresh signals</button>
          </div>
          <div class="drafts" id="signalItems"></div>
        </div>

        <div class="panel">
          <h2>Fragments</h2>
          <div class="row">
            <label>
              Status
              <select id="fragmentStatusFilter">
                <option value="">All</option>
                <option value="raw">Raw</option>
                <option value="processing">Processing</option>
                <option value="drafted">Drafted</option>
                <option value="failed">Failed</option>
              </select>
            </label>
            <label>
              Type
              <select id="fragmentTypeFilter">
                <option value="">All</option>
                <option value="text">Text</option>
                <option value="link">Link</option>
                <option value="voice">Voice</option>
                <option value="image">Image</option>
                <option value="document">Document</option>
              </select>
            </label>
            <label>
              Limit
              <input id="fragmentLimit" type="number" min="1" max="100" value="20" />
            </label>
          </div>
          <div class="actions" style="margin-top: 16px;">
            <button id="loadFragments">Load fragments</button>
            <button class="secondary" id="refreshFragments">Refresh fragments</button>
          </div>
          <div class="drafts" id="fragments"></div>
        </div>

        <div class="panel">
          <h2>Drafts</h2>
          <div class="drafts" id="drafts"></div>
        </div>
      </section>
    </main>

    <script>
      const statusEl = document.getElementById('status');
      const apiKeyInput = document.getElementById('apiKey');
      const userIdInput = document.getElementById('userId');
      const personaIdInput = document.getElementById('personaId');
      const statusFilter = document.getElementById('statusFilter');
      const platformFilter = document.getElementById('platformFilter');
      const limitInput = document.getElementById('limit');
      const draftsEl = document.getElementById('drafts');
      const ingestTextEl = document.getElementById('ingestText');
      const ingestLinkEl = document.getElementById('ingestLink');
      const bookIsbnEl = document.getElementById('bookIsbn');
      const bookQueryEl = document.getElementById('bookQuery');
      const bookmarkUrlsEl = document.getElementById('bookmarkUrls');
      const sourcesEl = document.getElementById('sources');
      const sourceNameInput = document.getElementById('sourceName');
      const sourceTypeInput = document.getElementById('sourceType');
      const sourceUrlInput = document.getElementById('sourceUrl');
      const sourceSubredditInput = document.getElementById('sourceSubreddit');
      const signalStatusFilter = document.getElementById('signalStatusFilter');
      const signalMinScoreInput = document.getElementById('signalMinScore');
      const signalLimitInput = document.getElementById('signalLimit');
      const signalItemsEl = document.getElementById('signalItems');
      const bookmarkLimitInput = document.getElementById('bookmarkLimit');
      const bookmarksEl = document.getElementById('bookmarks');
      const collectionStateEl = document.getElementById('collectionState');
      const resourceReportEl = document.getElementById('resourceReport');
      const fragmentStatusFilter = document.getElementById('fragmentStatusFilter');
      const fragmentTypeFilter = document.getElementById('fragmentTypeFilter');
      const fragmentLimitInput = document.getElementById('fragmentLimit');
      const fragmentsEl = document.getElementById('fragments');
      const collectionPlatformEl = document.getElementById('collectionPlatform');
      const collectionLimitEl = document.getElementById('collectionLimit');
      const llmSummaryEl = document.getElementById('llmSummary');
      const llmUsageEl = document.getElementById('llmUsage');

      apiKeyInput.value = localStorage.getItem('sla_api_key') || '';
      userIdInput.value = localStorage.getItem('sla_user_id') || '';
      personaIdInput.value = localStorage.getItem('sla_persona_id') || '';
      console.log('[UI] loaded');

      window.addEventListener('error', (event) => {
        const message = event && event.message ? event.message : 'UI error';
        setStatus('UI error: ' + message, 'error');
      });

      window.addEventListener('unhandledrejection', (event) => {
        const reason = event && event.reason ? event.reason : 'Unhandled rejection';
        setStatus('UI error: ' + reason, 'error');
      });

      function setStatus(message, tone) {
        statusEl.textContent = message;
        statusEl.style.color = tone === 'error' ? '#ff6b6b' : '#9aa4b2';
      }

      function persistInputs() {
        localStorage.setItem('sla_api_key', apiKeyInput.value.trim());
        localStorage.setItem('sla_user_id', userIdInput.value.trim());
        localStorage.setItem('sla_persona_id', personaIdInput.value.trim());
      }

      async function api(path, options) {
        const headers = options && options.headers ? options.headers : {};
        const apiKey = apiKeyInput.value.trim();
        if (apiKey) {
          headers['x-api-key'] = apiKey;
        }
        if (options && options.body && typeof options.body !== 'string') {
          headers['Content-Type'] = 'application/json';
          options.body = JSON.stringify(options.body);
        }
        const response = await fetch(path, { ...options, headers });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.error || 'Request failed');
        }
        return payload;
      }

      function renderDrafts(drafts) {
        draftsEl.innerHTML = '';
        if (!drafts || drafts.length === 0) {
          draftsEl.innerHTML = '<div class="empty">No drafts yet.</div>';
          return;
        }
        drafts.forEach((draft, index) => {
          const card = document.createElement('article');
          card.className = 'card';
          card.style.setProperty('--delay', (index * 60) + 'ms');
          card.innerHTML = \`
            <div class="meta">
              <span class="pill">\${draft.platform.toUpperCase()}</span>
              <span class="pill">\${draft.status}</span>
              <span class="pill">Voice \${draft.voice_match ?? 0}%</span>
              <span class="mono">\${draft.id}</span>
            </div>
            <textarea data-role="text">\${draft.text || ''}</textarea>
            <div class="actions">
              <button data-action="save">Save edit</button>
              <button class="secondary" data-action="approve">Approve</button>
              <button class="secondary" data-action="trash">Trash</button>
            </div>
          \`;
          card.querySelector('[data-action="save"]').addEventListener('click', async () => {
            const text = card.querySelector('[data-role="text"]').value.trim();
            if (text.length < 10) {
              setStatus('Text must be at least 10 characters.', 'error');
              return;
            }
            try {
              await api('/drafts/' + draft.id, { method: 'PATCH', body: { text } });
              setStatus('Saved draft edits.', 'ok');
            } catch (err) {
              setStatus(err.message, 'error');
            }
          });
          card.querySelector('[data-action="approve"]').addEventListener('click', async () => {
            try {
              await api('/drafts/' + draft.id, { method: 'PATCH', body: { status: 'approved' } });
              setStatus('Draft approved.', 'ok');
              await loadDrafts();
            } catch (err) {
              setStatus(err.message, 'error');
            }
          });
          card.querySelector('[data-action="trash"]').addEventListener('click', async () => {
            try {
              await api('/drafts/' + draft.id, { method: 'PATCH', body: { status: 'trashed' } });
              setStatus('Draft trashed.', 'ok');
              await loadDrafts();
            } catch (err) {
              setStatus(err.message, 'error');
            }
          });
          draftsEl.appendChild(card);
        });
      }

      function renderSources(sources) {
        sourcesEl.innerHTML = '';
        if (!sources || sources.length === 0) {
          sourcesEl.innerHTML = '<div class="empty">No radar sources yet.</div>';
          return;
        }
        sources.forEach((source, index) => {
          const card = document.createElement('article');
          card.className = 'card';
          card.style.setProperty('--delay', (index * 60) + 'ms');
          const subreddit = source.config && source.config.subreddit ? source.config.subreddit : '';
          card.innerHTML = \`
            <div class="meta">
              <span class="pill">\${source.type.toUpperCase()}</span>
              <span class="pill">\${source.active ? 'active' : 'paused'}</span>
              <span class="mono">\${source.id}</span>
            </div>
            <div class="mono">\${source.name}</div>
            <div class="mono">\${source.url || subreddit || ''}</div>
            <div class="actions">
              <button data-action="run">Run</button>
              <button class="secondary" data-action="toggle">\${source.active ? 'Pause' : 'Activate'}</button>
              <button class="secondary" data-action="delete">Delete</button>
            </div>
          \`;
          card.querySelector('[data-action="run"]').addEventListener('click', async () => {
            try {
              await api('/radar-sources/' + source.id + '/run', { method: 'POST' });
              setStatus('Radar run finished.', 'ok');
              await loadDrafts();
            } catch (err) {
              setStatus(err.message, 'error');
            }
          });
          card.querySelector('[data-action="toggle"]').addEventListener('click', async () => {
            try {
              await api('/radar-sources/' + source.id, {
                method: 'PATCH',
                body: { active: !source.active },
              });
              await loadSources();
            } catch (err) {
              setStatus(err.message, 'error');
            }
          });
          card.querySelector('[data-action="delete"]').addEventListener('click', async () => {
            try {
              await api('/radar-sources/' + source.id, { method: 'DELETE' });
              await loadSources();
            } catch (err) {
              setStatus(err.message, 'error');
            }
          });
          sourcesEl.appendChild(card);
        });
      }

      function renderSignalItems(items) {
        signalItemsEl.innerHTML = '';
        if (!items || items.length === 0) {
          signalItemsEl.innerHTML = '<div class="empty">No signal items yet.</div>';
          return;
        }
        items.forEach((item, index) => {
          const card = document.createElement('article');
          card.className = 'card';
          card.style.setProperty('--delay', (index * 60) + 'ms');
          const sourceName = item.radar_sources && item.radar_sources.name ? item.radar_sources.name : '';
          const sourceType = item.radar_sources && item.radar_sources.type ? item.radar_sources.type : '';
          card.innerHTML = \`
            <div class="meta">
              <span class="pill">\${(sourceType || 'signal').toUpperCase()}</span>
              <span class="pill">\${item.status}</span>
              <span class="pill">Score \${item.relevance_score ?? 'n/a'}</span>
              <span class="mono">\${item.id}</span>
            </div>
            <div class="mono">\${sourceName || item.source_id || ''}</div>
            <div>\${item.title || 'Untitled'}</div>
            <textarea readonly>\${item.content || ''}</textarea>
            <div class="mono">\${item.url || ''}</div>
          \`;
          signalItemsEl.appendChild(card);
        });
      }

      function renderBookmarks(items) {
        if (!bookmarksEl) return;
        bookmarksEl.innerHTML = '';
        if (!items || items.length === 0) {
          bookmarksEl.innerHTML = '<div class="empty">No bookmarks yet.</div>';
          return;
        }
        items.forEach((item, index) => {
          const card = document.createElement('article');
          card.className = 'card';
          card.style.setProperty('--delay', (index * 60) + 'ms');
          card.innerHTML = \`
            <div class="meta">
              <span class="pill">\${(item.platform || 'bookmark').toUpperCase()}</span>
              <span class="mono">\${item.id}</span>
            </div>
            <div>\${item.title || 'Untitled'}</div>
            <textarea readonly>\${item.content || ''}</textarea>
            <div class="mono">\${item.url || ''}</div>
          \`;
          bookmarksEl.appendChild(card);
        });
      }

      function renderCollectionState(items) {
        if (!collectionStateEl) return;
        collectionStateEl.innerHTML = '';
        if (!items || items.length === 0) {
          collectionStateEl.innerHTML = '<div class="empty">No collection state yet.</div>';
          return;
        }
        items.forEach((item, index) => {
          const card = document.createElement('article');
          card.className = 'card';
          card.style.setProperty('--delay', (index * 60) + 'ms');
          const lastRun = item.last_run_at ? new Date(item.last_run_at).toLocaleString() : 'n/a';
          const latest = item.latest_bookmark;
          const latestLine = latest
            ? (latest.title || latest.url || 'Latest bookmark') + ' · ' + (latest.collected_at ? new Date(latest.collected_at).toLocaleString() : '')
            : 'No bookmarks yet';
          card.innerHTML = `
            <div class="meta">
              <span class="pill">${(item.platform || 'unknown').toUpperCase()}</span>
              <span class="pill">Last run ${lastRun}</span>
              <span class="mono">${item.last_post_id || 'no stop yet'}</span>
            </div>
            <div>${latestLine}</div>
            <div class="mono">${latest && latest.url ? latest.url : ''}</div>
          `;
          collectionStateEl.appendChild(card);
        });
      }

      function renderResourceReport(payload) {
        if (!resourceReportEl) return;
        resourceReportEl.innerHTML = '';
        if (!payload || !payload.report) {
          resourceReportEl.innerHTML = '<div class="empty">No report yet.</div>';
          return;
        }
        const report = payload.report;
        const generatedAt = payload.generated_at
          ? new Date(payload.generated_at).toLocaleString()
          : '';
        const sources = report.source_candidates || [];
        const pillars = report.content_pillars || [];

        const card = document.createElement('article');
        card.className = 'card';
        card.innerHTML = `
          <div class="meta">
            <span class="pill">Generated ${generatedAt}</span>
          </div>
          <div><strong>Target:</strong> ${report.target_audience || 'n/a'}</div>
          <div><strong>Positioning:</strong> ${report.positioning || 'n/a'}</div>
          <div style="margin-top: 10px;"><strong>Pillars</strong></div>
          <ul>${pillars.map((p) => `<li>${p}</li>`).join('')}</ul>
          <div style="margin-top: 10px;"><strong>Sources seeded</strong></div>
          <ul>${sources
            .map((s) => {
              const label = `${(s.type || '').toUpperCase()} · ${s.name}`;
              const target = s.url || (s.config && s.config.subreddit ? `r/${s.config.subreddit}` : '');
              return `<li>${label} ${target ? '— ' + target : ''}</li>`;
            })
            .join('')}</ul>
        `;
        resourceReportEl.appendChild(card);
      }

      function renderFragments(items) {
        fragmentsEl.innerHTML = '';
        if (!items || items.length === 0) {
          fragmentsEl.innerHTML = '<div class="empty">No fragments yet.</div>';
          return;
        }
        items.forEach((item, index) => {
          const card = document.createElement('article');
          card.className = 'card';
          card.style.setProperty('--delay', (index * 60) + 'ms');
          card.innerHTML = \`
            <div class="meta">
              <span class="pill">\${item.type.toUpperCase()}</span>
              <span class="pill">\${item.status}</span>
              <span class="mono">\${item.id}</span>
            </div>
            <div class="mono">Signal: \${item.signal_item_id || 'n/a'} · Bookmark: \${item.bookmark_id || 'n/a'}</div>
            <textarea readonly>\${item.raw_content || ''}</textarea>
            <div class="mono">\${item.source_url || ''}</div>
          \`;
          fragmentsEl.appendChild(card);
        });
      }

      function renderLlmUsage(payload) {
        if (!llmUsageEl || !llmSummaryEl) return;
        const usage = payload && payload.usage ? payload.usage : [];
        const summary = payload && payload.summary ? payload.summary : {};

        const summaryEntries = Object.entries(summary);
        if (summaryEntries.length === 0) {
          llmSummaryEl.innerHTML = '<span class="pill">No usage yet</span>';
        } else {
          llmSummaryEl.innerHTML = summaryEntries
            .map(([key, counts]) => {
              const label = key.replace(':', ' · ');
              return (
                '<span class="pill">' +
                label +
                ' ' +
                counts.success +
                '✓ ' +
                counts.error +
                '✕</span>'
              );
            })
            .join('');
        }

        llmUsageEl.innerHTML = '';
        if (!usage || usage.length === 0) {
          llmUsageEl.innerHTML = '<div class="empty">No LLM calls logged yet.</div>';
          return;
        }

        usage.forEach((item, index) => {
          const card = document.createElement('article');
          card.className = 'card';
          card.style.setProperty('--delay', (index * 40) + 'ms');
          const ts = item.created_at ? new Date(item.created_at).toLocaleString() : '';
          const status = item.status === 'success' ? 'success' : 'error';
        const latency = item.latency_ms != null ? item.latency_ms + 'ms' : 'n/a';
          const keyAlias = item.key_alias ? item.key_alias : 'key#?';
          card.innerHTML = \`
            <div class="meta">
              <span class="pill">\${item.provider.toUpperCase()}</span>
              <span class="pill">\${item.model}</span>
              <span class="pill">\${keyAlias}</span>
              <span class="pill">\${status}</span>
              <span class="mono">\${latency}</span>
            </div>
            <div class="mono">\${item.caller || 'unknown'} · \${ts}</div>
            <div class="meta">
              <span class="pill">prompt \${item.prompt_chars ?? 0}</span>
              <span class="pill">response \${item.response_chars ?? 0}</span>
            </div>
            \${item.error ? '<textarea readonly>' + item.error + '</textarea>' : ''}
          \`;
          llmUsageEl.appendChild(card);
        });
      }

      async function loadLlmUsage() {
        if (!llmUsageEl || !llmSummaryEl) return;
        try {
          const payload = await api('/llm/usage?limit=50', { method: 'GET' });
          renderLlmUsage(payload);
        } catch (err) {
          setStatus(err.message, 'error');
        }
      }

      async function loadSources() {
        const userId = userIdInput.value.trim();
        const personaId = personaIdInput.value.trim();
        if (!userId) {
          return;
        }
        if (!personaId) {
          setStatus('Persona ID is required to load radar sources.', 'error');
          return;
        }
        persistInputs();
        try {
          const payload = await api(
            '/radar-sources?user_id=' + userId + '&persona_id=' + personaId,
            { method: 'GET' }
          );
          renderSources(payload.sources || []);
        } catch (err) {
          setStatus(err.message, 'error');
        }
      }

      async function loadBookmarks() {
        const userId = userIdInput.value.trim();
        const personaId = personaIdInput.value.trim();
        if (!userId) {
          return;
        }
        if (!personaId) {
          setStatus('Persona ID is required to load bookmarks.', 'error');
          return;
        }
        persistInputs();
        const limit = bookmarkLimitInput ? bookmarkLimitInput.value : '20';
        try {
          const payload = await api(
            '/bookmarks?user_id=' + userId + '&persona_id=' + personaId + '&limit=' + limit,
            { method: 'GET' }
          );
          renderBookmarks(payload.bookmarks || []);
        } catch (err) {
          setStatus(err.message, 'error');
        }
      }

      async function loadCollectionState() {
        const userId = userIdInput.value.trim();
        const personaId = personaIdInput.value.trim();
        if (!userId) {
          return;
        }
        if (!personaId) {
          setStatus('Persona ID is required to load collection state.', 'error');
          return;
        }
        persistInputs();
        try {
          const payload = await api(
            '/collection-state?user_id=' + userId + '&persona_id=' + personaId,
            { method: 'GET' }
          );
          renderCollectionState(payload.states || []);
        } catch (err) {
          setStatus(err.message, 'error');
        }
      }

      async function loadResourceReport() {
        const userId = userIdInput.value.trim();
        const personaId = personaIdInput.value.trim();
        if (!userId) return;
        if (!personaId) {
          setStatus('Persona ID is required to load resource report.', 'error');
          return;
        }
        persistInputs();
        try {
          const payload = await api(
            '/persona-reports?user_id=' + userId + '&persona_id=' + personaId,
            { method: 'GET' }
          );
          renderResourceReport(payload);
        } catch (err) {
          setStatus(err.message, 'error');
        }
      }

      async function generateResourceReport() {
        const personaId = personaIdInput.value.trim();
        if (!personaId) {
          setStatus('Persona ID is required to generate report.', 'error');
          return;
        }
        try {
          await api('/persona-reports/generate', {
            method: 'POST',
            body: { persona_id: personaId },
          });
          await loadResourceReport();
          setStatus('Resource report generated.', 'ok');
        } catch (err) {
          setStatus(err.message, 'error');
        }
      }

      async function loadSignalItems() {
        const userId = userIdInput.value.trim();
        const personaId = personaIdInput.value.trim();
        if (!userId) {
          setStatus('User ID is required to load signal items.', 'error');
          return;
        }
        if (!personaId) {
          setStatus('Persona ID is required to load signal items.', 'error');
          return;
        }
        persistInputs();
        setStatus('Loading signal items...', 'ok');
        try {
          const params = new URLSearchParams();
          params.set('user_id', userId);
          params.set('persona_id', personaId);
          const status = signalStatusFilter.value;
          const minScore = signalMinScoreInput.value;
          const limit = signalLimitInput.value;
          if (status) params.set('status', status);
          if (minScore) params.set('min_score', minScore);
          if (limit) params.set('limit', limit);
          const payload = await api('/signal-items?' + params.toString(), { method: 'GET' });
          renderSignalItems(payload.signal_items || []);
          setStatus('Signal items loaded.', 'ok');
        } catch (err) {
          setStatus(err.message, 'error');
        }
      }

      async function loadFragments() {
        const userId = userIdInput.value.trim();
        const personaId = personaIdInput.value.trim();
        if (!userId) {
          setStatus('User ID is required to load fragments.', 'error');
          return;
        }
        if (!personaId) {
          setStatus('Persona ID is required to load fragments.', 'error');
          return;
        }
        persistInputs();
        setStatus('Loading fragments...', 'ok');
        try {
          const params = new URLSearchParams();
          params.set('user_id', userId);
          params.set('persona_id', personaId);
          const status = fragmentStatusFilter.value;
          const type = fragmentTypeFilter.value;
          const limit = fragmentLimitInput.value;
          if (status) params.set('status', status);
          if (type) params.set('type', type);
          if (limit) params.set('limit', limit);
          const payload = await api('/fragments?' + params.toString(), { method: 'GET' });
          renderFragments(payload.fragments || []);
          setStatus('Fragments loaded.', 'ok');
        } catch (err) {
          setStatus(err.message, 'error');
        }
      }

      async function loadDrafts() {
        const userId = userIdInput.value.trim();
        const personaId = personaIdInput.value.trim();
        if (!userId) {
          setStatus('User ID is required to load drafts.', 'error');
          return;
        }
        if (!personaId) {
          setStatus('Persona ID is required to load drafts.', 'error');
          return;
        }
        persistInputs();
        setStatus('Loading drafts...', 'ok');
        try {
          const params = new URLSearchParams();
          params.set('user_id', userId);
          params.set('persona_id', personaId);
          const status = statusFilter.value;
          const platform = platformFilter.value;
          const limit = limitInput.value;
          if (status) params.set('status', status);
          if (platform) params.set('platform', platform);
          if (limit) params.set('limit', limit);
          const payload = await api('/drafts?' + params.toString(), { method: 'GET' });
          renderDrafts(payload.drafts || []);
          setStatus('Drafts loaded.', 'ok');
        } catch (err) {
          setStatus(err.message, 'error');
        }
      }

      async function addSource() {
        const userId = userIdInput.value.trim();
        const personaId = personaIdInput.value.trim();
        if (!userId) {
          setStatus('User ID is required to add sources.', 'error');
          return;
        }
        if (!personaId) {
          setStatus('Persona ID is required to add sources.', 'error');
          return;
        }
        const name = sourceNameInput.value.trim();
        if (!name) {
          setStatus('Source name is required.', 'error');
          return;
        }
        const type = sourceTypeInput.value;
        const payload = { user_id: userId, persona_id: personaId, name, type };
        if (type === 'reddit') {
          payload.subreddit = sourceSubredditInput.value.trim();
        } else if (type === 'twitter') {
          payload.handle = sourceSubredditInput.value.trim();
          payload.url = sourceUrlInput.value.trim();
        } else {
          payload.url = sourceUrlInput.value.trim();
        }
        try {
          await api('/radar-sources', { method: 'POST', body: payload });
          sourceNameInput.value = '';
          sourceUrlInput.value = '';
          sourceSubredditInput.value = '';
          await loadSources();
          setStatus('Radar source added.', 'ok');
        } catch (err) {
          setStatus(err.message, 'error');
        }
      }

      async function runRadar() {
        const userId = userIdInput.value.trim();
        const personaId = personaIdInput.value.trim();
        if (!userId) {
          setStatus('User ID is required to run radar.', 'error');
          return;
        }
        if (!personaId) {
          setStatus('Persona ID is required to run radar.', 'error');
          return;
        }
        try {
          await api('/radar-sources/run', {
            method: 'POST',
            body: { user_id: userId, persona_id: personaId },
          });
          setStatus('Radar run finished.', 'ok');
          await loadSignalItems();
          await loadFragments();
          await loadDrafts();
        } catch (err) {
          setStatus(err.message, 'error');
        }
      }

      async function runCollection() {
        const userId = userIdInput.value.trim();
        const personaId = personaIdInput.value.trim();
        if (!userId) {
          setStatus('User ID is required to collect bookmarks.', 'error');
          return;
        }
        if (!personaId) {
          setStatus('Persona ID is required to collect bookmarks.', 'error');
          return;
        }
        const platform = collectionPlatformEl.value;
        const limit = collectionLimitEl.value;
        setStatus('Running authenticated collection...', 'ok');
        try {
          const payload = await api('/collection/run', {
            method: 'POST',
            body: { user_id: userId, persona_id: personaId, platform, limit },
          });
          setStatus(
            payload.ok
              ? 'Collection done. Inserted: ' + JSON.stringify(payload.inserted)
              : 'Collection finished with errors: ' + (payload.failures || []).join(', '),
            payload.ok ? 'ok' : 'error'
          );
          await loadCollectionState();
          await loadSignalItems();
          await loadFragments();
          await loadDrafts();
        } catch (err) {
          setStatus(err.message, 'error');
        }
      }

      async function ingest(type) {
        const userId = userIdInput.value.trim();
        const personaId = personaIdInput.value.trim();
        if (!userId) {
          setStatus('User ID is required to ingest.', 'error');
          return;
        }
        if (!personaId) {
          setStatus('Persona ID is required to ingest.', 'error');
          return;
        }
        persistInputs();
        const body = { user_id: userId, persona_id: personaId, type };
        if (type === 'text') {
          body.raw_content = ingestTextEl.value.trim();
          if (!body.raw_content) {
            setStatus('Text content is required.', 'error');
            return;
          }
        } else {
          body.source_url = ingestLinkEl.value.trim();
          if (!body.source_url) {
            setStatus('Link is required.', 'error');
            return;
          }
        }
        setStatus('Ingesting...', 'ok');
        try {
          await api('/ingest', { method: 'POST', body });
          setStatus('Ingested. Drafts will appear shortly.', 'ok');
          await loadDrafts();
        } catch (err) {
          setStatus(err.message, 'error');
        }
      }

      async function ingestBook() {
        const userId = userIdInput.value.trim();
        const personaId = personaIdInput.value.trim();
        if (!userId) {
          setStatus('User ID is required to ingest.', 'error');
          return;
        }
        if (!personaId) {
          setStatus('Persona ID is required to ingest.', 'error');
          return;
        }
        const isbn = bookIsbnEl.value.trim();
        const query = bookQueryEl.value.trim();
        if (!isbn && !query) {
          setStatus('Provide an ISBN or search query.', 'error');
          return;
        }
        persistInputs();
        setStatus('Ingesting book...', 'ok');
        try {
          await api('/ingest/books', {
            method: 'POST',
            body: {
              user_id: userId,
              persona_id: personaId,
              isbn: isbn || undefined,
              query: query || undefined,
            },
          });
          setStatus('Book ingested. Drafts will appear shortly.', 'ok');
          await loadDrafts();
        } catch (err) {
          setStatus(err.message, 'error');
        }
      }

      async function ingestBookmarks() {
        const userId = userIdInput.value.trim();
        const personaId = personaIdInput.value.trim();
        if (!userId) {
          setStatus('User ID is required to ingest.', 'error');
          return;
        }
        if (!personaId) {
          setStatus('Persona ID is required to ingest.', 'error');
          return;
        }
        const urls = bookmarkUrlsEl.value
          .split(/\\r?\\n/)
          .map((u) => u.trim())
          .filter(Boolean);
        if (urls.length === 0) {
          setStatus('Provide at least one URL.', 'error');
          return;
        }
        persistInputs();
        setStatus('Ingesting bookmarks...', 'ok');
        try {
          await api('/ingest/bookmarks', {
            method: 'POST',
            body: { user_id: userId, persona_id: personaId, urls },
          });
          setStatus('Bookmarks ingested. Drafts will appear shortly.', 'ok');
          await loadDrafts();
        } catch (err) {
          setStatus(err.message, 'error');
        }
      }

      document.getElementById('loadDrafts').addEventListener('click', loadDrafts);
      document.getElementById('refresh').addEventListener('click', loadDrafts);
      document.getElementById('ingestTextBtn').addEventListener('click', () => ingest('text'));
      document.getElementById('ingestLinkBtn').addEventListener('click', () => ingest('link'));
      document.getElementById('ingestBookBtn').addEventListener('click', ingestBook);
      document.getElementById('ingestBookmarksBtn').addEventListener('click', ingestBookmarks);
      document.getElementById('addSource').addEventListener('click', addSource);
      document.getElementById('refreshSources').addEventListener('click', loadSources);
      document.getElementById('runRadar').addEventListener('click', runRadar);
      document.getElementById('runCollection').addEventListener('click', runCollection);
      document
        .getElementById('refreshCollectionState')
        .addEventListener('click', loadCollectionState);
      document.getElementById('refreshReport').addEventListener('click', loadResourceReport);
      document.getElementById('generateReport').addEventListener('click', generateResourceReport);
      document.getElementById('loadBookmarks').addEventListener('click', loadBookmarks);
      document.getElementById('refreshBookmarks').addEventListener('click', loadBookmarks);
      document.getElementById('refreshLlmUsage').addEventListener('click', loadLlmUsage);
      document.getElementById('loadSignals').addEventListener('click', loadSignalItems);
      document.getElementById('refreshSignals').addEventListener('click', loadSignalItems);
      document.getElementById('loadFragments').addEventListener('click', loadFragments);
      document.getElementById('refreshFragments').addEventListener('click', loadFragments);

      if (userIdInput.value.trim() && personaIdInput.value.trim()) {
        loadSources();
        loadSignalItems();
        loadCollectionState();
        loadResourceReport();
        loadBookmarks();
        loadFragments();
        loadDrafts();
      }
      loadLlmUsage();
    </script>
  </body>
</html>`;

export function registerUiRoutes(app: Hono) {
  app.get('/', (c) => c.redirect('/ui'));
  app.get('/ui', (c) => c.html(html));
}

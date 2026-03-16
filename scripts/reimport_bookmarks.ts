import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

type ExportPayload = {
  exported_at: string;
  profiles: Array<{
    id: string;
    owner_user_id: string;
    username: string | null;
    telegram_id: number | null;
    onboarding_done: boolean;
  }>;
  bookmarks: Array<any>;
  fragments: Array<any>;
};

type ProfileMap = {
  oldProfileId: string;
  userId: string;
  personaId: string;
};

function normalizeStatus(status?: string | null): string {
  const allowed = new Set(['raw', 'scored', 'queued', 'drafted', 'ignored']);
  if (status && allowed.has(status)) return status;
  return 'raw';
}

async function main() {
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) throw new Error('SUPABASE_DB_URL missing');

  const filePath =
    process.argv[2] ??
    path.join(process.cwd(), 'exports', 'bookmarks_export.json');
  if (!fs.existsSync(filePath)) {
    throw new Error(`Export file not found: ${filePath}`);
  }

  const payload = JSON.parse(fs.readFileSync(filePath, 'utf8')) as ExportPayload;

  const client = new pg.Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const profileMaps: ProfileMap[] = [];

  for (const profile of payload.profiles) {
    const userId = profile.owner_user_id;
    if (!userId) continue;

    await client.query(
      `insert into profiles (id, username, telegram_id, onboarding_done)
       values ($1,$2,$3,$4)
       on conflict (id) do update
       set username=excluded.username,
           telegram_id=excluded.telegram_id,
           onboarding_done=excluded.onboarding_done`,
      [userId, profile.username, profile.telegram_id, profile.onboarding_done]
    );

    const personaName = profile.username || 'Default';
    const personaRes = await client.query(
      `insert into personas (user_id, name, platforms, posts_per_week, active)
       values ($1,$2,$3,$4,true)
       returning id`,
      [userId, personaName, ['twitter', 'threads'], 3]
    );

    const personaId = personaRes.rows[0].id as string;

    await client.query(
      `insert into persona_platforms (persona_id, platform, style_notes, taboos, active)
       values ($1,'twitter',$2,$3,true),
              ($1,'threads',$4,$3,true)`,
      [
        personaId,
        'Short, sharp, no fluff.',
        [],
        'Short paragraphs, direct tone.',
      ]
    );

    profileMaps.push({
      oldProfileId: profile.id,
      userId,
      personaId,
    });
  }

  const mapByOldProfile = new Map(
    profileMaps.map((p) => [p.oldProfileId, p])
  );

  const bookmarkIdMap = new Map<string, string>();
  for (const item of payload.bookmarks) {
    const map = mapByOldProfile.get(item.user_id);
    if (!map) continue;
    const { userId, personaId } = map;

    const res = await client.query(
      `insert into bookmarks (persona_id, user_id, platform, url, title, content, author, post_id, source_meta, created_at, collected_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       on conflict (persona_id, platform, url) do update
       set title=excluded.title,
           content=excluded.content,
           author=excluded.author
       returning id`,
      [
        personaId,
        userId,
        item.platform ?? 'unknown',
        item.url ?? '',
        item.title ?? null,
        item.content ?? null,
        item.author ?? null,
        item.post_id ?? null,
        item.source_meta ?? {},
        item.created_at ?? null,
        item.collected_at ?? new Date().toISOString(),
      ]
    );
    bookmarkIdMap.set(item.id, res.rows[0].id);
  }

  for (const fragment of payload.fragments) {
    const map = mapByOldProfile.get(fragment.user_id);
    if (!map) continue;
    const { userId, personaId } = map;
    const newBookmarkId = fragment.bookmark_id
      ? bookmarkIdMap.get(fragment.bookmark_id) ?? null
      : null;

    await client.query(
      `insert into fragments (persona_id, user_id, type, raw_content, source_url, file_path, status, signal_item_id, bookmark_id, metadata, created_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        personaId,
        userId,
        fragment.type ?? 'text',
        fragment.raw_content ?? null,
        fragment.source_url ?? null,
        fragment.file_path ?? null,
        fragment.status ?? 'raw',
        null,
        newBookmarkId,
        fragment.metadata ?? {},
        fragment.created_at ?? new Date().toISOString(),
      ]
    );
  }

  await client.end();
  console.log(
    `Reimport complete. Profiles: ${profileMaps.length}, Bookmarks: ${bookmarkIdMap.size}, Fragments: ${payload.fragments.length}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

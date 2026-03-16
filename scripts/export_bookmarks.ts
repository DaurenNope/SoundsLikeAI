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

async function main() {
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) throw new Error('SUPABASE_DB_URL missing');

  const client = new pg.Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const profilesRes = await client.query(
    'select id, owner_user_id, username, telegram_id, onboarding_done from profiles'
  );
  const bookmarksRes = await client.query(
    'select * from bookmarks order by collected_at desc'
  );
  const fragmentsRes = await client.query(
    'select * from fragments order by created_at desc'
  );

  const payload: ExportPayload = {
    exported_at: new Date().toISOString(),
    profiles: profilesRes.rows,
    bookmarks: bookmarksRes.rows,
    fragments: fragmentsRes.rows,
  };

  const exportDir = path.join(process.cwd(), 'exports');
  if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });
  const filePath = path.join(exportDir, 'bookmarks_export.json');
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
  console.log(
    `Exported ${payload.bookmarks.length} bookmarks and ${payload.fragments.length} fragments to ${filePath}`
  );

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

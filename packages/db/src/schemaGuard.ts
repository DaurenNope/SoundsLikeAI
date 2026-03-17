import pg from 'pg';

const REQUIRED_TABLES = [
  'profiles',
  'personas',
  'persona_platforms',
  'voice_models',
  'voice_samples',
  'cultural_touchpoints',
  'persona_touchpoints',
  'persona_opinions',
  'knowledge_base',
  'knowledge_usage',
  'radar_sources',
  'signal_items',
  'bookmarks',
  'fragments',
  'drafts',
  'feedback_events',
  'persona_reports',
  'retrain_queue',
  'published_posts',
  'scrape_cache',
  'inbound_emails',
  'llm_usage',
  'collection_state',
];

const REQUIRED_ENUMS: Record<string, string[]> = {
  fragment_type: ['text', 'voice', 'link', 'image', 'document'],
  fragment_status: ['raw', 'processing', 'drafted', 'failed'],
  draft_status: ['ready', 'approved', 'trashed', 'published', 'failed'],
  feedback_action: ['approved', 'edited', 'trashed'],
  signal_status: ['raw', 'scored', 'queued', 'drafted', 'ignored'],
  platform_type: ['twitter', 'threads', 'linkedin', 'newsletter'],
  source_type: ['rss', 'twitter', 'reddit', 'newsletter', 'podcast', 'youtube'],
  voice_sample_source: ['manual', 'approved_draft', 'imported'],
  touchpoint_type: ['person', 'book', 'film', 'podcast', 'concept', 'publication'],
  knowledge_source_type: ['book', 'podcast', 'person', 'article', 'quote', 'transcript'],
};

const REQUIRED_COLUMNS: Record<string, string[]> = {
  profiles: ['id', 'username', 'telegram_id', 'onboarding_done'],
  personas: ['id', 'user_id', 'name', 'platforms', 'posts_per_week', 'active'],
  voice_models: ['id', 'persona_id', 'user_id', 'profile', 'is_active'],
  voice_samples: ['id', 'persona_id', 'user_id', 'content', 'source'],
  radar_sources: ['id', 'persona_id', 'user_id', 'name', 'type'],
  signal_items: ['id', 'persona_id', 'user_id', 'status', 'fetched_at'],
  bookmarks: ['id', 'persona_id', 'user_id', 'platform', 'url', 'collected_at'],
  fragments: ['id', 'persona_id', 'user_id', 'type', 'status', 'bookmark_id'],
  drafts: ['id', 'persona_id', 'user_id', 'fragment_id', 'status'],
  feedback_events: ['id', 'persona_id', 'user_id', 'draft_id', 'action'],
  persona_reports: ['id', 'persona_id', 'user_id', 'report', 'generated_at'],
  knowledge_base: ['id', 'source_type', 'source_name', 'content'],
  knowledge_usage: ['id', 'chunk_id', 'persona_id'],
  retrain_queue: ['persona_id', 'requested_at'],
  published_posts: ['id', 'draft_id', 'persona_id', 'user_id'],
  inbound_emails: ['id', 'user_id', 'from_email', 'content'],
  llm_usage: ['id', 'provider', 'model', 'status', 'created_at'],
  collection_state: ['id', 'user_id', 'persona_id', 'platform', 'last_run_at'],
};

export async function assertSchemaOrThrow() {
  const dbUrl =
    process.env.SUPABASE_DB_URL ||
    process.env.DATABASE_URL ||
    process.env.LOCAL_DATABASE_URL;

  if (!dbUrl) {
    throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL for schema guard');
  }

  const client = new pg.Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const tablesRes = await client.query(
    `select table_name from information_schema.tables where table_schema='public'`
  );
  const tables = new Set(tablesRes.rows.map((r) => r.table_name));

  const missingTables = REQUIRED_TABLES.filter((t) => !tables.has(t));
  if (missingTables.length > 0) {
    await client.end();
    throw new Error(
      `Schema guard failed. Missing tables: ${missingTables.join(', ')}`
    );
  }

  const columnsRes = await client.query(
    `select table_name, column_name from information_schema.columns where table_schema='public'`
  );
  const columnsByTable = new Map<string, Set<string>>();
  for (const row of columnsRes.rows) {
    if (!columnsByTable.has(row.table_name)) {
      columnsByTable.set(row.table_name, new Set());
    }
    columnsByTable.get(row.table_name)!.add(row.column_name);
  }

  const missingColumns: string[] = [];
  for (const [table, columns] of Object.entries(REQUIRED_COLUMNS)) {
    const tableColumns = columnsByTable.get(table) ?? new Set<string>();
    for (const col of columns) {
      if (!tableColumns.has(col)) {
        missingColumns.push(`${table}.${col}`);
      }
    }
  }

  if (missingColumns.length > 0) {
    await client.end();
    throw new Error(
      `Schema guard failed. Missing columns: ${missingColumns.join(', ')}`
    );
  }

  const enumsRes = await client.query(
    `select t.typname as enum_name, e.enumlabel as enum_value\n     from pg_type t\n     join pg_enum e on t.oid = e.enumtypid\n     join pg_namespace n on n.oid = t.typnamespace\n     where n.nspname = 'public'\n     order by t.typname, e.enumsortorder`
  );
  const enums: Record<string, string[]> = {};
  for (const row of enumsRes.rows) {
    if (!enums[row.enum_name]) enums[row.enum_name] = [];
    enums[row.enum_name].push(row.enum_value);
  }

  const missingEnums: string[] = [];
  for (const [enumName, values] of Object.entries(REQUIRED_ENUMS)) {
    const actual = enums[enumName] ?? [];
    for (const value of values) {
      if (!actual.includes(value)) {
        missingEnums.push(`${enumName}:${value}`);
      }
    }
  }

  await client.end();

  if (missingEnums.length > 0) {
    throw new Error(
      `Schema guard failed. Missing enum values: ${missingEnums.join(', ')}`
    );
  }
}

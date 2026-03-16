import 'dotenv/config';
import pg from 'pg';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function main() {
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) throw new Error('SUPABASE_DB_URL missing');

  const client = new pg.Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  await client.query('begin');

  await client.query(`
    create temp table tmp_bookmark_signals as
    select
      si.*,
      coalesce(
        si.score_reasoning->>'platform',
        rs.config->>'platform',
        rs.type::text
      ) as platform
    from signal_items si
    left join radar_sources rs on rs.id = si.source_id
    where
      (
        (si.score_reasoning->>'source' = 'bookmarks')
        or (rs.config->>'collection_mode' = 'bookmarks')
        or (rs.name ilike 'Bookmarks - %')
      )
      and (
        coalesce(
          si.score_reasoning->>'platform',
          rs.config->>'platform',
          rs.type::text
        ) in ('twitter','threads','reddit')
        or si.url ~* '(twitter\\.com|x\\.com|threads\\.net|reddit\\.com)'
      );
  `);

  const countRes = await client.query(
    'select count(*)::int as cnt from tmp_bookmark_signals'
  );
  const total = countRes.rows[0]?.cnt ?? 0;

  await client.query(
    `
    insert into bookmarks (
      user_id,
      persona_id,
      platform,
      url,
      title,
      content,
      author,
      source_meta,
      created_at,
      collected_at
    )
    select
      user_id,
      persona_id,
      coalesce(platform, 'unknown'),
      url,
      title,
      content,
      null,
      jsonb_build_object(
        'migrated_from', 'signal_items',
        'source_id', source_id,
        'score_reasoning', score_reasoning
      ),
      fetched_at,
      fetched_at
    from (
      select distinct on (persona_id, coalesce(platform, 'unknown'), url)
        *
      from tmp_bookmark_signals
      where url is not null
      order by persona_id, coalesce(platform, 'unknown'), url, fetched_at desc
    ) dedup
    on conflict (persona_id, platform, url) do update
    set title = excluded.title,
        content = excluded.content
    `
  );

  await client.query(
    `
    update fragments f
    set bookmark_id = b.id,
        signal_item_id = null
    from bookmarks b
    join tmp_bookmark_signals t
      on t.url = b.url
     and t.persona_id = b.persona_id
     and coalesce(t.platform, 'unknown') = b.platform
    where f.signal_item_id = t.id
    `
  );

  await client.query(
    'delete from signal_items where id in (select id from tmp_bookmark_signals)'
  );

  await client.query('commit');
  await client.end();

  console.log(`Migrated ${total} signal_items into bookmarks.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

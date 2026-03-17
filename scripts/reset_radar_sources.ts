import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY required');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

type RadarSourceSeed = {
  name: string;
  type: 'rss' | 'reddit' | 'twitter' | 'podcast' | 'youtube';
  url?: string;
  config?: Record<string, unknown>;
};

const SOURCE_SEED: RadarSourceSeed[] = [
  {
    name: 'HubSpot Sales Blog',
    type: 'rss',
    url: 'https://blog.hubspot.com/sales/rss.xml',
  },
  {
    name: 'HubSpot Service Blog',
    type: 'rss',
    url: 'https://blog.hubspot.com/service/rss.xml',
  },
  {
    name: 'SalesforceBen',
    type: 'rss',
    url: 'https://www.salesforceben.com/feed/',
  },
  {
    name: 'Zoho Blog',
    type: 'rss',
    url: 'https://www.zoho.com/blog/feed/',
  },
  {
    name: 'Intercom Blog',
    type: 'rss',
    url: 'https://www.intercom.com/blog/feed/',
  },
  {
    name: 'WorkOS Blog',
    type: 'rss',
    url: 'https://workos.com/blog/rss.xml',
  },
  {
    name: 'Airtable Blog',
    type: 'rss',
    url: 'https://blog.airtable.com/rss/',
  },
  {
    name: 'Process Street Blog',
    type: 'rss',
    url: 'https://www.process.st/blog/feed/',
  },
  {
    name: 'RingCentral Blog',
    type: 'rss',
    url: 'https://www.ringcentral.com/us/en/blog/feed/',
  },
  {
    name: 'AWS Enterprise Strategy',
    type: 'rss',
    url: 'https://aws.amazon.com/blogs/enterprise-strategy/feed/',
  },
  {
    name: 'vc.ru (CIS Business Tech)',
    type: 'rss',
    url: 'https://vc.ru/rss/all',
  },
  {
    name: 'Habr (CIS Tech/Business)',
    type: 'rss',
    url: 'https://habr.com/ru/rss/all/all/',
  },
  {
    name: 'r/sales',
    type: 'reddit',
    config: { subreddit: 'sales' },
  },
  {
    name: 'r/salesops',
    type: 'reddit',
    config: { subreddit: 'salesops' },
  },
  {
    name: 'r/operations',
    type: 'reddit',
    config: { subreddit: 'operations' },
  },
  {
    name: 'r/SaaS',
    type: 'reddit',
    config: { subreddit: 'SaaS' },
  },
  {
    name: 'HubSpot (Twitter)',
    type: 'twitter',
    config: { handle: 'HubSpot' },
  },
  {
    name: 'Salesforce (Twitter)',
    type: 'twitter',
    config: { handle: 'salesforce' },
  },
];

async function main() {
  const personaName = process.env.RADAR_PERSONA_NAME ?? 'RahmetLabs';

  const { data: personas, error: personaErr } = await supabase
    .from('personas')
    .select('id, user_id, name')
    .ilike('name', personaName)
    .limit(2);

  if (personaErr) {
    throw new Error(`Failed to load persona: ${personaErr.message}`);
  }

  if (!personas || personas.length === 0) {
    throw new Error(`No persona found for name ${personaName}`);
  }
  if (personas.length > 1) {
    throw new Error(`Multiple personas matched ${personaName}. Use exact name.`);
  }

  const persona = personas[0];

  const { error: sourceDeleteErr } = await supabase
    .from('radar_sources')
    .delete()
    .eq('persona_id', persona.id);

  if (sourceDeleteErr) {
    throw new Error(`Failed to clear radar_sources: ${sourceDeleteErr.message}`);
  }

  const sourcesToInsert = SOURCE_SEED.map((source) => ({
    user_id: persona.user_id,
    persona_id: persona.id,
    name: source.name,
    type: source.type,
    url: source.url ?? null,
    config: source.config ?? {},
    active: true,
  }));

  const { error: insertErr } = await supabase
    .from('radar_sources')
    .insert(sourcesToInsert);

  if (insertErr) {
    throw new Error(`Failed to insert radar_sources: ${insertErr.message}`);
  }

  const { count, error: countErr } = await supabase
    .from('radar_sources')
    .select('id', { count: 'exact', head: true })
    .eq('persona_id', persona.id);

  if (countErr) {
    throw new Error(`Failed to count radar_sources: ${countErr.message}`);
  }

  console.log(
    `Reset radar_sources for ${persona.name} (${persona.id}). Total: ${count ?? 0}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

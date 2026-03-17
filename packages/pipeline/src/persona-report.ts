import { supabase } from '@sla/db';

type SourceCandidate = {
  type: 'rss' | 'reddit' | 'youtube' | 'podcast' | 'twitter';
  name: string;
  url?: string;
  config?: Record<string, unknown>;
  reason: string;
  priority: 'high' | 'medium' | 'low';
};

type PersonaReport = {
  target_audience: string;
  positioning: string;
  content_pillars: string[];
  source_candidates: SourceCandidate[];
};

function includesAny(value: string, needles: string[]) {
  const hay = value.toLowerCase();
  return needles.some((n) => hay.includes(n));
}

function buildReportForPersona(persona: {
  name: string;
  description?: string | null;
  platforms?: string[] | null;
}) {
  const description = persona.description?.toLowerCase() ?? '';
  const isWeb3 = includesAny(description, ['web3', 'blockchain', 'defi', 'crypto', 'smart contract']);
  const isAutomation = includesAny(description, ['automation', 'ops', 'ai ops', 'workflow', 'revops']);

  const targetAudience = isAutomation
    ? 'B2B operations leaders, founders, and teams drowning in manual workflows who need automation'
    : 'B2B founders and product leaders looking to ship and scale systems fast';

  const positioning = isAutomation
    ? 'We turn manual ops into automated systems using AI agents, integrations, and measurable ROI'
    : 'We design and build product systems fast with modern web and automation stacks';

  const contentPillars = [
    'Ops automation outcomes (before/after, hours saved, SLA improvements)',
    'AI agent workflows and playbooks for business systems',
    'Delivery velocity: architecture choices that ship fast without breaking',
    'System integration: CRM/ERP/support/chat tooling connected',
  ];

  if (isWeb3) {
    contentPillars.push('Web3 automation: on-chain analytics, smart contract ops, infra reliability');
  }

  const sources: SourceCandidate[] = [
    {
      type: 'rss',
      name: 'Hacker News',
      url: 'https://news.ycombinator.com/rss',
      reason: 'B2B startup ecosystem, product, and systems discussions',
      priority: 'high',
    },
    {
      type: 'rss',
      name: 'TechCrunch',
      url: 'https://techcrunch.com/feed/',
      reason: 'B2B tech and funding signals relevant to buyers',
      priority: 'medium',
    },
    {
      type: 'rss',
      name: 'MIT Technology Review',
      url: 'https://www.technologyreview.com/feed/',
      reason: 'AI and automation trends for ops leaders',
      priority: 'medium',
    },
    {
      type: 'reddit',
      name: 'r/startups',
      config: { subreddit: 'startups' },
      reason: 'B2B founders discussing operational pain and tooling',
      priority: 'high',
    },
    {
      type: 'reddit',
      name: 'r/SaaS',
      config: { subreddit: 'SaaS' },
      reason: 'Recurring-revenue operators with automation needs',
      priority: 'medium',
    },
    {
      type: 'twitter',
      name: 'Y Combinator',
      config: { handle: 'ycombinator' },
      reason: 'Founder and product signal stream',
      priority: 'medium',
    },
    {
      type: 'podcast',
      name: 'Lex Fridman Podcast',
      url: 'https://lexfridman.com/feed/podcast/',
      reason: 'Long-form founder and AI conversations',
      priority: 'low',
    },
    {
      type: 'youtube',
      name: 'Lex Fridman',
      url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCSHZKyawb77ixDdsGog4iWA',
      reason: 'Video interviews with builders and AI leaders',
      priority: 'low',
    },
  ];

  if (isWeb3) {
    sources.push(
      {
        type: 'rss',
        name: 'CoinDesk',
        url: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
        reason: 'Web3 market signals and infra changes',
        priority: 'low',
      },
      {
        type: 'reddit',
        name: 'r/ethdev',
        config: { subreddit: 'ethdev' },
        reason: 'Smart contract and web3 engineering discussion',
        priority: 'low',
      }
    );
  }

  const report: PersonaReport = {
    target_audience: targetAudience,
    positioning,
    content_pillars: contentPillars,
    source_candidates: sources,
  };

  return report;
}

async function seedRadarSources(
  userId: string,
  personaId: string,
  sources: SourceCandidate[]
) {
  const existing = await supabase
    .from('radar_sources')
    .select('id,type,url,config')
    .eq('user_id', userId)
    .eq('persona_id', personaId);

  const seen = new Set<string>();
  for (const row of existing.data ?? []) {
    const key = `${row.type}:${row.url ?? ''}:${JSON.stringify(row.config ?? {})}`;
    seen.add(key);
  }

  const inserts = sources.filter((source) => {
    const key = `${source.type}:${source.url ?? ''}:${JSON.stringify(source.config ?? {})}`;
    return !seen.has(key);
  });

  if (inserts.length === 0) return;

  await supabase.from('radar_sources').insert(
    inserts.map((source) => ({
      user_id: userId,
      persona_id: personaId,
      name: source.name,
      type: source.type,
      url: source.url ?? null,
      config: source.config ?? {},
      active: true,
    }))
  );
}

export async function generatePersonaReport(personaId: string) {
  const { data: persona } = await supabase
    .from('personas')
    .select('id,user_id,name,description,platforms')
    .eq('id', personaId)
    .single();

  if (!persona) {
    throw new Error('Persona not found');
  }

  const report = buildReportForPersona({
    name: persona.name,
    description: persona.description,
    platforms: persona.platforms ?? [],
  });

  await supabase.from('persona_reports').upsert(
    [
      {
        persona_id: persona.id,
        user_id: persona.user_id,
        report,
        generated_at: new Date().toISOString(),
      },
    ],
    { onConflict: 'persona_id' }
  );

  await seedRadarSources(persona.user_id, persona.id, report.source_candidates);

  return report;
}

export async function runPersonaReportSweep() {
  const { data: personas } = await supabase
    .from('personas')
    .select('id')
    .eq('active', true);

  for (const persona of personas ?? []) {
    await generatePersonaReport(persona.id);
  }
}

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { llm } from '../packages/ai/src/llm/router.ts';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY required');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

const STOP_TITLES = [
  'monthly post',
  "who's hiring",
  'gossip hour',
  'welcome to r/',
];

const STOPWORDS = new Set(
  [
    'the',
    'and',
    'for',
    'with',
    'that',
    'this',
    'from',
    'your',
    'into',
    'over',
    'when',
    'what',
    'why',
    'how',
    'we',
    'our',
    'you',
    'they',
    'them',
    'their',
    'are',
    'was',
    'were',
    'but',
    'not',
    'can',
    'will',
    'about',
    'after',
    'before',
    'just',
    'its',
    'it',
    'as',
    'on',
    'in',
    'of',
    'to',
    'a',
    'an',
  ].map((w) => w.toLowerCase())
);

const ANGLES = ['lesson', 'playbook', 'warning', 'comparison', 'contrarian'];
const HOOKS = ['metaphor', 'constraint', 'mini-story', 'counterfactual', 'trade-off'];
const STRUCTURES = ['1-liner', '3-step', 'before-after', 'short-story', 'qa'];
const COMBOS = ANGLES.flatMap((angle) =>
  HOOKS.flatMap((hook) => STRUCTURES.map((structure) => ({ angle, hook, structure })))
);

function comboHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

const ROLE_TERMS = [
  'coo',
  'head of sales',
  'sales ops',
  'revops',
  'operations',
  'sales',
  'customer success',
  'cio',
  'head of it',
  'owner',
  'founder',
  'director',
  'vp',
  'manager',
  'procurement',
  'finance',
];

const INDUSTRY_TERMS = [
  'b2b',
  'saas',
  'logistics',
  'retail',
  'manufacturing',
  'fintech',
  'healthcare',
  'education',
  'real estate',
  'construction',
  'telecom',
  'ecommerce',
  'enterprise',
  'smb',
];

const KEYWORDS = [
  'automation',
  'ops',
  'operations',
  'devops',
  'revops',
  'sales ops',
  'support ops',
  'customer success',
  'sales',
  'revenue',
  'workflow',
  'integration',
  'api',
  'sync',
  'pipeline',
  'deployment',
  'release',
  'incident',
  'reliability',
  'observability',
  'monitoring',
  'infrastructure',
  'platform',
  'migration',
  'cloud',
  'security',
  'compliance',
  'governance',
  'identity',
  'access',
  'sso',
  'auth',
  'data',
  'crm',
  'erp',
  'billing',
  'procurement',
  'b2b',
  'saas',
  'onboarding',
  'automation platform',
  'productivity',
  'автоматизация',
  'операции',
  'продажи',
  'внедрение',
  'процессы',
];

const USER_INPUT_KEYWORDS = [
  'automation',
  'ops',
  'operations',
  'revops',
  'sales ops',
  'crm',
  'erp',
  'pipeline',
  'workflow',
  'integration',
  'process',
  'compliance',
  'onboarding',
  'customer success',
  'sales',
  'revenue',
  'b2b',
  'saas',
  'governance',
  'audit',
  'procurement',
  'billing',
  'автоматизация',
  'операции',
  'продажи',
  'внедрение',
  'процессы',
];

function cleanText(input: string | null | undefined): string {
  return (input ?? '').replace(/\s+/g, ' ').trim();
}

function normalizeNote(input: string | null | undefined): string {
  const cleaned = cleanText(input);
  if (!cleaned) return '';
  const firstSentence = cleaned.split(/(?<=[.!?])\s+/)[0] || cleaned;
  return firstSentence.slice(0, 160);
}

function isLowIntent(title: string): boolean {
  const lowered = title.toLowerCase();
  return STOP_TITLES.some((t) => lowered.includes(t));
}

function extractKeywords(text: string): string[] {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9а-яё\s-]/gi, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 4 && !STOPWORDS.has(t));

  const counts = new Map<string, number>();
  for (const token of tokens) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([word]) => KEYWORDS.some((kw) => word.includes(kw) || kw.includes(word)))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word);
}

function keywordHits(text: string): string[] {
  const lowered = text.toLowerCase();
  return KEYWORDS.filter((kw) => lowered.includes(kw));
}

type Enrichment = {
  metric: string | null;
  processStep: string | null;
  roleOrIndustry: string | null;
};

function extractMetric(text: string): string | null {
  const match =
    text.match(
      /\\b(?:\\d{1,3}(?:[.,]\\d{3})+|\\d+)(?:[.,]\\d+)?\\s?(?:%|percent|hrs|hours|days|weeks|months|leads|meetings|calls|tickets|users|employees|мин|минут|час|часов|дней|недель|месяцев)\\b/i
    ) ||
    text.match(/\\b(?:\\d{1,3}(?:[.,]\\d{3})+|\\d+)(?:[.,]\\d+)?\\s?(?:k|m|тыс|млн)\\b/i);
  return match ? match[0] : null;
}

function extractProcessStep(text: string): string | null {
  const candidates = [
    'set up',
    'setup',
    'implement',
    'roll out',
    'automate',
    'integrate',
    'migrate',
    'standardize',
    'centralize',
    'replace',
    'remove',
    'sync',
    'dedupe',
    'enrich',
    'route',
    'score',
    'qualify',
    'clean',
    'monitor',
    'audit',
    'approve',
    'guide',
    'playbook',
    'how to',
    'case study',
    'внедр',
    'автомат',
    'интегр',
    'мигр',
    'централиз',
    'очист',
    'синхрон',
    'настро',
    'скоринг',
    'валидац',
  ];
  const lowered = text.toLowerCase();
  const hit = candidates.find((c) => lowered.includes(c));
  if (!hit) return null;
  return hit;
}

function extractRoleOrIndustry(text: string): string | null {
  const lowered = text.toLowerCase();
  const role = ROLE_TERMS.find((r) => lowered.includes(r));
  if (role) return role;
  const industry = INDUSTRY_TERMS.find((i) => lowered.includes(i));
  return industry ?? null;
}

function inferRoleFromSource(sourceName?: string, sourceUrl?: string): string | null {
  const text = `${sourceName ?? ''} ${sourceUrl ?? ''}`.toLowerCase();
  if (text.includes('salesops')) return 'sales ops';
  if (text.includes('sales')) return 'head of sales';
  if (text.includes('operations')) return 'coo';
  if (text.includes('service')) return 'customer success';
  if (text.includes('saas')) return 'saas';
  if (text.includes('revops')) return 'revops';
  if (text.includes('crm')) return 'crm';
  if (text.includes('enterprise')) return 'enterprise';
  return null;
}

const STEP_MAP: Array<{ keywords: string[]; step: string }> = [
  { keywords: ['compliance', 'audit', 'iso'], step: 'automate compliance checks' },
  { keywords: ['lead', 'pipeline', 'routing'], step: 'route leads into CRM' },
  { keywords: ['crm', 'salesforce', 'hubspot'], step: 'centralize intake in CRM' },
  { keywords: ['onboarding', 'activation'], step: 'standardize onboarding checklist' },
  { keywords: ['conversation intelligence', 'call', 'recording'], step: 'tag calls and push notes into CRM' },
  { keywords: ['data quality', 'enrich', 'dedupe'], step: 'dedupe and enrich records nightly' },
  { keywords: ['support', 'ticket'], step: 'auto‑route tickets by category' },
  { keywords: ['revops', 'sales ops'], step: 'lock one pipeline definition and enforce it' },
  { keywords: ['automation', 'workflow'], step: 'replace manual steps with one workflow' },
];

function deriveProcessStep(text: string): string | null {
  const lowered = text.toLowerCase();
  for (const rule of STEP_MAP) {
    if (rule.keywords.some((kw) => lowered.includes(kw))) {
      return rule.step;
    }
  }
  return null;
}

const SOURCE_STEP_MAP: Array<{ keywords: string[]; step: string }> = [
  { keywords: ['process street'], step: 'document SOPs and enforce checklists' },
  { keywords: ['hubspot'], step: 'standardize pipeline stages and CRM fields' },
  { keywords: ['salesforce'], step: 'lock pipeline definitions and enforce usage' },
  { keywords: ['ringcentral'], step: 'tag calls and sync outcomes to CRM' },
  { keywords: ['intercom'], step: 'route conversations and update CRM automatically' },
  { keywords: ['airtable'], step: 'centralize ops data into one base' },
  { keywords: ['workos'], step: 'standardize onboarding and access flows' },
  { keywords: ['zoho'], step: 'clean and normalize CRM data nightly' },
];

function deriveStepFromSource(sourceName?: string, sourceUrl?: string): string | null {
  const text = `${sourceName ?? ''} ${sourceUrl ?? ''}`.toLowerCase();
  for (const rule of SOURCE_STEP_MAP) {
    if (rule.keywords.some((kw) => text.includes(kw))) {
      return rule.step;
    }
  }
  return null;
}

function enrichSignal(signal: any): Enrichment {
  const text = `${signal?.title ?? ''} ${signal?.content ?? ''}`.replace(/\\s+/g, ' ').trim();
  const derivedStep = deriveProcessStep(text);
  const extractedStep = extractProcessStep(text);
  const step =
    derivedStep ||
    (extractedStep && ['how to', 'guide', 'playbook', 'case study'].includes(extractedStep)
      ? null
      : extractedStep) ||
    deriveStepFromSource(signal?.radar_sources?.name, signal?.radar_sources?.url);
  return {
    metric: extractMetric(text),
    processStep: step,
    roleOrIndustry:
      extractRoleOrIndustry(text) ||
      inferRoleFromSource(signal?.radar_sources?.name, signal?.radar_sources?.url) ||
      inferRoleFromSource(undefined, signal?.url),
  };
}

function buildSuggestion(
  angle: string,
  hook: string,
  structure: string,
  signal: any,
  enrichment: Enrichment,
  userNote?: string
) {
  const title = cleanText(signal?.title);
  const role = enrichment.roleOrIndustry ? `${enrichment.roleOrIndustry}` : 'ops team';
  const step = enrichment.processStep || 'standardize intake';
  const baseInsight = userNote || `${step} for the ${role}`;
  const metric = enrichment.metric ? `(${enrichment.metric})` : '';
  const roleLabel = (() => {
    if (role === 'operations') return 'COO';
    if (role === 'customer success') return 'Head of CS';
    if (role === 'sales') return 'Head of Sales';
    if (role === 'revops') return 'RevOps lead';
    if (role === 'enterprise') return 'enterprise COO';
    return role;
  })();

  const hookText = (() => {
    if (hook === 'metaphor') {
      return 'Your ops stack is like a kitchen: too many orders come in from random doors.';
    }
    if (hook === 'mini-story') {
      return `A ${roleLabel} told me: “We had 9 dashboards and zero truth.”`;
    }
    if (hook === 'constraint') {
      return 'If you only had 10 minutes a week to fix ops, start here.';
    }
    if (hook === 'counterfactual') {
      return 'Imagine if sales never touched a spreadsheet again.';
    }
    return `You can ship fast or track revenue — unless you ${step}.`;
  })();

  const angleText = (() => {
    if (angle === 'playbook') {
      return `Playbook: ${step} → 3 steps: diagnose → automate → monitor.`;
    }
    if (angle === 'warning') {
      return `Warning: ${title} looks fine on paper, but it hides the real bottleneck.`;
    }
    if (angle === 'comparison') {
      return `Before: ${title}. After: ${baseInsight} ${metric}.`;
    }
    if (angle === 'contrarian') {
      return `Contrarian take: ${title} is the wrong focus. The lever is ${baseInsight}.`;
    }
    return `Lesson from ${title}: ${baseInsight} ${metric}.`;
  })();

  if (structure === '1-liner') {
    return `${hookText} ${angleText}`;
  }
  if (structure === '3-step') {
    return `${hookText}\n1) ${step}\n2) ${baseInsight}\n3) Measure ${metric || 'the outcome'}`;
  }
  if (structure === 'before-after') {
    return `${hookText} Before: ${title}. After: ${baseInsight} ${metric}.`;
  }
  if (structure === 'qa') {
    return `Q: What actually fixes ${title}?\nA: ${baseInsight} (${role}). ${metric ? `Result: ${metric}.` : ''}`;
  }
  return `${hookText} ${angleText}`;
}

async function buildSuggestionLLM(
  angle: string,
  hook: string,
  structure: string,
  signal: any,
  enrichment: Enrichment,
  userNote?: string
): Promise<string> {
  const systemPrompt = [
    'You are a founder-operator writing short, authentic posts about ops, CRM, and automation.',
    'Voice: blunt, practical, no fluff, no buzzwords.',
    'Banned phrases: "in today’s world", "leveraging", "optimize", "synergy".',
    'Must include: one concrete action step; one creative device (metaphor, mini-story, constraint, counterfactual, trade-off).',
    'If metric is missing, do NOT invent numbers; instead name the metric to track.',
    'Keep it under 120 words.',
  ].join(' ');

  const userPrompt = [
    `Angle: ${angle}`,
    `Hook style: ${hook}`,
    `Structure: ${structure}`,
    `Signal title: ${signal?.title ?? ''}`,
    `Signal content: ${cleanText(signal?.content).slice(0, 600)}`,
    `Enrichment: metric=${enrichment.metric ?? 'none'}, step=${
      enrichment.processStep ?? 'none'
    }, role=${enrichment.roleOrIndustry ?? 'none'}`,
    userNote ? `User note: ${userNote}` : 'User note: none',
    'Write one post now.',
  ].join('\n');

  return llm.complete([{ role: 'user', content: userPrompt }], systemPrompt, {
    caller: 'suggestor_v2',
  });
}

async function main() {
  const personaName = process.env.SUGGEST_PERSONA_NAME ?? 'RahmetLabs';
  const max = Number(process.env.SUGGEST_MAX ?? 10);

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

  const { data: signals } = await supabase
    .from('signal_items')
    .select('id, title, content, url, fetched_at, source_id, radar_sources(name, url, type)')
    .eq('persona_id', persona.id)
    .order('fetched_at', { ascending: false })
    .limit(400);

  const { data: notes } = await supabase
    .from('fragments')
    .select('id, raw_content, created_at')
    .eq('persona_id', persona.id)
    .is('signal_item_id', null)
    .is('bookmark_id', null)
    .order('created_at', { ascending: false })
    .limit(40);

  const filteredSignals =
    signals?.filter((s) => s.title && !isLowIntent(s.title)) ?? [];
  const nonRedditSignals = filteredSignals.filter((s) => !s.url?.includes('reddit.com'));
  const redditSignals = filteredSignals.filter((s) => s.url?.includes('reddit.com'));
  const orderedSignals = [...nonRedditSignals, ...redditSignals];
  const filteredNotes =
    notes?.filter((n) => {
      const text = `${n.raw_content ?? ''}`.trim();
      if (text.length < 40 || text.length > 500) return false;
      const lowered = text.toLowerCase();
      if (lowered.includes('http') || lowered.includes('wikipedia')) return false;
      return USER_INPUT_KEYWORDS.some((kw) => lowered.includes(kw));
    }) ?? [];

  const keywordPool = extractKeywords(
    filteredSignals.map((s) => `${s.title ?? ''} ${s.content ?? ''}`).join(' ')
  );

  const suggestions = [];
  const usedNotes = new Set<string>();
  const comboQueue = [...COMBOS].sort((a, b) => {
    const aKey = `${a.angle}|${a.hook}|${a.structure}`;
    const bKey = `${b.angle}|${b.hook}|${b.structure}`;
    return comboHash(aKey) - comboHash(bKey);
  });
  let signalIndex = 0;
  while (suggestions.length < Math.min(max, orderedSignals.length) && signalIndex < orderedSignals.length) {
    const signal = orderedSignals[signalIndex++];
    const signalText = `${signal.title ?? ''} ${signal.content ?? ''}`;
    const enrichment = enrichSignal(signal);
    const richness = [enrichment.metric, enrichment.processStep, enrichment.roleOrIndustry].filter(Boolean).length;
    if (richness < 2) {
      continue;
    }

    const signalKeywords = keywordHits(signalText);
    const note =
      filteredNotes.find((n) => {
        const hits = USER_INPUT_KEYWORDS.filter((kw) =>
          `${n.raw_content ?? ''}`.toLowerCase().includes(kw)
        );
        const normalized = normalizeNote(n.raw_content);
        return hits.some((kw) => signalKeywords.includes(kw)) && !usedNotes.has(normalized);
      }) ?? undefined;

    const combo = comboQueue[suggestions.length % comboQueue.length];
    const angle = combo.angle;
    const hook = combo.hook;
    const structure = combo.structure;

    const userText = note ? normalizeNote(note.raw_content) : '';
    if (userText) usedNotes.add(userText);
    let text = '';
    try {
      text = await buildSuggestionLLM(
        angle,
        hook,
        structure,
        signal,
        enrichment,
        userText
      );
    } catch (err) {
      text = buildSuggestion(angle, hook, structure, signal, enrichment, userText);
    }

    suggestions.push({
      format: angle,
      hook,
      angle,
      structure,
      draft_text: text,
      signal_url: signal.url,
      enrichment,
    });
  }

  const themes = keywordPool.slice(0, 8);

  console.log(JSON.stringify({ persona: persona.name, themes, suggestions }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

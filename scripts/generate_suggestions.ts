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

const FORMATS = [
  'War Story',
  'Hot Take',
  'Playbook',
  'Before/After',
  'Counter-intuitive',
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

function buildSuggestion(format: string, signal: any, bookmark?: any) {
  const title = cleanText(signal?.title);
  const insight = cleanText(signal?.content).slice(0, 200);
  const userNote = cleanText(bookmark?.content || bookmark?.title).slice(0, 160);

  if (format === 'War Story') {
    return `We saw this in the wild: ${title}. Here’s the fix we used: ${userNote || 'outline the 3-step repair.'}`;
  }
  if (format === 'Hot Take') {
    return `Hot take: ${title} is the wrong focus. The real lever is ${userNote || 'cleaning the ops bottleneck'}.`;
  }
  if (format === 'Playbook') {
    return `Playbook: ${title} → 3 steps: ${userNote || 'diagnose → automate → monitor'}.`;
  }
  if (format === 'Before/After') {
    return `Before: ${title}. After: ${userNote || 'CRM + automation turned it into a clean pipeline.'}`;
  }
  return `Counter‑intuitive lesson from ${title}: ${userNote || 'less tooling, more process design.'}`;
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
    .select('id, title, content, url, fetched_at')
    .eq('persona_id', persona.id)
    .order('fetched_at', { ascending: false })
    .limit(60);

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
  for (let i = 0; i < Math.min(max, orderedSignals.length); i += 1) {
    const signal = orderedSignals[i];
    const signalText = `${signal.title ?? ''} ${signal.content ?? ''}`;
    const signalKeywords = keywordHits(signalText);
    const note =
      filteredNotes.find((n) => {
        const hits = USER_INPUT_KEYWORDS.filter((kw) =>
          `${n.raw_content ?? ''}`.toLowerCase().includes(kw)
        );
        return hits.some((kw) => signalKeywords.includes(kw));
      }) ?? undefined;
    const format = FORMATS[i % FORMATS.length];
    const userText = note?.raw_content || '';
    suggestions.push({
      format,
      text: buildSuggestion(format, signal, userText ? { content: userText } : undefined),
      signal_url: signal.url,
      user_source_url: null,
    });
  }

  const themes = keywordPool.slice(0, 8);

  console.log(JSON.stringify({ persona: persona.name, themes, suggestions }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

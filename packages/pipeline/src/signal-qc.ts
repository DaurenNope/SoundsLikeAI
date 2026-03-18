import { supabase } from '@sla/db';

const STOP_TITLES = ['monthly post', "who's hiring", 'gossip hour', 'welcome to r/'];
const PROCESS_KEYWORDS = [
  'automation',
  'workflow',
  'crm',
  'revops',
  'sales ops',
  'integration',
  'onboarding',
  'compliance',
  'checklist',
  'pipeline',
  'routing',
  'dedupe',
  'enrich',
  'audit',
  'governance',
];

function scoreSignalItem(item: { title?: string | null; content?: string | null; url?: string | null }) {
  const title = (item.title ?? '').toLowerCase();
  const content = (item.content ?? '').toLowerCase();
  let score = 50;
  const reasons: Record<string, unknown> = {};

  if (STOP_TITLES.some((t) => title.includes(t))) {
    score -= 40;
    reasons.low_intent = true;
  }

  if (PROCESS_KEYWORDS.some((kw) => title.includes(kw) || content.includes(kw))) {
    score += 20;
    reasons.process_keyword = true;
  }

  if (content.match(/\b\d{1,3}(?:[.,]\d+)?\s?(%|percent|hours|hrs|days|weeks|months|leads|tickets)\b/i)) {
    score += 20;
    reasons.has_metric = true;
  }

  if ((item.url ?? '').includes('reddit.com')) {
    score -= 10;
    reasons.reddit_penalty = true;
  }

  if ((item.content ?? '').length < 80) {
    score -= 20;
    reasons.too_short = true;
  }

  score = Math.max(0, Math.min(100, score));
  return { score, reasons };
}

export async function processSignalQC(options?: {
  userId?: string;
  personaId?: string;
  limit?: number;
}) {
  const limit = options?.limit ?? Number(process.env.QC_MAX_ITEMS ?? 50);
  const threshold = Number(process.env.QC_SCORE_THRESHOLD ?? 60);

  let query = supabase
    .from('signal_items')
    .select('id, user_id, persona_id, title, content, url')
    .eq('status', 'raw')
    .order('fetched_at', { ascending: false })
    .limit(limit);

  if (options?.userId) query = query.eq('user_id', options.userId);
  if (options?.personaId) query = query.eq('persona_id', options.personaId);

  const { data: signals } = await query;

  for (const signal of signals ?? []) {
    const { score, reasons } = scoreSignalItem(signal);
    const decision = score >= threshold ? 'approved' : 'rejected';

    await supabase.from('signal_reviews').insert({
      signal_id: signal.id,
      persona_id: signal.persona_id,
      user_id: signal.user_id,
      score,
      decision,
      reasons,
    });

    await supabase
      .from('signal_items')
      .update({ status: decision === 'approved' ? 'queued' : 'ignored' })
      .eq('id', signal.id);
  }
}

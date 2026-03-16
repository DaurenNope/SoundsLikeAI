import { supabase } from '@sla/db';

export type LLMUsageEvent = {
  user_id?: string | null;
  persona_id?: string | null;
  provider: string;
  model: string;
  key_alias?: string | null;
  caller?: string | null;
  status: 'success' | 'error';
  latency_ms?: number | null;
  prompt_chars?: number | null;
  response_chars?: number | null;
  error?: string | null;
};

export async function recordLlmUsage(event: LLMUsageEvent): Promise<void> {
  if (process.env.LLM_USAGE_ENABLED === 'false') return;
  try {
    await supabase.from('llm_usage').insert({
      ...event,
    });
  } catch (err: any) {
    console.warn('[LLM] usage log failed', err?.message ?? err);
  }
}

export type LLMMessage = { role: 'user' | 'assistant' | 'system'; content: string };

export interface LLMProvider {
  name: string;
  model: string;
  complete(messages: LLMMessage[], systemPrompt?: string): Promise<string>;
  getLastKeyAlias?(): string | undefined;
}

export class LLMRouter {
  private providers: LLMProvider[];

  constructor(providers: LLMProvider[]) {
    this.providers = providers;
  }

  async complete(
    messages: LLMMessage[],
    systemPrompt?: string,
    meta?: { caller?: string; userId?: string; personaId?: string }
  ): Promise<string> {
    for (const provider of this.providers) {
      const startedAt = Date.now();
      try {
        const result = await provider.complete(messages, systemPrompt);
        const latency = Date.now() - startedAt;
        const keyAlias = provider.getLastKeyAlias?.();
        await recordLlmUsage({
          user_id: meta?.userId,
          persona_id: meta?.personaId,
          provider: provider.name,
          model: provider.model,
          key_alias: keyAlias,
          caller: meta?.caller,
          status: 'success',
          latency_ms: latency,
          prompt_chars: countChars(messages, systemPrompt),
          response_chars: result?.length ?? 0,
        });
        console.log(`[LLM] Used: ${provider.name}`);
        return result;
      } catch (err: any) {
        const latency = Date.now() - startedAt;
        const keyAlias = provider.getLastKeyAlias?.();
        await recordLlmUsage({
          user_id: meta?.userId,
          persona_id: meta?.personaId,
          provider: provider.name,
          model: provider.model,
          key_alias: keyAlias,
          caller: meta?.caller,
          status: 'error',
          latency_ms: latency,
          prompt_chars: countChars(messages, systemPrompt),
          error: err?.message ?? String(err),
        });
        console.warn(
          `[LLM] ${provider.name} failed: ${err?.message ?? err} — trying next`
        );
        continue;
      }
    }
    throw new Error('[LLM] All providers failed');
  }
}

import { GroqProvider } from './providers/groq';
import { GeminiProvider } from './providers/gemini';
import { MistralProvider } from './providers/mistral';
import { OpenRouterProvider } from './providers/openrouter';
import { parseKeys } from './keyPool';
import { recordLlmUsage } from './usage';

const rotation = (process.env.LLM_KEY_ROTATION as 'round_robin' | 'random') ?? 'round_robin';
const cooldownMs = Number(process.env.LLM_KEY_COOLDOWN_MS ?? 60000);

export const llm = new LLMRouter([
  new GroqProvider(
    parseKeys(process.env.GROQ_API_KEY, process.env.GROQ_API_KEYS),
    rotation,
    cooldownMs
  ),
  new GeminiProvider(
    parseKeys(process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEYS),
    rotation,
    cooldownMs
  ),
  new MistralProvider(
    parseKeys(process.env.MISTRAL_API_KEY, process.env.MISTRAL_API_KEYS),
    rotation,
    cooldownMs
  ),
  new OpenRouterProvider(
    parseKeys(process.env.OPENROUTER_API_KEY, process.env.OPENROUTER_API_KEYS),
    rotation,
    cooldownMs
  ),
]);

function countChars(messages: LLMMessage[], systemPrompt?: string): number {
  const msgChars = messages.reduce((sum, m) => sum + (m.content?.length ?? 0), 0);
  return msgChars + (systemPrompt?.length ?? 0);
}

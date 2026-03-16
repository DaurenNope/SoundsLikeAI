import type { LLMMessage, LLMProvider } from '../router';
import { KeyPool } from '../keyPool';

export class OpenRouterProvider implements LLMProvider {
  name = 'openrouter';
  model = 'meta-llama/llama-3.1-70b-instruct:free';
  private pool: KeyPool;
  private lastKeyAlias?: string;

  constructor(keys: string[], rotation?: 'round_robin' | 'random', cooldownMs?: number) {
    this.pool = new KeyPool(keys, rotation, cooldownMs);
  }

  async complete(messages: LLMMessage[], systemPrompt?: string): Promise<string> {
    const attempts = Math.max(this.pool.size(), 1);
    let lastErr: Error | null = null;
    for (let i = 0; i < attempts; i += 1) {
      const apiKey = this.pool.next();
      if (!apiKey) break;
      this.lastKeyAlias = this.pool.getKeyAlias(apiKey);

      const body = {
        model: this.model,
        messages: systemPrompt
          ? [{ role: 'system', content: systemPrompt }, ...messages]
          : messages,
      };

      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const err = new Error(`OpenRouter error: ${res.status}`);
          this.pool.markFailure(apiKey, err.message);
          throw err;
        }
        const data = await res.json();
        return data.choices?.[0]?.message?.content?.trim() ?? '';
      } catch (err: any) {
        lastErr = err instanceof Error ? err : new Error(String(err));
        this.pool.markFailure(apiKey, lastErr.message);
        continue;
      }
    }

    if (lastErr) throw lastErr;
    throw new Error('Missing OPENROUTER_API_KEY');
  }

  getLastKeyAlias(): string | undefined {
    return this.lastKeyAlias;
  }
}

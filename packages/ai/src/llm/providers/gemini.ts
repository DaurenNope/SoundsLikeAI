import type { LLMMessage, LLMProvider } from '../router';
import { KeyPool } from '../keyPool';

export class GeminiProvider implements LLMProvider {
  name = 'gemini';
  model = 'gemini-1.5-flash';
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

      const contents = messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      const body = {
        systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
        contents,
      };

      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }
        );

        if (!res.ok) {
          const err = new Error(`Gemini error: ${res.status}`);
          this.pool.markFailure(apiKey, err.message);
          throw err;
        }
        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
      } catch (err: any) {
        lastErr = err instanceof Error ? err : new Error(String(err));
        this.pool.markFailure(apiKey, lastErr.message);
        continue;
      }
    }

    if (lastErr) throw lastErr;
    throw new Error('Missing GEMINI_API_KEY');
  }

  getLastKeyAlias(): string | undefined {
    return this.lastKeyAlias;
  }
}

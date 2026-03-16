type RotationMode = 'round_robin' | 'random';

export class KeyPool {
  private keys: string[];
  private index = 0;
  private cooldowns = new Map<string, number>();
  private rotation: RotationMode;
  private cooldownMs: number;

  constructor(keys: string[], rotation?: RotationMode, cooldownMs?: number) {
    this.keys = keys.filter((k) => k && k.trim().length > 0);
    this.rotation = rotation ?? 'round_robin';
    this.cooldownMs = cooldownMs ?? 60000;
  }

  size(): number {
    return this.keys.length;
  }

  getKeyAlias(key: string): string | undefined {
    const idx = this.keys.indexOf(key);
    if (idx === -1) return undefined;
    return `key#${idx + 1}`;
  }

  next(): string | null {
    if (this.keys.length === 0) return null;
    if (this.rotation === 'random') {
      return this.pickRandom();
    }
    return this.pickRoundRobin();
  }

  private pickRoundRobin(): string {
    const start = this.index % this.keys.length;
    for (let i = 0; i < this.keys.length; i += 1) {
      const idx = (start + i) % this.keys.length;
      const key = this.keys[idx];
      if (!this.isCoolingDown(key)) {
        this.index = idx + 1;
        return key;
      }
    }
    const key = this.keys[start];
    this.index = start + 1;
    return key;
  }

  private pickRandom(): string {
    const available = this.keys.filter((k) => !this.isCoolingDown(k));
    const list = available.length > 0 ? available : this.keys;
    const key = list[Math.floor(Math.random() * list.length)];
    return key;
  }

  markFailure(key: string, reason?: string): void {
    if (shouldCooldown(reason)) {
      this.cooldowns.set(key, Date.now() + this.cooldownMs);
    }
  }

  private isCoolingDown(key: string): boolean {
    const until = this.cooldowns.get(key);
    if (!until) return false;
    if (Date.now() > until) {
      this.cooldowns.delete(key);
      return false;
    }
    return true;
  }
}

export function parseKeys(primary?: string, multi?: string): string[] {
  const values = [];
  if (multi) values.push(multi);
  if (primary) values.push(primary);
  return values
    .join(',')
    .split(/[\n, ]+/)
    .map((k) => k.trim())
    .filter(Boolean);
}

export function shouldCooldown(reason?: string): boolean {
  if (!reason) return false;
  return reason.includes('429') || reason.toLowerCase().includes('rate');
}

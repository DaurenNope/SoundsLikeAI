const DOMAIN_LIMITS: Record<string, number> = {
  'reddit.com': 1000,
  default: 500,
};

const lastRequestTime: Record<string, number> = {};

export async function waitForRateLimit(url: string): Promise<void> {
  const host = new URL(url).hostname.replace('www.', '');
  const limit = DOMAIN_LIMITS[host] ?? DOMAIN_LIMITS.default;
  const last = lastRequestTime[host] ?? 0;
  const elapsed = Date.now() - last;
  const wait = Math.max(0, limit - elapsed);

  if (wait > 0) {
    await new Promise((r) => setTimeout(r, wait + Math.random() * 300));
  }

  lastRequestTime[host] = Date.now();
}

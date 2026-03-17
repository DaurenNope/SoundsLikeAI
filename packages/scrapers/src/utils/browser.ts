import { chromium as stealthChromium } from 'playwright-extra';
import { chromium as playwrightChromium } from 'playwright-core';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { cleanText } from './clean';
import { getProxyUrl } from './proxy';

stealthChromium.use(StealthPlugin());

type BrowserTool = 'playwright' | 'lightpanda';

const DEFAULT_TIMEOUT = 30000;

async function scrapeWithPlaywright(url: string) {
  const proxyUrl = getProxyUrl();
  const browser = await stealthChromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    proxy: proxyUrl ? { server: proxyUrl } : undefined,
  });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: DEFAULT_TIMEOUT });
    await page.waitForTimeout(600 + Math.random() * 800);
    const title = await page.title();
    const content = await page.evaluate(() => document.body?.innerText ?? '');
    await page.close();
    return { title, content: cleanText(content).slice(0, 8000) };
  } finally {
    await browser.close();
  }
}

async function scrapeWithLightpanda(url: string) {
  const token = process.env.LIGHTPANDA_TOKEN;
  const region = process.env.LIGHTPANDA_REGION ?? 'euwest';
  const proxy = process.env.LIGHTPANDA_PROXY;
  const fromToken = token
    ? `wss://${region}.cloud.lightpanda.io/ws?token=${token}&browser=lightpanda${
        proxy ? `&proxy=${proxy}` : ''
      }`
    : null;
  const rawUrl = process.env.LIGHTPANDA_CDP_URL ?? fromToken ?? '';
  const cdpUrl = rawUrl.trim();
  if (!cdpUrl) {
    throw new Error('LIGHTPANDA_CDP_URL is not set');
  }
  try {
    new URL(cdpUrl);
  } catch {
    throw new Error('LIGHTPANDA_CDP_URL is invalid');
  }
  const browser = await playwrightChromium.connectOverCDP(cdpUrl);
  try {
    const context = browser.contexts()[0] ?? (await browser.newContext());
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: DEFAULT_TIMEOUT });
    await page.waitForTimeout(600 + Math.random() * 800);
    const title = await page.title();
    const content = await page.evaluate(() => document.body?.innerText ?? '');
    await page.close();
    return { title, content: cleanText(content).slice(0, 8000) };
  } finally {
    await browser.close();
  }
}

export async function scrapeWithBrowser(
  url: string
): Promise<{ title: string; content: string; tool: BrowserTool } | null> {
  const mode = (process.env.SCRAPE_BROWSER_MODE ?? 'off').toLowerCase();
  if (mode === 'off') return null;

  const ratio = Number(process.env.SCRAPE_BROWSER_PILOT_RATIO ?? 0.5);
  const prefer: BrowserTool =
    mode === 'lightpanda'
      ? 'lightpanda'
      : mode === 'playwright'
      ? 'playwright'
      : mode === 'pilot' && Math.random() < ratio
      ? 'lightpanda'
      : 'playwright';

  const run = async (tool: BrowserTool) => {
    const result =
      tool === 'lightpanda'
        ? await scrapeWithLightpanda(url)
        : await scrapeWithPlaywright(url);
    return result ? { ...result, tool } : null;
  };

  try {
    const primary = await run(prefer);
    if (primary && primary.content.length > 0) {
      return primary;
    }
  } catch (err) {
    console.warn(`[Browser] ${prefer} failed for ${url}: ${err}`);
  }

  if (prefer !== 'playwright') {
    try {
      const fallback = await run('playwright');
      if (fallback && fallback.content.length > 0) {
        return fallback;
      }
    } catch (err) {
      console.warn(`[Browser] playwright failed for ${url}: ${err}`);
    }
  }

  return null;
}

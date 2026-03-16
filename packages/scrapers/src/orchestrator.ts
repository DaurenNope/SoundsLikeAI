import { PlaywrightCrawler, RequestQueue } from 'crawlee';
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { cleanText } from './utils/clean';
import { getProxyUrl } from './utils/proxy';

chromium.use(StealthPlugin());

export interface CrawlResult {
  url: string;
  title: string;
  content: string;
  error?: string;
}

export async function batchCrawl(urls: string[]): Promise<CrawlResult[]> {
  const results: CrawlResult[] = [];
  const requestQueue = await RequestQueue.open();

  for (const url of urls) {
    await requestQueue.addRequest({ url });
  }

  const crawler = new PlaywrightCrawler({
    requestQueue,
    launchContext: {
      launcher: chromium,
      launchOptions: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        proxy: getProxyUrl() ? { server: getProxyUrl()! } : undefined,
      },
    },
    maxConcurrency: 2,
    requestHandlerTimeoutSecs: 30,
    maxRequestRetries: 1,
    async requestHandler({ request, page }) {
      await page.waitForTimeout(600 + Math.random() * 800);
      await page.waitForLoadState('domcontentloaded');
      const title = await page.title();
      const content = await page.evaluate(() => document.body?.innerText ?? '');
      results.push({
        url: request.url,
        title,
        content: cleanText(content).slice(0, 6000),
      });
    },
    async failedRequestHandler({ request }, err) {
      results.push({ url: request.url, title: '', content: '', error: err.message });
    },
  });

  await crawler.run();
  return results;
}

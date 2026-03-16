import { extract } from '@extractus/article-extractor';
import * as cheerio from 'cheerio';
import { cleanText } from '../utils/clean';
import { initProxyFetch } from '../utils/proxy';
import { scrapeWithBrowser } from '../utils/browser';
import type { ScrapeResult } from '../index';

initProxyFetch();

const MIN_BROWSER_CONTENT = Number(process.env.SCRAPE_BROWSER_MIN_LEN ?? 500);

export async function scrapeArticle(url: string): Promise<ScrapeResult> {
  try {
    const article = await extract(url, {
      wordsPerMinute: 300,
      descriptionTruncateLen: 10000,
    });
    if (article?.content && article.content.length > 200) {
      return {
        title: article.title ?? '',
        content: cleanText(article.content),
        url,
        author: article.author,
        publishedAt: article.published,
        type: 'article',
      };
    }
  } catch (err) {
    console.warn(`[Article] Extractor failed for ${url}: ${err}`);
  }

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      Accept: 'text/html',
    },
  });
  const html = await res.text();
  const $ = cheerio.load(html);
  $('script, style, nav, footer, header, aside').remove();
  const title = $('h1').first().text() || $('title').text();
  const content = $('article, main, .post-content, .entry-content, .article-body')
    .first()
    .text();

  const cleanedTitle = cleanText(title);
  const cleanedContent = cleanText(content).slice(0, 8000);

  if (cleanedContent.length < MIN_BROWSER_CONTENT) {
    const browserResult = await scrapeWithBrowser(url);
    if (browserResult && browserResult.content.length > cleanedContent.length) {
      return {
        title: browserResult.title || cleanedTitle,
        content: browserResult.content,
        url,
        type: 'article',
      };
    }
  }

  return { title: cleanedTitle, content: cleanedContent, url, type: 'article' };
}

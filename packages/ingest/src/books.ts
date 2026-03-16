export interface BookInfo {
  title: string;
  authors: string[];
  description?: string;
  publishYear?: number;
  isbn?: string;
  olid?: string;
  sourceUrl?: string;
}

export async function fetchBookByIsbn(isbn: string): Promise<BookInfo> {
  const cleanIsbn = isbn.replace(/[^0-9Xx]/g, '');
  if (!cleanIsbn) {
    throw new Error('isbn is required');
  }
  const book = await fetchJson(
    `https://openlibrary.org/isbn/${encodeURIComponent(cleanIsbn)}.json`
  );
  const authors = await fetchAuthors(book.authors);
  return {
    title: book.title,
    authors,
    description: normalizeDescription(book.description),
    publishYear: book.publish_date ? parseYear(book.publish_date) : undefined,
    isbn: cleanIsbn,
    olid: book.key?.replace('/books/', ''),
    sourceUrl: `https://openlibrary.org${book.key}`,
  };
}

export async function fetchBookByQuery(query: string): Promise<BookInfo> {
  if (!query || query.trim().length < 2) {
    throw new Error('query is required');
  }
  const search = await fetchJson(
    `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=1`
  );
  const doc = search.docs?.[0];
  if (!doc) {
    throw new Error('no books found');
  }

  let workKey = doc.key;
  if (doc.cover_edition_key) {
    workKey = `/books/${doc.cover_edition_key}`;
  }

  const work = await fetchJson(`https://openlibrary.org${workKey}.json`);
  const authors = await fetchAuthors(work.authors);

  return {
    title: work.title ?? doc.title,
    authors,
    description: normalizeDescription(work.description) ?? doc.first_sentence,
    publishYear: doc.first_publish_year,
    isbn: Array.isArray(doc.isbn) ? doc.isbn[0] : undefined,
    olid: work.key?.replace('/works/', ''),
    sourceUrl: `https://openlibrary.org${work.key ?? workKey}`,
  };
}

export function buildBookFragmentText(info: BookInfo): string {
  const lines = [
    `Book: ${info.title}`,
    info.authors.length ? `Author: ${info.authors.join(', ')}` : '',
    info.publishYear ? `Published: ${info.publishYear}` : '',
    info.description ? '' : '',
    info.description ? info.description : '',
  ]
    .filter((line) => line !== '')
    .join('\n');

  return lines.trim();
}

async function fetchAuthors(authors?: Array<{ key: string }>): Promise<string[]> {
  if (!authors || authors.length === 0) return [];
  const results: string[] = [];
  for (const author of authors.slice(0, 3)) {
    if (!author?.key) continue;
    try {
      const data = await fetchJson(`https://openlibrary.org${author.key}.json`);
      if (data?.name) results.push(data.name);
    } catch {
      continue;
    }
  }
  return results;
}

function normalizeDescription(description: any): string | undefined {
  if (!description) return undefined;
  if (typeof description === 'string') return description;
  if (description?.value) return String(description.value);
  return undefined;
}

function parseYear(value: string): number | undefined {
  const match = value.match(/(19|20)\\d{2}/);
  return match ? Number(match[0]) : undefined;
}

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'SoundsLikeAI/1.0' },
  });
  if (!res.ok) {
    throw new Error(`Open Library error: ${res.status}`);
  }
  return res.json();
}

import { supabase } from '@sla/db';
import { transcribe } from '@sla/ai';
import { buildBookFragmentText, fetchBookByIsbn, fetchBookByQuery } from './books';

export type IngestType = 'text' | 'link' | 'voice' | 'image' | 'document';

export interface IngestFragmentInput {
  userId: string;
  personaId: string;
  type: IngestType;
  rawContent?: string;
  sourceUrl?: string;
  filePath?: string;
  metadata?: Record<string, unknown>;
  signalItemId?: string | null;
  dedupe?: boolean;
  transcribeVoice?: boolean;
}

export interface IngestFragmentResult {
  fragmentId: string;
  deduped: boolean;
  processable: boolean;
}

export interface IngestEmailInput {
  userId: string;
  personaId?: string;
  fromEmail: string;
  subject?: string;
  content: string;
  process?: boolean;
}

export interface IngestEmailResult {
  inboundEmailId: string;
  fragmentId?: string;
  processed: boolean;
}

export interface IngestBookInput {
  userId: string;
  personaId: string;
  isbn?: string;
  query?: string;
}

export interface IngestBookResult extends IngestFragmentResult {
  bookTitle: string;
  sourceUrl?: string;
}

const DEFAULT_DEDUPE_WINDOW_HOURS = 24;

export async function ingestFragment(
  input: IngestFragmentInput
): Promise<IngestFragmentResult> {
  if (!input.userId) {
    throw new Error('user_id is required');
  }
  if (!input.personaId) {
    throw new Error('persona_id is required');
  }
  if (!input.personaId) {
    throw new Error('persona_id is required');
  }
  if (!input.type) {
    throw new Error('type is required');
  }

  const type = input.type;
  let rawContent = input.rawContent?.toString().trim() ?? '';
  let sourceUrl = input.sourceUrl?.toString().trim() ?? '';
  const filePath = input.filePath?.toString().trim() ?? '';
  const metadata: Record<string, unknown> = { ...(input.metadata ?? {}) };

  if (type === 'text' && rawContent.length === 0) {
    throw new Error('raw_content is required for text');
  }

  if (type === 'link') {
    if (!sourceUrl) {
      throw new Error('source_url is required for link');
    }
    sourceUrl = normalizeUrl(sourceUrl);
  }

  if ((type === 'voice' || type === 'image' || type === 'document') && !filePath) {
    throw new Error('file_path is required for file inputs');
  }

  const dedupe = input.dedupe ?? type === 'link';
  if (dedupe && sourceUrl) {
    const since = new Date(Date.now() - DEFAULT_DEDUPE_WINDOW_HOURS * 3600 * 1000).toISOString();
    const { data: existing } = await supabase
      .from('fragments')
      .select('id, status')
      .eq('user_id', input.userId)
      .eq('persona_id', input.personaId)
      .eq('source_url', sourceUrl)
      .gte('created_at', since)
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      return { fragmentId: existing.id, deduped: true, processable: false };
    }
  }

  let fragmentType: IngestType = type;
  let processable = type === 'text' || type === 'link';

  if (
    type === 'voice' &&
    input.transcribeVoice &&
    process.env.WHISPER_SERVICE_URL &&
    filePath
  ) {
    rawContent = await transcribe(filePath);
    fragmentType = 'text';
    processable = true;
    metadata.original_type = 'voice';
    metadata.original_file_path = filePath;
  }

  const { data: fragment, error } = await supabase
    .from('fragments')
    .insert({
      user_id: input.userId,
      persona_id: input.personaId,
      type: fragmentType,
      raw_content: rawContent || null,
      source_url: sourceUrl || null,
      file_path: filePath || null,
      signal_item_id: input.signalItemId ?? null,
      status: 'raw',
      metadata,
    })
    .select('id')
    .single();

  if (error || !fragment) {
    throw new Error(error?.message ?? 'failed to insert fragment');
  }

  return { fragmentId: fragment.id, deduped: false, processable };
}

export async function ingestEmail(
  input: IngestEmailInput
): Promise<IngestEmailResult> {
  if (!input.userId) {
    throw new Error('user_id is required');
  }
  if (!input.fromEmail) {
    throw new Error('from_email is required');
  }
  const normalizedContent = normalizeEmailContent(input.content);
  if (!normalizedContent || normalizedContent.trim().length < 50) {
    throw new Error('content must be at least 50 characters');
  }

  const { data: inboundEmail, error } = await supabase
    .from('inbound_emails')
    .insert({
      user_id: input.userId,
      persona_id: input.personaId ?? null,
      from_email: input.fromEmail,
      subject: input.subject ?? null,
      content: normalizedContent,
      processed: false,
    })
    .select('id')
    .single();

  if (error || !inboundEmail) {
    throw new Error(error?.message ?? 'failed to insert inbound email');
  }

  if (!input.process) {
    return { inboundEmailId: inboundEmail.id, processed: false };
  }
  if (!input.personaId) {
    throw new Error('persona_id is required to process inbound email');
  }

  const rawContent = input.subject
    ? `${input.subject}\n\n${normalizedContent}`
    : normalizedContent;

  const fragment = await ingestFragment({
    userId: input.userId,
    personaId: input.personaId,
    type: 'text',
    rawContent,
    metadata: {
      source: 'email',
      inbound_email_id: inboundEmail.id,
      from_email: input.fromEmail,
      subject: input.subject ?? null,
    },
    dedupe: false,
  });

  await supabase
    .from('inbound_emails')
    .update({ processed: true })
    .eq('id', inboundEmail.id);

  return {
    inboundEmailId: inboundEmail.id,
    fragmentId: fragment.fragmentId,
    processed: true,
  };
}

function normalizeEmailContent(content: string): string {
  const trimmed = content.trim();
  if (!trimmed.includes('<')) return trimmed;
  return trimmed
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function ingestBook(
  input: IngestBookInput
): Promise<IngestBookResult> {
  if (!input.userId) {
    throw new Error('user_id is required');
  }

  const bookInfo = input.isbn
    ? await fetchBookByIsbn(input.isbn)
    : await fetchBookByQuery(input.query ?? '');

  const rawContent = buildBookFragmentText(bookInfo);
  if (!rawContent || rawContent.length < 10) {
    throw new Error('book description is too short');
  }

  const result = await ingestFragment({
    userId: input.userId,
    personaId: input.personaId,
    type: 'text',
    rawContent,
    metadata: {
      source: 'book',
      isbn: bookInfo.isbn,
      olid: bookInfo.olid,
      source_url: bookInfo.sourceUrl,
    },
    dedupe: false,
  });

  return {
    ...result,
    bookTitle: bookInfo.title,
    sourceUrl: bookInfo.sourceUrl,
  };
}

function normalizeUrl(value: string): string {
  try {
    const url = new URL(value.trim());
    return url.toString();
  } catch (err) {
    throw new Error('source_url is not a valid URL');
  }
}

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { supabase } from '@sla/db';
import { processFragment } from './fragment';

export type CollectionPlatform = 'twitter' | 'threads' | 'reddit';

type CollectedPost = {
  platform: CollectionPlatform;
  post_id?: string | null;
  title?: string | null;
  content?: string | null;
  url?: string | null;
  author?: string | null;
  created_at?: string | null;
};

type RunCollectionOptions = {
  userId: string;
  personaId: string;
  platform?: 'all' | CollectionPlatform;
  limit?: number;
  stopAt?: string | null;
  skipProcessing?: boolean;
};

type RunCollectionResult = {
  inserted: Record<string, number>;
  failures: string[];
};

function runCollector(platform: CollectionPlatform, limit: number, stopAt?: string) {
  return new Promise<CollectedPost[]>((resolve, reject) => {
    const script =
      process.env.COLLECTOR_SCRIPT ??
      path.resolve(process.cwd(), 'scripts', 'collect_bookmarks.py');
    const beyondlinesRoot =
      process.env.BEYONDLINES_MVP_PATH ??
      '/Users/mac/Documents/Development/beyondlines/beyondlines_mvp';
    const preferredPython = path.join(beyondlinesRoot, 'venv', 'bin', 'python');
    const python =
      process.env.BEYONDLINES_PYTHON ??
      (fs.existsSync(preferredPython) ? preferredPython : 'python3');

    const args = [script, '--platform', platform, '--limit', String(limit)];
    if (stopAt) {
      args.push('--stop-at', stopAt);
    }

    const child = spawn(python, args, {
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (err) => {
      reject(err);
    });
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `collector failed with code ${code}`));
        return;
      }
      try {
        const parsed = JSON.parse(stdout || '[]');
        resolve(Array.isArray(parsed) ? parsed : []);
      } catch (err) {
        reject(new Error('collector output was not valid JSON'));
      }
    });
  });
}

export async function runCollectionForPersona(
  options: RunCollectionOptions
): Promise<RunCollectionResult> {
  const {
    userId,
    personaId,
    platform = 'all',
    limit = 50,
    stopAt = null,
    skipProcessing = false,
  } = options;

  const platforms: CollectionPlatform[] =
    platform === 'all'
      ? (['twitter', 'threads', 'reddit'] as const)
      : [platform];

  const existingUrls = new Set<string>();
  const { data: existingBookmarks } = await supabase
    .from('bookmarks')
    .select('url')
    .eq('user_id', userId)
    .eq('persona_id', personaId)
    .not('url', 'is', null)
    .limit(10000);
  for (const row of existingBookmarks ?? []) {
    if (row.url) existingUrls.add(row.url);
  }

  const summary: Record<string, number> = {};
  const failures: string[] = [];

  for (const p of platforms) {
    try {
      let stopCursor = stopAt;
      if (!stopCursor) {
        const { data: state } = await supabase
          .from('collection_state')
          .select('last_post_id')
          .eq('user_id', userId)
          .eq('persona_id', personaId)
          .eq('platform', p)
          .maybeSingle();
        stopCursor = state?.last_post_id ?? null;
      }

      const posts = await runCollector(p, limit, stopCursor ?? undefined);
      let inserted = 0;

      for (const post of posts) {
        const url = post.url?.toString().trim();
        if (!url || existingUrls.has(url)) {
          continue;
        }

        const title = post.title?.toString().trim() || 'Bookmark';
        const content = post.content?.toString().trim() || '';
        const rawContent = content ? `${title}\n\n${content}` : title;

        const { data: bookmark, error: bookmarkErr } = await supabase
          .from('bookmarks')
          .upsert(
            [
              {
                user_id: userId,
                persona_id: personaId,
                platform: p,
                url,
                title,
                content: content || title,
                author: post.author ?? null,
                post_id: post.post_id ?? null,
                created_at: post.created_at ?? null,
                source_meta: { source: 'bookmarks', platform: p },
              },
            ],
            { onConflict: 'persona_id,platform,url', ignoreDuplicates: true }
          )
          .select()
          .single();

        let bookmarkId = bookmark?.id ?? null;
        if (!bookmarkId && !bookmarkErr) {
          const { data: existing } = await supabase
            .from('bookmarks')
            .select('id')
            .eq('user_id', userId)
            .eq('persona_id', personaId)
            .eq('platform', p)
            .eq('url', url)
            .maybeSingle();
          bookmarkId = existing?.id ?? null;
        }

        if (!bookmarkId) {
          continue;
        }

        const { data: fragment, error: fragErr } = await supabase
          .from('fragments')
          .insert({
            user_id: userId,
            persona_id: personaId,
            type: 'text',
            raw_content: rawContent,
            source_url: url,
            bookmark_id: bookmarkId,
            status: 'raw',
            metadata: { platform: p, post_id: post.post_id, author: post.author },
          })
          .select()
          .single();

        if (fragErr || !fragment) {
          continue;
        }

        if (!skipProcessing) {
          await processFragment(fragment.id);
        }
        existingUrls.add(url);
        inserted += 1;
      }

      summary[p] = inserted;

      const newest = posts
        .filter((post) => post.post_id)
        .map((post) => ({
          post_id: post.post_id!,
          created_at: post.created_at ? Date.parse(post.created_at) : 0,
        }))
        .sort((a, b) => b.created_at - a.created_at)[0];

      await supabase.from('collection_state').upsert(
        [
          {
            user_id: userId,
            persona_id: personaId,
            platform: p,
            last_post_id: newest?.post_id ?? stopCursor ?? null,
            last_run_at: new Date().toISOString(),
          },
        ],
        { onConflict: 'user_id,persona_id,platform' }
      );
    } catch (err: any) {
      failures.push(`${p}: ${err?.message ?? err}`);
    }
  }

  return { inserted: summary, failures };
}

export async function runCollectionSweep(options?: {
  userId?: string;
  personaId?: string;
  limit?: number;
  platform?: 'all' | CollectionPlatform;
  skipProcessing?: boolean;
}) {
  const limit = options?.limit ?? Number(process.env.COLLECTION_LIMIT ?? 50);
  const platform = options?.platform ?? 'all';
  const skipProcessing =
    options?.skipProcessing ?? process.env.COLLECTION_SKIP_PROCESSING === 'true';
  const platformsEnv = process.env.COLLECTION_PLATFORMS;

  const platforms =
    platform === 'all'
      ? ((platformsEnv?.split(',').map((p) => p.trim()) ??
          ['twitter', 'threads', 'reddit']) as CollectionPlatform[])
      : [platform];

  let query = supabase.from('personas').select('id,user_id').eq('active', true);
  if (options?.userId) {
    query = query.eq('user_id', options.userId);
  }
  if (options?.personaId) {
    query = query.eq('id', options.personaId);
  }

  const { data: personas } = await query;

  for (const persona of personas ?? []) {
    for (const p of platforms) {
      await runCollectionForPersona({
        userId: persona.user_id,
        personaId: persona.id,
        platform: p,
        limit,
        skipProcessing,
      });
    }
  }
}

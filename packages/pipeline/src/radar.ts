import { supabase } from '@sla/db';
import {
  fetchPodcastFeed,
  fetchRssFeed,
  fetchSubreddit,
  fetchTwitterFeed,
  fetchYoutubeFeed,
} from '@sla/scrapers';
import { embed, transcribeUrl } from '@sla/ai';
import { scoreSignal } from './matching';
import { processFragment } from './fragment';

export async function runRadarScan(options?: {
  userId?: string;
  personaId?: string;
  sourceId?: string;
}) {
  const maxItems = Number(process.env.RADAR_MAX_ITEMS ?? 0);
  const scoreThreshold = Number(process.env.RADAR_SCORE_THRESHOLD ?? 75);
  const requireEmbeddings = (process.env.RADAR_REQUIRE_EMBEDDINGS ?? 'true') !== 'false';
  const noEmbeddingsScore = Number(process.env.RADAR_NO_EMBEDDINGS_SCORE ?? 0);
  const queueOnly = (process.env.RADAR_QUEUE_ONLY ?? 'true') !== 'false';
  const ingestionNoDrafts = (process.env.INGESTION_NO_DRAFTS ?? 'true') !== 'false';
  const requireKeywords = (process.env.RADAR_REQUIRE_KEYWORDS ?? 'true') !== 'false';
  const keywordList =
    process.env.RADAR_KEYWORDS?.split(',').map((k) => k.trim()).filter(Boolean) ?? [
      'automation',
      'ops',
      'operations',
      'devops',
      'revops',
      'sales ops',
      'support ops',
      'customer success',
      'sales',
      'revenue',
      'workflow',
      'integration',
      'api',
      'sync',
      'pipeline',
      'deployment',
      'release',
      'ci/cd',
      'cicd',
      'incident',
      'reliability',
      'sre',
      'observability',
      'monitoring',
      'logging',
      'on-call',
      'runbook',
      'infrastructure',
      'platform',
      'architecture',
      'migration',
      'cloud',
      'security',
      'compliance',
      'audit',
      'governance',
      'identity',
      'access',
      'sso',
      'auth',
      'network',
      'data',
      'internal tool',
      'backoffice',
      'ticketing',
      'crm',
      'erp',
      'billing',
      'procurement',
      'b2b',
      'saas',
      'ai agent',
      'agentic',
      'onboarding',
      'data sync',
      'manual process',
      'automation platform',
      'productivity',
      'автоматизация',
      'операции',
      'продажи',
      'внедрение',
      'процессы',
      'crm',
      'erp',
    ];
  const embeddingsAvailable = Boolean(process.env.EMBEDDINGS_SERVICE_URL);
  let query = supabase.from('radar_sources').select('*').eq('active', true);
  if (options?.userId) {
    query = query.eq('user_id', options.userId);
  }
  if (options?.personaId) {
    query = query.eq('persona_id', options.personaId);
  }
  if (options?.sourceId) {
    query = query.eq('id', options.sourceId);
  }

  const { data: sources } = await query;

  for (const source of sources ?? []) {
    let items: any[] = [];
    try {
      if (source.type === 'rss') {
        if (!source.url) continue;
        items = await fetchRssFeed(source.url);
      }
      if (source.type === 'reddit') {
        const subreddit = source.config?.subreddit;
        if (!subreddit) continue;
        items = await fetchSubreddit(subreddit);
      }
      if (source.type === 'twitter') {
        const handle = source.config?.handle || source.url;
        if (!handle) continue;
        items = await fetchTwitterFeed(handle);
      }
      if (source.type === 'podcast') {
        if (!source.url) continue;
        items = await fetchPodcastFeed(source.url);
      }
      if (source.type === 'youtube') {
        if (!source.url) continue;
        items = await fetchYoutubeFeed(source.url);
      }
    } catch (err) {
      console.warn('[Radar] source fetch failed', source.id, err);
      continue;
    }

    const limitedItems =
      maxItems > 0 && Number.isFinite(maxItems) ? items.slice(0, maxItems) : items;

    for (const item of limitedItems) {
      try {
        const text = `${item.title ?? ''} ${item.content ?? ''}`.toLowerCase();
        if (requireKeywords) {
          const hasKeyword = keywordList.some((kw) => kw && text.includes(kw));
          if (!hasKeyword) {
            continue;
          }
        }
        let embedding: number[] | null = null;
        let score = { score: 0, reasoning: { fallback: 'no_embeddings' } };
        if (embeddingsAvailable) {
          embedding = await embed(text);
          score = await scoreSignal(source.persona_id, embedding);
        } else if (requireEmbeddings) {
          continue;
        } else {
          score = { score: noEmbeddingsScore, reasoning: { fallback: 'no_embeddings' } };
        }
        if (score.score < scoreThreshold) continue;

        const { data: signal, error: signalErr } = await supabase
          .from('signal_items')
          .insert({
            source_id: source.id,
            user_id: source.user_id,
            persona_id: source.persona_id,
            title: item.title,
            content: item.content,
            url: item.url,
            embedding,
            relevance_score: score.score,
            score_reasoning: score.reasoning,
            status: 'raw',
          })
          .select()
          .single();

        if (signalErr || !signal) {
          console.warn('[Radar] signal insert failed', signalErr?.message);
          continue;
        }

        if (queueOnly || ingestionNoDrafts) {
          continue;
        }

        let fragmentType: 'link' | 'text' = 'link';
        let rawContent = `${item.title}\n\n${item.content}`;
        const metadata: Record<string, unknown> = {};

        if (
          source.type === 'podcast' ||
          source.type === 'youtube' ||
          source.type === 'twitter'
        ) {
          fragmentType = 'text';
        }

        if (source.type === 'podcast' && (item as any).audioUrl) {
          metadata.audio_url = (item as any).audioUrl;
          if (process.env.WHISPER_SERVICE_URL) {
            try {
              const transcript = await transcribeUrl((item as any).audioUrl);
              if (transcript && transcript.trim().length > 50) {
                rawContent = `${item.title}\n\n${transcript}`;
                metadata.transcript_source = 'whisper';
              }
            } catch (err) {
              console.warn('[Radar] podcast transcription failed', err);
            }
          }
        }

        if (source.type === 'youtube') {
          if ((item as any).videoId) {
            metadata.video_id = (item as any).videoId;
          }
          if ((item as any).transcript) {
            rawContent = `${item.title}\n\n${(item as any).transcript}`;
            metadata.transcript_source = 'youtube';
          }
        }

        if (source.type === 'twitter') {
          metadata.tweet_url = item.url;
        }

        const { data: fragment, error: fragErr } = await supabase
          .from('fragments')
          .insert({
            user_id: source.user_id,
            persona_id: source.persona_id,
            type: fragmentType,
            raw_content: rawContent,
            source_url: item.url,
            signal_item_id: signal.id,
            status: 'raw',
            metadata,
          })
          .select()
          .single();

        if (fragErr || !fragment) {
          console.warn('[Radar] fragment insert failed', fragErr?.message);
          continue;
        }

        await processFragment(fragment.id);
      } catch (err) {
        console.warn('[Radar] item failed', err);
      }
    }

    await supabase
      .from('radar_sources')
      .update({ last_fetched: new Date().toISOString() })
      .eq('id', source.id);
  }
}

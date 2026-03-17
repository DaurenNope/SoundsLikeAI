import { supabase } from '@sla/db';

export async function scoreSignal(personaId: string, signalEmbedding: number[]) {
  const { data } = await supabase.rpc('score_signal_for_persona', {
    p_persona_id: personaId,
    p_embedding: signalEmbedding,
  });

  const avgSimilarity = data?.avg_similarity ?? null;
  const sampleCount = data?.sample_count ?? 0;
  if (sampleCount === 0) {
    const fallbackScore = Number(process.env.RADAR_EMPTY_VOICE_SCORE ?? 80);
    return {
      score: fallbackScore,
      reasoning: {
        avg_similarity: avgSimilarity,
        sample_count: sampleCount,
        fallback: 'no_voice_samples',
      },
    };
  }

  return {
    score: Math.round((avgSimilarity ?? 0) * 100),
    reasoning: { avg_similarity: avgSimilarity, sample_count: sampleCount },
  };
}

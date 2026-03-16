import { supabase } from '@sla/db';

export async function scoreSignal(personaId: string, signalEmbedding: number[]) {
  const { data } = await supabase.rpc('score_signal_for_persona', {
    p_persona_id: personaId,
    p_embedding: signalEmbedding,
  });

  return {
    score: Math.round((data?.avg_similarity ?? 0) * 100),
    reasoning: { avg_similarity: data?.avg_similarity },
  };
}

import { supabase } from '@sla/db';

export async function getUserAndPersonaFromTelegram(telegramId: number): Promise<{
  userId: string;
  personaId: string;
}> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('telegram_id', telegramId)
    .single();
  if (!profile) throw new Error('Profile not found for telegram_id');

  const { data: persona } = await supabase
    .from('personas')
    .select('id')
    .eq('user_id', profile.id)
    .eq('active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!persona) {
    throw new Error('No active persona found for profile');
  }

  return { userId: profile.id, personaId: persona.id };
}

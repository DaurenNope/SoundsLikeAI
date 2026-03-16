import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY required');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

async function main() {
  const userId = process.env.SEED_USER_ID;
  const telegramId = process.env.SEED_TELEGRAM_ID
    ? Number(process.env.SEED_TELEGRAM_ID)
    : undefined;
  const username = process.env.SEED_USERNAME;
  const personaName = process.env.SEED_PERSONA_NAME ?? username ?? 'Default';

  let profileId = userId;
  const email = process.env.SEED_AUTH_EMAIL;
  if (email) {
    const password =
      process.env.SEED_AUTH_PASSWORD ?? crypto.randomBytes(12).toString('hex');
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !data.user) {
      throw new Error(
        `Failed to create auth user. Set SEED_USER_ID instead. ${error?.message ?? ''}`
      );
    }
    profileId = data.user.id;
    if (!process.env.SEED_AUTH_PASSWORD) {
      console.log(`Generated auth password: ${password}`);
    }
  }
  if (!profileId) {
    throw new Error('SEED_USER_ID required when SEED_AUTH_EMAIL is not set');
  }

  await supabase.from('profiles').upsert({
    id: profileId,
    username: username,
    telegram_id: telegramId,
    onboarding_done: Boolean(telegramId),
  });

  const { data: persona } = await supabase
    .from('personas')
    .insert({
      user_id: profileId,
      name: personaName,
      platforms: ['twitter', 'threads'],
      posts_per_week: 3,
      active: true,
    })
    .select('id')
    .single();

  if (!persona) {
    throw new Error('Failed to create persona');
  }

  await supabase.from('persona_platforms').insert([
    {
      persona_id: persona.id,
      platform: 'twitter',
      style_notes: 'Short, sharp, no fluff.',
      taboos: [],
      active: true,
    },
    {
      persona_id: persona.id,
      platform: 'threads',
      style_notes: 'Short paragraphs, direct tone.',
      taboos: [],
      active: true,
    },
  ]);

  console.log('Seeded profile + persona + platforms');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

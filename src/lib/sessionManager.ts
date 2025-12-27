import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import type { Database } from '@/types/supabase';

type TrainingSessionRow = Database['public']['Tables']['training_sessions']['Row'];

async function getActiveSession(user: User): Promise<TrainingSessionRow | null> {
  const { data, error } = await supabase
    .from('training_sessions')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    console.error('Error fetching active session', error);
    return null;
  }

  return data ?? null;
}

async function hasActiveSession(user: User): Promise<boolean> {
  const session = await getActiveSession(user);
  return !!session;
}

export const sessionManager = {
  getActiveSession,
  hasActiveSession,
};


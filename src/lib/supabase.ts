import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || '';

const isPlaceholderUrl =
  !supabaseUrl ||
  supabaseUrl.includes('your-project-id.supabase.co') ||
  !supabaseUrl.startsWith('https://');

const isPlaceholderKey =
  !supabaseAnonKey || supabaseAnonKey === 'your-supabase-anon-key';

export const isSupabaseConfigured = !isPlaceholderUrl && !isPlaceholderKey;

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

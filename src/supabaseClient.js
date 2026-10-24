import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabaseUrl = url;
export const supabaseAnonKey = key;

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Şifre ile giriş yapıyoruz (signInWithPassword) → URL'de token aramaya gerek yok
    detectSessionInUrl: false,
  },
});
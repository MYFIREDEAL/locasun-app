import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file.'
  );
}

// 🔥 Configuration complète pour garantir la persistance de session
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: window.localStorage,        // Force localStorage (pas cookies)
    autoRefreshToken: true,               // Rafraîchir automatiquement le token
    persistSession: true,                 // Persister la session entre les rechargements
    detectSessionInUrl: true,             // CRUCIAL : Détecter le token dans l'URL du magic link
    flowType: 'implicit',                 // ✅ Flux implicit pour Magic Link OTP (pas PKCE)
    storageKey: 'sb-yscwpxwgnhqbhkqzipag-auth-token', // Clé explicite du token
  },
  db: {
    schema: 'public'                      // 🔥 Schéma explicite pour les RPC functions
  }
});

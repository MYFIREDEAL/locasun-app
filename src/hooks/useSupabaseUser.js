import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Hook pour charger les infos de l'utilisateur authentifié depuis Supabase
 * 🔥 IMPORTANT: Retourne DEUX UUIDs différents :
 *  - supabaseUserId = public.users.id (UUID PK) → Pour appointments.assigned_user_id FK
 *  - authUserId = auth.users.id = public.users.user_id → Pour prospects.owner_id FK
 */
export const useSupabaseUser = () => {
  const [supabaseUserId, setSupabaseUserId] = useState(null); // users.id (PK)
  const [authUserId, setAuthUserId] = useState(null); // users.user_id (auth UUID)
  const [userEmail, setUserEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true);
        
        // 1. Récupérer l'utilisateur authentifié
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) throw authError;
        if (!user) throw new Error("Non authentifié");

        setUserEmail(user.email);
        setAuthUserId(user.id); // 🔥 Auth UUID (pour prospects.owner_id)

        // 2. Récupérer l'UUID PK dans public.users
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, name, email')
          .eq('user_id', user.id)
          .single();

        if (userError) throw userError;
        if (!userData) throw new Error("User introuvable dans public.users");

        setSupabaseUserId(userData.id); // 🔥 UUID PK (pour appointments.assigned_user_id)
        
        console.log('🔍 useSupabaseUser loaded:', {
          authUserId: user.id,
          supabaseUserId: userData.id,
          note: 'appointments FK uses supabaseUserId, prospects FK uses authUserId'
        });
      } catch (err) {
        console.error('❌ Erreur useSupabaseUser:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  return {
    supabaseUserId, // users.id (UUID PK) - Pour appointments
    authUserId,     // users.user_id (auth UUID) - Pour prospects
    userEmail,
    loading,
    error
  };
};

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Hook pour charger les infos de l'utilisateur authentifié depuis Supabase
 * Retourne l'UUID de public.users (pas auth.users)
 */
export const useSupabaseUser = () => {
  const [supabaseUserId, setSupabaseUserId] = useState(null);
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

        // 2. Récupérer l'UUID dans public.users
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, name, email')
          .eq('user_id', user.id)
          .single();

        if (userError) throw userError;
        if (!userData) throw new Error("User introuvable dans public.users");

        setSupabaseUserId(userData.id);
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
    supabaseUserId,
    userEmail,
    loading,
    error
  };
};

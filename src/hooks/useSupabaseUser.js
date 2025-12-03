import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

/**
 * Hook pour charger les infos de l'utilisateur authentifié depuis Supabase
 * 🔥 FIX: supabaseUserId et authUserId retournent la MÊME valeur (auth UUID)
 * Les deux pointent vers users.user_id = auth.uid() pour que les RLS policies fonctionnent
 */
export const useSupabaseUser = () => {
  const [supabaseUserId, setSupabaseUserId] = useState(null); // users.user_id (auth UUID)
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
        setAuthUserId(user.id); // 🔥 Auth UUID = users.user_id
        setSupabaseUserId(user.id); // 🔥 FIX: Même valeur! Auth UUID pour que RLS policies fonctionnent

        // 2. Vérifier que l'user existe dans public.users (mais on n'utilise PAS sa PK)
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, name, email')
          .eq('user_id', user.id)
          .single();

        if (userError) throw userError;
        if (!userData) throw new Error("User introuvable dans public.users");

        // ✅ On ne change RIEN - supabaseUserId reste sur l'auth UUID
      } catch (err) {
        logger.error('Erreur useSupabaseUser:', { error: err.message });
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

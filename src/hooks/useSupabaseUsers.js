import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

/**
 * Hook pour charger TOUS les utilisateurs depuis Supabase
 * Utilisé pour peupler les dropdowns d'assignation
 */
export const useSupabaseUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        
        // Vérifier la session Supabase
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        // 🔥 FIX: Si pas de session, ne pas appeler la RPC
        if (!session) {
          logger.debug('useSupabaseUsers: No active Supabase session');
          setUsers([]);
          setLoading(false);
          return;
        }
        
        // 🔥 FIX: Utiliser RPC function pour gérer access_rights correctement
        // Cette fonction SECURITY DEFINER bypass les RLS et gère la logique métier
        const { data, error: fetchError } = await supabase
          .rpc('get_accessible_users');

        if (fetchError) {
          logger.error('useSupabaseUsers RPC error:', fetchError);
          throw fetchError;
        }
        
        logger.debug('useSupabaseUsers loaded', { count: data?.length || 0 });
        setUsers(data || []);
      } catch (err) {
        logger.error('❌ Erreur chargement utilisateurs:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  return {
    users,
    loading,
    error
  };
};

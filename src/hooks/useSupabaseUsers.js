import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

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
        
        const { data, error: fetchError } = await supabase
          .from('users')
          .select('id, user_id, name, email, role, phone, avatar_url, manager_id, access_rights')
          .order('name', { ascending: true });

        if (fetchError) {
          console.error('❌ Safari DEBUG - useSupabaseUsers fetch error:', fetchError);
          throw fetchError;
        }
        
        setUsers(data || []);
      } catch (err) {
        console.error('❌ Erreur chargement utilisateurs:', err);
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

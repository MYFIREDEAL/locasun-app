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
        
        const { data, error: fetchError } = await supabase
          .from('users')
          .select('id, name, email, role')
          .order('name', { ascending: true });

        if (fetchError) throw fetchError;

        console.log('✅ Utilisateurs Supabase chargés:', data?.length || 0);
        
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

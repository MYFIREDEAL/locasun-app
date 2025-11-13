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
        console.log('🔄 Safari DEBUG - useSupabaseUsers: Starting loadUsers...');
        setLoading(true);
        
        // Vérifier la session Supabase
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log('🔐 Safari DEBUG - useSupabaseUsers session:', session ? 'OK' : 'NO SESSION', sessionError);
        
        const { data, error: fetchError } = await supabase
          .from('users')
          .select('id, user_id, name, email, role')
          .order('name', { ascending: true });

        console.log('📊 Safari DEBUG - useSupabaseUsers fetch result:', {
          success: !fetchError,
          count: data?.length || 0,
          error: fetchError
        });

        if (fetchError) {
          console.error('❌ Safari DEBUG - useSupabaseUsers fetch error:', fetchError);
          throw fetchError;
        }

        console.log('✅ Utilisateurs Supabase chargés:', data?.length || 0);
        if (data && data.length > 0) {
          console.log('👥 Premiers utilisateurs:', data.slice(0, 2).map(u => ({ id: u.user_id, name: u.name })));
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

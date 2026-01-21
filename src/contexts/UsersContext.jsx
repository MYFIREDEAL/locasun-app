import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

/**
 * UsersContext - Cache global des utilisateurs accessibles
 * 
 * Optimisation : Un seul appel à get_accessible_users() par session
 * au lieu de ~10 appels par page (chaque composant qui utilisait useSupabaseUsers)
 * 
 * Usage:
 *   import { useUsers } from '@/contexts/UsersContext';
 *   const { users, loading, error, refetch } = useUsers();
 */

const UsersContext = createContext(null);

export const UsersProvider = ({ children }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Vérifier la session Supabase
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        logger.debug('UsersContext: No active session, skipping fetch');
        setUsers([]);
        setLoading(false);
        return;
      }

      // Appel unique à la RPC
      const { data, error: fetchError } = await supabase.rpc('get_accessible_users');

      if (fetchError) {
        logger.error('UsersContext RPC error:', fetchError);
        throw fetchError;
      }

      logger.debug('UsersContext loaded', { count: data?.length || 0 });
      setUsers(data || []);
      setLastFetch(new Date());
    } catch (err) {
      logger.error('❌ UsersContext fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Charger au montage
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Écouter les changements d'auth pour recharger si nécessaire
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        logger.debug('UsersContext: Auth changed, refetching users');
        fetchUsers();
      } else if (event === 'SIGNED_OUT') {
        setUsers([]);
        setLastFetch(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUsers]);

  const value = {
    users,
    loading,
    error,
    refetch: fetchUsers,
    lastFetch,
  };

  return (
    <UsersContext.Provider value={value}>
      {children}
    </UsersContext.Provider>
  );
};

export const useUsers = () => {
  const context = useContext(UsersContext);
  
  if (!context) {
    throw new Error('useUsers must be used within a UsersProvider');
  }
  
  return context;
};

export default UsersContext;

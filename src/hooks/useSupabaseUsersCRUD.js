import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';

/**
 * Hook pour gérer les opérations CRUD sur les utilisateurs PRO (public.users)
 * Remplace les fonctions localStorage updateUsers() et deleteUser()
 * 
 * Fonctionnalités :
 * - ✅ Fetch initial avec real-time sync
 * - ✅ addUser() - Créer utilisateur dans auth.users + public.users
 * - ✅ updateUser() - Modifier utilisateur existant
 * - ✅ deleteUser() - Supprimer utilisateur + réassigner ses prospects
 * - ✅ Real-time subscription automatique
 */
export const useSupabaseUsersCRUD = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Charger tous les utilisateurs au montage
  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;

      console.log('✅ Utilisateurs CRUD chargés:', data?.length || 0);
      setUsers(data || []);
      setError(null);
    } catch (err) {
      console.error('❌ Erreur chargement utilisateurs CRUD:', err);
      setError(err.message);
      toast({
        title: "Erreur",
        description: "Impossible de charger les utilisateurs.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // 🔥 REAL-TIME : Écouter les changements en temps réel
  useEffect(() => {
    console.log('🔥 Setting up real-time subscription for users...');

    const channel = supabase
      .channel('users-crud-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'users'
        },
        (payload) => {
          console.log('🔥 Real-time user change detected:', payload);

          if (payload.eventType === 'INSERT') {
            // Nouvel utilisateur ajouté
            setUsers(prev => [...prev, payload.new]);
            toast({
              title: "👤 Nouvel utilisateur",
              description: `${payload.new.name} a été ajouté !`,
              className: "bg-green-500 text-white",
            });
          } else if (payload.eventType === 'UPDATE') {
            // Utilisateur modifié
            setUsers(prev => prev.map(u => u.id === payload.new.id ? payload.new : u));
            console.log('📝 User updated:', payload.new.name);
          } else if (payload.eventType === 'DELETE') {
            // Utilisateur supprimé
            setUsers(prev => prev.filter(u => u.id !== payload.old.id));
            toast({
              title: "🗑️ Utilisateur supprimé",
              description: "Un utilisateur a été supprimé.",
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Users CRUD subscription status:', status);
      });

    return () => {
      console.log('🔌 Unsubscribing from users CRUD real-time...');
      supabase.removeChannel(channel);
    };
  }, []);

  /**
   * ✅ AJOUTER UN UTILISATEUR
   * Crée l'utilisateur dans auth.users puis dans public.users
   * 
   * @param {Object} userData - Données du nouvel utilisateur
   * @param {string} userData.name - Nom complet
   * @param {string} userData.email - Email (doit être unique)
   * @param {string} userData.password - Mot de passe (min 6 caractères)
   * @param {string} userData.role - Rôle ('Global Admin', 'Manager', 'Commercial')
   * @param {string} userData.manager - Nom du manager (optionnel)
   * @param {string} userData.phone - Téléphone (optionnel)
   * @param {Object} userData.accessRights - Droits d'accès (optionnel)
   */
  const addUser = async (userData) => {
    try {
      console.log('🔧 Adding user:', userData);

      // 1️⃣ Créer l'utilisateur dans auth.users (Supabase Auth)
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true, // Auto-confirmer l'email
      });

      if (authError) throw new Error(`Auth error: ${authError.message}`);
      if (!authData?.user) throw new Error('Échec de création du compte utilisateur');

      console.log('✅ Auth user created:', authData.user.id);

      // 2️⃣ Trouver l'ID du manager si spécifié
      let managerId = null;
      if (userData.manager) {
        const { data: managerData } = await supabase
          .from('users')
          .select('id')
          .eq('name', userData.manager)
          .single();
        
        if (managerData) {
          managerId = managerData.id;
        }
      }

      // 3️⃣ Créer l'entrée dans public.users
      const { data: publicUserData, error: publicUserError } = await supabase
        .from('users')
        .insert([{
          user_id: authData.user.id, // Lien vers auth.users
          name: userData.name,
          email: userData.email,
          role: userData.role,
          manager_id: managerId,
          phone: userData.phone || null,
          access_rights: userData.accessRights || {
            modules: ['Pipeline', 'Agenda', 'Contacts'],
            users: []
          },
        }])
        .select()
        .single();

      if (publicUserError) {
        // Si échec public.users, supprimer le compte auth créé
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw new Error(`Public user error: ${publicUserError.message}`);
      }

      console.log('✅ Public user created:', publicUserData);

      // ✅ Le real-time va automatiquement ajouter l'utilisateur à la liste
      toast({
        title: "Succès !",
        description: `${userData.name} a été ajouté avec succès.`,
        className: "bg-green-500 text-white",
      });

      return publicUserData;
    } catch (err) {
      console.error('❌ Erreur ajout utilisateur:', err);
      toast({
        title: "Erreur",
        description: err.message || "Impossible d'ajouter l'utilisateur.",
        variant: "destructive",
      });
      throw err;
    }
  };

  /**
   * ✅ METTRE À JOUR UN UTILISATEUR
   * Modifie les données dans public.users
   * 
   * @param {string} userId - UUID de l'utilisateur (public.users.id)
   * @param {Object} updates - Champs à mettre à jour
   */
  const updateUser = async (userId, updates) => {
    try {
      console.log('🔧 Updating user:', userId, updates);

      // Préparer les données pour Supabase (snake_case)
      const dbUpdates = {};
      
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.email !== undefined) dbUpdates.email = updates.email;
      if (updates.role !== undefined) dbUpdates.role = updates.role;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;
      if (updates.accessRights !== undefined) dbUpdates.access_rights = updates.accessRights;
      
      // Gérer manager_id si "manager" est fourni (nom du manager)
      if (updates.manager !== undefined) {
        if (updates.manager === '' || updates.manager === 'none') {
          dbUpdates.manager_id = null;
        } else {
          const { data: managerData } = await supabase
            .from('users')
            .select('id')
            .eq('name', updates.manager)
            .single();
          
          if (managerData) {
            dbUpdates.manager_id = managerData.id;
          }
        }
      }

      // Ajouter updated_at
      dbUpdates.updated_at = new Date().toISOString();

      const { data, error: updateError } = await supabase
        .from('users')
        .update(dbUpdates)
        .eq('id', userId)
        .select()
        .single();

      if (updateError) throw updateError;

      // ✅ Le real-time va automatiquement mettre à jour la liste
      console.log('✅ User updated in DB, waiting for real-time sync...');

      toast({
        title: "Succès !",
        description: "Utilisateur modifié avec succès.",
        className: "bg-green-500 text-white",
      });

      return data;
    } catch (err) {
      console.error('❌ Erreur update utilisateur:', err);
      toast({
        title: "Erreur",
        description: err.message || "Impossible de modifier l'utilisateur.",
        variant: "destructive",
      });
      throw err;
    }
  };

  /**
   * ✅ SUPPRIMER UN UTILISATEUR
   * Supprime l'utilisateur et réassigne ses prospects à son manager
   * 
   * @param {string} userId - UUID de l'utilisateur à supprimer (public.users.id)
   */
  const deleteUser = async (userId) => {
    try {
      console.log('🔧 Deleting user:', userId);

      // 1️⃣ Récupérer les infos de l'utilisateur à supprimer
      const { data: userToDelete, error: fetchError } = await supabase
        .from('users')
        .select('*, manager:manager_id(id, name)')
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;
      if (!userToDelete) throw new Error('Utilisateur introuvable');

      console.log('👤 User to delete:', userToDelete.name);

      // 2️⃣ Déterminer le nouvel owner_id pour réassigner les prospects
      let newOwnerId = null;

      if (userToDelete.manager_id) {
        // Réassigner au manager
        newOwnerId = userToDelete.manager_id;
        console.log('📦 Reassigning prospects to manager:', userToDelete.manager?.name);
      } else {
        // Trouver un Global Admin ou Manager comme fallback
        const { data: fallbackUser } = await supabase
          .from('users')
          .select('id')
          .in('role', ['Global Admin', 'Manager'])
          .limit(1)
          .single();

        if (fallbackUser) {
          newOwnerId = fallbackUser.id;
          console.log('📦 Reassigning prospects to fallback admin/manager');
        }
      }

      // 3️⃣ Réassigner tous les prospects de cet utilisateur
      if (newOwnerId) {
        const { error: updateProspectsError } = await supabase
          .from('prospects')
          .update({ owner_id: newOwnerId })
          .eq('owner_id', userId);

        if (updateProspectsError) {
          console.error('⚠️ Erreur réassignation prospects:', updateProspectsError);
        } else {
          console.log('✅ Prospects reassigned successfully');
        }
      }

      // 4️⃣ Supprimer l'utilisateur de public.users
      // (CASCADE va supprimer automatiquement dans auth.users grâce au ON DELETE CASCADE)
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (deleteError) throw deleteError;

      // ✅ Le real-time va automatiquement retirer l'utilisateur de la liste
      console.log('✅ User deleted, waiting for real-time sync...');

      toast({
        title: "Succès !",
        description: `${userToDelete.name} a été supprimé et ses prospects réassignés.`,
        className: "bg-green-500 text-white",
      });

      return true;
    } catch (err) {
      console.error('❌ Erreur suppression utilisateur:', err);
      toast({
        title: "Erreur",
        description: err.message || "Impossible de supprimer l'utilisateur.",
        variant: "destructive",
      });
      throw err;
    }
  };

  return {
    users,
    loading,
    error,
    addUser,
    updateUser,
    deleteUser,
    refetchUsers: fetchUsers,
  };
};

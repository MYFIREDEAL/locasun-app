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
          if (payload.eventType === 'INSERT') {
            // Nouvel utilisateur ajouté
            setUsers(prev => [...prev, payload.new]);
            toast({
              title: "👤 Nouvel utilisateur",
              description: `${payload.new.name} a été ajouté !`,
              className: "bg-green-500 text-white",
            });
          } else if (payload.eventType === 'UPDATE') {
            // Utilisateur modifié - CONSERVER les champs qui existent déjà
            // pour éviter d'écraser avec des données manquantes
            setUsers(prev => prev.map(u => 
              u.id === payload.new.id 
                ? { ...u, ...payload.new } // Merge au lieu de remplacement total
                : u
            ));
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  /**
   * ✅ AJOUTER UN UTILISATEUR
   * Crée l'utilisateur dans auth.users puis dans public.users
   * 
   * ⚠️ NOTE : Utilise signUp() qui nécessite une confirmation d'email
   * Pour production, il faudrait une Edge Function avec Service Role Key
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
      // 1️⃣ Créer l'utilisateur dans auth.users (Supabase Auth)
      // Note: signUp() envoie un email de confirmation par défaut
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            name: userData.name,
            role: userData.role,
          }
        }
      });

      if (authError) throw new Error(`Auth error: ${authError.message}`);
      if (!authData?.user) throw new Error('Échec de création du compte utilisateur');

      // 2️⃣ Trouver l'UUID du manager si spécifié
      let managerId = null;
      if (userData.manager && userData.manager !== 'none' && userData.manager !== '') {
        // 🔥 FIX : manager_id doit être un UUID (user_id), pas un integer (id)
        const { data: managerData } = await supabase
          .from('users')
          .select('user_id')
          .eq('name', userData.manager)
          .single();
        
        if (managerData) {
          managerId = managerData.user_id;
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
        console.error('❌ Error creating public user:', publicUserError);
        throw new Error(`Public user error: ${publicUserError.message}`);
      }

      // 🔥 Ajouter manuellement à la liste (le real-time devrait le faire, mais on force au cas où)
      setUsers(prev => [...prev, publicUserData]);

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
   * @param {string|number} userIdOrPk - UUID (user_id) OU integer PK (id)
   * @param {Object} updates - Champs à mettre à jour
   */
  const updateUser = async (userIdOrPk, updates) => {
    try {
      // 🔥 Détecter si c'est un UUID (string) ou un PK (integer)
      const isUUID = typeof userIdOrPk === 'string' && userIdOrPk.includes('-');
      const idField = isUUID ? 'user_id' : 'id';
      const idValue = userIdOrPk;
      
      console.log(`🔍 [updateUser] idField: ${idField}, idValue: ${idValue}`);
      
      // Préparer les données pour Supabase (snake_case)
      const dbUpdates = {};
      
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.email !== undefined) dbUpdates.email = updates.email;
      if (updates.role !== undefined) dbUpdates.role = updates.role;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;
      if (updates.accessRights !== undefined) {
        dbUpdates.access_rights = updates.accessRights;
        console.log('🔍 [updateUser] access_rights envoyé:', JSON.stringify(updates.accessRights));
      }
      
      // Gérer manager_id si "manager" est fourni (nom du manager)
      if (updates.manager !== undefined) {
        console.log('🔍 [updateUser] Manager reçu:', updates.manager);
        if (updates.manager === '' || updates.manager === 'none') {
          dbUpdates.manager_id = null;
          console.log('🔍 [updateUser] Manager = null (aucun manager)');
        } else {
          // 🔥 FIX : manager_id doit être un UUID (user_id), pas un integer (id)
          const { data: managerData, error: managerError } = await supabase
            .from('users')
            .select('user_id')
            .eq('name', updates.manager)
            .single();
          
          console.log('🔍 [updateUser] Recherche manager par nom:', updates.manager);
          console.log('🔍 [updateUser] Manager trouvé:', managerData);
          
          if (managerError) {
            console.error('❌ [updateUser] Erreur recherche manager:', managerError);
          }
          
          if (managerData) {
            dbUpdates.manager_id = managerData.user_id;
            console.log('✅ [updateUser] manager_id assigné:', managerData.user_id);
          }
        }
      }

      // Ajouter updated_at
      dbUpdates.updated_at = new Date().toISOString();

      console.log('🔍 [updateUser] dbUpdates final:', JSON.stringify(dbUpdates));

      let data, updateError;

      // 🔥 Si on modifie access_rights, utiliser la RPC function pour bypass RLS
      if (updates.accessRights !== undefined) {
        console.log('🔍 [updateUser] Utilisation RPC pour access_rights');
        const rpcResult = await supabase.rpc('update_user_access_rights', {
          target_user_id: idValue,
          new_access_rights: updates.accessRights
        });
        data = rpcResult.data;
        updateError = rpcResult.error;
      } else {
        // Sinon, UPDATE normal
        const result = await supabase
          .from('users')
          .update(dbUpdates)
          .eq(idField, idValue)
          .select();
        data = result.data;
        updateError = result.error;
      }

      console.log('🔍 [updateUser] Supabase response data:', data);
      console.log('🔍 [updateUser] Supabase response error:', updateError);

      if (updateError) throw updateError;
      
      // Extraire le premier élément si c'est un array
      const updatedUser = Array.isArray(data) ? data[0] : data;

      // ✅ Le real-time va automatiquement mettre à jour la liste
      toast({
        title: "Succès !",
        description: "Utilisateur modifié avec succès.",
        className: "bg-green-500 text-white",
      });

      return updatedUser;
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
   * @param {string|number} userIdOrPk - UUID (user_id) OU integer PK (id)
   */
  const deleteUser = async (userIdOrPk) => {
    try {
      // 🔥 Détecter si c'est un UUID (string) ou un PK (integer)
      const isUUID = typeof userIdOrPk === 'string' && userIdOrPk.includes('-');
      const idField = isUUID ? 'user_id' : 'id';
      const idValue = userIdOrPk;
      
      // 1️⃣ Récupérer les infos de l'utilisateur à supprimer
      const { data: userToDelete, error: fetchError } = await supabase
        .from('users')
        .select('*, manager:manager_id(id, name)')
        .eq(idField, idValue)
        .single();

      if (fetchError) throw fetchError;
      if (!userToDelete) throw new Error('Utilisateur introuvable');

      // 2️⃣ Déterminer le nouvel owner_id pour réassigner les prospects
      let newOwnerId = null;

      if (userToDelete.manager_id) {
        // Réassigner au manager
        newOwnerId = userToDelete.manager_id;
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
        }
      }

      // 4️⃣ Supprimer l'utilisateur de public.users
      // (CASCADE va supprimer automatiquement dans auth.users grâce au ON DELETE CASCADE)
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq(idField, idValue);

      if (deleteError) throw deleteError;

      // ✅ Le real-time va automatiquement retirer l'utilisateur de la liste
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

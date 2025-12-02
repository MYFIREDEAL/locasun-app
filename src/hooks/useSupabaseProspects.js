import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';

/**
 * Hook personnalisé pour gérer les prospects via Supabase
 * Remplace progressivement localStorage
 */
export const useSupabaseProspects = (activeAdminUser) => {
  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const channelRef = useRef(null); // 🔥 Stocker le channel pour broadcast manuel

  // Charger les prospects depuis Supabase
  const fetchProspects = async () => {
    try {
      setLoading(true);
      
      // 🔥 Vérifier si une session existe
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('⚠️ [useSupabaseProspects] Pas de session - skip chargement prospects');
        setProspects([]);
        setLoading(false);
        return;
      }
      
      // 🔥 UTILISER LA FONCTION RPC AU LIEU DU SELECT DIRECT
      // Contourne le problème de auth.uid() qui retourne NULL dans les RLS policies SELECT
      const { data, error: fetchError } = await supabase.rpc('get_prospects_safe');

      if (fetchError) {
        console.error('❌ Fetch error:', fetchError);
        throw fetchError;
      }

      // Transformer les données Supabase vers le format attendu par l'app
      const transformedProspects = (data || []).map(prospect => ({
        id: prospect.id,
        name: prospect.name,
        email: prospect.email,
        phone: prospect.phone,
        company: prospect.company_name,
        address: prospect.address,
        ownerId: prospect.owner_id,
        status: prospect.status,
        tags: prospect.tags || [],
        hasAppointment: prospect.has_appointment || false,
        affiliateName: prospect.affiliate_name,
        formData: prospect.form_data || {}, // 🔥 Réponses aux formulaires
        // Ajouter les champs manquants si nécessaire
        createdAt: prospect.created_at,
        updatedAt: prospect.updated_at,
      }));

      console.log('🔍 [useSupabaseProspects] Prospects chargés:', transformedProspects.length, 'prospects');
      setProspects(transformedProspects);
      setError(null);
    } catch (err) {
      console.error('Erreur chargement prospects:', err);
      setError(err.message);
      toast({
        title: "Erreur",
        description: "Impossible de charger les prospects.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Charger au montage et quand l'utilisateur change
  useEffect(() => {
    console.log('🔍 [useSupabaseProspects] useEffect triggered, activeAdminUser:', activeAdminUser?.id, activeAdminUser?.name);
    if (activeAdminUser) {
      console.log('🔍 [useSupabaseProspects] Fetching prospects...');
      fetchProspects();
    } else {
      console.warn('⚠️ No activeAdminUser, skipping fetchProspects');
      setLoading(false);
    }
  }, [activeAdminUser?.id]); // ✅ Utiliser l'ID au lieu de l'objet complet

  // 🔥 REAL-TIME : Écouter les changements en temps réel
  useEffect(() => {
    if (!activeAdminUser) return;

    const channel = supabase
      .channel(`prospects-changes-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'prospects'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // Nouveau prospect ajouté
            const newProspect = {
              id: payload.new.id,
              name: payload.new.name,
              email: payload.new.email,
              phone: payload.new.phone,
              company: payload.new.company_name,
              address: payload.new.address,
              ownerId: payload.new.owner_id,
              status: payload.new.status,
              tags: payload.new.tags || [],
              hasAppointment: payload.new.has_appointment || false,
              affiliateName: payload.new.affiliate_name,
              formData: payload.new.form_data || {}, // 🔥 Réponses aux formulaires
              createdAt: payload.new.created_at,
              updatedAt: payload.new.updated_at,
            };
            setProspects(prev => [newProspect, ...prev]);
            toast({
              title: "🆕 Nouveau contact",
              description: `${newProspect.name} a été ajouté !`,
              className: "bg-green-500 text-white",
            });
          } else if (payload.eventType === 'UPDATE') {
            // Prospect modifié
            const updatedProspect = {
              id: payload.new.id,
              name: payload.new.name,
              email: payload.new.email,
              phone: payload.new.phone,
              company: payload.new.company_name,
              address: payload.new.address,
              ownerId: payload.new.owner_id,
              status: payload.new.status,
              tags: payload.new.tags || [],
              hasAppointment: payload.new.has_appointment || false,
              affiliateName: payload.new.affiliate_name,
              formData: payload.new.form_data || {}, // 🔥 Réponses aux formulaires
              createdAt: payload.new.created_at,
              updatedAt: payload.new.updated_at,
            };
            setProspects(prev => prev.map(p => p.id === payload.new.id ? updatedProspect : p));
          } else if (payload.eventType === 'DELETE') {
            // Prospect supprimé
            setProspects(prev => prev.filter(p => p.id !== payload.old.id));
            toast({
              title: "🗑️ Contact supprimé",
              description: "Un contact a été supprimé.",
            });
          }
        }
      )
      .on('broadcast', { event: 'prospect-updated' }, (payload) => {
        // 🔥 Écouter les broadcasts manuels (quand un client modifie son profil)
        console.log('📡 [useSupabaseProspects] Broadcast manual UPDATE received:', payload.payload);
        setProspects(prev => prev.map(p => p.id === payload.payload.id ? payload.payload : p));
      })
      .subscribe();

    // 🔥 Stocker le channel dans le ref pour broadcast manuel
    channelRef.current = channel;

    // Cleanup : se désabonner quand le composant unmount
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [activeAdminUser?.id]); // ✅ Utiliser l'ID au lieu de l'objet complet

  // 🔥 CANAL GLOBAL pour broadcasts (fonctionne pour admins ET clients)
  useEffect(() => {
    const broadcastChannel = supabase
      .channel('prospects-broadcast-global')
      .on('broadcast', { event: 'prospect-updated' }, (payload) => {
        console.log('📡 [useSupabaseProspects] GLOBAL Broadcast received:', payload.payload);
        // Mettre à jour la liste prospects (pas besoin de if activeAdminUser, on met toujours à jour)
        // 🔥 Créer un nouvel objet pour forcer React à détecter le changement
        setProspects(prev => {
          console.log('🔄 [useSupabaseProspects] Avant update:', prev.find(p => p.id === payload.payload.id)?.name);
          const updated = prev.map(p => 
            p.id === payload.payload.id ? { ...payload.payload } : p
          );
          console.log('✅ [useSupabaseProspects] Après update:', updated.find(p => p.id === payload.payload.id)?.name);
          return updated;
        });
      })
      .subscribe();

    // Stocker aussi dans le ref pour les clients qui n'ont pas activeAdminUser
    if (!channelRef.current) {
      channelRef.current = broadcastChannel;
    }

    return () => {
      supabase.removeChannel(broadcastChannel);
    };
  }, []); // Pas de dépendance, canal permanent

  // Ajouter un prospect
  const addProspect = async (prospectData) => {
    try {
      // Récupérer l'UUID réel du user depuis Supabase
      const { data: { user } } = await supabase.auth.getUser();
      const { data: { session } } = await supabase.auth.getSession();
      
      console.log('🔍 [useSupabaseProspects] Auth user:', user?.id, user?.email);
      console.log('🔍 [useSupabaseProspects] Session:', session?.access_token ? 'PRÉSENTE' : 'ABSENTE');
      
      if (!user) {
        throw new Error("Utilisateur non authentifié");
      }

      // Vérifier que l'user est bien dans la table users
      const { data: userData, error: userCheckError } = await supabase
        .from('users')
        .select('user_id, name, role')
        .eq('user_id', user.id)
        .single();
      
      console.log('🔍 [useSupabaseProspects] User dans table users:', JSON.stringify(userData), 'Error:', userCheckError);
      
      if (userCheckError || !userData) {
        console.error('❌ User pas trouvé dans table users:', userCheckError);
        throw new Error('Utilisateur non autorisé à créer des prospects');
      }

      // 🔥 IMPORTANT: La FK prospects.owner_id référence users.user_id (auth UUID)
      // et PAS users.id (UUID PK de la table users)
      // Donc on utilise directement user.id (auth UUID) sans query supplémentaire

      // 🔥 UTILISER LA FONCTION RPC AU LIEU DE L'INSERT DIRECT
      // Contourne le problème de auth.uid() qui retourne NULL dans les RLS policies
      console.log('🔍 [useSupabaseProspects] Utilisation de la fonction RPC insert_prospect_safe');
      
      // ⚠️ Ne plus utiliser 'Intéressé' en fallback - le status doit venir de l'appelant
      // qui utilise le step_id de la première colonne du globalPipelineSteps
      const { data: rpcResult, error: insertError } = await supabase.rpc('insert_prospect_safe', {
        p_name: prospectData.name,
        p_email: prospectData.email,
        p_phone: prospectData.phone,
        p_company_name: prospectData.company || '',
        p_address: prospectData.address || '',
        p_status: prospectData.status, // ✅ Requis - doit être fourni par l'appelant
        p_tags: prospectData.tags || [],
        p_has_appointment: prospectData.hasAppointment || false,
        p_affiliate_name: prospectData.affiliateName || null,
      });

      if (insertError) throw insertError;

      // La fonction RPC retourne un objet JSON, on le parse
      const data = rpcResult;
      console.log('🔍 [useSupabaseProspects] RPC result:', data);

      // Transformer et ajouter à la liste locale
      const transformed = {
        id: data.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        company: data.company_name,
        address: data.address,
        ownerId: data.owner_id,
        status: data.status,
        tags: data.tags || [],
        hasAppointment: data.has_appointment || false,
        affiliateName: data.affiliate_name,
        formData: data.form_data || {}, // 🔥 Réponses aux formulaires
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      // Ne pas ajouter localement, laisser le real-time s'en charger

      // 🎉 AFFICHER LE TOAST DE SUCCÈS IMMÉDIATEMENT
      toast({
        title: "Succès",
        description: `Prospect "${data.name}" créé !`,
        className: "bg-green-500 text-white",
      });

      // 🔥 ENVOYER UN MAGIC LINK AU PROSPECT (passwordless, comme inscription client)
      try {
        console.log('📧 [useSupabaseProspects] Envoi Magic Link à', data.email);
        
        // Envoyer le Magic Link (crée automatiquement le user auth si inexistant)
        const { data: otpData, error: magicLinkError } = await supabase.auth.signInWithOtp({
          email: data.email,
          options: {
            emailRedirectTo: `${window.location.origin}/client/dashboard`,
            shouldCreateUser: true, // ✅ Créer le user auth automatiquement
          }
        });

        if (magicLinkError) {
          console.error('❌ Erreur envoi Magic Link:', magicLinkError);
          
          // Afficher un toast informatif (ne pas bloquer la création du prospect)
          toast({
            title: "Prospect créé",
            description: "Le prospect a été créé mais l'email de connexion n'a pas pu être envoyé.",
            variant: "warning",
          });
        } else {
          // 🔥 Lier le user_id au prospect si disponible immédiatement
          if (otpData?.user?.id) {
            const { error: updateError } = await supabase
              .from('prospects')
              .update({ user_id: otpData.user.id })
              .eq('id', data.id);
            
            if (updateError) {
              console.error('⚠️ Erreur liaison user_id:', updateError);
            } else {
              console.log('✅ Prospect lié au user_id:', otpData.user.id);
            }
          }
          
          console.log('✅ Magic Link envoyé à', data.email);
          
          // Toast de succès avec info email
          toast({
            title: "Prospect créé",
            description: `Un lien de connexion a été envoyé à ${data.email}`,
            className: "bg-green-500 text-white",
          });
        }
      } catch (emailErr) {
        console.error('⚠️ Erreur envoi Magic Link:', emailErr);
        // Ne pas bloquer si l'email échoue - le prospect est créé
      }

      return transformed;
    } catch (err) {
      console.error('Erreur ajout prospect:', err);
      toast({
        title: "Erreur",
        description: err.message || "Impossible d'ajouter le prospect.",
        variant: "destructive",
      });
      throw err;
    }
  };

  // Mettre à jour un prospect
  const updateProspect = async (idOrProspect, updatesParam) => {
    try {
      // Support des deux formats : updateProspect(id, updates) OU updateProspect({ id, ...data })
      console.log('🔍 [updateProspect] idOrProspect:', typeof idOrProspect, idOrProspect);
      console.log('🔍 [updateProspect] updatesParam:', typeof updatesParam, updatesParam);
      
      let id, updates;
      if (typeof idOrProspect === 'object' && idOrProspect.id) {
        // Format objet complet
        id = idOrProspect.id;
        updates = idOrProspect;
        console.log('🔍 [updateProspect] Mode objet complet');
      } else {
        // Format séparé (id, updates)
        id = idOrProspect;
        updates = updatesParam;
        console.log('🔍 [updateProspect] Mode séparé (id, updates)');
      }
      
      // Transformer les clés du format app vers le format DB
      const dbUpdates = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.email !== undefined) dbUpdates.email = updates.email;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.company !== undefined) dbUpdates.company_name = updates.company;
      if (updates.address !== undefined) dbUpdates.address = updates.address;
      // ✅ Envoyer owner_id - la RPC update_prospect_safe gère les permissions selon le rôle
      if (updates.ownerId !== undefined) dbUpdates.owner_id = updates.ownerId;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
      if (updates.hasAppointment !== undefined) dbUpdates.has_appointment = updates.hasAppointment;
      if (updates.affiliateName !== undefined) dbUpdates.affiliate_name = updates.affiliateName;
      if (updates.formData !== undefined) dbUpdates.form_data = updates.formData; // 🔥 Réponses aux formulaires

      // 🔥 DEBUG : Log des données envoyées à la RPC
      console.log('🔍 [updateProspect] Prospect ID:', id);
      console.log('🔍 [updateProspect] Updates reçus:', updates);
      console.log('🔍 [updateProspect] dbUpdates (snake_case):', dbUpdates);
      console.log('🔍 [updateProspect] dbUpdates stringifié:', JSON.stringify(dbUpdates));

      // 🔥 DÉTECTER SI C'EST UN CLIENT OU UN ADMIN
      const { data: { user } } = await supabase.auth.getUser();
      const { data: adminCheck } = await supabase
        .from('users')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      let data, updateError;

      if (adminCheck) {
        // 🔥 ADMIN : Utiliser update_prospect_safe (avec vérification des droits)
        console.log('🔍 [updateProspect] Mode ADMIN - RPC update_prospect_safe');
        const result = await supabase.rpc('update_prospect_safe', {
          _prospect_id: id,
          _data: dbUpdates
        });
        data = result.data;
        updateError = result.error;
      } else {
        // 🔥 CLIENT : Utiliser update_own_prospect_profile (sans prospect_id)
        console.log('🔍 [updateProspect] Mode CLIENT - RPC update_own_prospect_profile');
        const result = await supabase.rpc('update_own_prospect_profile', {
          _data: dbUpdates
        });
        data = result.data;
        updateError = result.error;
      }

      if (updateError) {
        console.error('❌ [updateProspect] RPC Error:', updateError);
        console.error('❌ [updateProspect] Error details:', JSON.stringify(updateError));
        throw updateError;
      }

      console.log('✅ [updateProspect] RPC Success:', data);

      // 🔥 Mettre à jour immédiatement le state local avec les données retournées
      if (data && data.length > 0) {
        const dbProspect = data[0]; // Le RPC retourne un array
        const transformedProspect = {
          id: dbProspect.id,
          name: dbProspect.name,
          email: dbProspect.email,
          phone: dbProspect.phone,
          company: dbProspect.company_name,
          address: dbProspect.address,
          ownerId: dbProspect.owner_id,
          status: dbProspect.status,
          tags: dbProspect.tags || [],
          hasAppointment: dbProspect.has_appointment || false,
          affiliateName: dbProspect.affiliate_name,
          formData: dbProspect.form_data || {},
          createdAt: dbProspect.created_at,
          updatedAt: dbProspect.updated_at,
        };
        
        setProspects(prev => 
          prev.map(p => p.id === id ? transformedProspect : p)
        );
        console.log('✅ [updateProspect] State local mis à jour immédiatement');

        // 🔥 Si c'est un CLIENT qui modifie, broadcaster manuellement aux autres utilisateurs
        if (!adminCheck && channelRef.current) {
          console.log('📡 [updateProspect] Broadcasting manual update to other users...');
          // Envoyer un broadcast personnalisé pour notifier les autres utilisateurs
          channelRef.current.send({
            type: 'broadcast',
            event: 'prospect-updated',
            payload: transformedProspect
          });
        }
      }

      return data;
    } catch (err) {
      console.error('Erreur update prospect:', err);
      toast({
        title: "Erreur",
        description: err.message || "Impossible de modifier le prospect.",
        variant: "destructive",
      });
      throw err;
    }
  };

  // Supprimer un prospect
  const deleteProspect = async (id) => {
    try {
      const { error: deleteError } = await supabase
        .from('prospects')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      // Retirer de la liste locale
      setProspects(prev => prev.filter(p => p.id !== id));

      toast({
        title: "Succès",
        description: "Prospect supprimé avec succès !",
        className: "bg-green-500 text-white",
      });
    } catch (err) {
      console.error('Erreur suppression prospect:', err);
      toast({
        title: "Erreur",
        description: err.message || "Impossible de supprimer le prospect.",
        variant: "destructive",
      });
      throw err;
    }
  };

  return {
    prospects,
    loading,
    error,
    addProspect,
    updateProspect,
    deleteProspect,
    refetchProspects: fetchProspects,
  };
};

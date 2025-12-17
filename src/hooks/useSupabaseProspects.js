import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { logger } from '@/lib/logger';

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
        console.warn('[useSupabaseProspects] No session - skipping prospects loading');
        setProspects([]);
        setLoading(false);
        return;
      }
      
      // 🔥 UTILISER LA FONCTION RPC AU LIEU DU SELECT DIRECT
      // Contourne le problème de auth.uid() qui retourne NULL dans les RLS policies SELECT
      const { data, error: fetchError } = await supabase.rpc('get_prospects_safe');

      if (fetchError) {
        logger.error('Erreur fetch prospects', { error: fetchError.message });
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

      logger.debug('Prospects fetched', { count: transformedProspects.length });
      setProspects(transformedProspects);
      setError(null);
    } catch (err) {
      logger.error('Erreur chargement prospects', { error: err.message });
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
    // ⚠️ IMPORTANT : Ne charger que si activeAdminUser existe ET a un ID
    // Cela évite les calls 403 pendant l'inscription (utilisateur anonyme)
    if (!activeAdminUser || !activeAdminUser.id) {
      console.log('🔍 [useSupabaseProspects] Skipping fetch:', { 
        activeAdminUser: activeAdminUser,
        hasUser: !!activeAdminUser, 
        hasId: !!activeAdminUser?.id,
        id: activeAdminUser?.id
      });
      setLoading(false);
      setProspects([]);
      return;
    }
    
    console.log('🔍 [useSupabaseProspects] Fetching prospects for:', activeAdminUser?.name);
    fetchProspects();
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
        logger.debug('Broadcast manual UPDATE received', { id: payload.payload?.id });
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
        logger.debug('GLOBAL Broadcast received', { id: payload.payload?.id });
        // Mettre à jour la liste prospects (pas besoin de if activeAdminUser, on met toujours à jour)
        // 🔥 Créer un nouvel objet pour forcer React à détecter le changement
        setProspects(prev => {
          logger.debug('Before update', { name: prev.find(p => p.id === payload.payload.id)?.name });
          const updated = prev.map(p => 
            p.id === payload.payload.id ? { ...payload.payload } : p
          );
          logger.debug('After update', { name: updated.find(p => p.id === payload.payload.id)?.name });
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
      
      logger.debug('Auth user', { id: user?.id, email: user?.email });
      logger.debug('Session status', { hasSession: !!session?.access_token });
      
      if (!user) {
        throw new Error("Utilisateur non authentifié");
      }

      // Vérifier que l'user est bien dans la table users
      const { data: userData, error: userCheckError } = await supabase
        .from('users')
        .select('user_id, name, role')
        .eq('user_id', user.id)
        .single();
      
      logger.debug('User in users table', { userData, error: userCheckError });
      
      if (userCheckError || !userData) {
        logger.error('Utilisateur non trouvé dans table users', { error: userCheckError?.message });
        throw new Error('Utilisateur non autorisé à créer des prospects');
      }

      // 🔥 IMPORTANT: La FK prospects.owner_id référence users.user_id (auth UUID)
      // et PAS users.id (UUID PK de la table users)
      // Donc on utilise directement user.id (auth UUID) sans query supplémentaire

      // 🔥 UTILISER LA FONCTION RPC AU LIEU DE L'INSERT DIRECT
      // Contourne le problème de auth.uid() qui retourne NULL dans les RLS policies
      logger.debug('Using RPC insert_prospect_safe');
      
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
      logger.debug('RPC result', { prospectId: data?.id });

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
        logger.debug('Sending Magic Link', { email: data.email });
        
        // Envoyer le Magic Link (crée automatiquement le user auth si inexistant)
        const { data: otpData, error: magicLinkError } = await supabase.auth.signInWithOtp({
          email: data.email,
          options: {
            emailRedirectTo: `${window.location.origin}/client/dashboard`,
            shouldCreateUser: true, // ✅ Créer le user auth automatiquement
          }
        });

        if (magicLinkError) {
          logger.error('Erreur envoi Magic Link', { error: magicLinkError.message });
          
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
              logger.error('Erreur liaison user_id', { error: updateError.message });
            } else {
              logger.debug('Prospect linked to user_id', { userId: otpData.user.id });
            }
          }
          
          logger.debug('Magic Link sent', { email: data.email });
          
          // Toast de succès avec info email
          toast({
            title: "Prospect créé",
            description: `Un lien de connexion a été envoyé à ${data.email}`,
            className: "bg-green-500 text-white",
          });
        }
      } catch (emailErr) {
        logger.error('Erreur envoi Magic Link', { error: emailErr.message });
        // Ne pas bloquer si l'email échoue - le prospect est créé
      }

      return transformed;
    } catch (err) {
      logger.error('Erreur ajout prospect', { error: err.message });
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
      logger.debug('updateProspect called', { 
        idType: typeof idOrProspect, 
        updatesType: typeof updatesParam 
      });
      
      let id, updates;
      if (typeof idOrProspect === 'object' && idOrProspect.id) {
        // Format objet complet
        id = idOrProspect.id;
        updates = idOrProspect;
        logger.debug('Update mode: full object');
      } else {
        // Format séparé (id, updates)
        id = idOrProspect;
        updates = updatesParam;
        logger.debug('Update mode: separate params');
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
      logger.debug('Preparing update', { 
        prospectId: id, 
        fieldsUpdated: Object.keys(dbUpdates) 
      });

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
        logger.debug('Update mode: ADMIN - using update_prospect_safe');
        const result = await supabase.rpc('update_prospect_safe', {
          _prospect_id: id,
          _data: dbUpdates
        });
        data = result.data;
        updateError = result.error;
      } else {
        // 🔥 CLIENT : Utiliser update_own_prospect_profile (sans prospect_id)
        logger.debug('Update mode: CLIENT - using update_own_prospect_profile');
        const result = await supabase.rpc('update_own_prospect_profile', {
          _data: dbUpdates
        });
        data = result.data;
        updateError = result.error;
      }

      if (updateError) {
        logger.error('Erreur RPC', { error: updateError.message });
        logger.error('Détails erreur', { details: JSON.stringify(updateError) });
        throw updateError;
      }

      logger.debug('RPC Success', { prospectId: id });

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
        logger.debug('Local state updated immediately');

        // 🔥 Si c'est un CLIENT qui modifie, broadcaster manuellement aux autres utilisateurs
        if (!adminCheck && channelRef.current) {
          logger.debug('Broadcasting manual update to other users');
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
      logger.error('Erreur update prospect', { error: err.message });
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
      logger.error('Erreur suppression prospect', { error: err.message });
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

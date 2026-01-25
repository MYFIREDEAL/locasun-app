import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { logger } from '@/lib/logger';
import { useOrganization } from '@/contexts/OrganizationContext';
import { prospectToCamel, prospectToSnake, transformArray } from '@/lib/transforms';

/**
 * Hook personnalisé pour gérer les prospects via Supabase
 * PR-4: Utilise transforms centralisés pour la conversion snake_case ↔ camelCase
 */
export const useSupabaseProspects = (activeAdminUser) => {
  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const channelRef = useRef(null); // 🔥 Stocker le channel pour broadcast manuel
  const { organizationId } = useOrganization(); // 🔥 AJOUT

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

      // 🔥 PR-4: Utiliser transforms centralisés
      const transformedProspects = transformArray(data, prospectToCamel);

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
      setLoading(false);
      setProspects([]);
      return;
    }
    
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
            // 🔥 PR-4: Utiliser transform centralisé
            const newProspect = prospectToCamel(payload.new);
            setProspects(prev => [newProspect, ...prev]);
            toast({
              title: "🆕 Nouveau contact",
              description: `${newProspect.name} a été ajouté !`,
              className: "bg-green-500 text-white",
            });
          } else if (payload.eventType === 'UPDATE') {
            // 🔥 PR-4: Utiliser transform centralisé
            logger.info('🔄 [useSupabaseProspects] Real-time UPDATE received', {
              prospectId: payload.new.id,
              name: payload.new.name,
              hasFormData: !!payload.new.form_data,
              formDataKeys: payload.new.form_data ? Object.keys(payload.new.form_data) : []
            });
            const updatedProspect = prospectToCamel(payload.new);
            logger.info('📦 [useSupabaseProspects] updatedProspect after transform', {
              id: updatedProspect.id,
              name: updatedProspect.name,
              hasFormData: !!updatedProspect.formData,
              formDataProjects: Object.keys(updatedProspect.formData || {}),
              fullObject: updatedProspect
            });
            setProspects(prev => {
              const newProspects = prev.map(p => p.id === payload.new.id ? updatedProspect : p);
              logger.info('✅ [useSupabaseProspects] State updated, new array length:', newProspects.length);
              // 🔥 FIX: Forcer un nouveau tableau pour déclencher le re-render
              return [...newProspects];
            });
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
  // Ajouter un prospect
  const addProspect = async (prospectData) => {
    try {
      console.log('[addProspect] started', { prospectData });
      
      // Récupérer l'UUID réel du user depuis Supabase
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Utilisateur non authentifié");
      }
      
      console.log('[addProspect] auth user', { userId: user.id });

      if (!organizationId) {
        throw new Error('organization_id manquant');
      }
      
      console.log('[addProspect] organizationId', { organizationId });

      // 🔥 PR-4.1: INSERT DIRECT (plus de RPC silencieuse)
      const { data, error } = await supabase
        .from('prospects')
        .insert({
          name: prospectData.name,
          email: prospectData.email,
          phone: prospectData.phone || '',
          company_name: prospectData.company || prospectData.companyName || '',
          address: prospectData.address || '',
          owner_id: prospectData.ownerId || user.id,
          status: prospectData.status || 'lead',
          tags: prospectData.tags || [],
          has_appointment: prospectData.hasAppointment || false,
          affiliate_name: prospectData.affiliateName || null,
          organization_id: organizationId,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      console.log('[addProspect] insert result', { data, error: error?.message });

      if (error) {
        console.error('[addProspect] insert failed', error);
        throw error;
      }

      // PR-4: Utiliser transform centralisé
      const transformed = prospectToCamel(data);

      // Toast de succès
      toast({
        title: "Succès",
        description: `Prospect "${data.name}" créé !`,
        className: "bg-green-500 text-white",
      });

      return transformed;
    } catch (err) {
      console.error('[addProspect] error', err);
      toast({
        title: "Erreur",
        description: err.message || "Impossible d'ajouter le prospect.",
        variant: "destructive",
      });
      throw err;
    }
  };

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
      if (updates.companyName !== undefined) dbUpdates.company_name = updates.companyName; // ✅ Support de companyName (formContactConfig)
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
        // 🔥 PR-4: Utiliser transform centralisé
        const transformedProspect = prospectToCamel(dbProspect);
        
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

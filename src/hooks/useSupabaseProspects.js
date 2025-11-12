import { useState, useEffect } from 'react';
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

  console.log('🔧 useSupabaseProspects - activeAdminUser:', activeAdminUser?.name || 'UNDEFINED');

  // Charger les prospects depuis Supabase
  const fetchProspects = async () => {
    try {
      setLoading(true);
      
      const { data, error: fetchError } = await supabase
        .from('prospects')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

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
        // Ajouter les champs manquants si nécessaire
        createdAt: prospect.created_at,
        updatedAt: prospect.updated_at,
      }));

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
    if (activeAdminUser) {
      fetchProspects();
    }
  }, [activeAdminUser]);

  // 🔥 REAL-TIME : Écouter les changements en temps réel
  useEffect(() => {
    if (!activeAdminUser) return;

    console.log('🔥 Setting up real-time subscription for prospects...');

    const channel = supabase
      .channel('prospects-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'prospects'
        },
        (payload) => {
          console.log('🔥 Real-time change detected:', payload);

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
            console.log('📝 Updating prospect:', payload.new.id, payload.new.name);
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
              createdAt: payload.new.created_at,
              updatedAt: payload.new.updated_at,
            };
            setProspects(prev => {
              const newProspects = prev.map(p => p.id === payload.new.id ? updatedProspect : p);
              console.log('✅ Prospects updated, new count:', newProspects.length);
              return newProspects;
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
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
      });

    // Cleanup : se désabonner quand le composant unmount
    return () => {
      console.log('🔌 Unsubscribing from real-time...');
      supabase.removeChannel(channel);
    };
  }, [activeAdminUser]);

  // Ajouter un prospect
  const addProspect = async (prospectData) => {
    try {
      // Récupérer l'UUID réel du user depuis Supabase
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Utilisateur non authentifié");
      }

      // Récupérer l'ID du user dans public.users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (userError || !userData) {
        throw new Error("Impossible de récupérer les informations utilisateur");
      }

      console.log('👤 Assignation du prospect à:', userData.id);

      const { data, error: insertError } = await supabase
        .from('prospects')
        .insert([{
          name: prospectData.name,
          email: prospectData.email,
          phone: prospectData.phone,
          company_name: prospectData.company,
          address: prospectData.address || '',
          owner_id: userData.id, // Utiliser l'UUID réel du user connecté
          status: prospectData.status || 'Intéressé',
          tags: prospectData.tags || [],
          has_appointment: prospectData.hasAppointment || false,
          affiliate_name: prospectData.affiliateName || null,
        }])
        .select()
        .single();

      if (insertError) throw insertError;

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
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      // ✅ Ne pas ajouter localement, laisser le real-time s'en charger
      console.log('✅ Prospect created in DB, waiting for real-time sync...');

      toast({
        title: "Succès",
        description: "Prospect ajouté avec succès !",
        className: "bg-green-500 text-white",
      });

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
      let id, updates;
      if (typeof idOrProspect === 'object' && idOrProspect.id) {
        // Format objet complet
        id = idOrProspect.id;
        updates = idOrProspect;
      } else {
        // Format séparé (id, updates)
        id = idOrProspect;
        updates = updatesParam;
      }
      
      // Transformer les clés du format app vers le format DB
      const dbUpdates = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.email !== undefined) dbUpdates.email = updates.email;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.company !== undefined) dbUpdates.company_name = updates.company;
      if (updates.address !== undefined) dbUpdates.address = updates.address;
      if (updates.ownerId !== undefined) dbUpdates.owner_id = updates.ownerId;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
      if (updates.hasAppointment !== undefined) dbUpdates.has_appointment = updates.hasAppointment;
      if (updates.affiliateName !== undefined) dbUpdates.affiliate_name = updates.affiliateName;

      const { data, error: updateError } = await supabase
        .from('prospects')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      // ✅ Ne pas mettre à jour localement, laisser le real-time s'en charger
      // Le real-time va recevoir l'événement UPDATE et mettre à jour automatiquement
      console.log('✅ Prospect updated in DB, waiting for real-time sync...');

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

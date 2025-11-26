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

  // Charger les prospects depuis Supabase
  const fetchProspects = async () => {
    try {
      setLoading(true);
      
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
      .subscribe();

    // Cleanup : se désabonner quand le composant unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeAdminUser?.id]); // ✅ Utiliser l'ID au lieu de l'objet complet

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
      
      const { data: rpcResult, error: insertError } = await supabase.rpc('insert_prospect_safe', {
        p_name: prospectData.name,
        p_email: prospectData.email,
        p_phone: prospectData.phone,
        p_company_name: prospectData.company || '',
        p_address: prospectData.address || '',
        p_status: prospectData.status || 'Intéressé',
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

      // ENVOYER UN EMAIL D'INVITATION AU PROSPECT (en arrière-plan, ne bloque pas)
      try {
        // STRATÉGIE : 
        // 1. Créer un user temporaire dans auth.users avec un mot de passe aléatoire
        // 2. Envoyer un email de réinitialisation de mot de passe
        // 3. Le prospect définit son mot de passe et active son compte
        
        const tempPassword = `temp_${Math.random().toString(36).slice(2)}_${Date.now()}`;
        
        // Créer le user dans auth.users
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: data.email,
          password: tempPassword,
          options: {
            data: {
              prospect_id: data.id,
            }
          }
        });

        if (signUpError) {
          console.error('❌ Erreur création auth user:', signUpError);
          
          // Si l'user existe déjà, envoyer juste un reset password
          if (signUpError.message.includes('already registered')) {
            const redirectUrl = import.meta.env.DEV 
              ? `${window.location.origin}/reset-password`
              : 'https://evatime.vercel.app/reset-password';
            
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(data.email, {
              redirectTo: redirectUrl,
            });
            
            if (resetError) {
              throw resetError;
            }
            
            toast({
              title: "Prospect créé",
              description: `Un email d'activation a été envoyé à ${data.email}`,
              className: "bg-green-500 text-white",
            });
          } else {
            throw signUpError;
          }
        } else {
          // Lier immédiatement le user_id au prospect
          const { error: updateError } = await supabase
            .from('prospects')
            .update({ user_id: authData.user.id })
            .eq('id', data.id);
          
          if (updateError) {
            console.error('⚠️ Erreur liaison user_id:', updateError);
          }
          
          // Envoyer un email de définition de mot de passe
          const redirectUrl = import.meta.env.DEV 
            ? `${window.location.origin}/reset-password`
            : 'https://evatime.vercel.app/reset-password';
          
          const { error: resetError } = await supabase.auth.resetPasswordForEmail(data.email, {
            redirectTo: redirectUrl,
          });
          
          if (resetError) {
            console.error('⚠️ Erreur envoi email:', resetError);
          } else {
            console.log('✅ Email d\'activation envoyé à', data.email);
          }
        }
      } catch (emailErr) {
        console.error('⚠️ Erreur email (non bloquant):', emailErr);
        // Ne pas throw, l'email est optionnel
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
      if (updates.formData !== undefined) dbUpdates.form_data = updates.formData; // 🔥 Réponses aux formulaires

      // 🔥 UTILISER LA FONCTION RPC AU LIEU DE L'UPDATE DIRECT
      const { data, error: updateError } = await supabase.rpc('update_prospect_safe', {
        _prospect_id: id,
        _data: dbUpdates
      });

      if (updateError) throw updateError;

      // ✅ Ne pas mettre à jour localement, laisser le real-time s'en charger
      // Le real-time va recevoir l'événement UPDATE et mettre à jour automatiquement

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

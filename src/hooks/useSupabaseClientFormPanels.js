import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook pour gérer les formulaires envoyés aux clients via Supabase
 * Table: client_form_panels
 */
export function useSupabaseClientFormPanels(prospectId = null) {
  const [formPanels, setFormPanels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Transformation Supabase → App
  const transformFromDB = (dbPanel) => ({
    panelId: dbPanel.panel_id,
    prospectId: dbPanel.prospect_id,
    projectType: dbPanel.project_type,
    formId: dbPanel.form_id,
    promptId: dbPanel.prompt_id, // 🔥 AJOUT: ID du prompt pour auto-complete
    currentStepIndex: dbPanel.current_step_index, // 🔥 AJOUT: Index de l'étape
    messageTimestamp: dbPanel.message_timestamp,
    status: dbPanel.status,
    userOverride: dbPanel.user_override,
    stepName: dbPanel.step_name, // 🔥 AJOUT: Nom de l'étape du pipeline
    lastSubmittedAt: dbPanel.last_submitted_at ? new Date(dbPanel.last_submitted_at).getTime() : null,
    createdAt: new Date(dbPanel.created_at).getTime(),
    updatedAt: new Date(dbPanel.updated_at).getTime(),
  });

  // Transformation App → Supabase
  const transformToDB = (appPanel) => ({
    prospect_id: appPanel.prospectId,
    project_type: appPanel.projectType,
    form_id: appPanel.formId,
    message_timestamp: appPanel.messageTimestamp,
    status: appPanel.status,
    user_override: appPanel.userOverride || null,
  });

  // Charger les formulaires
  useEffect(() => {
    const fetchFormPanels = async () => {
      try {
        setLoading(true);
        
        // 🔥 Vérifier si une session existe avant de faire des requêtes
        const { data: { session } } = await supabase.auth.getSession();
        
        console.log('🔍 [useSupabaseClientFormPanels] Chargement avec prospectId:', prospectId);
        
        // Si pas de session active, ne charger aucune donnée (ex: page inscription)
        if (!session) {
          console.log('⚠️ [useSupabaseClientFormPanels] Pas de session - skip chargement');
          setFormPanels([]);
          setLoading(false);
          return;
        }
        
        // 🔥 Si prospectId === null, charger TOUS les formulaires (pour admin)
        let query = supabase
          .from('client_form_panels')
          .select('*');
        
        if (prospectId) {
          query = query.eq('prospect_id', prospectId);
          console.log('🔍 [useSupabaseClientFormPanels] Filtre appliqué: prospect_id =', prospectId);
        } else {
          console.log('🔍 [useSupabaseClientFormPanels] Pas de filtre (mode admin)');
        }
        
        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
          console.error('❌ [useSupabaseClientFormPanels] Erreur Supabase SELECT:', error.message);
          throw error;
        }

        console.log('📋 [useSupabaseClientFormPanels] Données brutes Supabase:', data?.length || 0, 'formulaires');
        const transformed = Array.isArray(data) ? data.map(transformFromDB) : [];
        console.log('📋 [useSupabaseClientFormPanels] Données transformées:', transformed.length, 'formulaires');
        setFormPanels(transformed);
        setError(null);
      } catch (err) {
        console.error('❌ [useSupabaseClientFormPanels] Exception chargement:', err.message || err);
        setFormPanels([]); // ✅ Garantir tableau vide en cas d'erreur
        setError(err.message || 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    };

    fetchFormPanels();

    // Real-time subscription
    const channelName = prospectId ? `client-form-panels-${prospectId}` : 'client-form-panels-all';
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'client_form_panels',
          ...(prospectId && { filter: `prospect_id=eq.${prospectId}` }), // 🔥 Filtre uniquement si prospectId fourni
        },
        (payload) => {
          try {
            if (payload.eventType === 'INSERT') {
              const newPanel = transformFromDB(payload.new);
              setFormPanels((prev) => {
                const currentPanels = Array.isArray(prev) ? prev : [];
                // Éviter les doublons
                if (currentPanels.some(p => p.panelId === newPanel.panelId)) {
                  return currentPanels;
                }
                return [newPanel, ...currentPanels];
              });
            } else if (payload.eventType === 'UPDATE') {
              const updatedPanel = transformFromDB(payload.new);
              setFormPanels((prev) => {
                const currentPanels = Array.isArray(prev) ? prev : [];
                return currentPanels.map((p) => (p.panelId === updatedPanel.panelId ? updatedPanel : p));
              });
            } else if (payload.eventType === 'DELETE') {
              setFormPanels((prev) => {
                const currentPanels = Array.isArray(prev) ? prev : [];
                return currentPanels.filter((p) => p.panelId !== payload.old.panel_id);
              });
            }
          } catch (err) {
            console.error('❌ [useSupabaseClientFormPanels] Erreur real-time:', err);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [prospectId]);

  // Mettre à jour un formulaire
  const updateFormPanel = async (panelId, updates) => {
    try {
      const dbUpdates = {};
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.userOverride !== undefined) dbUpdates.user_override = updates.userOverride;
      if (updates.lastSubmittedAt !== undefined) dbUpdates.last_submitted_at = updates.lastSubmittedAt;

      const { data, error } = await supabase
        .from('client_form_panels')
        .update(dbUpdates)
        .eq('panel_id', panelId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: transformFromDB(data) };
    } catch (err) {
      console.error('❌ Erreur mise à jour form panel:', err);
      return { success: false, error: err.message };
    }
  };

  // Supprimer un formulaire
  const deleteFormPanel = async (panelId) => {
    try {
      const { error } = await supabase
        .from('client_form_panels')
        .delete()
        .eq('panel_id', panelId);

      if (error) throw error;

      return { success: true };
    } catch (err) {
      console.error('❌ Erreur suppression form panel:', err);
      return { success: false, error: err.message };
    }
  };

  // Supprimer tous les formulaires d'un prospect/projet
  const deleteFormPanelsByProspect = async (prospectId, projectType) => {
    try {
      let query = supabase
        .from('client_form_panels')
        .delete()
        .eq('prospect_id', prospectId);

      if (projectType) {
        query = query.eq('project_type', projectType);
      }

      const { error } = await query;

      if (error) throw error;

      return { success: true };
    } catch (err) {
      console.error('❌ Erreur suppression form panels:', err);
      return { success: false, error: err.message };
    }
  };

  // 🔥 AJOUT : Créer un nouveau formulaire dans Supabase
  const createFormPanel = async (panelData) => {
    try {
      console.log('➕ [createFormPanel] Création formulaire:', {
        prospectId: panelData.prospectId,
        projectType: panelData.projectType,
        formId: panelData.formId,
        status: panelData.status || 'pending',
        stepName: panelData.stepName
      });

      const { error } = await supabase
        .from('client_form_panels')
        .insert({
          panel_id: panelData.panelId || `panel-${panelData.prospectId}-${panelData.projectType}-${panelData.formId}-${Date.now()}`,
          prospect_id: panelData.prospectId,
          project_type: panelData.projectType,
          form_id: panelData.formId,
          prompt_id: panelData.promptId || null, // 🔥 AJOUT: ID du prompt pour auto-complete
          current_step_index: panelData.currentStepIndex || 0, // 🔥 AJOUT: Index de l'étape
          message_timestamp: panelData.messageTimestamp,
          status: panelData.status || 'pending',
          step_name: panelData.stepName || null, // 🔥 AJOUT: Nom de l'étape du pipeline
        });

      if (error) {
        console.error('❌ [createFormPanel] Erreur Supabase INSERT:', error.message);
        throw error;
      }
      
      console.log('✅ [createFormPanel] Formulaire créé avec succès');
      return { success: true };
    } catch (err) {
      console.error('❌ [createFormPanel] Exception insertion:', err.message || err);
      return { success: false, error: err.message || 'Erreur inconnue' };
    }
  };

  return {
    formPanels: Array.isArray(formPanels) ? formPanels : [], // ✅ Garantir tableau
    loading,
    error,
    createFormPanel, // 🔥 AJOUT ICI
    updateFormPanel,
    deleteFormPanel,
    deleteFormPanelsByProspect,
  };
}

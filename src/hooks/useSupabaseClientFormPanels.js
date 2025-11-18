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
    messageTimestamp: dbPanel.message_timestamp,
    status: dbPanel.status,
    userOverride: dbPanel.user_override,
    stepName: dbPanel.step_name, // 🔥 AJOUT: Nom de l'étape du pipeline
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
    // ⚠️ Ne pas charger si pas de prospectId (évite de charger tous les formulaires)
    if (!prospectId) {
      setLoading(false);
      return;
    }

    const fetchFormPanels = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('client_form_panels')
          .select('*')
          .eq('prospect_id', prospectId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        console.log('📋 [useSupabaseClientFormPanels] Raw data from Supabase:', data);
        const transformed = (data || []).map(transformFromDB);
        console.log('📋 [useSupabaseClientFormPanels] Transformed:', transformed);
        setFormPanels(transformed);
        setError(null);
      } catch (err) {
        console.error('Erreur chargement form panels:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFormPanels();

    // Real-time subscription (seulement si prospectId fourni)
    if (!prospectId) {
      return;
    }

    const channel = supabase
      .channel(`client-form-panels-${prospectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'client_form_panels',
          filter: `prospect_id=eq.${prospectId}`,
        },
        (payload) => {
          console.log('🔔 Real-time client_form_panels:', payload);

          if (payload.eventType === 'INSERT') {
            const newPanel = transformFromDB(payload.new);
            setFormPanels((prev) => {
              // Éviter les doublons
              if (prev.some(p => p.panelId === newPanel.panelId)) {
                return prev;
              }
              return [newPanel, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedPanel = transformFromDB(payload.new);
            setFormPanels((prev) =>
              prev.map((p) => (p.panelId === updatedPanel.panelId ? updatedPanel : p))
            );
          } else if (payload.eventType === 'DELETE') {
            setFormPanels((prev) =>
              prev.filter((p) => p.panelId !== payload.old.panel_id)
            );
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
      // Note: submission_data n'existe pas encore dans la table

      const { data, error } = await supabase
        .from('client_form_panels')
        .update(dbUpdates)
        .eq('panel_id', panelId)
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Form panel mis à jour:', data);
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

      console.log('✅ Form panel supprimé:', panelId);
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

      console.log('✅ Form panels supprimés pour:', { prospectId, projectType });
      return { success: true };
    } catch (err) {
      console.error('❌ Erreur suppression form panels:', err);
      return { success: false, error: err.message };
    }
  };

  // 🔥 AJOUT : Créer un nouveau formulaire dans Supabase
  const createFormPanel = async (panelData) => {
    try {
      console.log('➕ [createFormPanel] Création formulaire:', panelData);
      
      const { error } = await supabase
        .from('client_form_panels')
        .insert({
          panel_id: panelData.panelId || `panel-${panelData.prospectId}-${panelData.projectType}-${panelData.formId}-${Date.now()}`,
          prospect_id: panelData.prospectId,
          project_type: panelData.projectType,
          form_id: panelData.formId,
          message_timestamp: panelData.messageTimestamp,
          status: panelData.status || 'pending',
          step_name: panelData.stepName || null, // 🔥 AJOUT: Nom de l'étape du pipeline
        });

      if (error) throw error;
      
      console.log('✅ [createFormPanel] Formulaire créé avec succès');
      return { success: true };
    } catch (err) {
      console.error('❌ [createFormPanel] Erreur insertion:', err);
      return { success: false, error: err.message };
    }
  };

  return {
    formPanels,
    loading,
    error,
    createFormPanel, // 🔥 AJOUT ICI
    updateFormPanel,
    deleteFormPanel,
    deleteFormPanelsByProspect,
  };
}

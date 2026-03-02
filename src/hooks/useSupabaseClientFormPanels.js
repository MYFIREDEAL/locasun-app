import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '@/lib/logger';
import { useOrganization } from '@/contexts/OrganizationContext';

/**
 * Hook pour gérer les formulaires envoyés aux clients via Supabase
 * Table: client_form_panels
 */
export function useSupabaseClientFormPanels(prospectId = null) {
  const { organizationId } = useOrganization();
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
    filledByRole: dbPanel.filled_by_role || 'client', // 🔥 AJOUT: Qui remplit (client/partner)
    formData: dbPanel.form_data || {}, // 🔥 AJOUT: Données du formulaire (pour partenaire)
    rejectionReason: dbPanel.rejection_reason || null, // 🔥 AJOUT: Raison du refus (pour partenaire)
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
    // 🔥 FIX BOOT: Ne pas exécuter si disabled
    if (prospectId === '__DISABLED__') {
      setFormPanels([]);
      setLoading(false);
      return;
    }

    // 🔥 MULTI-ORG: Toujours exiger organizationId pour les lectures via RPC
    // (le backend est multi-org, plus de .from('client_form_panels') en lecture)
    if (!organizationId) {
      setFormPanels([]);
      setLoading(false);
      return;
    }
    
    const fetchFormPanels = async () => {
      try {
        setLoading(true);
        
        // 🔥 Vérifier si une session existe avant de faire des requêtes
        const { data: { session } } = await supabase.auth.getSession();
        
        logger.debug('Loading client form panels', { prospectId });
        
        // Si pas de session active, ne charger aucune donnée (ex: page inscription)
        if (!session) {
          logger.debug('No session - skipping form panels loading');
          setFormPanels([]);
          setLoading(false);
          return;
        }
        
        // 🔥 LECTURE DIRECTE (plus de RPC - évite les problèmes de cache PostgREST)
        let query = supabase
          .from('client_form_panels')
          .select('*')
          .eq('organization_id', organizationId);
        
        // Si prospectId fourni, filtrer par prospect (mode client)
        if (prospectId) {
          query = query.eq('prospect_id', prospectId);
        }
        
        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
          logger.error('Supabase SELECT error:', error.message);
          throw error;
        }

        const transformed = Array.isArray(data) ? data.map(transformFromDB) : [];
        logger.debug('[useSupabaseClientFormPanels] Loaded', { count: transformed.length, organizationId, prospectId });
        setFormPanels(transformed);
        setError(null);
      } catch (err) {
        logger.error('❌ [useSupabaseClientFormPanels] Exception chargement:', err.message || err);
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
            logger.error('❌ [useSupabaseClientFormPanels] Erreur real-time:', err);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [prospectId, organizationId]);

  // Mettre à jour un formulaire
  const updateFormPanel = async (panelId, updates) => {
    try {
      const dbUpdates = {};
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.userOverride !== undefined) dbUpdates.user_override = updates.userOverride;
      if (updates.lastSubmittedAt !== undefined) dbUpdates.last_submitted_at = updates.lastSubmittedAt;
      if (updates.formData !== undefined) dbUpdates.form_data = updates.formData; // 🔥 AJOUT: Mapping camelCase → snake_case
      if (updates.rejectionReason !== undefined) dbUpdates.rejection_reason = updates.rejectionReason; // 🔥 AJOUT: Raison du refus

      const { error } = await supabase
        .from('client_form_panels')
        .update(dbUpdates)
        .eq('panel_id', panelId);

      if (error) throw error;

      return { success: true };
    } catch (err) {
      logger.error('❌ Erreur mise à jour form panel:', err);
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
      logger.error('❌ Erreur suppression form panel:', err);
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
      logger.error('❌ Erreur suppression form panels:', err);
      return { success: false, error: err.message };
    }
  };

  // 🔥 AJOUT : Créer un nouveau formulaire dans Supabase
  const createFormPanel = async (panelData) => {
    try {
      logger.debug('Creating form panel', {
        prospectId: panelData.prospectId,
        projectType: panelData.projectType,
        formId: panelData.formId
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
          action_id: panelData.actionId || null, // 🔥 AJOUT: ID de l'action pour déclenchement séquentiel
        });

      if (error) {
        logger.error('Supabase INSERT error:', error.message);
        throw error;
      }
      
      logger.debug('Form panel created successfully');
      return { success: true };
    } catch (err) {
      logger.error('Form panel insertion error:', err.message || err);
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

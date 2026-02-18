/**
 * ═══════════════════════════════════════════════════════════════════════════
 * HOOK: useSupabaseWorkflowModuleTemplates
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Gère la persistance des configurations Workflow V2 dans Supabase.
 * Table: workflow_module_templates
 * 
 * PROMPT 9 — Persistance DB Configuration
 * 
 * ⚠️ CONTRAINTES:
 *    - Aucune exécution
 *    - Aucune logique métier
 *    - Pure persistance CRUD
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '@/lib/logger';

/**
 * Hook pour gérer les configurations Workflow V2 via Supabase
 * 
 * @param {string} organizationId - UUID de l'organisation
 * @param {string} projectType - Type de projet (ACC, Centrale, etc.)
 * @returns {Object} { templates, loading, error, loadTemplate, saveTemplate, deleteTemplate }
 */
export function useSupabaseWorkflowModuleTemplates(organizationId, projectType = null) {
  const [templates, setTemplates] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // ─────────────────────────────────────────────────────────────────────────
  // TRANSFORMATION DB ↔ APP
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Transforme un record DB en objet App
   * snake_case → camelCase
   */
  const transformFromDB = (dbRecord) => ({
    id: dbRecord.id,
    orgId: dbRecord.org_id,
    projectType: dbRecord.project_type,
    moduleId: dbRecord.module_id,
    configJson: dbRecord.config_json,
    createdAt: dbRecord.created_at,
    updatedAt: dbRecord.updated_at,
  });

  /**
   * Transforme un objet App en record DB
   * camelCase → snake_case
   */
  const transformToDB = (appRecord) => ({
    org_id: appRecord.orgId,
    project_type: appRecord.projectType,
    module_id: appRecord.moduleId,
    config_json: appRecord.configJson,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // LOAD ALL TEMPLATES (pour un project_type)
  // ─────────────────────────────────────────────────────────────────────────

  const fetchTemplates = useCallback(async () => {
    if (!organizationId) {
      setTemplates({});
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('workflow_module_templates')
        .select('*')
        .eq('org_id', organizationId);

      // Filtrer par projectType si fourni
      if (projectType) {
        query = query.eq('project_type', projectType);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Transformer en objet indexé par projectType:moduleId (clé composite unique)
      const templatesObject = {};
      (data || []).forEach((record) => {
        const transformed = transformFromDB(record);
        const key = `${transformed.projectType}:${transformed.moduleId}`;
        templatesObject[key] = transformed;
      });

      setTemplates(templatesObject);
      logger.info('[WorkflowModuleTemplates] Loaded', {
        organizationId,
        projectType,
        count: Object.keys(templatesObject).length,
      });

    } catch (err) {
      logger.error('[WorkflowModuleTemplates] Erreur chargement:', { error: err.message });
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [organizationId, projectType]);

  // Charger au mount et quand les params changent
  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // ─────────────────────────────────────────────────────────────────────────
  // LOAD SINGLE TEMPLATE
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Charge une config spécifique par moduleId
   * @param {string} targetProjectType - Type de projet (override ou default)
   * @param {string} moduleId - ID du module
   * @returns {Object|null} Config ou null si non trouvée
   */
  const loadTemplate = useCallback(async (targetProjectType, moduleId) => {
    const effectiveProjectType = targetProjectType || projectType;
    
    if (!organizationId || !effectiveProjectType || !moduleId) {
      return null;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('workflow_module_templates')
        .select('*')
        .eq('org_id', organizationId)
        .eq('project_type', effectiveProjectType)
        .eq('module_id', moduleId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        const transformed = transformFromDB(data);
        logger.info('[WorkflowModuleTemplates] Loaded template', { moduleId, effectiveProjectType });
        return transformed;
      }

      return null;
    } catch (err) {
      logger.error('[WorkflowModuleTemplates] Erreur load template:', { 
        moduleId, 
        error: err.message 
      });
      return null;
    }
  }, [organizationId, projectType]);

  // ─────────────────────────────────────────────────────────────────────────
  // SAVE TEMPLATE (UPSERT)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Sauvegarde une config (upsert)
   * @param {string} targetProjectType - Type de projet (override ou default)
   * @param {string} moduleId - ID du module
   * @param {Object} configJson - Configuration complète
   * @returns {Object} { success, data, error }
   */
  const saveTemplate = useCallback(async (targetProjectType, moduleId, configJson) => {
    const effectiveProjectType = targetProjectType || projectType;
    
    if (!organizationId || !effectiveProjectType || !moduleId) {
      return { 
        success: false, 
        error: 'Paramètres manquants (organizationId, projectType, moduleId)' 
      };
    }

    try {
      setSaving(true);
      setError(null);

      const record = transformToDB({
        orgId: organizationId,
        projectType: effectiveProjectType,
        moduleId,
        configJson,
      });

      // Upsert basé sur la contrainte unique
      const { data, error: upsertError } = await supabase
        .from('workflow_module_templates')
        .upsert(record, {
          onConflict: 'org_id,project_type,module_id',
          returning: 'representation',
        })
        .select()
        .single();

      if (upsertError) throw upsertError;

      const transformed = transformFromDB(data);

      // 🔥 FIX MULTI-TENANT: Créer/mettre à jour un prompt pour rétro-compatibilité
      // (useAutoVerificationTasks vérifie la présence de prompts)
      try {
        const promptId = `prompt-wfv2-${effectiveProjectType}`;
        const promptRecord = {
          prompt_id: promptId,
          name: effectiveProjectType.toUpperCase(),
          tone: configJson.tone || 'professional',
          project_id: effectiveProjectType,
          organization_id: organizationId,
          steps_config: {}, // Vide car V2 gère les actions différemment
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        await supabase
          .from('prompts')
          .upsert(promptRecord, {
            onConflict: 'prompt_id',
          });

        logger.debug('[WorkflowModuleTemplates] Prompt créé/mis à jour', { promptId });
      } catch (promptError) {
        // Non bloquant : si ça échoue, la config V2 est quand même sauvegardée
        logger.warn('[WorkflowModuleTemplates] Erreur création prompt (non bloquant)', { 
          error: promptError.message 
        });
      }

      // Mettre à jour le cache local (clé composite projectType:moduleId)
      const cacheKey = `${effectiveProjectType}:${moduleId}`;
      setTemplates((prev) => ({
        ...prev,
        [cacheKey]: transformed,
      }));

      logger.info('[WorkflowModuleTemplates] Saved template', { 
        moduleId, 
        effectiveProjectType 
      });

      return { success: true, data: transformed };

    } catch (err) {
      logger.error('[WorkflowModuleTemplates] Erreur save:', { 
        moduleId, 
        error: err.message 
      });
      setError(err.message);
      return { success: false, error: err.message };

    } finally {
      setSaving(false);
    }
  }, [organizationId, projectType]);

  // ─────────────────────────────────────────────────────────────────────────
  // DELETE TEMPLATE
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Supprime une config
   * @param {string} targetProjectType - Type de projet (override ou default)
   * @param {string} moduleId - ID du module
   * @returns {Object} { success, error }
   */
  const deleteTemplate = useCallback(async (targetProjectType, moduleId) => {
    const effectiveProjectType = targetProjectType || projectType;
    
    if (!organizationId || !effectiveProjectType || !moduleId) {
      return { success: false, error: 'Paramètres manquants' };
    }

    try {
      const { error: deleteError } = await supabase
        .from('workflow_module_templates')
        .delete()
        .eq('org_id', organizationId)
        .eq('project_type', effectiveProjectType)
        .eq('module_id', moduleId);

      if (deleteError) throw deleteError;

      // Retirer du cache local (clé composite)
      const cacheKey = `${effectiveProjectType}:${moduleId}`;
      setTemplates((prev) => {
        const updated = { ...prev };
        delete updated[cacheKey];
        return updated;
      });

      logger.info('[WorkflowModuleTemplates] Deleted template', { moduleId, effectiveProjectType });

      return { success: true };

    } catch (err) {
      logger.error('[WorkflowModuleTemplates] Erreur delete:', { 
        moduleId, 
        error: err.message 
      });
      return { success: false, error: err.message };
    }
  }, [organizationId, projectType]);

  // ─────────────────────────────────────────────────────────────────────────
  // HELPER: Vérifier si un module a une config persistée
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Vérifie si un module a une config persistée
   * @param {string} targetProjectType - Type de projet
   * @param {string} moduleId - ID du module
   * @returns {boolean}
   */
  const hasPersistedConfig = useCallback((targetProjectType, moduleId) => {
    const effectivePT = targetProjectType || projectType;
    const key = `${effectivePT}:${moduleId}`;
    return key in templates;
  }, [templates, projectType]);

  /**
   * Récupère la config persistée d'un module (depuis le cache)
   * @param {string} targetProjectType - Type de projet
   * @param {string} moduleId - ID du module
   * @returns {Object|null}
   */
  const getPersistedConfig = useCallback((targetProjectType, moduleId) => {
    const effectivePT = targetProjectType || projectType;
    const key = `${effectivePT}:${moduleId}`;
    return templates[key]?.configJson || null;
  }, [templates, projectType]);

  // ─────────────────────────────────────────────────────────────────────────
  // HELPER: Liste brute des templates (pour cockpit)
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Récupère tous les templates sous forme de liste
   * @returns {Array} Liste des templates avec project_type et module_id
   */
  const getAllTemplatesList = useCallback(() => {
    return Object.values(templates).map(t => ({
      project_type: t.projectType,
      module_id: t.moduleId,
      configJson: t.configJson,
    }));
  }, [templates]);

  // ─────────────────────────────────────────────────────────────────────────
  // RETURN
  // ─────────────────────────────────────────────────────────────────────────

  return {
    // State
    templates,
    loading,
    saving,
    error,
    
    // Context (pour IAKnowledgeDocuments)
    organizationId,

    // Actions
    loadTemplate,
    saveTemplate,
    deleteTemplate,
    refetch: fetchTemplates,

    // Helpers
    hasPersistedConfig,
    getPersistedConfig,
    getAllTemplatesList,
    
    // Alias pour compatibilité
    isSaving: saving,
    isPersisted: Object.keys(templates).length > 0,
  };
}

export default useSupabaseWorkflowModuleTemplates;

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '@/lib/logger';

/**
 * Hook Supabase pour gérer les modèles de projets (templates)
 * 
 * Fonctionnalités :
 * - Lecture des templates (ACC, Centrale, Autonomie, etc.)
 * - Création/modification/suppression (Admin uniquement)
 * - Gestion de la visibilité (is_public)
 * - Sync real-time entre admins
 * - 🔥 MULTI-TENANT: Filtre par organization_id
 * 
 * Table Supabase : project_templates
 * Remplace : localStorage 'evatime_projects_data'
 * 
 * @param {Object} options - Options du hook
 * @param {string|null} options.organizationId - UUID de l'organization
 * @param {boolean} options.enabled - Si false, le hook ne fait rien (default: true)
 */
export function useSupabaseProjectTemplates({ organizationId = null, enabled = true } = {}) {
  const [projectTemplates, setProjectTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isLocalUpdate = useRef(false);
  const lastFetchedOrgId = useRef(null);

  /**
   * ✅ CHARGER LES TEMPLATES AU MONTAGE ET QUAND organizationId CHANGE
   * 🔥 FIX BOUCLE #310: Ne rien faire si !enabled || !organizationId
   */
  useEffect(() => {
    // 🔥 Guard: Ne rien faire si pas enabled ou pas d'org
    if (!enabled || !organizationId) {
      return;
    }
    // Éviter les appels redondants avec le même org
    if (lastFetchedOrgId.current === organizationId) {
      return;
    }
    lastFetchedOrgId.current = organizationId;
    fetchProjectTemplates(organizationId);
  }, [organizationId, enabled]);

  /**
   * ✅ ÉCOUTER LES CHANGEMENTS REAL-TIME - Filtré par organization_id !
   * 🔥 FIX BOUCLE #310: Ne rien faire si !enabled || !organizationId
   */
  useEffect(() => {
    // 🔥 Guard: Ne rien faire si pas enabled ou pas d'org
    if (!enabled || !organizationId) return;

    const channel = supabase
      .channel(`project-templates-changes-${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_templates',
          filter: `organization_id=eq.${organizationId}`  // 🔥 Filtrer par org !
        },
        (payload) => {
          if (isLocalUpdate.current) {
            isLocalUpdate.current = false;
            return;
          }

          // 🔥 Double vérification de l'org (sécurité)
          if (payload.new?.organization_id && payload.new.organization_id !== organizationId) {
            return; // Ignorer les events d'autres orgs
          }

          // ✅ Transformer snake_case → camelCase
          const transformTemplate = (t) => ({
            ...t,
            clientTitle: t.client_title,
            isPublic: t.is_public,
            coverImage: t.image_url,
            clientDescription: t.client_description,
            ctaText: t.cta_text,
            contentBlocks: t.content_blocks || []
          });

          if (payload.eventType === 'INSERT') {
            setProjectTemplates(prev => {
              const exists = prev.find(t => t.id === payload.new.id);
              if (exists) return prev;
              return [...prev, transformTemplate(payload.new)];
            });
          } else if (payload.eventType === 'UPDATE') {
            setProjectTemplates(prev =>
              prev.map(template =>
                template.id === payload.new.id ? transformTemplate(payload.new) : template
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setProjectTemplates(prev =>
              prev.filter(template => template.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId]);  // 🔥 Re-subscribe si org change

  /**
   * 📥 RÉCUPÉRER LES TEMPLATES (filtrés par organization)
   * - Si organizationId fourni: templates globaux (NULL) + templates de l'org
   * - Sinon: uniquement templates globaux (NULL)
   * @param {string|null} orgId - L'organization_id à utiliser pour le filtre
   */
  const fetchProjectTemplates = async (orgId) => {
    try {
      setLoading(true);
      setError(null);

      // 🔥 MULTI-ORG: Lecture via RPC (plus de .from('project_templates') en lecture)
      const { data, error: fetchError } = await supabase.rpc('get_project_templates_for_org', {
        p_organization_id: orgId,
      });

      if (fetchError) throw fetchError;

      // ✅ TRANSFORMER snake_case → camelCase pour compatibilité avec l'app
      const transformedData = (Array.isArray(data) ? data : []).map(template => ({
        ...template,
        clientTitle: template.client_title,
        isPublic: template.is_public,
        coverImage: template.image_url,
        clientDescription: template.client_description,
        ctaText: template.cta_text,
        contentBlocks: template.content_blocks || []
      }));

      // Conserver l'ancien comportement: ordre par type
      transformedData.sort((a, b) => (a.type || '').localeCompare(b.type || ''));
      setProjectTemplates(transformedData);
    } catch (err) {
      logger.error('Erreur fetch project templates:', { error: err.message });
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * ➕ CRÉER UN NOUVEAU TEMPLATE
   * 🔥 MULTI-TENANT: Force l'inclusion de organization_id
   */
  const addTemplate = async (templateData) => {
    if (!organizationId) {
      throw new Error('organization_id requis pour créer un template');
    }

    try {
      isLocalUpdate.current = true;

      // 🔥 MULTI-TENANT: Inclure organization_id automatiquement
      const dataWithOrg = {
        ...templateData,
        organization_id: organizationId
      };

      const { data, error: insertError } = await supabase
        .from('project_templates')
        .insert([dataWithOrg])
        .select()
        .single();

      if (insertError) throw insertError;
      
      // ✅ Transformer snake_case → camelCase
      const transformedData = {
        ...data,
        clientTitle: data.client_title,
        isPublic: data.is_public,
        coverImage: data.image_url,
        clientDescription: data.client_description,
        ctaText: data.cta_text,
        contentBlocks: data.content_blocks
      };
      
      setProjectTemplates(prev => [...prev, transformedData]);
      return transformedData;
    } catch (err) {
      logger.error('Erreur création template:', { error: err.message });
      isLocalUpdate.current = false;
      throw err;
    }
  };

  /**
   * ✏️ MODIFIER UN TEMPLATE EXISTANT
   */
  const updateTemplate = async (id, updates) => {
    try {
      isLocalUpdate.current = true;

      const { data, error: updateError } = await supabase
        .from('project_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;
      
      // ✅ Transformer snake_case → camelCase
      const transformedData = {
        ...data,
        clientTitle: data.client_title,
        isPublic: data.is_public,
        coverImage: data.image_url,
        clientDescription: data.client_description,
        ctaText: data.cta_text,
        contentBlocks: data.content_blocks
      };
      
      setProjectTemplates(prev =>
        prev.map(template => (template.id === id ? transformedData : template))
      );
      return transformedData;
    } catch (err) {
      logger.error('Erreur modification template:', { error: err.message });
      isLocalUpdate.current = false;
      throw err;
    }
  };

  /**
   * 🗑️ SUPPRIMER UN TEMPLATE
   */
  const deleteTemplate = async (id) => {
    try {
      isLocalUpdate.current = true;

      const { error: deleteError } = await supabase
        .from('project_templates')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setProjectTemplates(prev => prev.filter(template => template.id !== id));
    } catch (err) {
      logger.error('Erreur suppression template:', { error: err.message });
      isLocalUpdate.current = false;
      throw err;
    }
  };

  /**
   * 🔍 RÉCUPÉRER UN TEMPLATE PAR TYPE
   */
  const getTemplateByType = (type) => {
    return projectTemplates.find(t => t.type === type);
  };

  /**
   * 📋 RÉCUPÉRER UNIQUEMENT LES TEMPLATES PUBLICS
   */
  const getPublicTemplates = () => {
    return projectTemplates.filter(t => t.is_public === true);
  };

  return {
    projectTemplates,
    loading,
    error,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplateByType,
    getPublicTemplates,
    refresh: fetchProjectTemplates
  };
}

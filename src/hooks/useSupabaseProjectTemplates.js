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
 * @param {string|null} organizationId - UUID de l'organization (optionnel)
 *   - Si fourni: retourne templates globaux (NULL) + templates de l'org
 *   - Si null/undefined: retourne uniquement les templates globaux (NULL)
 */
export function useSupabaseProjectTemplates(organizationId = null) {
  const [projectTemplates, setProjectTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isLocalUpdate = useRef(false);

  /**
   * ✅ CHARGER LES TEMPLATES AU MONTAGE ET QUAND organizationId CHANGE
   */
  useEffect(() => {
    fetchProjectTemplates(organizationId);
  }, [organizationId]);

  /**
   * ✅ ÉCOUTER LES CHANGEMENTS REAL-TIME - Filtré par organization_id !
   */
  useEffect(() => {
    if (!organizationId) return;

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
            ctaText: t.cta_text
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

      let query = supabase
        .from('project_templates')
        .select('*')
        .order('type', { ascending: true });

      // 🔥 MULTI-TENANT: Filtrer par organization_id
      if (orgId) {
        // Templates globaux (NULL) OU templates de cette org
        query = query.or(`organization_id.is.null,organization_id.eq.${orgId}`);
      } else {
        // Pas d'org = uniquement templates globaux
        query = query.is('organization_id', null);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // ✅ TRANSFORMER snake_case → camelCase pour compatibilité avec l'app
      const transformedData = (data || []).map(template => ({
        ...template,
        clientTitle: template.client_title,
        isPublic: template.is_public,
        coverImage: template.image_url,
        clientDescription: template.client_description,
        ctaText: template.cta_text
      }));

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
        ctaText: data.cta_text
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
        ctaText: data.cta_text
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

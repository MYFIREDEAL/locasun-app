import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '@/lib/logger';

/**
 * Hook pour gérer les templates de contrats via Supabase
 * Table: contract_templates
 * @param {string} organizationId - L'ID de l'organisation (requis pour l'isolation multi-tenant)
 */
export function useSupabaseContractTemplates(organizationId = null) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Transformation Supabase → App (snake_case → camelCase)
  const transformFromDB = (dbTemplates) => {
    return dbTemplates.map(template => ({
      id: template.id,
      name: template.name,
      projectType: template.project_type,
      contentHtml: template.content_html,
      version: template.version,
      isActive: template.is_active,
      createdAt: template.created_at,
      updatedAt: template.updated_at,
    }));
  };

  // Charger les templates
  useEffect(() => {
    // Ne rien charger si pas d'organization_id
    if (!organizationId) {
      setTemplates([]);
      setLoading(false);
      return;
    }

    const fetchTemplates = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('contract_templates')
          .select('*')
          .eq('organization_id', organizationId)  // 🔥 Filtrer par org !
          .order('created_at', { ascending: false });

        if (error) throw error;

        const transformed = transformFromDB(data || []);
        setTemplates(transformed);
        setError(null);
      } catch (err) {
        logger.error('Erreur chargement contract_templates:', { error: err.message });
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();

    // Real-time subscription - 🔥 Filtré par organization_id !
    const channel = supabase
      .channel(`contract-templates-changes-${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contract_templates',
          filter: `organization_id=eq.${organizationId}`,  // 🔥 Filtrer par org !
        },
        (payload) => {
          // 🔥 Double vérification de l'org (sécurité)
          if (payload.new?.organization_id && payload.new.organization_id !== organizationId) {
            return; // Ignorer les events d'autres orgs
          }
          
          if (payload.eventType === 'INSERT') {
            const newTemplate = {
              id: payload.new.id,
              name: payload.new.name,
              projectType: payload.new.project_type,
              contentHtml: payload.new.content_html,
              version: payload.new.version,
              isActive: payload.new.is_active,
              createdAt: payload.new.created_at,
              updatedAt: payload.new.updated_at,
            };
            setTemplates((prev) => [newTemplate, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedTemplate = {
              id: payload.new.id,
              name: payload.new.name,
              projectType: payload.new.project_type,
              contentHtml: payload.new.content_html,
              version: payload.new.version,
              isActive: payload.new.is_active,
              createdAt: payload.new.created_at,
              updatedAt: payload.new.updated_at,
            };
            setTemplates((prev) =>
              prev.map((t) => (t.id === updatedTemplate.id ? updatedTemplate : t))
            );
          } else if (payload.eventType === 'DELETE') {
            setTemplates((prev) => prev.filter((t) => t.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId]);  // 🔥 Re-fetch si org change

  // Créer un template
  const createTemplate = async (templateData) => {
    try {
      // 🔥 Vérifier que l'organization_id est présent
      if (!organizationId) {
        throw new Error('organization_id requis pour créer un template');
      }

      const dbPayload = {
        name: templateData.name,
        project_type: templateData.projectType || 'ACC',
        content_html: templateData.contentHtml || '',
        version: 1,
        is_active: true,
        organization_id: organizationId,  // 🔥 Inclure l'org !
      };

      const { data, error } = await supabase
        .from('contract_templates')
        .insert(dbPayload)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (err) {
      logger.error('Erreur création contract_template:', { error: err.message });
      return { success: false, error: err.message };
    }
  };

  // Mettre à jour un template
  const updateTemplate = async (templateId, templateData) => {
    try {
      const dbPayload = {
        name: templateData.name,
        project_type: templateData.projectType,
        content_html: templateData.contentHtml,
      };

      const { data, error } = await supabase
        .from('contract_templates')
        .update(dbPayload)
        .eq('id', templateId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (err) {
      logger.error('Erreur mise à jour contract_template:', { error: err.message });
      return { success: false, error: err.message };
    }
  };

  // Désactiver un template
  const deactivateTemplate = async (templateId) => {
    try {
      const { data, error } = await supabase
        .from('contract_templates')
        .update({ is_active: false })
        .eq('id', templateId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (err) {
      logger.error('Erreur désactivation contract_template:', { error: err.message });
      return { success: false, error: err.message };
    }
  };

  return {
    templates,
    loading,
    error,
    createTemplate,
    updateTemplate,
    deactivateTemplate,
  };
}

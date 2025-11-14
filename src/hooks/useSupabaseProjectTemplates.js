import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook Supabase pour gérer les modèles de projets (templates)
 * 
 * Fonctionnalités :
 * - Lecture des templates (ACC, Centrale, Autonomie, etc.)
 * - Création/modification/suppression (Admin uniquement)
 * - Gestion de la visibilité (is_public)
 * - Sync real-time entre admins
 * 
 * Table Supabase : project_templates
 * Remplace : localStorage 'evatime_projects_data'
 */
export function useSupabaseProjectTemplates() {
  const [projectTemplates, setProjectTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isLocalUpdate = useRef(false);

  /**
   * ✅ CHARGER LES TEMPLATES AU MONTAGE
   */
  useEffect(() => {
    fetchProjectTemplates();
  }, []);

  /**
   * ✅ ÉCOUTER LES CHANGEMENTS REAL-TIME
   */
  useEffect(() => {
    const channel = supabase
      .channel('project-templates-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_templates'
        },
        (payload) => {
          if (isLocalUpdate.current) {
            isLocalUpdate.current = false;
            return;
          }

          console.log('🔄 Real-time project template change:', payload);

          // ✅ Transformer snake_case → camelCase
          const transformTemplate = (t) => ({
            ...t,
            clientTitle: t.client_title,
            isPublic: t.is_public
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
  }, []);

  /**
   * 📥 RÉCUPÉRER TOUS LES TEMPLATES
   */
  const fetchProjectTemplates = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('project_templates')
        .select('*')
        .order('type', { ascending: true });

      if (fetchError) throw fetchError;

      // ✅ TRANSFORMER snake_case → camelCase pour compatibilité avec l'app
      const transformedData = (data || []).map(template => ({
        ...template,
        clientTitle: template.client_title,
        isPublic: template.is_public
      }));

      setProjectTemplates(transformedData);
    } catch (err) {
      console.error('❌ Erreur fetch project templates:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * ➕ CRÉER UN NOUVEAU TEMPLATE
   */
  const addTemplate = async (templateData) => {
    try {
      isLocalUpdate.current = true;

      const { data, error: insertError } = await supabase
        .from('project_templates')
        .insert([templateData])
        .select()
        .single();

      if (insertError) throw insertError;

      console.log('✅ Template créé:', data);
      
      // ✅ Transformer snake_case → camelCase
      const transformedData = {
        ...data,
        clientTitle: data.client_title,
        isPublic: data.is_public
      };
      
      setProjectTemplates(prev => [...prev, transformedData]);
      return transformedData;
    } catch (err) {
      console.error('❌ Erreur création template:', err);
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

      console.log('✅ Template modifié:', data);
      
      // ✅ Transformer snake_case → camelCase
      const transformedData = {
        ...data,
        clientTitle: data.client_title,
        isPublic: data.is_public
      };
      
      setProjectTemplates(prev =>
        prev.map(template => (template.id === id ? transformedData : template))
      );
      return transformedData;
    } catch (err) {
      console.error('❌ Erreur modification template:', err);
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

      console.log('✅ Template supprimé:', id);
      setProjectTemplates(prev => prev.filter(template => template.id !== id));
    } catch (err) {
      console.error('❌ Erreur suppression template:', err);
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

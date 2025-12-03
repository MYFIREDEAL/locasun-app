import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '@/lib/logger';

/**
 * Hook pour gérer les formulaires dynamiques via Supabase
 * Table: forms
 */
export function useSupabaseForms() {
  const [forms, setForms] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Transformation Supabase → App (object avec form_id comme clé)
  const transformFromDB = (dbForms) => {
    const formsObject = {};
    dbForms.forEach(form => {
      formsObject[form.form_id] = {
        id: form.form_id,
        name: form.name,
        fields: form.fields || [],
        projectIds: form.project_ids || [],
        createdAt: new Date(form.created_at).getTime(),
        updatedAt: new Date(form.updated_at).getTime(),
      };
    });
    return formsObject;
  };

  // Charger les formulaires
  useEffect(() => {
    const fetchForms = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('forms')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const transformed = transformFromDB(data || []);
        setForms(transformed);
        setError(null);
      } catch (err) {
        logger.error('Erreur chargement forms:', { error: err.message });
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchForms();

    // Real-time subscription
    const channel = supabase
      .channel(`forms-changes-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'forms',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newForm = payload.new;
            setForms((prev) => ({
              ...prev,
              [newForm.form_id]: {
                id: newForm.form_id,
                name: newForm.name,
                fields: newForm.fields || [],
                projectIds: newForm.project_ids || [],
                createdAt: new Date(newForm.created_at).getTime(),
                updatedAt: new Date(newForm.updated_at).getTime(),
              },
            }));
          } else if (payload.eventType === 'UPDATE') {
            const updatedForm = payload.new;
            setForms((prev) => ({
              ...prev,
              [updatedForm.form_id]: {
                id: updatedForm.form_id,
                name: updatedForm.name,
                fields: updatedForm.fields || [],
                projectIds: updatedForm.project_ids || [],
                createdAt: new Date(updatedForm.created_at).getTime(),
                updatedAt: new Date(updatedForm.updated_at).getTime(),
              },
            }));
          } else if (payload.eventType === 'DELETE') {
            setForms((prev) => {
              const updated = { ...prev };
              delete updated[payload.old.form_id];
              return updated;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Ajouter/mettre à jour un formulaire
  const saveForm = async (formId, formData) => {
    try {
      const dbPayload = {
        form_id: formId,
        name: formData.name,
        fields: formData.fields || [],
        project_ids: formData.projectIds || [],
      };

      const { data, error } = await supabase
        .from('forms')
        .upsert(dbPayload, { onConflict: 'form_id' })
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (err) {
      logger.error('Erreur sauvegarde form:', { error: err.message });
      return { success: false, error: err.message };
    }
  };

  // Supprimer un formulaire
  const deleteForm = async (formId) => {
    try {
      const { error } = await supabase
        .from('forms')
        .delete()
        .eq('form_id', formId);

      if (error) throw error;

      return { success: true };
    } catch (err) {
      logger.error('Erreur suppression form:', { error: err.message });
      return { success: false, error: err.message };
    }
  };

  return {
    forms,
    loading,
    error,
    saveForm,
    deleteForm,
  };
}
